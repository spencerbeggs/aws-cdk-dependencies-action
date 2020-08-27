FROM mhart/alpine-node:14.8.0
COPY package.json yarn.lock index.mjs /app/
ENV NODE_ENV production
RUN yarn install --production=true --frozen-lockfile
CMD [ "node", "index.mjs" ]