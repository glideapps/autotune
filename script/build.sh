#!/bin/bash -e

rm -rf dist/*

quicktype --telemetry enable
quicktype src/common/models.in.ts -o src/common/models.ts

tsc -p tsconfig.json

printf '%s\n%s\n' "#!/usr/bin/env node" "$(cat dist/cli/index.js)" > dist/cli/index.js

pushd dist
browserify index.js --standalone autotune -o index.browser.js
uglifyjs index.browser.js --compress --mangle -o index.browser.min.js
popd
