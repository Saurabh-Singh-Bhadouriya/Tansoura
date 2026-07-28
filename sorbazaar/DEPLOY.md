# Deployment Guide

## Backend (Render)
1. Push code to GitHub/GitLab/Bitbucket.
2. Create a new **Web Service** on Render.
3. Connect your repo and use these settings:
   - Root Directory: `backend`
   - Runtime: Node
   - Build Command: `npm install`
   - Start Command: `npm start`
4. Add Environment Variables in Render dashboard:
   - `MONGODB_URI`: your MongoDB connection string
   - `JWT_SECRET`: any strong secret
   - `PORT`: `10000`
   - `JWT_EXPIRES`: `7d`
5. Deploy. Once live, note the backend URL: `https://sorbazaar-backend.onrender.com` or your custom name.

## Frontend (Netlify)
**Option A: Git deploy (recommended)**
1. Push code to GitHub/GitLab/Bitbucket.
2. Create a new site on Netlify and connect your repo.
3. Set:
   - Base directory: `frontend`
   - Build command: `npm install && npm run build`
   - Publish directory: `frontend/dist`
4. Add environment variables in Netlify dashboard:
   - `VITE_API_URL = https://sorbazaar-backend.onrender.com/api`
5. Deploy.

**Option B: Manual drag-and-drop**
1. Run locally: `node build-all.js`
2. In Netlify dashboard, choose **Deploy site** → **Drag and drop**.
3. Drag the folder: `frontend/dist`
4. Set environment variable in Netlify dashboard first:
   - `VITE_API_URL = https://sorbazaar-backend.onrender.com/api`

## Verify
- Frontend: `https://tansoura.in`
- Admin: `https://tansoura.in/admin`
- API: `https://sorbazaar-backend.onrender.com/api/health`

## Notes
- The admin panel is built into `frontend/public/admin` so it serves under `/admin` on the same domain.
- All API calls in frontend and admin now point to the Render backend.
- Do NOT commit `.env` files to git.