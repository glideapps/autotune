#!/bin/bash -e

rm -rf dist
tsc -p tsconfig.json

pushd dist
browserify index.js --standalone autotune -o index.browser.js
uglifyjs index.browser.js --compress --mangle -o index.browser.min.js
popd

cp dist/index.browser.js docs/autotune.js