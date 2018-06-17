#!/usr/bin/env bash

docker build -t autotune .
docker run -it \
    -p 3000:3000 \
    --volume=$PWD:/autotune \
    --workdir="/autotune" \
    --memory=4g --memory-swap=4g --memory-swappiness=0 \
    --entrypoint=/bin/bash \
    autotune