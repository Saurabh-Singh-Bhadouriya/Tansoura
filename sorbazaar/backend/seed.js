require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const bcrypt = require('bcryptjs');
const prisma = require('./prismaClient');
const { connectDB } = require('./config/db');

const NAV_PAGES = ['home', 'skincare', 'haircare', 'bath-body', 'makeup', 'electronics', 'fashion', 'home-living', 'offers', 'new-arrivals'];

const sampleOrders = [
  {
    items: [
      { title: 'SPF 50 Sunscreen Body Lotion PA+++', price: 495, quantity: 2, image: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=600', variant: '200ml' },
      { title: 'Niacinamide 10% Face Serum', price: 249, quantity: 1, image: 'https://images.unsplash.com/photo-1620916560428-4262516a3145?w=600', variant: '30ml' }
    ],
    address: { fullName: 'Rahul Kumar', phone: '9876543210', pincode: '110001', addressLine1: '123 Market Street', addressLine2: 'Near City Mall', city: 'New Delhi', state: 'Delhi' },
    paymentMethod: 'cod', subtotal: 1239, shipping: 0, total: 1239,
    paymentStatus: 'paid', orderStatus: 'delivered',
    trackingReceived: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    trackingConfirmed: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    trackingShipped: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    trackingOutForDelivery: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    trackingDelivered: new Date(Date.now() - 12 * 60 * 60 * 1000),
    estimatedDelivery: '3-7 business days'
  },
  {
    items: [
      { title: 'Wireless Earbuds Pro', price: 2499, quantity: 1, image: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=600', variant: 'Black' }
    ],
    address: { fullName: 'Priya Sharma', phone: '9876543211', pincode: '400001', addressLine1: '456 Park Avenue', addressLine2: 'Tower B, Flat 12', city: 'Mumbai', state: 'Maharashtra' },
    paymentMethod: 'upi', subtotal: 2499, shipping: 0, total: 2499,
    paymentStatus: 'verified', orderStatus: 'shipped',
    paymentVerifiedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    upiUtr: 'HDFC1234567890', upiStatus: 'verified', upiVerifiedAt: new Date(Date.now() - 2 * 60 * 60 * 1000), upiAutoVerified: false,
    trackingConfirmed: new Date(Date.now() - 24 * 60 * 60 * 1000),
    trackingShipped: new Date(Date.now() - 12 * 60 * 60 * 1000),
    estimatedDelivery: '3-7 business days'
  },
  {
    items: [
      { title: 'Hair Growth Serum Concentrate', price: 885, quantity: 1, image: 'https://images.unsplash.com/photo-1527799820374-dcf8d9a4e388?w=600', variant: '60ml' },
      { title: 'Anti Dandruff Shampoo 3.5%', price: 265, quantity: 2, image: 'https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?w=600', variant: '200ml' }
    ],
    address: { fullName: 'Amit Singh', phone: '9876543212', pincode: '560001', addressLine1: '789 MG Road', addressLine2: 'Near Tech Park', city: 'Bangalore', state: 'Karnataka' },
    paymentMethod: 'upi', subtotal: 1415, shipping: 0, total: 1415,
    paymentStatus: 'pending_verification', orderStatus: 'pending',
    paymentVerificationAttemptedAt: new Date(Date.now() - 90 * 1000),
    upiUtr: 'ICICI9876543210', upiStatus: 'pending_verification', upiScreenshot: '/uploads/sample-payment.jpg',
    estimatedDelivery: '3-7 business days'
  },
  {
    items: [
      { title: 'Matte Liquid Lipstick Set', price: 699, quantity: 1, image: 'https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=600', variant: 'Set of 6' }
    ],
    address: { fullName: 'Sneha Patel', phone: '9876543213', pincode: '380001', addressLine1: '321 SG Highway', addressLine2: 'Opposite Theater', city: 'Ahmedabad', state: 'Gujarat' },
    paymentMethod: 'cod', subtotal: 699, shipping: 49, total: 748,
    paymentStatus: 'pending', orderStatus: 'confirmed',
    trackingConfirmed: new Date(Date.now() - 2 * 60 * 60 * 1000),
    estimatedDelivery: '3-7 business days'
  }
];

const sampleProducts = [
  { title: 'SPF 50 Sunscreen Body Lotion PA+++', handle: 'spf-50-sunscreen-body-lotion', bodyHtml: '<p>Protects + brightens + moisturises.</p>', vendor: 'SorCare', productCategory: 'Skincare', type: 'Sunscreen', tags: ['sunscreen', 'spf50', 'bestseller'], navPage: 'skincare', badge: 'Best Seller', rating: 4.8, reviewCount: 1004, benefits: ['Sun Protection', 'Brightens Skin'], suitableFor: ['All Skin Types'], variants: [{ sku: 'SC-SPF50-200', price: 495, compareAtPrice: 499, inventoryQty: 150, option1: '200ml' }], images: [{ src: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=600', position: 1, altText: 'SPF 50 Sunscreen' }] },
  { title: 'Niacinamide 10% Face Serum', handle: 'niacinamide-10-face-serum', bodyHtml: '<p>Acne Marks, Acne Prone & Oily Skin.</p>', vendor: 'SorCare', productCategory: 'Skincare', type: 'Serum', tags: ['serum', 'niacinamide', 'bestseller'], navPage: 'skincare', badge: 'Best Seller', rating: 4.7, reviewCount: 756, variants: [{ sku: 'SC-NIA-30', price: 249, compareAtPrice: 599, inventoryQty: 200, option1: '30ml' }], images: [{ src: 'https://images.unsplash.com/photo-1620916560428-4262516a3145?w=600', position: 1, altText: 'Niacinamide Serum' }] },
  { title: 'Vitamin C 10% Face Serum', handle: 'vitamin-c-10-face-serum', bodyHtml: '<p>Dullness, Spots & Loss of Elasticity.</p>', vendor: 'SorCare', productCategory: 'Skincare', type: 'Serum', tags: ['vitamin c', 'brightening'], navPage: 'skincare', badge: 'Trending', rating: 4.6, reviewCount: 520, variants: [{ sku: 'SC-VC-30', price: 299, compareAtPrice: 599, inventoryQty: 180, option1: '30ml' }], images: [{ src: 'https://images.unsplash.com/photo-1608248543801-ba977795e702?w=600', position: 1, altText: 'Vitamin C Serum' }] },
  { title: 'Hair Growth Serum Concentrate', handle: 'hair-growth-serum-concentrate', bodyHtml: '<p>Reduces hairfall + boosts new hair growth.</p>', vendor: 'SorHair', productCategory: 'Haircare', type: 'Serum', tags: ['hair growth', 'hairfall'], navPage: 'haircare', badge: 'Best Seller', rating: 4.9, reviewCount: 1201, variants: [{ sku: 'SH-HG-60', price: 885, compareAtPrice: 999, inventoryQty: 120, option1: '60ml' }], images: [{ src: 'https://images.unsplash.com/photo-1527799820374-dcf8d9a4e388?w=600', position: 1, altText: 'Hair Growth Serum' }] },
  { title: 'Anti Dandruff Shampoo 3.5%', handle: 'anti-dandruff-shampoo', bodyHtml: '<p>Reduces Dandruff with Zinc Pyrithione.</p>', vendor: 'SorHair', productCategory: 'Haircare', type: 'Shampoo', tags: ['dandruff', 'shampoo'], navPage: 'haircare', badge: 'Trending', rating: 4.5, reviewCount: 382, variants: [{ sku: 'SH-AD-200', price: 265, compareAtPrice: 440, inventoryQty: 90, option1: '200ml' }], images: [{ src: 'https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?w=600', position: 1, altText: 'Anti Dandruff Shampoo' }] },
  { title: 'Ceramide Lip Balm SPF 50', handle: 'ceramide-lip-balm-spf50', bodyHtml: '<p>Protects + moisturizes + brightens lips.</p>', vendor: 'SorCare', productCategory: 'Bath & Body', type: 'Lip Balm', tags: ['lip balm', 'spf'], navPage: 'bath-body', badge: 'New Launch', rating: 4.7, reviewCount: 911, variants: [{ sku: 'SC-LB-5', price: 295, compareAtPrice: 299, inventoryQty: 250, option1: '5g' }], images: [{ src: 'https://images.unsplash.com/photo-1596462502278-27bfdd403348?w=600', position: 1, altText: 'Lip Balm SPF 50' }] },
  { title: 'Matte Liquid Lipstick Set', handle: 'matte-liquid-lipstick-set', bodyHtml: '<p>Long-lasting matte finish in 6 shades.</p>', vendor: 'SorBeauty', productCategory: 'Makeup', type: 'Lipstick', tags: ['makeup', 'lipstick'], navPage: 'makeup', badge: 'New Launch', rating: 4.4, reviewCount: 156, variants: [{ sku: 'SB-LS-SET', price: 699, compareAtPrice: 999, inventoryQty: 75, option1: 'Set of 6' }], images: [{ src: 'https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=600', position: 1, altText: 'Lipstick Set' }] },
  { title: 'Wireless Earbuds Pro', handle: 'wireless-earbuds-pro', bodyHtml: '<p>Active noise cancellation.</p>', vendor: 'SaniosTech', productCategory: 'Electronics', type: 'Audio', tags: ['earbuds', 'wireless'], navPage: 'electronics', rating: 4.6, reviewCount: 890, variants: [{ sku: 'ST-WE-PRO', price: 2499, compareAtPrice: 3999, inventoryQty: 60, option1: 'Black' }], images: [{ src: 'https://images.unsplash.com/photo-1590658268023-6bf1215263df?w=600', position: 1, altText: 'Wireless Earbuds' }] },
  { title: 'Cotton Kurta Set', handle: 'cotton-kurta-set', bodyHtml: '<p>Premium cotton kurta with palazzo.</p>', vendor: 'SorFashion', productCategory: 'Fashion', type: 'Clothing', tags: ['kurta', 'ethnic'], navPage: 'fashion', badge: 'Trending', rating: 4.3, reviewCount: 234, variants: [{ sku: 'SF-KS-M', price: 1299, compareAtPrice: 1999, inventoryQty: 45, option1: 'M' }], images: [{ src: 'https://images.unsplash.com/photo-1583496661168-f2e5116a1a8c8?w=800', position: 1, altText: 'Cotton Kurta Set' }] }
];

const sliderImages = [
  'https://images.unsplash.com/photo-1596462502278-27bfdd403348?w=1200',
  'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=1200',
  'https://images.unsplash.com/photo-1527799820374-dcf8d9a4e388?w=1200',
  'https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=1200',
  'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=1200'
];

async function seed() {
  console.log('Seeding database...');
  await prisma.notification.deleteMany();
  await prisma.order.deleteMany();
  await prisma.product.deleteMany();
  await prisma.address.deleteMany();
  await prisma.review.deleteMany();
  await prisma.userWishlist.deleteMany();
  await prisma.userRecentlyViewed.deleteMany();
  await prisma.userPromoUsage.deleteMany();
  await prisma.user.deleteMany();
  await prisma.slider.deleteMany();
  await prisma.offer.deleteMany();
  await prisma.category.deleteMany();
  await prisma.promoCodeProduct.deleteMany();
  await prisma.promoCode.deleteMany();
  await prisma.notificationAction.deleteMany();
  console.log('Cleared existing data');

  const hashedPassword1 = await bcrypt.hash('user123', 12);
  const hashedPassword2 = await bcrypt.hash('admin123', 12);
  const hashedPassword3 = await bcrypt.hash('Sourabh123', 12);

  const u1 = await prisma.user.create({ data: { username: 'user01', email: 'user01@sorbazaar.com', phone: '9876543210', password: hashedPassword1, role: 'user', addresses: [], wishlist: [], recentlyViewed: [], reviews: [], promoUsages: [] } });
  const u2 = await prisma.user.create({ data: { username: 'admin01', email: 'admin01@sorbazaar.com', phone: '9876543211', password: hashedPassword2, role: 'admin', addresses: [], wishlist: [], recentlyViewed: [], reviews: [], promoUsages: [] } });
  const u3 = await prisma.user.create({ data: { username: 'Sourabh01', email: 'sourabh@sorbazaar.com', phone: '9876543212', password: hashedPassword3, role: 'admin', addresses: [], wishlist: [], recentlyViewed: [], reviews: [], promoUsages: [] } });
  console.log('Users seeded');

  for (const p of sampleProducts) {
    await prisma.product.create({
      data: {
        title: p.title, handle: p.handle, bodyHtml: p.bodyHtml, vendor: p.vendor,
        productCategory: p.productCategory, type: p.type, tags: p.tags, published: true,
        option1Name: 'Size', status: 'active', platform: 'manual', navPage: p.navPage,
        rating: p.rating, reviewCount: p.reviewCount, benefits: p.benefits || [], suitableFor: p.suitableFor || [],
        variants: p.variants, images: p.images, videos: [], giftCard: false,
        seoTitle: p.title, seoDescription: '', badge: p.badge, updatedAt: new Date(),
        reviews: [], faqs: [], whatsInbox: {}
      }
    });
  }
  console.log('Products seeded');

  const sliders = [];
  NAV_PAGES.forEach((page, pi) => {
    for (let i = 0; i < 5; i++) {
      sliders.push({
        title: `${page.charAt(0).toUpperCase() + page.slice(1).replace('-', ' ')} Collection ${i + 1}`,
        subtitle: 'Shop the latest trends with free shipping',
        link: `/category/${page}`, buttonText: 'Shop Now',
        image: sliderImages[i % sliderImages.length], navPage: page, position: i, active: true
      });
    }
  });
  await prisma.slider.createMany({ data: sliders });
  console.log('Sliders seeded');

  const dbUsers = [u1, u2, u3];
  for (let index = 0; index < sampleOrders.length; index++) {
    const order = sampleOrders[index];
    const user = dbUsers[index % dbUsers.length];
    await prisma.order.create({
      data: {
        userId: user.id, items: order.items,
        addressFullName: order.address.fullName, addressPhone: order.address.phone,
        addressPincode: order.address.pincode, addressLine1: order.address.addressLine1,
        addressLine2: order.address.addressLine2, addressCity: order.address.city,
        addressState: order.address.state, subtotal: order.subtotal, shipping: order.shipping,
        total: order.total, paymentMethod: order.paymentMethod, paymentStatus: order.paymentStatus,
        orderStatus: order.orderStatus, upiUtr: order.upiUtr, upiStatus: order.upiStatus,
        estimatedDelivery: order.estimatedDelivery, createdAt: new Date(Date.now() - index * 24 * 60 * 60 * 1000),
      }
    });
  }
  console.log('Orders seeded');

  await prisma.offer.createMany({
    data: [
      { title: '5% Extra off on Prepaid Orders', type: 'offer', navPage: 'home', position: 0, active: true },
      { title: 'Free Shipping Above ₹299', type: 'offer', navPage: 'home', position: 1, active: true },
      { title: 'Buy 2 Products for ₹699', type: 'promo', navPage: 'offers', position: 0, active: true },
      { title: 'Summer Sale - Up to 40% Off', type: 'banner', navPage: 'home', image: 'https://images.unsplash.com/photo-1607082348824-0a96b2a4b9da?w=1200', position: 0, active: true },
      { title: 'New Arrivals Banner', type: 'banner', navPage: 'new-arrivals', image: 'https://images.unsplash.com/photo-1441986300917-646bd600d8?w=1200', position: 0, active: true }
    ]
  });
  console.log('Offers seeded');

  console.log('Seed complete!');
  process.exit(0);
}

(async () => {
  try {
    await connectDB();
    await seed();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();