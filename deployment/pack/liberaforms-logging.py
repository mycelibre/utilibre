"""Narrow logging-only privacy adaptation for LiberaForms 4.11.1.

No request/IP/answer/error event sink. Health checks monitor response success
without retaining user activity. Native account/form permission data is intact.
SPDX-License-Identifier: AGPL-3.0-or-later
"""
import logging
import logging.config as logging_config

dictConfig = logging_config.dictConfig

class LogSetup:
    def __init__(self, app=None, **kwargs):
        if app is not None:
            self.init_app(app, **kwargs)

    def init_app(self, app, **kwargs):
        # Upstream ships the complete CSS bundles. Flask-Assets supported
        # production controls avoid cache writes/builds in the request path.
        app.config.update(ASSETS_AUTO_BUILD=False, ASSETS_MANIFEST=False, ASSETS_CACHE=False)
        logging_config.dictConfig({
            "version": 1, "disable_existing_loggers": True,
            "handlers": {"discard": {"class": "logging.NullHandler"}},
            "root": {"handlers": ["discard"], "level": "CRITICAL"},
        })
        logging.disable(logging.CRITICAL)
