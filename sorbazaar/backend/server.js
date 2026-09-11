require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');

const prisma = require('./prismaClient');
const app = express();

// ===== SECURITY & PERFORMANCE MIDDLEWARE =====

// Trust Proxy for Render/Netlify/Vercel (required for rate limiting, secure cookies, IP detection)
app.set('trust proxy', 1);

// Security headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    enabled: process.env.NODE_ENV === 'production',
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:", "blob:", "http://localhost:*"],
      connectSrc: ["'self'", "https://tansoura.in", "https://www.tansoura.in", "https://sorbazaar.netlify.app", "https://sorbazaar-admin.netlify.app", "http://localhost:*"],
      fontSrc: ["'self'", "data:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'", "http://localhost:*", "https://tansbackend-aqwx.onrender.com", "https://tansoura.in", "https://www.tansoura.in", "https://sorbazaar.netlify.app", "https://sorbazaar-admin.netlify.app", "blob:"]
    }
  }
}));

// Compression
app.use(compression());

// Request logging
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// CORS - production-ready configuration
const allowedOrigins = [
  'https://tansoura.in',
  'https://www.tansoura.in',
  'https://tansoura.com',
  'https://www.tansoura.com',
  'https://sorbazaar.netlify.app',
  'https://sorbazaar-admin.netlify.app',
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:5173',
  'http://localhost:5174'
];

// Allow overriding via environment variable
if (process.env.CORS_ORIGIN) {
  const extraOrigins = process.env.CORS_ORIGIN.split(',').map(o => o.trim());
  allowedOrigins.push(...extraOrigins);
}

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV !== 'production') {
      callback(null, true);
    } else {
      console.warn(`[CORS] Blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  exposedHeaders: ['Content-Disposition', 'X-Response-Time'],
  maxAge: 86400
};

app.use(cors(corsOptions));

app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Response time tracking (logging only - headers can't be set after response finishes)
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    // Only log, don't set headers after response is finished
    if (process.env.NODE_ENV !== 'production') {
      console.log(`${req.method} ${req.originalUrl} - ${duration}ms`);
    }
  });
  next();
});

// Global cache-control middleware - ensure no caching on all API responses
app.use('/api', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
  next();
});

// Data version tracking for client synchronization
let dataVersion = Date.now();
global.bumpDataVersion = () => {
  dataVersion = Date.now();
};
app.get('/api/version', (req, res) => {
  res.json({ version: dataVersion });
});
app.post('/api/version/bump', (req, res) => {
  dataVersion = Date.now();
  res.json({ version: dataVersion });
});

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/sliders', require('./routes/sliders'));
app.use('/api/offers', require('./routes/offers'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/notifications', require('./routes/notifications').router);
app.use('/api/profile', require('./routes/profile'));
app.use('/api/users', require('./routes/users'));
app.use('/api/promo', require('./routes/promo'));
app.use('/api/categories', require('./routes/categories'));

app.get('/api/health', (req, res) => res.json({ status: 'ok', name: 'SorBazaar API' }));

// 404 handler for unknown API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ message: `Route ${req.originalUrl} not found` });
});

// Global error handling middleware MUST come after all routes
app.use((err, req, res, next) => {
  console.error('[Global Error Handler]', err);

  // Handle CORS errors specifically
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({ message: 'CORS: Origin not allowed' });
  }

  // JSON parse error
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'Invalid JSON in request body' });
  }

  // Multer file size error
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ message: 'File too large. Maximum size is 100MB.' });
  }

  // Default error
  res.status(err.status || 500).json({
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// ===== DATABASE CONNECTION =====
const { connectDB, disconnectDB, getDB } = require('./config/db');

const checkDbConnection = async () => {
  try {
    await connectDB();
    await getDB().command({ ping: 1 });
    console.log('MongoDB connected successfully');
    return true;
  } catch (err) {
    console.error('Database connection error:', err.message);
    return false;
  }
};

// ===== SERVER STARTUP =====
const PORT = parseInt(process.env.PORT) || 5000;

async function startServer(port) {
  try {
    const connected = await checkDbConnection();
    if (!connected) {
      console.error('FATAL: Could not connect to MongoDB database. Exiting.');
      process.exit(1);
    }

    const server = app.listen(port, () => {
      console.log(`SorBazaar API running on port ${port}`);
    });

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`Port ${port} is already in use. Trying port ${port + 1}...`);
        server.close(() => {
          startServer(port + 1);
        });
      } else {
        console.error('Server error:', err);
      }
    });

    // Graceful shutdown
    const gracefulShutdown = (signal) => {
      console.log(`\n${signal} received. Shutting down gracefully...`);
      server.close(() => {
        console.log('HTTP server closed.');
        disconnectDB().then(() => {
          console.log('Database connection closed.');
          process.exit(0);
        }).catch(() => process.exit(1));
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        console.error('Forced shutdown after timeout.');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    return server;
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

startServer(PORT);

module.exports = {};
