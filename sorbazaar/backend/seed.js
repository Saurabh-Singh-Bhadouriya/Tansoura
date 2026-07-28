require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const mongoose = require('mongoose');
const User = require('./models/User');
const Product = require('./models/Product');
const Order = require('./models/Order');
const Slider = require('./models/Slider');
const Offer = require('./models/Offer');

const NAV_PAGES = ['home', 'skincare', 'haircare', 'bath-body', 'makeup', 'electronics', 'fashion', 'home-living', 'offers', 'new-arrivals'];

const sampleOrders = [
  {
    user: null, // Will be set after user creation
    items: [
      { product: null, title: 'SPF 50 Sunscreen Body Lotion PA+++', price: 495, quantity: 2, image: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=600', variant: '200ml' },
      { product: null, title: 'Niacinamide 10% Face Serum', price: 249, quantity: 1, image: 'https://images.unsplash.com/photo-1620916560428-4262516a3145?w=600', variant: '30ml' }
    ],
    address: { fullName: 'Rahul Kumar', phone: '9876543210', pincode: '110001', addressLine1: '123 Market Street', addressLine2: 'Near City Mall', city: 'New Delhi', state: 'Delhi' },
    paymentMethod: 'cod',
    subtotal: 1239,
    shipping: 0,
    total: 1239,
    paymentStatus: 'paid',
    orderStatus: 'delivered',
    tracking: {
      confirmed: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      shipped: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      outForDelivery: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      delivered: new Date(Date.now() - 12 * 60 * 60 * 1000)
    },
    estimatedDelivery: '3-7 business days'
  },
  {
    user: null,
    items: [
      { product: null, title: 'Wireless Earbuds Pro', price: 2499, quantity: 1, image: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=600', variant: 'Black' }
    ],
    address: { fullName: 'Priya Sharma', phone: '9876543211', pincode: '400001', addressLine1: '456 Park Avenue', addressLine2: 'Tower B, Flat 12', city: 'Mumbai', state: 'Maharashtra' },
    paymentMethod: 'upi',
    subtotal: 2499,
    shipping: 0,
    total: 2499,
    paymentStatus: 'verified',
    orderStatus: 'shipped',
    paymentVerifiedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    upiPayment: {
      utr: 'HDFC1234567890',
      status: 'verified',
      verifiedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      autoVerified: false
    },
    tracking: {
      confirmed: new Date(Date.now() - 24 * 60 * 60 * 1000),
      shipped: new Date(Date.now() - 12 * 60 * 60 * 1000)
    },
    estimatedDelivery: '3-7 business days'
  },
  {
    user: null,
    items: [
      { product: null, title: 'Hair Growth Serum Concentrate', price: 885, quantity: 1, image: 'https://images.unsplash.com/photo-1527799820374-dcf8d9a4e388?w=600', variant: '60ml' },
      { product: null, title: 'Anti Dandruff Shampoo 3.5%', price: 265, quantity: 2, image: 'https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?w=600', variant: '200ml' }
    ],
    address: { fullName: 'Amit Singh', phone: '9876543212', pincode: '560001', addressLine1: '789 MG Road', addressLine2: 'Near Tech Park', city: 'Bangalore', state: 'Karnataka' },
    paymentMethod: 'upi',
    subtotal: 1415,
    shipping: 0,
    total: 1415,
    paymentStatus: 'pending_verification',
    orderStatus: 'pending',
    paymentVerificationAttemptedAt: new Date(Date.now() - 90 * 1000), // 90 seconds ago
    upiPayment: {
      utr: 'ICICI9876543210',
      status: 'pending_verification',
      screenshot: '/uploads/sample-payment.jpg'
    },
    tracking: {},
    estimatedDelivery: '3-7 business days'
  },
  {
    user: null,
    items: [
      { product: null, title: 'Matte Liquid Lipstick Set', price: 699, quantity: 1, image: 'https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=600', variant: 'Set of 6' }
    ],
    address: { fullName: 'Sneha Patel', phone: '9876543213', pincode: '380001', addressLine1: '321 SG Highway', addressLine2: 'Opposite Theater', city: 'Ahmedabad', state: 'Gujarat' },
    paymentMethod: 'cod',
    subtotal: 699,
    shipping: 49,
    total: 748,
    paymentStatus: 'pending',
    orderStatus: 'confirmed',
    tracking: {
      confirmed: new Date(Date.now() - 2 * 60 * 60 * 1000)
    },
    estimatedDelivery: '3-7 business days'
  }
];

const sampleProducts = [
  {
    title: 'SPF 50 Sunscreen Body Lotion PA+++',
    handle: 'spf-50-sunscreen-body-lotion',
    bodyHtml: '<p>Protects + brightens + moisturises. Light weight-less texture with no white cast.</p>',
    vendor: 'SorCare', productCategory: 'Skincare', type: 'Sunscreen', tags: ['sunscreen', 'spf50', 'bestseller'],
    navPage: 'skincare', badge: 'Best Seller', rating: 4.8, reviewCount: 1004,
    benefits: ['Sun Protection', 'Brightens Skin', 'Moisturises'], suitableFor: ['All Skin Types', 'Daily Use'],
    ingredients: 'Aqua, Niacinamide, Zinc Oxide, Titanium Dioxide, Glycerine, Ceramides...',
    howToUse: 'Apply generously on face and body 15 minutes before sun exposure.',
    faqs: [{ question: 'Does it work for oily skin?', answer: 'Yes, it has oil-balancing formula.' }],
    variants: [{ sku: 'SC-SPF50-200', price: 495, compareAtPrice: 499, inventoryQty: 150, option1: '200ml' }],
    images: [{ src: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=600', position: 1, altText: 'SPF 50 Sunscreen' }]
  },
  {
    title: 'Niacinamide 10% Face Serum',
    handle: 'niacinamide-10-face-serum',
    bodyHtml: '<p>Acne Marks, Acne Prone & Oily Skin. Reduces pores and controls oil.</p>',
    vendor: 'SorCare', productCategory: 'Skincare', type: 'Serum', tags: ['serum', 'niacinamide', 'bestseller'],
    navPage: 'skincare', badge: 'Best Seller', rating: 4.7, reviewCount: 756,
    benefits: ['Reduces Acne Marks', 'Controls Oil', 'Minimizes Pores'],
    suitableFor: ['Oily Skin', 'Acne Prone Skin'],
    variants: [{ sku: 'SC-NIA-30', price: 249, compareAtPrice: 599, inventoryQty: 200, option1: '30ml' }, { sku: 'SC-NIA-60', price: 449, compareAtPrice: 899, inventoryQty: 100, option1: '60ml' }],
    images: [{ src: 'https://images.unsplash.com/photo-1620916560428-4262516a3145?w=600', position: 1, altText: 'Niacinamide Serum' }]
  },
  {
    title: 'Vitamin C 10% Face Serum',
    handle: 'vitamin-c-10-face-serum',
    bodyHtml: '<p>Dullness, Spots & Loss of Elasticity. Brightens and evens skin tone.</p>',
    vendor: 'SorCare', productCategory: 'Skincare', type: 'Serum', tags: ['vitamin c', 'brightening'],
    navPage: 'skincare', badge: 'Trending', rating: 4.6, reviewCount: 520,
    variants: [{ sku: 'SC-VC-30', price: 299, compareAtPrice: 599, inventoryQty: 180, option1: '30ml' }],
    images: [{ src: 'https://images.unsplash.com/photo-1608248543801-ba977795e702?w=600', position: 1, altText: 'Vitamin C Serum' }]
  },
  {
    title: 'Hair Growth Serum Concentrate',
    handle: 'hair-growth-serum-concentrate',
    bodyHtml: '<p>Reduces hairfall + boosts new hair growth with peptides and biotin.</p>',
    vendor: 'SorHair', productCategory: 'Haircare', type: 'Serum', tags: ['hair growth', 'hairfall'],
    navPage: 'haircare', badge: 'Best Seller', rating: 4.9, reviewCount: 1201,
    variants: [{ sku: 'SH-HG-60', price: 885, compareAtPrice: 999, inventoryQty: 120, option1: '60ml' }],
    images: [{ src: 'https://images.unsplash.com/photo-1527799820374-dcf8d9a4e388?w=600', position: 1, altText: 'Hair Growth Serum' }]
  },
  {
    title: 'Anti Dandruff Shampoo 3.5%',
    handle: 'anti-dandruff-shampoo',
    bodyHtml: '<p>Reduces Dandruff, Itchiness, Scalp Impurities with Zinc Pyrithione.</p>',
    vendor: 'SorHair', productCategory: 'Haircare', type: 'Shampoo', tags: ['dandruff', 'shampoo'],
    navPage: 'haircare', badge: 'Trending', rating: 4.5, reviewCount: 382,
    variants: [{ sku: 'SH-AD-200', price: 265, compareAtPrice: 440, inventoryQty: 90, option1: '200ml' }],
    images: [{ src: 'https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?w=600', position: 1, altText: 'Anti Dandruff Shampoo' }]
  },
  {
    title: 'Ceramide Lip Balm SPF 50',
    handle: 'ceramide-lip-balm-spf50',
    bodyHtml: '<p>Protects + moisturizes + brightens lips with SPF 50 PA++++.</p>',
    vendor: 'SorCare', productCategory: 'Bath & Body', type: 'Lip Balm', tags: ['lip balm', 'spf'],
    navPage: 'bath-body', badge: 'New Launch', rating: 4.7, reviewCount: 911,
    variants: [{ sku: 'SC-LB-5', price: 295, compareAtPrice: 299, inventoryQty: 250, option1: '5g' }],
    images: [{ src: 'https://images.unsplash.com/photo-1596462502278-27bfdd403348?w=600', position: 1, altText: 'Lip Balm SPF 50' }]
  },
  {
    title: 'Matte Liquid Lipstick Set',
    handle: 'matte-liquid-lipstick-set',
    bodyHtml: '<p>Long-lasting matte finish in 6 stunning shades.</p>',
    vendor: 'SorBeauty', productCategory: 'Makeup', type: 'Lipstick', tags: ['makeup', 'lipstick'],
    navPage: 'makeup', badge: 'New Launch', rating: 4.4, reviewCount: 156,
    variants: [{ sku: 'SB-LS-SET', price: 699, compareAtPrice: 999, inventoryQty: 75, option1: 'Set of 6' }],
    images: [{ src: 'https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=600', position: 1, altText: 'Lipstick Set' }]
  },
  {
    title: 'Wireless Earbuds Pro',
    handle: 'wireless-earbuds-pro',
    bodyHtml: '<p>Active noise cancellation, 30hr battery, IPX5 water resistant.</p>',
    vendor: 'SorTech', productCategory: 'Electronics', type: 'Audio', tags: ['earbuds', 'wireless'],
    navPage: 'electronics', rating: 4.6, reviewCount: 890,
    variants: [{ sku: 'ST-WE-PRO', price: 2499, compareAtPrice: 3999, inventoryQty: 60, option1: 'Black' }],
    images: [{ src: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=600', position: 1, altText: 'Wireless Earbuds' }]
  },
  {
    title: 'Cotton Kurta Set',
    handle: 'cotton-kurta-set',
    bodyHtml: '<p>Premium cotton kurta with matching palazzo. Perfect for everyday wear.</p>',
    vendor: 'SorFashion', productCategory: 'Fashion', type: 'Clothing', tags: ['kurta', 'ethnic'],
    navPage: 'fashion', badge: 'Trending', rating: 4.3, reviewCount: 234,
    variants: [{ sku: 'SF-KS-M', price: 1299, compareAtPrice: 1999, inventoryQty: 45, option1: 'M' }],
    images: [{ src: 'https://images.unsplash.com/photo-1583496661168-f2e5d1a8d8c0?w=600', position: 1, altText: 'Cotton Kurta Set' }]
  },
  {
    title: 'Scented Candle Collection',
    handle: 'scented-candle-collection',
    bodyHtml: '<p>Hand-poured soy wax candles in lavender, vanilla & sandalwood.</p>',
    vendor: 'SorHome', productCategory: 'Home & Living', type: 'Decor', tags: ['candles', 'home decor'],
    navPage: 'home-living', rating: 4.5, reviewCount: 178,
    variants: [{ sku: 'SH-CD-3', price: 599, compareAtPrice: 899, inventoryQty: 80, option1: 'Set of 3' }],
    images: [{ src: 'https://images.unsplash.com/photo-1602607624243-7584a4a8a0a0?w=600', position: 1, altText: 'Scented Candles' }]
  },
  {
    title: 'Gentle Facial Cleanser',
    handle: 'gentle-facial-cleanser',
    bodyHtml: '<p>Daily gentle cleanser that removes makeup and impurities without stripping skin.</p>',
    vendor: 'SorCare', productCategory: 'Skincare', type: 'Cleanser', tags: ['cleanser', 'facial', 'bestseller'],
    navPage: 'skincare', badge: 'Best Seller', rating: 4.8, reviewCount: 892,
    benefits: ['Removes Impurities', 'Maintains Skin Barrier', 'Suitable for Daily Use'],
    suitableFor: ['All Skin Types'],
    ingredients: 'Aqua, Glycerin, Aloe Vera, Chamomile Extract, Hyaluronic Acid...',
    howToUse: 'Massage onto damp skin, rinse thoroughly with lukewarm water.',
    faqs: [{ question: 'Can I use it with other products?', answer: 'Yes, works well with all skincare products.' }],
    variants: [{ sku: 'SC-GFC-150', price: 349, compareAtPrice: 399, inventoryQty: 180, option1: '150ml' }],
    images: [{ src: 'https://images.unsplash.com/photo-1571840635301-2b0ba211dcd5?w=600', position: 1, altText: 'Facial Cleanser' }]
  },
  {
    title: 'Retinol Night Cream',
    handle: 'retinol-night-cream',
    bodyHtml: '<p>Anti-aging night cream with Retinol to reduce wrinkles and fine lines.</p>',
    vendor: 'SorCare', productCategory: 'Skincare', type: 'Cream', tags: ['retinol', 'night cream', 'anti-aging'],
    navPage: 'skincare', badge: 'New Launch', rating: 4.6, reviewCount: 420,
    benefits: ['Reduces Wrinkles', 'Improves Skin Texture', 'Boosts Collagen'],
    suitableFor: ['Mature Skin', 'Dull Skin'],
    ingredients: 'Retinol, Hyaluronic Acid, Peptides, Niacinamide, Squalane...',
    howToUse: 'Apply a pea-sized amount to face before bed. Use nightly.',
    faqs: [{ question: 'When will I see results?', answer: 'Visible improvements in 4-6 weeks.' }],
    variants: [{ sku: 'SC-RNC-50', price: 799, compareAtPrice: 999, inventoryQty: 100, option1: '50ml' }],
    images: [{ src: 'https://images.unsplash.com/photo-1629839246608-c6c0e0c7b6a3?w=600', position: 1, altText: 'Retinol Night Cream' }]
  },
  {
    title: 'Rose Glow Face Mist',
    handle: 'rose-glow-face-mist',
    bodyHtml: '<p>Hydrating facial mist with Rose Water and Vitamin C for instant glow.</p>',
    vendor: 'SorCare', productCategory: 'Skincare', type: 'Mist', tags: ['face mist', 'rose water', 'vitamin c'],
    navPage: 'skincare', rating: 4.5, reviewCount: 356,
    benefits: ['Instant Hydration', 'Brightens Skin', 'Sets Makeup'],
    suitableFor: ['All Skin Types'],
    ingredients: 'Rose Water, Vitamin C, Glycerin, Aloe Vera...',
    howToUse: 'Spray evenly on face at any time for refreshment.',
    faqs: [{ question: 'Can I use it over makeup?', answer: 'Yes, perfect for setting makeup.' }],
    variants: [{ sku: 'SC-RGM-100', price: 299, compareAtPrice: 399, inventoryQty: 150, option1: '100ml' }],
    images: [{ src: 'https://images.unsplash.com/photo-1514866958115-3f937f8f8b8c?w=600', position: 1, altText: 'Rose Glow Face Mist' }]
  },
  {
    title: 'Collagen Boosting Eye Cream',
    handle: 'collagen-eye-cream',
    bodyHtml: '<p>Reduces dark circles and puffiness with Peptide Complex and Caffeine.</p>',
    vendor: 'SorCare', productCategory: 'Skincare', type: 'Eye Cream', tags: ['eye cream', 'collagen', 'dark circles'],
    navPage: 'skincare', badge: 'Trending', rating: 4.4, reviewCount: 289,
    benefits: ['Reduces Dark Circles', 'Minimizes Puffiness', 'Fades Fine Lines'],
    suitableFor: ['All Skin Types'],
    ingredients: 'Peptide Complex, Caffeine, Hyaluronic Acid, Vitamin E...',
    howToUse: 'Apply small amount gently around eye area morning and night.',
    faqs: [{ question: 'Is it suitable for sensitive skin?', answer: 'Yes, gentle formula for sensitive eyes.' }],
    variants: [{ sku: 'SC-CEC-30', price: 549, compareAtPrice: 699, inventoryQty: 120, option1: '30ml' }],
    images: [{ src: 'https://images.unsplash.com/photo-1582946888570-8e09a5e1a3c7?w=600', position: 1, altText: 'Collagen Eye Cream' }]
  },
  {
    title: 'Aloe Vera Gel Moisturizer',
    handle: 'aloe-vera-gel-moisturizer',
    bodyHtml: '<p>Lightweight gel moisturizer with 99% Pure Aloe Vera for intense hydration.</p>',
    vendor: 'SorCare', productCategory: 'Skincare', type: 'Moisturizer', tags: ['aloe vera', 'gel moisturizer', 'hydrating'],
    navPage: 'skincare', rating: 4.7, reviewCount: 634,
    benefits: ['Intense Hydration', 'Soothing', 'Oil-Free'],
    suitableFor: ['Oily Skin', 'Acne Prone', 'Combination'],
    ingredients: 'Aloe Vera Leaf Juice, Glycerin, Panthenol, Hyaluronic Acid...',
    howToUse: 'Apply to clean face and neck. Can be used as primer under makeup.',
    faqs: [{ question: 'Will it clog pores?', answer: 'No, non-comedogenic formula.' }],
    variants: [{ sku: 'SC-AVG-100', price: 399, compareAtPrice: 499, inventoryQty: 200, option1: '100ml' }],
    images: [{ src: 'https://images.unsplash.com/photo-1567169011195-70164848cb5a?w=600', position: 1, altText: 'Aloe Vera Gel Moisturizer' }]
  },
  {
    title: 'Charcoal Detox Mask',
    handle: 'charcoal-detox-mask',
    bodyHtml: '<p>Detoxifying charcoal mask that deep cleans pores and removes toxins.</p>',
    vendor: 'SorCare', productCategory: 'Skincare', type: 'Mask', tags: ['charcoal', 'detox', 'pore cleansing'],
    navPage: 'skincare', badge: 'Best Seller', rating: 4.6, reviewCount: 445,
    benefits: ['Deep Cleansing', 'Removes Toxins', 'Reduces Oil'],
    suitableFor: ['Oily Skin', 'Combination Skin'],
    ingredients: 'Activated Charcoal, Bentonite Clay, Tea Tree Oil, Witch Hazel...',
    howToUse: 'Apply 2-3 times a week. Leave for 10-15 minutes and rinse.',
    faqs: [{ question: 'Is it drying?', answer: 'Follow with moisturizer for balanced hydration.' }],
    variants: [{ sku: 'SC-CDM-75', price: 249, compareAtPrice: 299, inventoryQty: 160, option1: '75ml' }],
    images: [{ src: 'https://images.unsplash.com/photo-1607082349545-dc9a70f6f5c2?w=600', position: 1, altText: 'Charcoal Detox Mask' }]
  },
  {
    title: 'Hydrating Hyaluronic Serum',
    handle: 'hydrating-hyaluronic-serum',
    bodyHtml: '<p>Multi-molecular hyaluronic acid serum for 72-hour hydration.</p>',
    vendor: 'SorCare', productCategory: 'Skincare', type: 'Serum', tags: ['hyaluronic acid', 'hydrating', 'serum'],
    navPage: 'skincare', rating: 4.8, reviewCount: 921,
    benefits: ['72-Hour Hydration', 'Plumps Skin', 'Reduces Fine Lines'],
    suitableFor: ['All Skin Types', 'Dry Skin'],
    ingredients: 'Hyaluronic Acid, Glycerin, Ceramides, Vitamin B5...',
    howToUse: 'Apply 2-3 drops on face before moisturizer.',
    faqs: [{ question: 'Can I use it with Vitamin C?', answer: 'Yes, layer hyaluronic acid after Vitamin C.' }],
    variants: [{ sku: 'SC-HHS-30', price: 499, compareAtPrice: 599, inventoryQty: 140, option1: '30ml' }],
    images: [{ src: 'https://images.unsplash.com/photo-1611082358817-21b9da71e8e1?w=600', position: 1, altText: 'Hyaluronic Serum' }]
  },
  {
    title: 'Salicylic Acid Spot Treatment',
    handle: 'salicylic-acid-spot-treatment',
    bodyHtml: '<p>Targeted treatment for acne, blackheads and blemishes.</p>',
    vendor: 'SorCare', productCategory: 'Skincare', type: 'Treatment', tags: ['salicylic acid', 'acne', 'spot treatment'],
    navPage: 'skincare', badge: 'New Launch', rating: 4.5, reviewCount: 312,
    benefits: ['Reduces Acne', 'Prevents Breakouts', 'Heals Blemishes'],
    suitableFor: ['Acne Prone', 'Oily Skin'],
    ingredients: 'Salicylic Acid 2%, Tea Tree Oil, Witch Hazel, Zinc PCA...',
    howToUse: 'Apply directly on affected area 1-2 times daily.',
    faqs: [{ question: 'How long to see results?', answer: 'Noticeable reduction in 3-5 days.' }],
    variants: [{ sku: 'SC-SAT-15', price: 199, compareAtPrice: 249, inventoryQty: 180, option1: '15ml' }],
    images: [{ src: 'https://images.unsplash.com/photo-1607082348836-bb6dd8d1f7a8?w=600', position: 1, altText: 'Spot Treatment' }]
  },
  {
    title: 'Vitamin C Glow Serum',
    handle: 'vitamin-c-glow-serum',
    bodyHtml: '<p>Brightening serum with 15% Vitamin C for radiant skin.</p>',
    vendor: 'SorCare', productCategory: 'Skincare', type: 'Serum', tags: ['vitamin c', 'brightening', 'antioxidant'],
    navPage: 'skincare', badge: 'Best Seller', rating: 4.7, reviewCount: 765,
    benefits: ['Brightens Skin', 'Even Skin Tone', 'Antioxidant Protection'],
    suitableFor: ['Dull Skin', 'Sun-Damaged Skin'],
    ingredients: 'Vitamin C 15%, Ferulic Acid, Vitamin E, Hyaluronic Acid...',
    howToUse: 'Apply daily on clean skin before moisturizer.',
    faqs: [{ question: 'Can I use it with retinol?', answer: 'Use Vitamin C in morning, retinol at night.' }],
    variants: [{ sku: 'SC-VCS-30', price: 599, compareAtPrice: 799, inventoryQty: 130, option1: '30ml' }],
    images: [{ src: 'https://images.unsplash.com/photo-1611929439037-71c9b1d1e42c?w=600', position: 1, altText: 'Vitamin C Serum' }]
  },
  {
    title: 'Night Repair Sleeping Mask',
    handle: 'night-repair-sleeping-mask',
    bodyHtml: '<p>Overnight sleeping mask that repairs skin while you rest.</p>',
    vendor: 'SorCare', productCategory: 'Skincare', type: 'Mask', tags: ['sleeping mask', 'night repair', 'overnight'],
    navPage: 'skincare', badge: 'Trending', rating: 4.6, reviewCount: 298,
    benefits: ['Overnight Repair', 'Deep Hydration', 'Wake-Up Glow'],
    suitableFor: ['All Skin Types', 'Dry Skin'],
    ingredients: 'Squalane, Peptides, Ceramides, Niacinamide, Hyaluronic Acid...',
    howToUse: 'Apply before bed. Rinse off in the morning.',
    faqs: [{ question: 'Do I need to rinse it off?', answer: 'Yes, rinse in the morning for best results.' }],
    variants: [{ sku: 'SC-NRM-80', price: 449, compareAtPrice: 549, inventoryQty: 110, option1: '80ml' }],
    images: [{ src: 'https://images.unsplash.com/photo-1607082349546-8c5a5e880a7c?w=600', position: 1, altText: 'Sleeping Mask' }]
  }
];

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI, { family: 4 });
  console.log('Connected to MongoDB');

  await User.deleteMany({});
  await Product.deleteMany({});
  await Order.deleteMany({});
  await Slider.deleteMany({});
  await Offer.deleteMany({});

  await User.create([
    { username: 'user01', email: 'user01@sorbazaar.com', phone: '9876543210', password: 'user123', role: 'user' },
    { username: 'admin01', email: 'admin01@sorbazaar.com', phone: '9876543211', password: 'admin123', role: 'admin' },
    { username: 'Sourabh01', email: 'sourabh@sorbazaar.com', phone: '9876543212', password: 'Sourabh123', role: 'admin' }
  ]);
  console.log('Users seeded');

  await Product.insertMany(sampleProducts);
  console.log('Products seeded');

  const sliderImages = [
    'https://images.unsplash.com/photo-1596462502278-27bfdd403348?w=1200',
    'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=1200',
    'https://images.unsplash.com/photo-1527799820374-dcf8d9a4e388?w=1200',
    'https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=1200',
    'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=1200'
  ];

  const sliders = [];
  NAV_PAGES.forEach((page, pi) => {
    for (let i = 0; i < 5; i++) {
      sliders.push({
        title: `${page.charAt(0).toUpperCase() + page.slice(1).replace('-', ' ')} Collection ${i + 1}`,
        subtitle: 'Shop the latest trends with free shipping',
        link: `/category/${page}`,
        buttonText: 'Shop Now',
        image: sliderImages[i % sliderImages.length],
        navPage: page,
        position: i,
        active: true
      });
    }
  });
  await Slider.insertMany(sliders);
  console.log('Sliders seeded');

  // Create orders after users are created
  const users = await User.find({});
  const orders = sampleOrders.map((order, index) => ({
    ...order,
    user: users[index % users.length]._id,
    createdAt: new Date(Date.now() - index * 24 * 60 * 60 * 1000) // Spread over last few days
  }));
  await Order.insertMany(orders);
  console.log('Orders seeded');

  await Offer.insertMany([
    { title: '5% Extra off on Prepaid Orders', type: 'offer', navPage: 'home', position: 0, active: true },
    { title: 'Free Shipping Above ₹299', type: 'offer', navPage: 'home', position: 1, active: true },
    { title: 'Buy 2 Products for ₹699', type: 'promo', navPage: 'offers', position: 0, active: true },
    { title: 'Summer Sale - Up to 40% Off', type: 'banner', navPage: 'home', image: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1200', position: 0, active: true },
    { title: 'New Arrivals Banner', type: 'banner', navPage: 'new-arrivals', image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200', position: 0, active: true }
  ]);
  console.log('Offers seeded');

  console.log('Seed complete!');
  process.exit(0);
}

seed().catch(err => { console.error(err); process.exit(1); });
