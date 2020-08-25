FROM mhart/alpine-node:slim-14.8.0
WORKDIR /app
COPY index.js .
ENV NODE_ENV production
CMD [ "node", "index.js" ]