#!/bin/bash -e

rm -rf dist/*

quicktype --telemetry enable
quicktype src/schemas/models.in.ts -o src/common/models.ts
quicktype --src-lang schema --just-types src/schemas/ClientConfig.schema -o src/common/ClientConfig.ts 
quicktype --src-lang schema src/schemas/counts.schema -o src/common/ExperimentCounts.ts

npm run tslint
tsc -p tsconfig.json

printf '%s\n%s\n' "#!/usr/bin/env node" "$(cat dist/cli/index.js)" > dist/cli/index.js

pushd dist/client
browserify index.js --standalone autotune -o index.browser.js
uglifyjs index.browser.js --compress --mangle -o index.browser.min.js
popd
