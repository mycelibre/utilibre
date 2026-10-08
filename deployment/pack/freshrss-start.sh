#!/bin/sh
# Runs after the native entrypoint; preserves its install/permissions workflow.
set -eu
sed -i -E 's@^CustomLog .*@CustomLog /dev/null combined_proxy@;s@^ErrorLog .*@ErrorLog /dev/null@' /etc/apache2/sites-available/FreshRSS.Apache.conf
sed -i -E "s@'simplepie_syslog_enabled' => true@'simplepie_syslog_enabled' => false@" /var/www/FreshRSS/config.default.php
sed -i -E 's@2>> /proc/1/fd/2 > /tmp/FreshRSS.log@> /dev/null 2> /dev/null@' /etc/crontab.freshrss.default
if [ -n "${CRON_MIN:-}" ]; then
 sed -r "s#^[^ ]+ #$CRON_MIN #" /etc/crontab.freshrss.default | crontab -
 cron
fi
# Debian's native envvars intentionally reads optional unset variables.
set +u
. /etc/apache2/envvars
exec apache2 -D FOREGROUND -c 'Include /etc/apache2/utilibre-privacy.conf'
