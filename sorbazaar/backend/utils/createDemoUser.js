require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

async function main() {
  await mongoose.connect(process.env.MONGODB_URI, { family: 4 });
  console.log('Connected to MongoDB');

  const demoUsers = [
    { username: 'user01', email: 'user01@sorbazaar.com', phone: '9876543210', password: 'user123', role: 'user' },
    { username: 'admin01', email: 'admin01@sorbazaar.com', phone: '9876543211', password: 'admin123', role: 'admin' },
    { username: 'Sourabh01', email: 'sourabh@sorbazaar.com', phone: '9876543212', password: 'Sourabh123', role: 'admin' }
  ];

  for (const u of demoUsers) {
    const hashedPassword = await bcrypt.hash(u.password, 12);
    const updated = await User.findOneAndUpdate(
      { username: u.username },
      {
        $set: {
          email: u.email,
          phone: u.phone,
          password: hashedPassword,
          role: u.role
        }
      },
      { upsert: true, new: true }
    );
    console.log(`Set user: ${updated.username} (email: ${updated.email}) with password: ${u.password}`);
  }

  console.log('Done');
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });