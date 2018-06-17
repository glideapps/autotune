#!/usr/bin/env bash

echo "//registry.npmjs.org/:_authToken=$NPM_TOKEN" >> ~/.npmrc
npm run bump-version
npm publish

# Publish quicktype.io
curl -H "Authorization: Bearer $BUILDKITE_TOKEN" \
    https://api.buildkite.com/v2/organizations/typeguard/pipelines/quicktype-dot-io/builds \
    -X POST \
    -F "commit=HEAD" \
    -F "branch=master" \
    -F "message=Deploy for new autotune :rocket:"