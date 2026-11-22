/* Synthetic public-API compatibility checks; no network or account store. */
#include <assert.h>
#include <stdio.h>
#include <string.h>
#include <sasl/sasl.h>
#include <sasl/saslutil.h>

int main(void) {
    char encoded[64], decoded[64];
    unsigned length = 0;
    assert(sasl_encode64("fictional", 9, encoded, sizeof encoded, &length) == SASL_OK);
    assert(length == 12 && !strcmp(encoded, "ZmljdGlvbmFs"));
    assert(sasl_decode64(encoded, length, decoded, sizeof decoded, &length) == SASL_OK);
    assert(length == 9 && !memcmp(decoded, "fictional", 9));
    assert(sasl_encode64("fictional", 9, encoded, 2, &length) == SASL_BUFOVER);
    assert(sasl_decode64("!!!!", 4, decoded, sizeof decoded, &length) == SASL_BADPROT);
    assert(sasl_client_init(NULL) == SASL_OK);
    sasl_conn_t *connection = NULL;
    const sasl_callback_t prompts[] = {{SASL_CB_USER, NULL, NULL}, {SASL_CB_LIST_END, NULL, NULL}};
    assert(sasl_client_new("imap", "example.invalid", NULL, NULL, prompts, 0, &connection) == SASL_OK);
    assert(sasl_setprop(connection, SASL_AUTH_EXTERNAL, "fictional") == SASL_OK);
    sasl_interact_t *interaction = NULL;
    const char *output = NULL, *mechanism = NULL;
    assert(sasl_client_start(connection, "EXTERNAL", &interaction, &output, &length, &mechanism) == SASL_INTERACT);
    assert(interaction && interaction[0].id == SASL_CB_USER && interaction[1].id == SASL_CB_LIST_END);
    interaction[0].result = "fictional";
    interaction[0].len = 9;
    assert(sasl_client_start(connection, "EXTERNAL", &interaction, &output, &length, &mechanism) == SASL_OK);
    assert(!strcmp(mechanism, "EXTERNAL") && length == 9 && !memcmp(output, "fictional", 9));
    sasl_dispose(&connection);
    assert(connection == NULL);
    assert(sasl_client_new("imap", "example.invalid", NULL, NULL, NULL, 0, &connection) == SASL_OK);
    assert(sasl_client_start(connection, "UNSUPPORTED-FIXTURE", &interaction, &output, &length, &mechanism) == SASL_NOMECH);
    sasl_dispose(&connection);
    sasl_done();
    puts("{\"passed\":true,\"encodingChecks\":4,\"nativeExternalExchange\":true,\"unsupportedRejected\":true,\"network\":\"none\"}");
    return 0;
}
