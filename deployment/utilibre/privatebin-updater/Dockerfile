# Application-only upgrade on the reviewed, immutable local security runtime.
# The coordinator verifies this tag's image ID before and after a networkless build.
FROM utilibre-privatebin:reviewed-update-runtime
USER root
RUN rm -rf /srv/lib /srv/tpl /srv/bin /var/www/js /var/www/css /var/www/i18n /var/www/img
COPY --chown=65534:82 source/lib /srv/lib/
# Preserve the reviewed vendor tree too. The coordinator requires unchanged
# composer.json + composer.lock; dependency changes require a runtime review.
COPY --chown=65534:82 source/tpl /srv/tpl/
COPY --chown=65534:82 source/bin /srv/bin/
COPY --chown=65534:82 source/js /var/www/js/
COPY --chown=65534:82 source/css /var/www/css/
COPY --chown=65534:82 source/i18n /var/www/i18n/
COPY --chown=65534:82 source/img /var/www/img/
COPY --chown=65534:82 source/index.php /var/www/index.php
COPY source/LICENSE.md source/CREDITS.md source/CHANGELOG.md /usr/share/doc/privatebin/
COPY release.json /usr/share/doc/privatebin/utilibre-release.json
USER 65534:82
