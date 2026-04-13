import React, { useEffect } from "react"; 
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { CartProvider } from "./context/CartContext"; 
import { ThemeProvider } from "./context/ThemeContext"; 
import { Toaster } from 'react-hot-toast';
import Navbar from "./components/Navbar";
import ProductDetail from "./pages/ProductDetail";
import ProtectedRoute from "./components/ProtectedRoute"; 
import AdminRoute from "./components/AdminRoute"; 
import Home from "./pages/Home";
import Products from "./pages/Products";
import Cart from "./pages/Cart";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ResetPassword from './pages/ResetPassword';
import Orders from "./pages/Orders"; 
import AdminDashboard from "./pages/AdminDashboard"; 
import Profile from "./pages/Profile"; 
import Wishlist from "./pages/Wishlist"; 
import Chatbot from "./components/Chatbot";
import InstallApp from './components/InstallApp';
import OrderTracking from './components/OrderTracking';
import VoiceAssistant from './components/VoiceAssistant'; 
import { SyncManager } from './services/SyncManager';

// 🚀 NEW: Import Mobile Bottom Navigation
import MobileBottomNav from './components/MobileBottomNav';

function App() {

  useEffect(() => {
    const handleOnline = () => {
      SyncManager.syncCart();
    };

    window.addEventListener('online', handleOnline);
    SyncManager.syncCart();

    return () => window.removeEventListener('online', handleOnline);
  }, []);

  return ( 
    <ThemeProvider>
      <CartProvider>
        <Router>
          <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#0a0f1c] transition-colors duration-300 relative">
            <Navbar />
            <Toaster position="bottom-right" reverseOrder={false} />
            
            <main className="flex-grow">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/products" element={<Products />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/product/:id" element={<ProductDetail />} />
                <Route path="/cart" element={<Cart />} />

                {/* USER PROTECTED ROUTES */}
                <Route path="/orders" element={<ProtectedRoute><Orders /></ProtectedRoute>} />
                <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                <Route path="/wishlist" element={<ProtectedRoute><Wishlist /></ProtectedRoute>} />
                <Route path="/track" element={<ProtectedRoute><OrderTracking /></ProtectedRoute>} />

                {/* ADMIN ONLY ROUTE */}
                <Route path="/admin" element={
                    <AdminRoute>
                        <AdminDashboard />
                    </AdminRoute>
                } />

                <Route path="*" element={<div className="text-center py-20 font-bold text-2xl dark:text-white">404 - Page Not Found</div>} />
              </Routes>
            </main>
            
            <VoiceAssistant />
            <Chatbot />
            
            {/* 🚀 INJECT MOBILE NAV: This will stick to the bottom of mobile screens */}
            <MobileBottomNav />

          </div>
          <InstallApp />
        </Router>
      </CartProvider>
    </ThemeProvider>
  );
}

export default App;