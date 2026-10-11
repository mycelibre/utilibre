#!/bin/sh
# Native 2.18.3 source plus the already-reviewed compatible dependency pins.
# Source archive contains only backend, common and CHANGES.md from ff7a66f.
set -eu
test "$(sha256sum /input/source.tar | cut -d ' ' -f 1)" = 1d61e7277dd38fc351b1db3244606d4d86db07e38f58a5cbc95e5fe9064cb18b
mkdir -p /work/source /work/user /work/config /work/m2
tar -xf /input/source.tar -C /work/source
export CLJ_CONFIG=/work/config CLJ_CACHE=/work/cache GITLIBS=/work/gitlibs
export JAVA_TOOL_OPTIONS='-Xmx1536m -XX:ActiveProcessorCount=2 -Duser.home=/work/user'
cd /work
clojure -M /reviewed/penpot-libraries/patch.clj
cd /work/source/common
clojure -T:build compile
cd /work/source/backend
mkdir -p target/classes
cp /reviewed/penpot-2.18.3/version.txt target/classes/version.txt
cp ../CHANGES.md target/classes/changelog.md
clojure -T:build jar
cp target/penpot.jar /output/penpot.jar
cp deps.edn /output/backend-deps.edn
cp ../common/deps.edn /output/common-deps.edn
clojure -Stree > /output/dependency-tree.txt
sha256sum /output/penpot.jar
