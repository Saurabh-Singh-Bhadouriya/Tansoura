import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import HeroSlider from '../components/HeroSlider';
import SEO from '../components/SEO';
import { ProductGrid } from '../components/ProductCard';
import { products as productsApi, offers as offersApi, mediaUrl, NAV_ITEMS } from '../api';
import { useRefreshKey } from '../context/DataRefreshContext';

export default function HomePage() {
  const refreshKey = useRefreshKey();
  const [allProducts, setAllProducts] = useState([]);
  const [bestSellers, setBestSellers] = useState([]);
  const [newLaunches, setNewLaunches] = useState([]);
  const [offers, setOffers] = useState([]);
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewAll, setViewAll] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      productsApi.list({ navPage: 'home', featured: true, limit: 8 }),
      productsApi.list({ navPage: 'new-arrivals', limit: 6 }),
      productsApi.list({ navPage: 'home', limit: 8, sort: 'newest' }),
      offersApi.list({ navPage: 'home', type: 'offer' }),
      offersApi.list({ navPage: 'home', type: 'banner' })
    ]).then(([bs, nl, all, off, ban]) => {
      setBestSellers(bs.products?.length ? bs.products : []);
      setNewLaunches(nl.products?.length ? nl.products : []);
      if (!bs.products?.length && all.products?.length) {
        setBestSellers(all.products);
      }
      setAllProducts(all.products || []);
      setOffers(off || []);
      setBanners(ban || []);
    }).catch(console.error).finally(() => setLoading(false));
  }, [refreshKey]);

  const handleViewAll = async () => {
    setLoading(true);
    try {
      const res = await productsApi.list({ limit: 100 });
      setAllProducts(res.products || []);
      setViewAll(true);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const offerText = offers.map(o => o.title).join(' | ');

  return (
    <>
      <SEO
        title="सबसे सस्ते और भरोसेमंद ऑनलाइन शॉपिंग"
        description="Tansoura पर पाएं सबसे सस्ते दामों पर 100% ऑथेंटिक प्रोडक्ट्स। स्किनकेयर, फैशन, इलेक्ट्रॉनिक्स, किराना और भी बहुत कुछ। फ्री डिलीवरी & ईज़ी रिटर्न। Shop honest, authentic & affordable products online at best prices in India."
        keywords="Tansoura, online shopping India, cheapest online shopping, authentic products, honest products, affordable shopping, skincare, fashion, electronics, grocery, सस्ती ऑनलाइन शॉपिंग, ऑथेंटिक प्रोडक्ट्स, भरोसेमंद शॉपिंग"
        canonical="https://tansoura.in/"
        breadcrumbs={[
          { name: 'Home', item: 'https://tansoura.in/' }
        ]}
      />

      {offerText && (
        <div className="announcement-bar">
          <span>{offerText} | Free Shipping Above ₹299 | 5% Extra off on Prepaid Orders</span>
        </div>
      )}

      <HeroSlider navPage="home" />

      <div className="container">
        {banners.map(b => (
          <div key={b.id} className="promo-banner">
            {b.video ? (
              <video
                src={mediaUrl(b.video)}
                autoPlay
                muted
                loop
                playsInline
                className="promo-banner-video"
                style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'var(--radius-lg)' }}
                disablePictureInPicture
                webkit-playsinline="true"
                x5-playsinline="true"
                preload="metadata"
              />
            ) : (
              <img src={b.image || 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1200'} alt={b.title} />
            )}
            {b.link && !b.link.startsWith('#') && (
              <a href={b.link} className="promo-banner-link" style={{ position: 'absolute', inset: 0, zIndex: 2 }} aria-label={b.title} />
            )}
          </div>
        ))}

        {newLaunches.length > 0 && (
          <section style={{ marginBottom: 60 }}>
            <h2 className="section-title">New Launches</h2>
            <p className="section-subtitle">Discover our latest products</p>
            <ProductGrid products={newLaunches} loading={loading} />
          </section>
        )}

        <section style={{ marginBottom: 60 }}>
          <h2 className="section-title">Our Best Sellers</h2>
          <p className="section-subtitle">Most loved products by our customers</p>
          <ProductGrid products={viewAll ? allProducts : bestSellers} loading={loading} />
          {!viewAll && (
            <div style={{ textAlign: 'center', marginTop: 32 }}>
              <button type="button" className="btn btn-outline" onClick={handleViewAll}>View All Products</button>
            </div>
          )}
        </section>

        <section style={{ marginBottom: 60, textAlign: 'center', padding: '48px 20px', background: 'var(--primary-light)', borderRadius: 'var(--radius-lg)' }}>
          <h2 className="section-title">The future of shopping is here</h2>
          <p style={{ color: 'var(--text-muted)', maxWidth: 600, margin: '0 auto 32px' }}>
            Embrace Tansoura, where each product is chosen for its quality and value, offering you authentic, effective solutions.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 24, maxWidth: 800, margin: '0 auto' }}>
            {[
              { title: 'Transparency', desc: 'Full disclosure of product details' },
              { title: 'Quality', desc: 'Curated products from trusted brands' },
              { title: 'Affordable', desc: 'Best prices, accessible to all' },
              { title: 'Fast Delivery', desc: 'Free shipping on orders above ₹299' }
            ].map(f => (
              <div key={f.title} style={{ padding: 20 }}>
                <h3 style={{ fontSize: 16, marginBottom: 8 }}>{f.title}</h3>
                <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}