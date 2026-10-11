;; Exercise the native 2.18.3 helper; no server or external content involved.
(require '[app.binfile.common :as bfc] '[clojure.string :as str])
(def input "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"64\" height=\"64\"><script>FICTIONAL_SCRIPT_MARKER</script><circle r=\"20\"/></svg>")
(doseq [ctype ["image/svg+xml" "IMAGE/SVG+XML" "  Image/Svg+Xml  " "image/svg+xml; charset=utf-8"]]
  (let [object {:content-type (bfc/normalize-content-type ctype)}
        _ (bfc/check-storage-content-type object)
        result (bfc/sanitize-imported-svg object (.getBytes input "UTF-8"))
        text (String. ^bytes (:bytes result) "UTF-8")]
    (assert (str/includes? text "<circle"))
    (assert (not (str/includes? text "<script")))
    (assert (not (str/includes? text "FICTIONAL_SCRIPT_MARKER")))
    (assert (= (:size result) (alength ^bytes (:bytes result))))
    (assert (str/starts-with? (:hash result) "blake2b:"))))
(doseq [ctype ["text/html" nil "" "application/x-font-woff"]]
  (assert (try (bfc/check-storage-content-type {:content-type ctype}) false
               (catch clojure.lang.ExceptionInfo e (= :media-type-not-allowed (:code (ex-data e)))))))
(assert (try (bfc/sanitize-imported-svg {:content-type "image/svg+xml"} (.getBytes "<svg><unclosed>" "UTF-8")) false
             (catch Exception _ true)))
(println "PASS: native SVG sanitizer, content-type normalization/rejection, malformed input, size and hash.")
