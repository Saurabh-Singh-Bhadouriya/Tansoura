const fs = require('fs');
const csv = require('csv-parser');
const Product = require('../models/Product');

const PLATFORM_FIELDS = {
  shopify: {
    handle: 'Handle',
    title: 'Title',
    bodyHtml: 'Body (HTML)',
    vendor: 'Vendor',
    productCategory: 'Product Category',
    type: 'Type',
    tags: 'Tags',
    published: 'Published',
    option1Name: 'Option1 Name',
    option2Name: 'Option2 Name',
    option3Name: 'Option3 Name',
    sku: 'Variant SKU',
    grams: 'Variant Grams',
    inventoryTracker: 'Variant Inventory Tracker',
    inventoryQty: 'Variant Inventory Qty',
    inventoryPolicy: 'Variant Inventory Policy',
    fulfillmentService: 'Variant Fulfillment Service',
    price: 'Variant Price',
    compareAtPrice: 'Variant Compare At Price',
    requiresShipping: 'Variant Requires Shipping',
    taxable: 'Variant Taxable',
    barcode: 'Variant Barcode',
    imageSrc: 'Image Src',
    imagePosition: 'Image Position',
    imageAltText: 'Image Alt Text',
    giftCard: 'Gift Card',
    seoTitle: 'SEO Title',
    seoDescription: 'SEO Description',
    variantImage: 'Variant Image',
    weightUnit: 'Variant Weight Unit',
    taxCode: 'Variant Tax Code',
    costPerItem: 'Cost per item',
    priceInternational: 'Price / International',
    compareAtPriceInternational: 'Compare At Price / International',
    status: 'Status',
    option1: 'Option1 Value',
    option2: 'Option2 Value',
    option3: 'Option3 Value'
  },
  // Amazon CSV columns must EXACTLY match: id,asin,brand,title,url,currency,price,original_price,rating,review_count,has_prime_shipping,has_deal,deal_text,is_sponsored,options_count,img_url,position,source_url,extracted_at
  amazon: {
    id: 'id', asin: 'asin', vendor: 'brand', title: 'title',
    url: 'url', currency: 'currency', price: 'price',
    compareAtPrice: 'original_price', rating: 'rating', reviewCount: 'review_count',
    has_prime_shipping: 'has_prime_shipping', has_deal: 'has_deal',
    deal_text: 'deal_text', is_sponsored: 'is_sponsored',
    options_count: 'options_count', imageSrc: 'img_url',
    position: 'position', source_url: 'source_url', extracted_at: 'extracted_at',
    sku: 'asin',
    // note: 'id' maps to amazonMeta.asin via the asin field above
  },
  flipkart: {
    title: 'Product Title', bodyHtml: 'Description', vendor: 'Brand',
    productCategory: 'Category', type: 'Product Type', sku: 'SKU ID',
    price: 'MRP', compareAtPrice: 'Selling Price', inventoryQty: 'Stock',
    imageSrc: 'Primary Image URL', option1: 'Size', option2: 'Color', status: 'Listing Status'
  },
  aliexpress: {
    title: 'Product Name', bodyHtml: 'Description', vendor: 'Brand Name',
    productCategory: 'Category', price: 'Price', compareAtPrice: 'Original Price',
    inventoryQty: 'Stock', imageSrc: 'Image URL', sku: 'SKU', status: 'Status'
  },
  wix: {
    title: 'name', bodyHtml: 'description', vendor: 'brand', productCategory: 'collection',
    price: 'price', compareAtPrice: 'comparePrice', inventoryQty: 'inventory',
    imageSrc: 'media', sku: 'sku', status: 'visible'
  },
  wordpress: {
    title: 'Name', bodyHtml: 'Description', type: 'Type', tags: 'Tags',
    price: 'Regular price', compareAtPrice: 'Sale price', inventoryQty: 'Stock',
    imageSrc: 'Images', sku: 'SKU', status: 'Published', productCategory: 'Categories'
  },
  meesho: {
    title: 'Product Name', bodyHtml: 'Description', vendor: 'Brand',
    productCategory: 'Category', price: 'Selling Price', compareAtPrice: 'MRP',
    inventoryQty: 'Inventory', imageSrc: 'Image Link', sku: 'Product Code', status: 'Status'
  }
};

// Exact Shopify columns in order as specified
const SHOPIFY_COLUMNS = [
  'Handle', 'Title', 'Body (HTML)', 'Vendor', 'Product Category', 'Type', 'Tags',
  'Published', 'Option1 Name', 'Option1 Value', 'Option2 Name', 'Option2 Value',
  'Option3 Name', 'Option3 Value', 'Variant SKU', 'Variant Grams',
  'Variant Inventory Tracker', 'Variant Inventory Qty', 'Variant Inventory Policy',
  'Variant Fulfillment Service', 'Variant Price', 'Variant Compare At Price',
  'Variant Requires Shipping', 'Variant Taxable', 'Variant Barcode', 'Image Src',
  'Image Position', 'Image Alt Text', 'Gift Card', 'SEO Title', 'SEO Description',
  'Variant Image', 'Variant Weight Unit', 'Variant Tax Code', 'Cost per item',
  'Price / International', 'Compare At Price / International', 'Status'
];

function parseBool(val) {
  if (typeof val === 'boolean') return val;
  return ['true', 'yes', '1', 'active', 'published', 'visible'].includes(String(val).toLowerCase());
}

function mapCategoryToNavPage(category) {
  const map = {
    'skincare': 'skincare',
    'skin care': 'skincare',
    'haircare': 'haircare',
    'hair care': 'haircare',
    'bath-body': 'bath-body',
    'bath & body': 'bath-body',
    'bath and body': 'bath-body',
    'makeup': 'makeup',
    'make up': 'makeup',
    'electronics': 'electronics',
    'fashion': 'fashion',
    'home-living': 'home-living',
    'home & living': 'home-living',
    'home and living': 'home-living',
    'home': 'home-living',
    'offers': 'offers',
    'new-arrivals': 'new-arrivals',
    'new arrivals': 'new-arrivals',
    'beauty': 'beauty',
    'grocery': 'grocery'
  };
  return map[category] || 'home';
}

function parseRow(row, platform) {
  const fields = PLATFORM_FIELDS[platform];
  if (!fields) return null;

  const get = (key) => {
    const fieldName = fields[key];
    return fieldName ? (row[fieldName] || '').trim() : '';
  };

  const tags = get('tags');
  const price = parseFloat(get('price')) || 0;
  const compareAtPrice = parseFloat(get('compareAtPrice')) || 0;

  const rawProductCategory = get('productCategory');
  const categoryLower = rawProductCategory ? rawProductCategory.toLowerCase() : '';
  
  const productData = {
    handle: get('handle') || undefined,
    title: get('title') || 'Untitled Product',
    bodyHtml: get('bodyHtml'),
    vendor: get('vendor'),
    productCategory: rawProductCategory,
    navPage: get('navPage') || mapCategoryToNavPage(categoryLower),
    type: get('type'),
    tags: tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : [],
    published: platform === 'shopify' ? parseBool(get('published')) : true,
    option1Name: get('option1Name') || 'Size',
    option2Name: get('option2Name') || 'Color',
    option3Name: get('option3Name'),
    variants: [{
      sku: get('sku'),
      grams: parseFloat(get('grams')) || 0,
      inventoryTracker: get('inventoryTracker') || 'shopify',
      inventoryQty: parseInt(get('inventoryQty')) || 0,
      inventoryPolicy: get('inventoryPolicy') || 'deny',
      fulfillmentService: get('fulfillmentService') || 'manual',
      price,
      compareAtPrice: compareAtPrice || price,
      requiresShipping: parseBool(get('requiresShipping') !== '' ? get('requiresShipping') : 'true'),
      taxable: parseBool(get('taxable') !== '' ? get('taxable') : 'true'),
      barcode: get('barcode'),
      weightUnit: get('weightUnit') || 'g',
      taxCode: get('taxCode'),
      costPerItem: parseFloat(get('costPerItem')) || 0,
      option1: get('option1'),
      option2: get('option2'),
      option3: get('option3'),
      image: get('variantImage')
    }],
    images: get('imageSrc') ? [{ src: get('imageSrc'), position: parseInt(get('imagePosition')) || 1, altText: get('imageAltText') || get('title') }] : [],
    giftCard: parseBool(get('giftCard')),
    seoTitle: get('seoTitle') || get('title'),
    seoDescription: get('seoDescription'),
    status: parseBool(get('status') !== '' ? get('status') : 'active') ? 'active' : 'draft',
    platform
  };

  // Amazon-specific fields -> amazonMeta and overrides
  if (platform === 'amazon') {
    const asin = get('asin') || get('id');
    if (asin) {
      productData.amazonMeta = {
        asin,
        url: get('url'),
        currency: get('currency') || 'INR',
        original_price: parseFloat(get('compareAtPrice')) || 0, // original_price column maps to compareAtPrice key
        has_prime_shipping: parseBool(get('has_prime_shipping')),
        has_deal: parseBool(get('has_deal')),
        deal_text: get('deal_text'),
        is_sponsored: parseBool(get('is_sponsored')),
        options_count: parseInt(get('options_count')) || 1,
        source_url: get('source_url'),
        extracted_at: get('extracted_at') ? new Date(get('extracted_at')) : undefined
      };
    }
    // Set rating/reviewCount from Amazon CSV columns
    const rating = parseFloat(get('rating'));
    if (rating) productData.rating = rating;
    const reviewCount = parseInt(get('reviewCount'));
    if (reviewCount) productData.reviewCount = reviewCount;
    // Set vendor from brand column
    const brand = get('vendor'); // 'vendor' key now maps to 'brand' CSV column
    if (brand) productData.vendor = brand;
    // Set sku to asin
    const sku = get('sku'); // 'sku' key maps to 'asin' CSV column
    if (sku) productData.variants[0].sku = sku;
    // Set image from img_url column
    const imgUrl = get('imageSrc'); // 'imageSrc' key now maps to 'img_url' CSV column
    if (imgUrl) {
      productData.images = [{ src: imgUrl, position: parseInt(get('position')) || 1, altText: productData.title }];
    }
  }

  return productData;
}

async function importFromCSV(filePath, platform) {
  return new Promise((resolve, reject) => {
    const products = [];
    const productMap = new Map();

    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => {
        const parsed = parseRow(row, platform);
        if (!parsed || !parsed.title) return;

        const key = parsed.handle || parsed.title.toLowerCase();
        if (productMap.has(key)) {
          const existing = productMap.get(key);
          if (parsed.variants[0]?.option1) existing.variants.push(parsed.variants[0]);
          if (parsed.images[0]?.src) existing.images.push(parsed.images[0]);
        } else {
          productMap.set(key, parsed);
        }
      })
      .on('end', async () => {
        try {
          const results = { created: 0, updated: 0, errors: [] };
          for (const [, productData] of productMap) {
            try {
              const existing = await Product.findOne({
                $or: [{ handle: productData.handle }, { title: productData.title }]
              });
              if (existing) {
                Object.assign(existing, productData);
                await existing.save();
                results.updated++;
              } else {
                await Product.create(productData);
                results.created++;
              }
            } catch (err) {
              results.errors.push({ title: productData.title, error: err.message });
            }
          }
          resolve(results);
        } catch (err) {
          reject(err);
        }
      })
      .on('error', reject);
  });
}

function getExportHeaders(platform) {
  if (platform === 'shopify') return SHOPIFY_COLUMNS;
  return PLATFORM_FIELDS[platform] ? Object.values(PLATFORM_FIELDS[platform]) : Object.values(PLATFORM_FIELDS.shopify);
}

function productToExportRow(product, platform) {
  if (platform === 'shopify') {
    const variant = product.variants[0] || {};
    const image = product.images[0] || {};
    const row = {};
    SHOPIFY_COLUMNS.forEach(col => {
      switch (col) {
        case 'Handle': row[col] = product.handle || ''; break;
        case 'Title': row[col] = product.title || ''; break;
        case 'Body (HTML)': row[col] = product.bodyHtml || ''; break;
        case 'Vendor': row[col] = product.vendor || ''; break;
        case 'Product Category': row[col] = product.productCategory || ''; break;
        case 'Type': row[col] = product.type || ''; break;
        case 'Tags': row[col] = (product.tags || []).join(', '); break;
        case 'Published': row[col] = product.published ? 'TRUE' : 'FALSE'; break;
        case 'Option1 Name': row[col] = product.option1Name || ''; break;
        case 'Option1 Value': row[col] = variant.option1 || ''; break;
        case 'Option2 Name': row[col] = product.option2Name || ''; break;
        case 'Option2 Value': row[col] = variant.option2 || ''; break;
        case 'Option3 Name': row[col] = product.option3Name || ''; break;
        case 'Option3 Value': row[col] = variant.option3 || ''; break;
        case 'Variant SKU': row[col] = variant.sku || ''; break;
        case 'Variant Grams': row[col] = variant.grams || 0; break;
        case 'Variant Inventory Tracker': row[col] = variant.inventoryTracker || ''; break;
        case 'Variant Inventory Qty': row[col] = variant.inventoryQty || 0; break;
        case 'Variant Inventory Policy': row[col] = variant.inventoryPolicy || ''; break;
        case 'Variant Fulfillment Service': row[col] = variant.fulfillmentService || ''; break;
        case 'Variant Price': row[col] = variant.price || 0; break;
        case 'Variant Compare At Price': row[col] = variant.compareAtPrice || 0; break;
        case 'Variant Requires Shipping': row[col] = variant.requiresShipping ? 'true' : 'false'; break;
        case 'Variant Taxable': row[col] = variant.taxable ? 'true' : 'false'; break;
        case 'Variant Barcode': row[col] = variant.barcode || ''; break;
        case 'Image Src': row[col] = image.src || ''; break;
        case 'Image Position': row[col] = image.position || 1; break;
        case 'Image Alt Text': row[col] = image.altText || ''; break;
        case 'Gift Card': row[col] = product.giftCard ? 'TRUE' : 'FALSE'; break;
        case 'SEO Title': row[col] = product.seoTitle || ''; break;
        case 'SEO Description': row[col] = product.seoDescription || ''; break;
        case 'Variant Image': row[col] = variant.image || ''; break;
        case 'Variant Weight Unit': row[col] = variant.weightUnit || 'g'; break;
        case 'Variant Tax Code': row[col] = variant.taxCode || ''; break;
        case 'Cost per item': row[col] = variant.costPerItem || 0; break;
        case 'Price / International': row[col] = variant.price || 0; break;
        case 'Compare At Price / International': row[col] = variant.compareAtPrice || 0; break;
        case 'Status': row[col] = product.status || 'active'; break;
        default: row[col] = '';
      }
    });
    return row;
  }

  const fields = PLATFORM_FIELDS[platform] || PLATFORM_FIELDS.shopify;
  const variant = product.variants[0] || {};
  const image = product.images[0] || {};

  const row = {};
  for (const [key, header] of Object.entries(fields)) {
    switch (key) {
      case 'handle': row[header] = product.handle; break;
      case 'title': row[header] = product.title; break;
      case 'bodyHtml': row[header] = product.bodyHtml; break;
      case 'vendor': row[header] = product.vendor; break;
      case 'productCategory': row[header] = product.productCategory; break;
      case 'type': row[header] = product.type; break;
      case 'tags': row[header] = (product.tags || []).join(', '); break;
      case 'published': row[header] = product.published ? 'TRUE' : 'FALSE'; break;
      case 'option1Name': row[header] = product.option1Name; break;
      case 'option2Name': row[header] = product.option2Name; break;
      case 'option3Name': row[header] = product.option3Name; break;
      case 'sku': row[header] = variant.sku; break;
      case 'grams': row[header] = variant.grams; break;
      case 'inventoryQty': row[header] = variant.inventoryQty; break;
      case 'price': row[header] = variant.price; break;
      case 'compareAtPrice': row[header] = variant.compareAtPrice; break;
      case 'imageSrc': row[header] = image.src; break;
      case 'imagePosition': row[header] = image.position; break;
      case 'imageAltText': row[header] = image.altText; break;
      case 'status': row[header] = product.status; break;
      case 'option1': row[header] = variant.option1; break;
      case 'option2': row[header] = variant.option2; break;
      case 'option3': row[header] = variant.option3; break;
      // Amazon-specific export fields
      case 'id': row[header] = product.amazonMeta?.asin || variant.sku || ''; break;
      case 'asin': row[header] = product.amazonMeta?.asin || variant.sku || ''; break;
      case 'url': row[header] = product.amazonMeta?.url || ''; break;
      case 'currency': row[header] = product.amazonMeta?.currency || 'INR'; break;
      case 'reviewCount': row[header] = product.reviewCount || 0; break;
      case 'has_prime_shipping': row[header] = product.amazonMeta?.has_prime_shipping ? 'true' : 'false'; break;
      case 'has_deal': row[header] = product.amazonMeta?.has_deal ? 'true' : 'false'; break;
      case 'deal_text': row[header] = product.amazonMeta?.deal_text || ''; break;
      case 'is_sponsored': row[header] = product.amazonMeta?.is_sponsored ? 'true' : 'false'; break;
      case 'options_count': row[header] = product.amazonMeta?.options_count || 1; break;
      case 'position': row[header] = image.position || 1; break;
      case 'source_url': row[header] = product.amazonMeta?.source_url || ''; break;
      case 'extracted_at': row[header] = product.amazonMeta?.extracted_at || ''; break;
      case 'rating': row[header] = product.rating || ''; break;
      default: row[header] = '';
    }
  }
  return row;
}

module.exports = { importFromCSV, getExportHeaders, productToExportRow, PLATFORM_FIELDS, SHOPIFY_COLUMNS };