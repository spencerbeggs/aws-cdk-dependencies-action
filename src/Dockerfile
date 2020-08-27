FROM mhart/alpine-node:14.8.0
COPY package.json yarn.lock index.mjs /app/
ENV NODE_ENV production
RUN cd /app && yarn install --production=true --frozen-lockfile
CMD [ "node", "/app/index.mjs" ]