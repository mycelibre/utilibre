#!/bin/sh
set -eu
# Test container only. No real queue or app configuration is mounted.
[ "${HOSTNAME:-}" != "" ]
[ -d /review ] && [ -d /report ]
[ "$(ip -o link show | wc -l)" -eq 1 ] || { echo 'Requires --network none'; exit 1; }
cp /review/../reply-header-checks /etc/postfix/utilibre-reply-header-checks
postconf -e 'myhostname=fixture.example.invalid'
postconf -e 'mydestination=fixture.example.invalid'
postconf -e 'inet_interfaces=127.0.0.1'
postconf -e 'inet_protocols=ipv4'
postconf -e 'mynetworks=127.0.0.0/8'
postconf -e 'local_recipient_maps='
postconf -e 'smtpd_relay_restrictions=permit_mynetworks,reject_unauth_destination'
postconf -e 'defer_transports=local,smtp,relay,virtual'
postconf -e 'header_checks=regexp:/etc/postfix/utilibre-reply-header-checks'
postconf -e 'smtpd_milters=inet:127.0.0.1:11332'
postconf -e 'non_smtpd_milters='
postconf -e 'milter_default_action=tempfail'
postconf -e 'milter_connect_timeout=2s'
postconf -e 'milter_command_timeout=15s'
postconf -e 'milter_content_timeout=15s'
postconf -e 'milter_protocol=6'
postconf -e 'maillog_file_prefixes=/report'
postconf -e 'maillog_file=/report/postfix.log'
postfix check
postfix start
