import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import API from '../services/api';
import { useCart } from '../context/CartContext';
import toast from 'react-hot-toast';

function Wishlist() {
    const [wishlistProducts, setWishlistProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const { addToCart } = useCart();
    const navigate = useNavigate();

    const userId = localStorage.getItem('userId');

    const fetchData = useCallback(async () => {
        try {
            const [wishlistRes, productsRes] = await Promise.all([
                API.get(`/wishlist/${userId}`),
                API.get('/products')
            ]);

            const savedItemIds = wishlistRes.data.map(item => item.productId);
            const savedProducts = productsRes.data.filter(p => savedItemIds.includes(p.id));
            
            setWishlistProducts(savedProducts);
        } catch (error) {
            console.error("Failed to fetch wishlist", error);
            toast.error("Could not load your saved items.");
        } finally {
            setLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        if (!userId) {
            navigate('/login');
            return;
        }
        fetchData();
    }, [userId, navigate, fetchData]);

    const handleRemove = async (productId) => {
        try {
            await API.delete(`/wishlist/${userId}/${productId}`);
            setWishlistProducts(wishlistProducts.filter(p => p.id !== productId));
            toast.success("Removed from Wishlist");
        } catch (error) {
            toast.error("Failed to remove item.");
        }
    };

    const handleAddToCart = (product) => {
        if (product.stock <= 0) {
            toast.error("Sorry, this item is out of stock!");
            return;
        }
        addToCart(product);
        toast.success("Moved to Cart! 🛒");
        handleRemove(product.id); 
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-[80vh] bg-slate-50 dark:bg-[#0a0f1c] transition-colors duration-300">
                <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-gray-900 dark:border-white"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#0a0f1c] py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-300">
            <div className="max-w-7xl mx-auto">
                <div className="flex items-center gap-3 mb-10">
                    <span className="text-4xl">❤️</span>
                    <h1 className="text-4xl font-black text-gray-900 dark:text-white tracking-tight transition-colors duration-300">Your Wishlist</h1>
                </div>

                {wishlistProducts.length === 0 ? (
                    <div className="bg-white dark:bg-[#111827] rounded-3xl p-16 text-center shadow-sm border border-gray-100 dark:border-white/5 max-w-2xl mx-auto transition-colors duration-300">
                        <div className="text-6xl mb-6 opacity-50">🤍</div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3 transition-colors duration-300">Your wishlist is empty</h2>
                        <p className="text-gray-500 dark:text-gray-400 mb-8 font-medium transition-colors duration-300">Save items you like by clicking the heart icon on the shop page.</p>
                        <Link to="/products" className="bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-8 py-3.5 rounded-full font-bold hover:bg-blue-600 dark:hover:bg-gray-200 transition-all shadow-lg inline-block">
                            Explore Products
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                        {wishlistProducts.map((product) => (
                            <div key={product.id} className="group flex flex-col bg-white dark:bg-[#111827] border border-gray-100 dark:border-white/5 rounded-3xl p-5 hover:shadow-xl dark:hover:shadow-blue-900/10 transition-all duration-300">
                                
                                <button onClick={() => handleRemove(product.id)} className="absolute top-8 left-8 z-10 p-2 bg-white/90 dark:bg-black/50 backdrop-blur-sm rounded-full shadow-sm hover:bg-red-50 dark:hover:bg-red-900/50 hover:text-red-500 transition-colors border border-gray-100 dark:border-white/10 group">
                                    <span className="text-xl">🗑️</span>
                                </button>

                                <div className="aspect-square w-full overflow-hidden rounded-2xl bg-gray-50 dark:bg-black/40 mb-6 flex items-center justify-center transition-colors duration-300">
                                    {product.imageUrl ? (
                                        <img src={`http://localhost:8080/uploads/${product.imageUrl}`} alt={product.name} className="h-full w-full object-cover" />
                                    ) : (
                                        <div className="text-6xl">📦</div>
                                    )}
                                </div>
                                
                                <div className="flex-1 flex flex-col justify-between">
                                    <div>
                                        <h3 className="text-lg font-bold text-gray-900 dark:text-white leading-tight mb-2 line-clamp-2 transition-colors duration-300">{product.name}</h3>
                                        <p className="text-xl font-black text-blue-600 dark:text-blue-400 mb-4 transition-colors duration-300">₹{product.price?.toLocaleString()}</p>
                                    </div>
                                    
                                    <button 
                                        onClick={() => handleAddToCart(product)}
                                        disabled={product.stock === 0}
                                        className={`w-full py-3 rounded-xl font-bold text-sm transition-colors duration-300 ${
                                            product.stock === 0 
                                            ? 'bg-gray-200 dark:bg-gray-800 text-gray-500 cursor-not-allowed' 
                                            : 'bg-gray-900 dark:bg-blue-600 text-white hover:bg-blue-600 dark:hover:bg-blue-500'
                                        }`}
                                    >
                                        {product.stock === 0 ? 'Out of Stock' : 'Move to Cart'}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

export default Wishlist;