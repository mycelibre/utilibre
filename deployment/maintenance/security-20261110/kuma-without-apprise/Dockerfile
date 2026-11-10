FROM sha256:81721ff6d94bb8afb0f4fbb4368f8558799a9cb20d741500ceec952bee7b3098
USER 0
RUN dpkg --purge apprise python3-markdown && test -z "$(dpkg --audit)"
USER 1000:1000
