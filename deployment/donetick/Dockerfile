# Native static Go binary embeds the pinned frontend. See rebuild.sh.
FROM scratch
COPY donetick /donetick
COPY zoneinfo.zip /zoneinfo.zip
ENV ZONEINFO=/zoneinfo.zip
USER 1000:1000
EXPOSE 2021
ENTRYPOINT ["/donetick"]
