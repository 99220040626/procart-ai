import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext'; 
import toast from 'react-hot-toast';

function ProductCard({ product }) {
  const { addToCart } = useCart(); 
  const [loaded, setLoaded] = useState(false);
  
  // Safely handle image URLs (works for both external links and local uploads)
  const imageUrl = product.imageUrl 
    ? (product.imageUrl.startsWith('http') ? product.imageUrl : `https://procart-ai.onrender.com/uploads/${product.imageUrl}`) 
    : null;

  // Intercept the click so we don't accidentally navigate to the product page when adding to cart
  const handleAdd = (e) => {
    e.preventDefault(); 
    e.stopPropagation();
    
    if (product.stock === 0) {
        toast.error("This asset is currently depleted.");
        return;
    }
    
    addToCart(product);
    toast.success(
      <div className="flex flex-col">
          <span className="font-bold text-gray-900 dark:text-white uppercase tracking-widest text-[10px]">Cart Updated</span>
          <span className="text-sm font-medium text-blue-600 dark:text-cyan-400 mt-0.5">{product.name}</span>
      </div>, { style: { borderRadius: '16px', background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(10px)', border: '1px solid rgba(6,182,212,0.2)' } }
    );
  };

  return (
    <div className="group relative bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-xl rounded-[2rem] border border-gray-200/50 dark:border-white/[0.05] p-4 transition-all duration-500 hover:shadow-2xl dark:hover:shadow-[0_10px_30px_rgba(6,182,212,0.15)] hover:-translate-y-2 flex flex-col h-full overflow-hidden">
      
      {/* 📸 Image Stage */}
      <Link to={`/product/${product.id}`} className="relative w-full h-56 sm:h-64 rounded-[1.5rem] overflow-hidden bg-gray-50 dark:bg-[#050505] mb-5 shadow-inner border border-gray-100 dark:border-white/[0.02] block">
        <div className="absolute inset-0 bg-gradient-to-tr from-black/5 to-transparent pointer-events-none z-10"></div>
        
        {/* Shimmer skeleton while cache triggers */}
        {!loaded && imageUrl && (
            <div className="absolute inset-0 bg-gray-200 dark:bg-gray-800 animate-pulse rounded-[1.5rem]"></div>
        )}

        {imageUrl ? (
            <img 
                src={imageUrl} 
                alt={product.name} 
                onLoad={() => setLoaded(true)}
                onError={(e) => {
                    setLoaded(true); // Stop the shimmer
                    e.target.src = 'https://via.placeholder.com/400x300?text=Asset+Missing'; // Fallback if local file is missing
                }}
                className={`w-full h-full object-cover transition-all duration-700 group-hover:scale-110 ${loaded ? 'opacity-100' : 'opacity-0'}`} 
                loading="lazy" 
            />
        ) : (
            <div className="w-full h-full flex items-center justify-center text-5xl opacity-20">📦</div>
        )}
        
        {/* Category Badge */}
        <div className="absolute top-3 left-3 bg-white/90 dark:bg-black/70 backdrop-blur-md px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-gray-800 dark:text-gray-200 rounded-full shadow-sm border border-gray-200 dark:border-white/10 z-20 transition-transform group-hover:scale-105">
          {product.category || "Premium Gear"}
        </div>
        
        {/* 3D AR Indicator (if model exists) */}
        {product.modelUrl && (
            <div className="absolute top-3 right-3 bg-indigo-600/90 backdrop-blur-md px-2 py-1 text-[9px] font-black uppercase tracking-widest text-white rounded-md shadow-lg z-20 animate-pulse border border-indigo-400/50">
              3D AR
            </div>
        )}
      </Link>

      {/* 📝 Details & Checkout */}
      <div className="flex-grow flex flex-col justify-between px-1">
        <Link to={`/product/${product.id}`} className="block mb-4">
          <h3 className="text-lg sm:text-xl font-black text-gray-900 dark:text-white leading-tight mb-1.5 tracking-tight group-hover:text-blue-600 dark:group-hover:text-cyan-400 transition-colors line-clamp-1">
            {product.name}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 font-medium leading-relaxed">
            {product.description || product.detailedDescription || "Premium high-fidelity asset engineered for absolute performance."}
          </p>
        </Link>
        
        <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-100 dark:border-white/5">
          <span className="text-xl sm:text-2xl font-black text-blue-600 dark:text-cyan-400 tracking-tighter">
            ₹{product.price?.toLocaleString()}
          </span>
          
          {/* Action Button */}
          <button 
            onClick={handleAdd} 
            disabled={product.stock === 0}
            className={`w-10 h-10 sm:w-auto sm:h-auto sm:px-5 sm:py-2.5 rounded-full sm:rounded-xl text-sm font-black active:scale-95 transition-all duration-300 flex items-center justify-center gap-2 ${
              product.stock === 0 
              ? 'bg-gray-100 dark:bg-[#111] text-gray-400 dark:text-gray-600 cursor-not-allowed shadow-none border border-gray-200 dark:border-gray-800' 
              : 'bg-gray-900 dark:bg-white text-white dark:text-black hover:bg-blue-600 dark:hover:bg-cyan-400 shadow-md hover:shadow-lg dark:hover:shadow-[0_0_20px_rgba(6,182,212,0.4)] hover:-translate-y-0.5'
            }`}
          >
            <span className="text-lg sm:hidden font-medium">
                {product.stock === 0 ? '✕' : '+'}
            </span>
            <span className="hidden sm:block uppercase tracking-widest text-[10px]">
              {product.stock === 0 ? 'Depleted' : 'Add to Cart'}
            </span>
          </button>
        </div>
      </div>

    </div>
  );
}

export default ProductCard;