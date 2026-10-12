# Exact parent ID is checked by check.py before and after this offline build.
ARG BASE_IMAGE=utilibre-projects:455aa274-npm1121-security-20261011
FROM ${BASE_IMAGE}
USER root
# redis@3.1.1 accidentally publishes a standalone Heroku example containing
# redis@3.1.0. Neither Projects nor its session/socket adapters use that demo.
# Preserve the direct fixed library, metadata, license and all runtime callers.
RUN node -e 'const fs=require("fs"),a=require("assert/strict");a.equal(require("/app/node_modules/redis/package.json").version,"3.1.1");a.equal(require("/app/node_modules/redis/heroku/node_modules/redis/package.json").version,"3.1.0");fs.rmSync("/app/node_modules/redis/heroku",{recursive:true});'
USER node
