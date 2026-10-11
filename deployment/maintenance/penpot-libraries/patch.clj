;; Apply dependency-only changes to an isolated copy of Penpot 2.18.2.
(require '[clojure.edn :as edn] '[clojure.pprint :as pp])
(defn load-deps [path] (edn/read-string (slurp path)))
(defn save-deps [path data] (spit path (with-out-str (pp/pprint data))))
(let [p "/work/source/common/deps.edn" d (load-deps p)]
  (doseq [n '[com.fasterxml.jackson.core/jackson-core com.fasterxml.jackson.core/jackson-databind]]
    (assert (= "2.22.2" (get-in d [:deps n :mvn/version]))))
  (save-deps p (-> d (assoc :mvn/local-repo "/work/m2")
                   (assoc-in [:deps 'com.fasterxml.jackson.core/jackson-core :mvn/version] "2.22.3")
                   (assoc-in [:deps 'com.fasterxml.jackson.core/jackson-databind :mvn/version] "2.22.3"))))
(let [p "/work/source/backend/deps.edn" d (load-deps p)
      modules '[netty-codec-dns netty-buffer netty-common netty-transport
                netty-transport-classes-epoll netty-transport-native-unix-common
                netty-codec-base netty-codec-http2 netty-resolver netty-codec
                netty-resolver-dns netty-handler netty-codec-http]]
  (assert (= "1.11.2" (get-in d [:deps 'at.yawk.lz4/lz4-java :mvn/version])))
  (save-deps p (reduce (fn [data n] (assoc-in data [:deps (symbol "io.netty" (name n))]
                                                 {:mvn/version "4.2.17.Final"}))
                      (-> d (assoc :mvn/local-repo "/work/m2")
                          (assoc-in [:deps 'at.yawk.lz4/lz4-java :mvn/version] "1.11.4")) modules)))
