const jwt = require('jsonwebtoken');
const prisma = require('../prismaClient');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }
    const secret = process.env.JWT_SECRET || 'dev_jwt_secret_change_me';
    if (!process.env.JWT_SECRET) {
      console.warn('[auth middleware] JWT_SECRET is missing. Using dev fallback (NOT for production).');
    }
    const decoded = jwt.verify(token, secret);
    const user = await prisma.user.findFirst({ where: { id: decoded.id } });
    if (!user) {
      res.status(401).json({ message: 'User not found' });
      return;
    }
    req.user = user;
    next();
  } catch {
    res.status(401).json({ message: 'Invalid token' });
  }
};

const adminAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }
    const secret = process.env.JWT_SECRET || 'dev_jwt_secret_change_me';
    const decoded = jwt.verify(token, secret);
    const user = await prisma.user.findFirst({ where: { id: decoded.id } });
    if (!user) {
      res.status(401).json({ message: 'User not found' });
      return;
    }
    if (user.role !== 'admin') {
      res.status(403).json({ message: 'Admin access required' });
      return;
    }
    req.user = user;
    next();
  } catch {
    res.status(401).json({ message: 'Invalid token' });
  }
};

module.exports = { auth, adminAuth };