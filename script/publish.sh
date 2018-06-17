#!/usr/bin/env bash

echo "//registry.npmjs.org/:_authToken=$NPM_TOKEN" >> ~/.npmrc
npm run bump-version
npm publish