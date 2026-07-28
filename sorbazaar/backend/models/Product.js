const mongoose = require('mongoose');

const variantSchema = new mongoose.Schema({
  sku: String,
  grams: Number,
  inventoryTracker: String,
  inventoryQty: { type: Number, default: 0 },
  inventoryPolicy: String,
  fulfillmentService: String,
  price: { type: Number, required: true },
  compareAtPrice: Number,
  requiresShipping: { type: Boolean, default: true },
  taxable: { type: Boolean, default: true },
  barcode: String,
  weightUnit: String,
  taxCode: String,
  costPerItem: Number,
  option1: String,
  option2: String,
  option3: String,
  image: String
});

const amazonMetaSchema = new mongoose.Schema({
  asin: String,
  url: String,
  currency: { type: String, default: 'INR' },
  original_price: Number,
  has_prime_shipping: { type: Boolean, default: false },
  has_deal: { type: Boolean, default: false },
  deal_text: String,
  is_sponsored: { type: Boolean, default: false },
  options_count: { type: Number, default: 1 },
  source_url: String,
  extracted_at: Date
});

const productSchema = new mongoose.Schema({
  handle: { type: String, unique: true, sparse: true },
  title: { type: String, required: true },
  bodyHtml: String,
  vendor: String,
  productCategory: String,
  type: String,
  tags: [String],
  published: { type: Boolean, default: true },
  option1Name: String,
  option2Name: String,
  option3Name: String,
  variants: [variantSchema],
  images: [{ src: String, position: Number, altText: String }],
  videos: [String],
  giftCard: { type: Boolean, default: false },
  seoTitle: String,
  seoDescription: String,
  status: { type: String, enum: ['active', 'draft', 'archived'], default: 'active' },
  platform: { type: String, enum: ['manual', 'amazon', 'flipkart', 'aliexpress', 'shopify', 'wix', 'wordpress', 'meesho'], default: 'manual' },
  navPage: { type: String, default: 'home' },
  rating: { type: Number, default: 4.5 },
  reviewCount: { type: Number, default: 0 },
  benefits: [String],
  suitableFor: [String],
  ingredients: String,
  howToUse: String,
  faqs: [{ question: String, answer: String }],
  specifications: String,
  badge: String,
  amazonMeta: amazonMetaSchema,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

productSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  if (!this.handle && this.title) {
    this.handle = this.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }
  next();
});

// Indexes for faster queries
productSchema.index({ navPage: 1, published: 1, status: 1, createdAt: -1 });
productSchema.index({ productCategory: 1, published: 1, status: 1 });
productSchema.index({ published: 1, status: 1, createdAt: -1 });
productSchema.index({ handle: 1 });
productSchema.index({ badge: 1, published: 1, status: 1 });
productSchema.index({ featured: 1, published: 1, status: 1 });
productSchema.index({ isFeatured: 1, published: 1, status: 1 });
productSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Product', productSchema);
