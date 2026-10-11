#!/bin/sh
# Pinned source is mounted read-only. Build only the native backend; no frontend
# rewrite, downloaded example templates, production credentials or user data.
set -eu
test "$(git -C /input rev-parse HEAD)" = cf46b53bcb61c2a9be8f202bec03647a5470d43d
test -z "$(git -C /input status --porcelain -- backend common CHANGES.md)"
mkdir -p /work/source /work/user /work/config /work/m2
cp -a /input/backend /input/common /input/CHANGES.md /work/source/
export CLJ_CONFIG=/work/config CLJ_CACHE=/work/cache GITLIBS=/work/gitlibs
export JAVA_TOOL_OPTIONS='-Xmx1536m -XX:ActiveProcessorCount=2 -Duser.home=/work/user'
cd /work
clojure -M /reviewed/patch.clj
cd /work/source/common
clojure -T:build compile
cd /work/source/backend
mkdir -p target/classes
cp /reviewed/version.txt target/classes/version.txt
cp ../CHANGES.md target/classes/changelog.md
clojure -T:build jar
cp target/penpot.jar /output/penpot.jar
cp deps.edn /output/backend-deps.edn
cp ../common/deps.edn /output/common-deps.edn
clojure -Stree > /output/dependency-tree.txt
sha256sum /output/penpot.jar
