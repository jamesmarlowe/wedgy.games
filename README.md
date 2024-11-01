# searchparty
```
#create a cloudflare pages app called intro - set for a subdomain
#create a cloudflare worker app called chat - set for just /api on a subdomain
npx wrangler deploy
#that will webpack the client for the static assets in the pages app
npx webpack && npx wrangler pages deploy ./dist --project-name intro
#and upload the chat.mjs file as the worker
```

passed scans:
https://www.ssllabs.com/ssltest/analyze.html?d=searchparty.wedgy.games&s=2606%3a4700%3a3035%3a0%3a0%3a0%3a6815%3a1723&latest
https://securityheaders.com/?q=https%3A%2F%2Fsearchparty.wedgy.games%2F&followRedirects=on
https://lighthouse-metrics.com/lighthouse/checks/9cd56d19-72e3-4b01-b3cf-8061c2fa1310
