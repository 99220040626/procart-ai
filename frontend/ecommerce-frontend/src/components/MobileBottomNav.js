import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useCart } from '../context/CartContext';

const MobileBottomNav = () => {
    const { cart } = useCart();
    const location = useLocation();

    const navItems = [
        { path: '/', icon: '🏠', label: 'Home' },
        { path: '/products', icon: '🛍️', label: 'Shop' },
        { path: '/cart', icon: '🛒', label: 'Cart', badge: cart.length },
        { path: '/profile', icon: '👤', label: 'Profile' }
    ];

    // Helper to keep the "Shop" icon highlighted even when looking at a specific product
    const isItemActive = (itemPath) => {
        if (itemPath === '/' && location.pathname === '/') return true;
        if (itemPath === '/products' && (location.pathname === '/products' || location.pathname.includes('/product/'))) return true;
        if (itemPath === '/cart' && location.pathname === '/cart') return true;
        if (itemPath === '/profile' && location.pathname === '/profile') return true;
        return false;
    };

    return (
        // Wrapper container handles the fixed positioning and iOS safe areas
        <div className="md:hidden fixed bottom-0 left-0 w-full z-[100] pointer-events-none pb-safe">
            
            {/* The Floating Glass Pill */}
            <div className="mx-4 mb-4 sm:mb-6 p-2 bg-white/80 dark:bg-[#050505]/80 backdrop-blur-3xl border border-gray-200/50 dark:border-white/[0.08] rounded-[2rem] shadow-[0_15px_40px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.8)] pointer-events-auto flex justify-between items-center">
                
                {navItems.map((item) => {
                    const isActive = isItemActive(item.path);
                    
                    return (
                        <Link 
                            key={item.path} 
                            to={item.path} 
                            className={`relative flex flex-col items-center justify-center w-full h-14 rounded-2xl transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] ${isActive ? 'bg-blue-50 dark:bg-cyan-500/10 -translate-y-1' : 'hover:bg-gray-50 dark:hover:bg-white/[0.02] active:scale-95'}`}
                        >
                            {/* Glowing Active Dot */}
                            {isActive && (
                                <span className="absolute -top-1 w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-cyan-400 shadow-[0_0_10px_rgba(59,130,246,0.8)] dark:shadow-[0_0_10px_rgba(6,182,212,0.8)] animate-[fadeIn_0.3s_ease-out]"></span>
                            )}
                            
                            <div className="relative">
                                {/* Icon */}
                                <span className={`text-xl sm:text-2xl transition-all duration-300 ${isActive ? 'scale-110 drop-shadow-md grayscale-0 opacity-100' : 'grayscale-[40%] opacity-60'}`}>
                                    {item.icon}
                                </span>
                                
                                {/* Notification Badge (Cart) */}
                                {item.badge > 0 && (
                                    <span className="absolute -top-1.5 -right-2.5 bg-red-500 text-white text-[9px] font-black w-4.5 h-4.5 flex items-center justify-center rounded-full shadow-[0_0_10px_rgba(239,68,68,0.6)] border-2 border-white dark:border-[#111] animate-bounce">
                                        {item.badge}
                                    </span>
                                )}
                            </div>
                            
                            {/* Label */}
                            <span className={`text-[9px] font-black tracking-widest uppercase mt-1 transition-colors duration-300 ${isActive ? 'text-blue-600 dark:text-cyan-400' : 'text-gray-400 dark:text-gray-600'}`}>
                                {item.label}
                            </span>
                        </Link>
                    );
                })}

            </div>

            <style dangerouslySetInnerHTML={{__html: `
                @keyframes fadeIn { from { opacity: 0; transform: scale(0); } to { opacity: 1; transform: scale(1); } }
                .pb-safe { padding-bottom: env(safe-area-inset-bottom, 16px); }
            `}} />
        </div>
    );
};

export default MobileBottomNav;