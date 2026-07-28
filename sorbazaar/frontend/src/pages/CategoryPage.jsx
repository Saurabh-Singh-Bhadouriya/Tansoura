import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import HeroSlider from '../components/HeroSlider';
import SearchBar from '../components/SearchBar';
import SEO from '../components/SEO';
import { ProductGrid } from '../components/ProductCard';
import { products as productsApi, NAV_ITEMS } from '../api';
import { useRefreshKey } from '../context/DataRefreshContext';

const CATEGORY_META = {
  skincare: {
    title: 'Skincare Products - Face Wash, Moisturizer, Serum & More',
    description: 'Shop best skincare products at lowest prices. Face wash, moisturizer, serum, sunscreen, toner & more. 100% authentic skincare for all skin types. Free shipping.',
    keywords: 'skincare, face wash, moisturizer, serum, sunscreen, toner, skincare products India, best skincare brand, cheap skincare'
  },
  'new-arrivals': {
    title: 'New Arrivals - Latest Products Just Launched',
    description: 'Discover latest products at Tansoura. New skincare, fashion, electronics & more added daily. Be the first to shop new arrivals at best prices.',
    keywords: 'new arrivals, latest products, new skincare products, just launched, new collection India'
  },
  fashion: {
    title: 'Fashion & Accessories - Stylish Clothing at Best Prices',
    description: 'Shop fashionable clothing, accessories & more at lowest prices. Trendy styles for men and women. 100% authentic fashion products with easy returns.',
    keywords: 'fashion, clothing, accessories, stylish clothes, fashion India, men fashion, women fashion, cheap clothes'
  },
  electronics: {
    title: 'Electronics & Gadgets at Best Price in India',
    description: 'Shop electronics, gadgets, accessories at cheapest prices. Earphones, smart watches, chargers, cables & more. Authentic products with warranty.',
    keywords: 'electronics, gadgets, earphones, smart watch, charger, cable, electronics India, cheap gadgets'
  },
  grocery: {
    title: 'Grocery & Kitchen Essentials - Daily Needs at Low Prices',
    description: 'Shop grocery, kitchen essentials, daily needs items at cheapest prices. Free delivery on groceries. Authentic products, fast shipping.',
    keywords: 'grocery, kitchen essentials, daily needs, grocery shopping India, cheap grocery, kitchen items'
  },
  'home-kitchen': {
    title: 'Home & Kitchen Products - Decor, Appliances & More',
    description: 'Shop home decor, kitchen appliances, organizers & more. Best prices on home & kitchen products. 100% authentic with easy returns.',
    keywords: 'home decor, kitchen appliances, home products, kitchen items, home improvement India'
  },
  beauty: {
    title: 'Beauty Products - Makeup, Hair Care & Personal Care',
    description: 'Shop beauty products, makeup, hair care, personal care at best prices. 100% authentic beauty products from top brands. Free shipping.',
    keywords: 'beauty products, makeup, hair care, personal care, beauty India, makeup India, hair products'
  }
};

export default function CategoryPage() {
  const { category } = useParams();
  const navigate = useNavigate();
  const refreshKey = useRefreshKey();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [priceSort, setPriceSort] = useState('');

  useEffect(() => {
    setLoading(true);
    const params = { navPage: category, category, limit: 40 };
    if (priceSort === 'low') params.sort = 'price_asc';
    if (priceSort === 'high') params.sort = 'price_desc';
    
    productsApi.list(params)
      .then(d => {
        let list = d.products || [];
        // Client-side sort if needed
        if (priceSort === 'low') list = [...list].sort((a, b) => (a.variants?.[0]?.price || 0) - (b.variants?.[0]?.price || 0));
        if (priceSort === 'high') list = [...list].sort((a, b) => (b.variants?.[0]?.price || 0) - (a.variants?.[0]?.price || 0));
        setProducts(list);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [category, priceSort, refreshKey]);

  const title = category?.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || 'Products';
  const meta = CATEGORY_META[category] || {};

  return (
    <>
      <SEO
        title={meta.title || `${title} Products - Buy Online at Best Price`}
        description={meta.description || `Shop ${title.toLowerCase()} products at best prices on Tansoura. 100% authentic products, free delivery, easy returns. India's cheapest online shopping.`}
        keywords={meta.keywords || `${category}, ${title.toLowerCase()} products, buy ${title.toLowerCase()} online, cheap ${title.toLowerCase()}, Tansoura ${category}`}
        canonical={`https://tansoura.in/category/${category}`}
        breadcrumbs={[
          { name: 'Home', item: 'https://tansoura.in/' },
          { name: title, item: `https://tansoura.in/category/${category}` }
        ]}
      />

      <HeroSlider navPage={category} />
      <div className="container" style={{ padding: '40px 20px' }}>
        <h1 className="section-title">{title}</h1>
        <p className="section-subtitle">Browse our collection of {title.toLowerCase()} products</p>
        
        {/* Category search & filter bar */}
        <div className="category-filter-bar">
          <div className="category-search-wrap">
            <SearchBar compact />
          </div>
          <div className="category-sort-wrap">
            <select value={priceSort} onChange={e => setPriceSort(e.target.value)}>
              <option value="">Sort: Default</option>
              <option value="low">Price: Low to High</option>
              <option value="high">Price: High to Low</option>
            </select>
          </div>
        </div>

        <ProductGrid products={products} loading={loading} />
      </div>
    </>
  );
}