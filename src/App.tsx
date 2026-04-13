/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import Product from './pages/Product';
import About from './pages/About';
import Login from './pages/Login';
import Shop from './pages/Shop';
import Admin from './pages/Admin';
import CRM from './pages/CRM';
import Inventory from './pages/Inventory';

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen flex flex-col">
          <Navbar />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/shop" element={<Shop />} />
            <Route path="/product/:id" element={<Product />} />
            <Route path="/about" element={<About />} />
            <Route path="/login" element={<Login />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/admin/crm" element={<CRM />} />
            <Route path="/admin/inventory" element={<Inventory />} />
          </Routes>
          <Footer />
        </div>
      </Router>
    </AuthProvider>
  );
}




