#!/bin/sh
set -eu
source_dir=${1:-/opt/utilibre/src/autoredact}
integration_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
[ "$(git -C "$source_dir" rev-parse HEAD)" = 360fc18b976b9278b73d00e2c49e26c76de6557a ]
cd "$source_dir"
if git apply --check --unidiff-zero "$integration_dir/local-source.patch" 2>/dev/null; then
  git apply --unidiff-zero "$integration_dir/local-source.patch"
else
  git apply --reverse --check --unidiff-zero "$integration_dir/local-source.patch"
fi
npm ci --ignore-scripts --no-fund
mkdir -p public/ocr/core public/ocr/lang public/pdfjs
cp node_modules/tesseract.js/dist/worker.min.js public/ocr/
cp node_modules/tesseract.js-core/*-lstm.* public/ocr/core/
cp node_modules/@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz public/ocr/lang/
for directory in wasm cmaps standard_fonts; do cp -R "node_modules/pdfjs-dist/$directory" public/pdfjs/; done
NODE_OPTIONS=--max-old-space-size=1536 npm run build
mkdir -p dist/licenses
cp LICENSE dist/licenses/autoredact-GPL.txt
cp node_modules/@fontsource-variable/inter/LICENSE dist/licenses/inter-OFL.txt
cp node_modules/tesseract.js/LICENSE.md dist/licenses/tesseract-LICENSE.txt
cp node_modules/tesseract.js-core/LICENSE dist/licenses/tesseract-core-LICENSE.txt
cp node_modules/pdfjs-dist/LICENSE dist/licenses/pdfjs-LICENSE.txt
cp "$integration_dir/tessdata-LICENSE.txt" dist/licenses/tessdata-LICENSE.txt
