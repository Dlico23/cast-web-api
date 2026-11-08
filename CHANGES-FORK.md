# Changes in this fork

Base: [vervallsweg/cast-web-api](https://github.com/vervallsweg/cast-web-api) 1.2.1 (commit `1af700f`, 2019).
The upstream project is no longer maintained.

The fork targets one use case: the SmartThings Edge driver
[toddaustin07/googlecast](https://github.com/toddaustin07/googlecast), for TTS announcements and audio
notifications (e.g. alarm sirens) on Google Nest / Home speakers.

| Area | Problem | Fix |
|---|---|---|
| Runtime | Node 8, Google Assistant needs the dead `grpc` native module | Node 22, Assistant dependencies dropped (it did not work anyway) |
| Google TTS | `google-tts-api` 0.0.4 no longer works | `google-tts-api` 2.x with Todd Austin's `google-tts.js` (Apache-2.0) |
| Connections | Every reconnect leaked a socket and a heartbeat timer; device PINGs were never answered | Previous socket closed first, PONG sent, events from stale sockets ignored |
| mDNS | A re-announcement of the same address dropped the connection every few minutes | Only a real address change reconnects |
| Reconnect | Fixed 10 s retries forever; speakers on Cast firmware 3.80 started refusing the host | Exponential backoff 10 s → 5 min |
| Callbacks | The Edge driver gets a new port at each restart; dead callbacks piled up and spammed the log | Same-host callbacks replaced, invalid URLs rejected, dropped after 200 consecutive failures, errors logged once per 50 |
| Media status | Crash on media without images | Guarded |

Not changed: the HTTP API, so existing clients keep working. Google Assistant endpoints still exist but
answer with errors.

## Run with Docker

```sh
# edit HOST_IP in docker-compose.yml, then
docker compose up -d --build
curl http://127.0.0.1:3000/device     # discovered devices and their connection state
curl http://127.0.0.1:3000/callback   # registered callbacks
```

After switching an existing SmartThings setup to this build, press **Refresh** on the cast-web-api device
in the SmartThings app so the driver registers its callback again.
