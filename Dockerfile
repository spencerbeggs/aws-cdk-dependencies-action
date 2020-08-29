FROM mhart/alpine-node:14.8.0 as base
ENV NODE_ENV production
EXPOSE 9229
COPY entrypoint.sh package.json yarn.lock index.mjs /app/
RUN chmod +x /app/entrypoint.sh
RUN cd /app && yarn install --production=true --frozen-lockfile

FROM base as run
CMD [ "node", "/app/index.mjs"]

FROM base as debug
CMD ["tail", "-f", "/dev/null"]

