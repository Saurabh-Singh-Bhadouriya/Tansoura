import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { AppProvider } from './context/AppContext';
import { NotificationProvider } from './context/NotificationContext';
import { DataRefreshProvider } from './context/DataRefreshContext';
import ScrollToTop from './components/ScrollToTop';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import CartDrawer from './components/CartDrawer';
import AuthModal from './components/AuthModal';
import HomePage from './pages/HomePage';
import CategoryPage from './pages/CategoryPage';
import CategoriesPage from './pages/CategoriesPage';
import ProductDetailPage from './pages/ProductDetailPage';
import SearchPage from './pages/SearchPage';
import CheckoutPage from './pages/CheckoutPage';
import OrderSuccessPage from './pages/OrderSuccessPage';
import OrderTrackingPage from './pages/OrderTrackingPage';
import MyOrdersPage from './pages/MyOrdersPage';
import ProfilePage from './pages/ProfilePage';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HelmetProvider>
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true
        }}
      >
        <ScrollToTop />
        <DataRefreshProvider>
        <AppProvider>
          <NotificationProvider>
            <Navbar />
          <main>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/category" element={<CategoriesPage />} />
              <Route path="/category/:category" element={<CategoryPage />} />
              <Route path="/products/:handle" element={<ProductDetailPage />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/checkout" element={<CheckoutPage />} />
              <Route path="/order-success" element={<OrderSuccessPage />} />
              <Route path="/orders" element={<MyOrdersPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/order/:id/track" element={<OrderTrackingPage />} />
            </Routes>
          </main>
          <Footer />
          <CartDrawer />
          <AuthModal />
          </NotificationProvider>
        </AppProvider>
        </DataRefreshProvider>
      </BrowserRouter>
    </HelmetProvider>
  </React.StrictMode>
);