/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { FavoritesProvider } from './contexts/FavoritesContext';
import { CartProvider } from './contexts/CartContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ScrollToTop from './components/ScrollToTop';
import SocialBar from './components/SocialBar';
import Home from './pages/Home';
import Product from './pages/Product';
import About from './pages/About';
import CustomerCarePage from './pages/CustomerCarePage';
import Recesso from './pages/Recesso';
import RecessoForm from './pages/RecessoForm';
import Login from './pages/Login';
import MyTryOns from './pages/MyTryOns';
import Shop from './pages/Shop';
import Admin from './pages/Admin';
import CRM from './pages/CRM';
import Inventory from './pages/Inventory';
import AdminOrders from './pages/AdminOrders';
import AdminOrderDetail from './pages/AdminOrderDetail';
import Account from './pages/Account';
import OrderDetail from './pages/OrderDetail';
import CookieBanner from './components/CookieBanner';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import CheckoutSuccess from './pages/CheckoutSuccess';
import CheckoutCancel from './pages/CheckoutCancel';
import CheckoutPending from './pages/CheckoutPending';

export default function App() {
  return (
    <AuthProvider>
      <FavoritesProvider>
        <CartProvider>
        <Router>
          <ScrollToTop />
          <div className="min-h-screen flex flex-col">
            <Navbar />
            <SocialBar />
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/shop" element={<Shop />} />
              <Route path="/product/:id" element={<Product />} />
              <Route path="/about" element={<About />} />
              <Route path="/contact" element={<CustomerCarePage variant="contact" />} />
              <Route path="/shipping-returns" element={<CustomerCarePage variant="shipping" />} />
              <Route path="/size-guide" element={<CustomerCarePage variant="size-guide" />} />
              <Route path="/privacy-policy" element={<CustomerCarePage variant="privacy" />} />
              <Route path="/terms" element={<CustomerCarePage variant="terms" />} />
              <Route path="/cookies" element={<CustomerCarePage variant="cookies" />} />
              <Route path="/accessibility" element={<CustomerCarePage variant="accessibility" />} />
              <Route path="/recesso" element={<Recesso />} />
              <Route path="/recesso/richiesta" element={<RecessoForm />} />
              <Route path="/my-try-ons" element={<MyTryOns />} />
              <Route path="/login" element={<Login />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/admin/crm" element={<CRM />} />
              <Route path="/admin/inventory" element={<Inventory />} />
              <Route path="/admin/orders" element={<AdminOrders />} />
              <Route path="/admin/orders/:id" element={<AdminOrderDetail />} />
              <Route path="/account" element={<Account />} />
              <Route path="/account/orders/:id" element={<OrderDetail />} />
              <Route path="/cart" element={<Cart />} />
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/checkout/success" element={<CheckoutSuccess />} />
              <Route path="/checkout/cancel" element={<CheckoutCancel />} />
              <Route path="/checkout/pending" element={<CheckoutPending />} />
            </Routes>
            <Footer />
            <CookieBanner />
          </div>
        </Router>
        </CartProvider>
      </FavoritesProvider>
    </AuthProvider>
  );
}
