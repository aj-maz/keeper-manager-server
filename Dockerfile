# Use an official Node.js runtime as the base image
FROM node:18-alpine as base

WORKDIR /manager

COPY package.json yarn.lock ./

RUN yarn install

COPY . .

FROM base as production

RUN rimraf ./build && tsc


