# searchparty
```
#create a cloudflare pages app called intro - set for a subdomain
#create a cloudflare worker app called chat - set for just /api on a subdomain
npx wrangler deploy
#that will webpack the client for the static assets in the pages app
npx webpack && npx wrangler pages deploy ./dist --project-name intro
#and upload the chat.mjs file as the worker

#landing page on wedgy.games
npx wrangler pages deploy ./landing --project-name landing
```

passed scans:
https://www.ssllabs.com/ssltest/analyze.html?d=searchparty.wedgy.games&s=2606%3a4700%3a3035%3a0%3a0%3a0%3a6815%3a1723&latest
https://securityheaders.com/?q=https%3A%2F%2Fsearchparty.wedgy.games%2F&followRedirects=on
https://lighthouse-metrics.com/lighthouse/checks/9cd56d19-72e3-4b01-b3cf-8061c2fa1310

landing:
https://www.ssllabs.com/ssltest/analyze.html?d=wedgy.games&s=2606%3a4700%3a3035%3a0%3a0%3a0%3a6815%3a1723&latest
https://securityheaders.com/?q=https%3A%2F%2Fwedgy.games%2F&followRedirects=on
https://lighthouse-metrics.com/lighthouse/checks/7c37f241-eff9-4a76-b2fe-862b7ebc8dc2

TODO:
when you join send whatever is happening for the others
make the scoring display work
[x]store player wordcounts in the durable object
[x]handle tie games
[x]helpers for set/get session
[x]clear round data between rounds
[x]fix bugs with tracking who won round/game
add other languages
reconnect correctly when server restarts? probably not possible
delete rooms with no connections
[x]limit new animals to unused colors
reject more than 6 players
make tiebreaker only go to those that tied
rename cloudflare apps/durable objects to make sense
make the repo build everything at once/as desired with scripts
make hummingbird wing flap
cleanup player.js
cleanup server.js
don't let you join if you haven't typed a room code
figure out if session can persist instead of periodically resetting
