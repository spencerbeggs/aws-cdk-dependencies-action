FROM mhart/alpine-node:14.8.0
WORKDIR /app
COPY package.json yarn.lock index.mjs ./
ENV NODE_ENV production
RUN yarn install --production=true --frozen-lockfile
CMD [ "node", "index.mjs" ]