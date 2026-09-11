const prisma = require('../prismaClient');

// Helper to convert Prisma record to plain object with camelCase keys
function toCamel(record) {
  if (!record) return null;
  const obj = { ...record };
  return obj;
}

// Find user by any login field (username, email, phone)
async function findByLogin(login) {
  const value = String(login).trim();
  const emailValue = value.toLowerCase();
  
  return prisma.user.findFirst({
    where: {
      OR: [
        { username: value },
        { email: emailValue },
        { phone: value }
      ]
    }
  });
}

// Find user by contact (email or phone)
async function findByContact(contact) {
  const value = String(contact).trim();
  const emailValue = value.toLowerCase();
  
  return prisma.user.findFirst({
    where: {
      OR: [
        { email: emailValue },
        { phone: value }
      ]
    }
  });
}

// Check if user exists by login fields
async function userExists(username, email, phone) {
  const conditions = [];
  if (username) conditions.push({ username });
  if (email) conditions.push({ email: email.toLowerCase() });
  if (phone) conditions.push({ phone });
  
  const count = await prisma.user.count({
    where: { OR: conditions }
  });
  
  return count > 0;
}

// Create user with hashed password
async function createUser(data) {
  const bcrypt = require('bcryptjs');
  const hashedPassword = await bcrypt.hash(data.password, 12);
  
  return prisma.user.create({
    data: {
      username: data.username,
      email: data.email || null,
      phone: data.phone || null,
      password: hashedPassword,
      role: data.role || 'user'
    }
  });
}

// Compare password
async function comparePassword(user, candidate) {
  const bcrypt = require('bcryptjs');
  return bcrypt.compare(candidate, user.password);
}

// Get public user data (without password)
function publicUser(user) {
  if (!user) return null;
  
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    phone: user.phone,
    role: user.role,
    fullName: user.fullName || '',
    dateOfBirth: user.dateOfBirth || '',
    gender: user.gender || '',
    profilePhoto: user.profilePhoto || '',
    addresses: user.addresses || [],
    wishlist: user.wishlist || [],
    recentlyViewed: user.recentlyViewed || [],
    reviews: user.reviews || [],
    notificationPreferences: user.notificationPreferences || { orderUpdates: true, offers: true, promotional: true },
    language: user.language || 'en',
    theme: user.theme || 'light',
    status: user.status,
    createdAt: user.createdAt
  };
}

// Generate order number from ID
function orderNum(id) {
  return String(id).slice(-8).toUpperCase();
}

module.exports = {
  toCamel,
  findByLogin,
  findByContact,
  userExists,
  createUser,
  comparePassword,
  publicUser,
  orderNum,
  prisma
};