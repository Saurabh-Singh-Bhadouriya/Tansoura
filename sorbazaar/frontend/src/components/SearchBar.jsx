import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { NAV_ITEMS } from '../api';

const PRICE_RANGES = [
  { label: 'All Prices', min: 0, max: Infinity },
  { label: 'Under ₹100', min: 0, max: 100 },
  { label: '₹100 - ₹299', min: 100, max: 299 },
  { label: '₹300 - ₹599', min: 300, max: 599 },
  { label: '₹600 - ₹999', min: 600, max: 999 },
  { label: '₹1000+', min: 1000, max: Infinity }
];

export default function SearchBar({ onSearch, compact = false }) {
  const [query, setQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [category, setCategory] = useState('');
  const [subcategory, setSubcategory] = useState('');
  const [priceRange, setPriceRange] = useState('');
  const navigate = useNavigate();
  const searchRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowFilters(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e) => {
    const val = e.target.value;
    setQuery(val);
  };

  const executeSearch = (searchQuery, filters) => {
    const q = searchQuery || query;
    const params = new URLSearchParams();
    if (q.trim()) params.set('search', q.trim());
    if (filters?.category || category) params.set('category', filters?.category || category);
    if (filters?.subcategory || subcategory) params.set('subcategory', filters?.subcategory || subcategory);
    if (filters?.priceRange || priceRange) params.set('priceRange', filters?.priceRange || priceRange);
    
    const qs = params.toString();
    if (qs) {
      navigate(`/search?${qs}`);
    } else if (q.trim()) {
      navigate(`/search?search=${encodeURIComponent(q.trim())}`);
    }
    setShowFilters(false);
    onSearch?.(q.trim());
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    executeSearch();
  };

  const clearFilters = () => {
    setCategory('');
    setSubcategory('');
    setPriceRange('');
  };

  const hasActiveFilters = category || subcategory || priceRange;

  return (
    <div className={`search-bar-wrapper ${compact ? 'search-bar-compact' : ''}`} ref={searchRef}>
      <form className="search-bar-form" onSubmit={handleSubmit}>
        <div className="search-input-group">
          <svg className="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4A90E2" strokeWidth="2.5">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            className="search-input"
            placeholder="Search products, brands, categories..."
            value={query}
            onChange={handleInputChange}
          />
          {query && (
            <button type="button" className="search-clear" onClick={() => { setQuery(''); }}>
              ✕
            </button>
          )}
          <button
            type="button"
            className={`search-filter-toggle ${showFilters || hasActiveFilters ? 'active' : ''}`}
            onClick={() => setShowFilters(!showFilters)}
            title="Filters"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" strokeLinejoin="round" />
              <line x1="3" y1="6" x2="21" y2="6" strokeWidth="2.5" />
              <path d="M16 10a4 4 0 0 1-8 0" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
            {hasActiveFilters && <span className="filter-badge-dot"></span>}
          </button>
        </div>

        {showFilters && (
          <div className="search-filters-panel">
            <div className="filter-group">
              <label>Category</label>
              <select value={category} onChange={e => setCategory(e.target.value)}>
                <option value="">All Categories</option>
                {NAV_ITEMS.filter(i => i.page !== 'home').map(item => (
                  <option key={item.page} value={item.page}>{item.label}</option>
                ))}
              </select>
            </div>
            <div className="filter-group">
              <label>Subcategory / Type</label>
              <input
                type="text"
                placeholder="e.g. face wash, serum..."
                value={subcategory}
                onChange={e => setSubcategory(e.target.value)}
              />
            </div>
            <div className="filter-group">
              <label>Price Range</label>
              <select value={priceRange} onChange={e => setPriceRange(e.target.value)}>
                <option value="">All Prices</option>
                {PRICE_RANGES.map(range => (
                  <option key={range.label} value={`${range.min}-${range.max === Infinity ? '999999' : range.max}`}>
                    {range.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="filter-actions">
              {hasActiveFilters && (
                <button type="button" className="btn btn-sm btn-outline" onClick={clearFilters}>
                  Clear Filters
                </button>
              )}
              <button type="button" className="btn btn-sm btn-primary" onClick={() => executeSearch()}>
                Apply Filters
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}