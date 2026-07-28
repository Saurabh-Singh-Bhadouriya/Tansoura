import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import SearchBar from '../components/SearchBar';
import SEO from '../components/SEO';
import { ProductGrid } from '../components/ProductCard';
import { products as productsApi } from '../api';
import { useRefreshKey } from '../context/DataRefreshContext';

export default function SearchPage() {
  const [searchParams] = useSearchParams();
  const refreshKey = useRefreshKey();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  const search = searchParams.get('search') || '';
  const category = searchParams.get('category') || '';
  const subcategory = searchParams.get('subcategory') || '';
  const priceRange = searchParams.get('priceRange') || '';

  useEffect(() => {
    setLoading(true);
    const params = {};
    if (search) params.search = search;
    if (category) params.category = category;
    if (subcategory) params.subcategory = subcategory;
    if (priceRange) params.priceRange = priceRange;
    params.limit = 40;

    productsApi.list(params)
      .then(d => {
        setProducts(d.products || []);
        setTotal(d.total || 0);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [search, category, subcategory, priceRange, refreshKey]);

  const pageTitle = search ? `Search results for "${search}"` : category ? `Filtered by ${category}` : 'Search Products';
  const pageDesc = search ? `Showing results for ${search} on Tansoura` : `Browse filtered products`;

  return (
    <>
      <SEO
        title={pageTitle}
        description={pageDesc}
        canonical="https://tansoura.in/search"
      />

      <div className="container" style={{ padding: '20px' }}>
        <div className="search-page-header">
          {!search && <h1 className="section-title">{pageTitle}</h1>}
        </div>

        <div className="search-page-bar">
          <SearchBar compact />
        </div>

        <ProductGrid products={products} loading={loading} />
      </div>
    </>
  );
}