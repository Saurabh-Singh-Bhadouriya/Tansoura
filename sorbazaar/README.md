# SorBazaar - Full Stack E-Commerce Platform

## Project Structure
```
sorbazaar/
├── backend/          # Node.js + Express + MongoDB API
├── frontend/         # Customer-facing React store (port 3000)
└── admin/            # Admin panel React app (port 3001)
```

## Quick Start

### 1. Backend
```bash
cd sorbazaar/backend
npm install
npm run seed    # Seed test data
npm run dev     # Starts on http://localhost:5000
```

### 2. Frontend (Store)
```bash
cd sorbazaar/frontend
npm install
npm run dev     # Starts on http://localhost:3000
```

### 3. Admin Panel
```bash
cd sorbazaar/admin
npm install
npm run dev     # Starts on http://localhost:3001
```

## Test Credentials
| Role  | Username | Password  |
|-------|----------|-----------|
| User  | user01   | user123   |
| Admin | admin01  | admin123  |

## Features
- **Frontend**: 10 nav categories, product cards, cart drawer, login/checkout flow, product detail pages
- **Admin**: Products (manual + bulk import/export), Sliders, Offers & Banners
- **Bulk Import**: Amazon, Flipkart, AliExpress, Shopify, Wix, WordPress, Meesho CSV formats
- **Theme**: Light blue & white, mobile responsive

## MongoDB
Connected to MongoDB Atlas (configured in backend/.env)
