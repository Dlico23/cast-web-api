FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --omit=optional --no-audit --no-fund && npm cache clean --force
COPY . ./
RUN mkdir -p /app/config && chown -R node:node /app/config
USER node
# HOST_IP: the LAN address clients (e.g. the SmartThings hub) use to reach the API
ENV HOST_IP="" PORT=3000
EXPOSE 3000
HEALTHCHECK --interval=60s --timeout=5s --start-period=20s CMD wget -qO- http://127.0.0.1:${PORT}/ >/dev/null || exit 1
CMD ["sh", "-c", "exec node bin/cast-web-api ${HOST_IP:+--hostname=$HOST_IP} --port=${PORT}"]
