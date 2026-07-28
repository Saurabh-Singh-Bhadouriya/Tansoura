# Netlify setup notes (SorBazaar)

This repo contains:
- `frontend/` : Customer React SPA
- `admin/` : Admin React SPA
- `backend/` : Express API

## Customer Netlify site (frontend only)
Use **root** `sorbazaar/netlify.toml`.

- `publish` is `frontend/dist`
- SPA routing uses `/* -> /index.html`

### Deploy steps
1. Deploy this repo (or this branch) to Netlify.
2. Ensure Netlify uses the repo root config (automatically picks up `netlify.toml`).
3. Redeploy.

After deploy, routes like:
- `/`
- `/category/skincare`
- `/products/some-handle`
must load the SPA (not Netlify 404).

