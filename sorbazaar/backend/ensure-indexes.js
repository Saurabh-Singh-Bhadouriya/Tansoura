// MongoDB Atlas uses automatically managed indexes, but for performance-critical fields
// we recommend creating compound indexes in Atlas (Database → Collections → Indexes):
//
//  products:  { navPage: 1, published: 1, status: 1, createdAt: -1 }
//             { productCategory: 1, published: 1, status: 1 }
//  orders:    { userId: 1, createdAt: -1 }
//             { orderStatus: 1 }
//             { paymentStatus: 1 }
//  users:     { username: 1 }, { email: 1 }, { phone: 1 } (unique)
//  notifications: { userId: 1, createdAt: -1 }

console.log('MongoDB Atlas indexes are managed in the Atlas dashboard. No local index setup required.');
process.exit(0);