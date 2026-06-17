# Speed Insights

Dicta loads Vercel Speed Insights only in production deployments.

Implementation notes:

- The loader injects `/_vercel/speed-insights/script.js`, which is served by Vercel for deployed projects.
- Sampling is set to `0.25` to preserve the Hobby/free-tier data point budget.
- `/admin` and `/internal` paths are filtered with `beforeSend` before metrics are sent.
- No npm dependency is added, so `package-lock.json` and the existing `npm ci` install flow remain unchanged.

After deploying, visit the production site and navigate through the main user flows. Vercel Speed Insights may take a short period and enough page views before useful route-level data appears.
