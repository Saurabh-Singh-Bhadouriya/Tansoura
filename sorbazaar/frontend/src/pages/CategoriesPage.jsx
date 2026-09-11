import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import SEO from '../components/SEO';
import { products as productsApi, categories as categoriesApi } from '../api';
import { ProductGrid } from '../components/ProductCard';
import { useRefreshKey } from '../context/DataRefreshContext';

const FALLBACK_META = {
  'skincare': { title: 'Skincare', description: 'Face wash, moisturizer, serum & more', icon: '✨' },
  'haircare': { title: 'Haircare', description: 'Shampoo, conditioner, hair oil & more', icon: '💆' },
  'bath-care': { title: 'Bath & Care', description: 'Body wash, scrub, soap & more', icon: '🛁' },
  'makeup': { title: 'Makeup', description: 'Lipstick, foundation, kajal & more', icon: '💄' },
  'natural': { title: 'Natural', description: 'Herbal & organic products', icon: '🌿' },
  'men': { title: 'Men', description: 'Grooming & personal care for men', icon: '👨' },
  'face-wash': { title: 'Face Wash', description: 'Cleansers & face washes', icon: '🧼' },
  'fragrance': { title: 'Fragrance', description: 'Perfumes & deodorants', icon: '🌸' },
  'deals': { title: 'Deals', description: 'Best discounts & offers', icon: '🏷️' },
  'new-arrivals': { title: 'New Arrivals', description: 'Latest products just launched', icon: '✨' }
};

export default function CategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [productsByCategory, setProductsByCategory] = useState({});
  const [loading, setLoading] = useState(true);
  const refreshKey = useRefreshKey();

  const getMeta = (handle) => {
    const meta = FALLBACK_META[handle];
    if (meta) return meta;
    return {
      title: handle.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      description: '',
      icon: '📦'
    };
  };

  useEffect(() => {
    setLoading(true);
    categoriesApi.list()
      .then(cats => {
        const active = cats.filter(c => c.active).sort((a, b) => (a.order || 0) - (b.order || 0));
        setCategories(active);
        const promises = active.map(c =>
          productsApi.list({ navPage: c.handle, limit: 4 })
            .then(data => ({ handle: c.handle, products: data.products || [] }))
            .catch(() => ({ handle: c.handle, products: [] }))
        );
        return Promise.all(promises);
      })
      .then(results => {
        const map = {};
        results.forEach(({ handle, products }) => { map[handle] = products; });
        setProductsByCategory(map);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [refreshKey]);

  return (
    <>
      <SEO
        title="Shop by Category - Tansoura"
        description="Browse products by category. Skincare, Haircare, Makeup, Natural, Men, Face Wash, Fragrance, Deals, New Arrivals & more."
        canonical="https://tansoura.in/category"
      />

      <div className="container" style={{ padding: '40px 20px' }}>
        <h1 className="section-title" style={{ textAlign: 'center', marginBottom: 12 }}>
          Shop by Category
        </h1>
        <p className="section-subtitle" style={{ textAlign: 'center', marginBottom: 40 }}>
          Explore our wide range of products across all categories
        </p>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div className="loading-spinner" style={{ fontSize: 48 }}>⏳</div>
            <p>Loading categories...</p>
          </div>
        ) : categories.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
            <p>No categories available right now.</p>
          </div>
        ) : (
          <div className="categories-grid">
            {categories.map(cat => {
              const meta = getMeta(cat.handle);
              const categoryProducts = productsByCategory[cat.handle] || [];

              return (
                <div key={cat.id} className="category-card">
                  <div className="category-header">
                    <span className="category-icon">{meta.icon}</span>
                    <div>
                      <h2>{cat.name}</h2>
                      {cat.description && <p>{cat.description}</p>}
                    </div>
                  </div>

                  <ProductGrid products={categoryProducts} loading={false} />

                  <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16 }}>
                      <Link to={`/category/${cat.handle || cat.id}`} style={{
                      display: 'inline-block',
                      padding: '10px 24px',
                      background: 'var(--primary)',
                      color: 'white',
                      textDecoration: 'none',
                      borderRadius: 6,
                      fontSize: 14,
                      fontWeight: 600
                    }}>
                      View All →
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
