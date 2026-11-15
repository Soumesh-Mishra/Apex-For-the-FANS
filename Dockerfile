FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY . .
RUN node build.mjs --standalone

FROM node:24-bookworm-slim
ENV NODE_ENV=production PORT=4173
WORKDIR /app
COPY --from=build --chown=node:node /app/dist/server ./dist/server
COPY --chown=node:node package.json server.mjs ./
USER node
EXPOSE 4173
HEALTHCHECK --interval=30s --timeout=5s CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.mjs"]
