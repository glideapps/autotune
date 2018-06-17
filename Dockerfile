FROM node:8.11.3

ENV workdir /autotune

RUN mkdir ${workdir}
WORKDIR ${workdir}

COPY . .

