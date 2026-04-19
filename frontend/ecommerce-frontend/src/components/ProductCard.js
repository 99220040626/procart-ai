import React, { useState, useCallback, memo } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext'; 
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';

// ==========================================
// 🧩 CONSTANTS & HELPERS
// ==========================================
const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1560393464-5c69a73c5770?q=80&w=800&auto=format&fit=crop';

const getImageUrl = (url) => {
    if (!url) return FALLBACK_IMAGE;
    // Check if it's already a full URL or Base64
    if (url.startsWith('http') || url.startsWith('data:image')) return url;
    // Route to relative uploads directory handled by the backend / static server
    return `/uploads/${url}`;
};

// ==========================================
// 🚀 PRODUCT CARD COMPONENT
// ==========================================
function ProductCard({ product }) {
    const { addToCart } = useCart(); 
    const [isLoaded, setIsLoaded] = useState(false);
    const [imgSrc, setImgSrc] = useState(() => getImageUrl(product?.imageUrl));

    const handleAdd = useCallback((e) => {
        e.preventDefault(); 
        e.stopPropagation();
        
        if (!product || product.stock === 0) {
            toast.error("This asset is currently depleted.", {
                style: { background: '#111', color: '#fff', border: '1px solid #333' }
            });
            return;
        }
        
        addToCart(product);
        toast.success(
            <div className="flex flex-col">
                <span className="font-bold text-neutral-900 dark:text-white uppercase tracking-widest text-[10px]">Added to Bag</span>
                <span className="text-sm font-medium text-neutral-500 dark:text-neutral-400 mt-0.5 truncate max-w-[200px]">
                    {product.name}
                </span>
            </div>, 
            { 
                duration: 3000,
                style: { 
                    borderRadius: '16px', 
                    background: 'rgba(10,10,10,0.85)', 
                    backdropFilter: 'blur(16px)', 
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: '#fff'
                } 
            }
        );
    }, [product, addToCart]);

    if (!product) return null;

    const productId = product._id || product.id;

    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-20px" }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="group relative bg-white/60 dark:bg-neutral-900/40 backdrop-blur-2xl rounded-[2.5rem] border border-neutral-200/50 dark:border-white/[0.05] p-4 transition-all duration-500 hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] dark:hover:shadow-[0_30px_50px_-15px_rgba(0,0,0,0.7)] hover:-translate-y-1 flex flex-col h-full overflow-hidden hover:bg-white/90 dark:hover:bg-neutral-900/80"
        >
            
            {/* 📸 Image Stage */}
            <Link to={`/product/${productId}`} className="relative w-full h-64 sm:h-72 rounded-[2rem] overflow-hidden bg-neutral-100 dark:bg-[#080808] mb-6 block border border-neutral-200/50 dark:border-white/[0.02]">
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-10 pointer-events-none"></div>
                
                {/* High-Performance Shimmer Loader */}
                {!isLoaded && (
                    <div className="absolute inset-0 bg-neutral-200 dark:bg-neutral-800 animate-pulse rounded-[2rem]"></div>
                )}

                <img 
                    src={imgSrc} 
                    alt={product.name || 'Product View'} 
                    onLoad={() => setIsLoaded(true)}
                    onError={() => {
                        setImgSrc(FALLBACK_IMAGE);
                        setIsLoaded(true);
                    }}
                    className={`w-full h-full object-cover transition-all duration-700 ease-in-out group-hover:scale-105 ${isLoaded ? 'opacity-100' : 'opacity-0'}`} 
                    loading="lazy" 
                    decoding="async"
                />
                
                {/* Premium Category Badge */}
                <div className="absolute top-4 left-4 bg-white/90 dark:bg-black/80 backdrop-blur-md px-3.5 py-1.5 text-[9px] font-bold uppercase tracking-widest text-neutral-900 dark:text-white rounded-full shadow-sm border border-neutral-200/50 dark:border-white/10 z-20 transition-transform duration-300 group-hover:scale-105">
                    {product.category || "Premium"}
                </div>
                
                {/* 3D AR Indicator (if model exists) */}
                {product.modelUrl && (
                    <div className="absolute top-4 right-4 bg-neutral-900/90 dark:bg-white/90 backdrop-blur-md px-2.5 py-1 text-[9px] font-bold uppercase tracking-widest text-white dark:text-black rounded-full shadow-lg z-20 transition-transform duration-300 group-hover:scale-105 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 bg-green-400 dark:bg-green-600 rounded-full animate-pulse"></span>
                        3D
                    </div>
                )}
            </Link>

            {/* 📝 Details & Checkout */}
            <div className="flex-grow flex flex-col justify-between px-2 pb-1">
                <Link to={`/product/${productId}`} className="block mb-4">
                    <h3 className="text-lg sm:text-xl font-bold text-neutral-900 dark:text-white leading-tight mb-2 tracking-tight group-hover:text-neutral-500 dark:group-hover:text-neutral-400 transition-colors line-clamp-1">
                        {product.name}
                    </h3>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 line-clamp-2 font-medium leading-relaxed">
                        {product.shortDescription || product.description || "Premium high-fidelity asset engineered for absolute performance."}
                    </p>
                </Link>
                
                <div className="flex items-center justify-between mt-auto pt-5 border-t border-neutral-200/50 dark:border-white/[0.05]">
                    <span className="text-xl sm:text-2xl font-medium text-neutral-900 dark:text-white tracking-tight">
                        ₹{product.price?.toLocaleString('en-IN') || '0'}
                    </span>
                    
                    {/* Action Button */}
                    <motion.button 
                        whileTap={product.stock > 0 ? { scale: 0.95 } : {}}
                        onClick={handleAdd} 
                        disabled={product.stock === 0}
                        className={`relative h-10 w-10 sm:w-auto sm:h-11 sm:px-6 rounded-full sm:rounded-2xl text-xs font-bold tracking-[0.1em] transition-all duration-300 flex items-center justify-center overflow-hidden ${
                            product.stock === 0 
                            ? 'bg-neutral-100 dark:bg-neutral-900 text-neutral-400 dark:text-neutral-600 cursor-not-allowed border border-neutral-200 dark:border-neutral-800' 
                            : 'bg-neutral-900 dark:bg-white text-white dark:text-black hover:shadow-xl hover:-translate-y-0.5'
                        }`}
                    >
                        <span className="text-xl sm:hidden font-medium leading-none mb-0.5">
                            {product.stock === 0 ? '✕' : '+'}
                        </span>
                        <span className="hidden sm:block uppercase z-10">
                            {product.stock === 0 ? 'Depleted' : 'Add'}
                        </span>
                    </motion.button>
                </div>
            </div>

        </motion.div>
    );
}

export default memo(ProductCard);