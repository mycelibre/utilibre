/* Native, disposable certificate/TLS regression checks. No Internet sockets. */
#include <gnutls/gnutls.h>
#include <gnutls/x509.h>
#include <errno.h>
#include <signal.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/socket.h>
#include <sys/wait.h>
#include <unistd.h>

static void fail(const char *message) { perror(message); exit(1); }
static void check(int result) {
    if (result < 0) { fprintf(stderr, "GnuTLS: %s\n", gnutls_strerror(result)); exit(1); }
}
static gnutls_x509_crt_t certificate(const char *path) {
    gnutls_datum_t data;
    gnutls_x509_crt_t result;
    check(gnutls_load_file(path, &data));
    check(gnutls_x509_crt_init(&result));
    check(gnutls_x509_crt_import(result, &data, GNUTLS_X509_FMT_PEM));
    gnutls_free(data.data);
    return result;
}
static void hostname(const char *label, const char *path, const char *host) {
    gnutls_x509_crt_t cert = certificate(path);
    unsigned matched = gnutls_x509_crt_check_hostname2(cert, host, 0);
    printf("{\"kind\":\"hostname\",\"case\":\"%s\",\"accepted\":%s}\n", label, matched ? "true" : "false");
    gnutls_x509_crt_deinit(cert);
}
static void chain(const char *label, const char *root, const char *leaf, const char *intermediate) {
    gnutls_x509_crt_t ca = certificate(root), certs[2] = {certificate(leaf), NULL};
    unsigned count = intermediate ? 2 : 1, status = 0;
    if (intermediate) certs[1] = certificate(intermediate);
    check(gnutls_x509_crt_list_verify(certs, count, &ca, 1, NULL, 0, 0, &status));
    printf("{\"kind\":\"chain\",\"case\":\"%s\",\"accepted\":%s,\"status\":%u}\n", label, status ? "false" : "true", status);
    for (unsigned i = 0; i < count; i++) gnutls_x509_crt_deinit(certs[i]);
    gnutls_x509_crt_deinit(ca);
}
static int handshake(gnutls_session_t session) {
    int ret;
    do { ret = gnutls_handshake(session); } while (ret == GNUTLS_E_AGAIN || ret == GNUTLS_E_INTERRUPTED);
    return ret;
}
static void tls(const char *label, const char *version, const char *cert, const char *key, const char *host) {
    int sockets[2];
    if (socketpair(AF_UNIX, SOCK_STREAM, 0, sockets)) fail("socketpair");
    fflush(NULL);
    pid_t pid = fork();
    if (pid < 0) fail("fork");
    int server = pid == 0;
    close(sockets[server ? 0 : 1]);
    int fd = sockets[server ? 1 : 0];
    gnutls_certificate_credentials_t creds;
    gnutls_session_t session;
    check(gnutls_certificate_allocate_credentials(&creds));
    if (server) check(gnutls_certificate_set_x509_key_file(creds, cert, key, GNUTLS_X509_FMT_PEM));
    else check(gnutls_certificate_set_x509_trust_file(creds, "CVE-2026-88647/ca.pem", GNUTLS_X509_FMT_PEM));
    check(gnutls_init(&session, server ? GNUTLS_SERVER : GNUTLS_CLIENT));
    char priority[96];
    snprintf(priority, sizeof priority, "NORMAL:-VERS-ALL:+VERS-%s", version);
    check(gnutls_priority_set_direct(session, priority, NULL));
    check(gnutls_credentials_set(session, GNUTLS_CRD_CERTIFICATE, creds));
    if (!server) {
        check(gnutls_server_name_set(session, GNUTLS_NAME_DNS, host, strlen(host)));
        gnutls_session_set_verify_cert(session, host, 0);
    }
    gnutls_transport_set_int(session, fd);
    gnutls_handshake_set_timeout(session, 4000);
    int ret = handshake(session), echo = 0;
    char buffer[16];
    const char payload[] = "fixture-data";
    if (ret == 0) {
        if (!server) check(gnutls_record_send(session, payload, sizeof payload));
        ssize_t size = gnutls_record_recv(session, buffer, sizeof buffer);
        echo = size == sizeof payload && memcmp(buffer, payload, sizeof payload) == 0;
        if (server && echo) check(gnutls_record_send(session, buffer, size));
    }
    unsigned verification = server ? 0 : gnutls_session_get_verify_cert_status(session);
    gnutls_deinit(session);
    gnutls_certificate_free_credentials(creds);
    close(fd);
    if (server) _exit(ret == 0 && echo ? 0 : 2);
    int child_status;
    if (waitpid(pid, &child_status, 0) != pid) fail("waitpid");
    if (!WIFEXITED(child_status)) fail("server terminated abnormally");
    if (ret == 0 && (!echo || WEXITSTATUS(child_status) != 0)) fail("TLS echo");
    printf("{\"kind\":\"tls\",\"case\":\"%s\",\"version\":\"%s\",\"accepted\":%s,\"echo\":%s,\"result\":%d,\"verification\":%u}\n", label, version, ret == 0 ? "true" : "false", echo ? "true" : "false", ret, verification);
}
int main(int argc, char **argv) {
    if (argc != 2 || chdir(argv[1])) fail("fixture directory");
    signal(SIGPIPE, SIG_IGN);
    alarm(40);
    check(gnutls_global_init());
    printf("{\"kind\":\"runtime\",\"version\":\"%s\"}\n", gnutls_check_version(NULL));
    hostname("malformed-srv", "CVE-2026-88647/ca_bad.pem", "target.example");
    hostname("well-formed-srv", "CVE-2026-88647/ca_good.pem", "target.example");
    hostname("cn-mismatch", "CVE-2026-88647/ca_nomatch.pem", "target.example");
    hostname("cn-match", "CVE-2026-88647/ca_nomatch.pem", "elsewhere.example");
    chain("permitted-dn-outside", "CVE-2026-88648/perm_dn_root.pem", "CVE-2026-88648/perm_dn_ee.pem", "CVE-2026-88648/perm_dn_sub.pem");
    chain("excluded-srv-match", "CVE-2026-88648/evidence-defect23/d2s_root.pem", "CVE-2026-88648/evidence-defect23/d2s_ee.pem", NULL);
    chain("excluded-dn-outside", "CVE-2026-88648/evidence-defect23/d3_root.pem", "CVE-2026-88648/evidence-defect23/d3_ee.pem", "CVE-2026-88648/evidence-defect23/d3_sub.pem");
    const char *versions[] = {"TLS1.2", "TLS1.3"};
    for (unsigned i = 0; i < 2; i++) {
        tls("malformed-srv", versions[i], "CVE-2026-88647/ca_bad.pem", "CVE-2026-88647/ca_bad.key", "target.example");
        tls("well-formed-srv", versions[i], "CVE-2026-88647/ca_good.pem", "CVE-2026-88647/ca_good.key", "target.example");
        tls("cn-mismatch", versions[i], "CVE-2026-88647/ca_nomatch.pem", "CVE-2026-88647/ca_nomatch.key", "target.example");
        tls("cn-match", versions[i], "CVE-2026-88647/ca_nomatch.pem", "CVE-2026-88647/ca_nomatch.key", "elsewhere.example");
    }
    gnutls_global_deinit();
    return 0;
}
