#!/bin/bash -e

rm -rf dist/*

quicktype --telemetry enable
quicktype src/common/models.in.ts -o src/common/models.ts
quicktype --src-lang schema -o src/common/ClientConfig.ts --just-types src/common/ClientConfig.schema
quicktype --src-lang schema -o src/common/ExperimentCounts.ts src/counts.schema

npm run tslint
tsc -p tsconfig.json

printf '%s\n%s\n' "#!/usr/bin/env node" "$(cat dist/cli/index.js)" > dist/cli/index.js

pushd dist/client
browserify index.js --standalone autotune -o index.browser.js
uglifyjs index.browser.js --compress --mangle -o index.browser.min.js
popd
