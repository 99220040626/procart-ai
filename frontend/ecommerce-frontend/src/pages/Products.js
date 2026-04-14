import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom'; 
import API from '../services/api';
import { useCart } from '../context/CartContext';
import toast from 'react-hot-toast';
import { OfflineStorage } from '../services/OfflineStorage';

// ==========================================
// 🌌 CORE OBSERVATION HOOKS
// ==========================================

const useIntersectionObserver = (options = { threshold: 0.1, rootMargin: "0px 0px -50px 0px" }) => {
    const [isVisible, setIsVisible] = useState(false);
    const domRef = useRef(null);
    useEffect(() => {
        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) setIsVisible(true);
        }, options);
        const currentRef = domRef.current;
        if (currentRef) observer.observe(currentRef);
        return () => { if (currentRef) observer.unobserve(currentRef); };
    }, [options]);
    return [domRef, isVisible];
};

// ==========================================
// 🧩 PREMIUM MICRO-COMPONENTS
// ==========================================

const ScrambleText = ({ text }) => {
    const [displayText, setDisplayText] = useState(text);
    const [isHovered, setIsHovered] = useState(false);
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&*';
    
    useEffect(() => {
        if (!isHovered) { setDisplayText(text); return; }
        let iteration = 0;
        const interval = setInterval(() => {
            setDisplayText(text.split('').map((letter, index) => {
                if (index < iteration) return text[index];
                return chars[Math.floor(Math.random() * chars.length)];
            }).join(''));
            if (iteration >= text.length) clearInterval(interval);
            iteration += 1 / 3; 
        }, 30);
        return () => clearInterval(interval);
    }, [isHovered, text]);

    return <span onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)} className="inline-block transition-all">{displayText}</span>;
};

const TiltCard = ({ children, className, depleted }) => {
    const cardRef = useRef(null);
    const [rotation, setRotation] = useState({ x: 0, y: 0 });
    const [isHovered, setIsHovered] = useState(false);

    const handleMouseMove = (e) => {
        if (!cardRef.current) return;
        const rect = cardRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const rotateX = ((y - rect.height / 2) / (rect.height / 2)) * -8; 
        const rotateY = ((x - rect.width / 2) / (rect.width / 2)) * 8;
        setRotation({ x: rotateX, y: rotateY });
    };

    const gradX = (rotation.y / 8) * 50 + 50; 
    const gradY = (rotation.x / -8) * 50 + 50;

    return (
        <div
            ref={cardRef}
            className={`transition-all duration-300 ease-out transform-gpu ${className} ${depleted && isHovered ? 'animate-[glitch_0.3s_infinite]' : ''}`}
            style={{ transform: isHovered && !depleted ? `perspective(1000px) rotateX(${rotation.x}deg) rotateY(${rotation.y}deg) scale3d(1.02, 1.02, 1.02)` : 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)' }}
            onMouseMove={handleMouseMove} onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => { setIsHovered(false); setRotation({ x: 0, y: 0 }); }}
        >
            {children}
            {isHovered && !depleted && (
                <div className="absolute inset-0 pointer-events-none rounded-[inherit] transition-opacity duration-300 z-50 mix-blend-screen hidden md:block"
                     style={{ background: `radial-gradient(600px circle at ${gradX}% ${gradY}%, rgba(6,182,212,0.15), transparent 50%)` }} />
            )}
            {depleted && isHovered && <div className="absolute inset-0 pointer-events-none rounded-[inherit] z-50 bg-[linear-gradient(rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[size:100%_4px] animate-[scan_2s_linear_infinite] opacity-50 mix-blend-overlay hidden md:block"></div>}
        </div>
    );
};

const SkeletonCard = ({ viewMode }) => (
    <div className={`bg-white dark:bg-[#050505] border border-gray-100 dark:border-white/[0.05] rounded-[2rem] sm:rounded-[2.5rem] p-4 sm:p-5 shadow-sm dark:shadow-none animate-pulse ${viewMode === 'list' ? 'flex flex-col sm:flex-row gap-4 sm:gap-6' : 'flex flex-col'}`}>
        <div className={`rounded-xl bg-gray-200 dark:bg-white/5 mb-4 ${viewMode === 'list' ? 'w-full sm:w-48 sm:h-48 mb-0' : 'aspect-square w-full'}`}></div>
        <div className="flex-1 flex flex-col justify-between">
            <div>
                <div className="h-3 bg-gray-200 dark:bg-white/10 rounded-full w-1/3 mb-4"></div>
                <div className="h-6 bg-gray-200 dark:bg-white/10 rounded-full w-3/4 mb-4"></div>
                <div className="h-4 bg-gray-200 dark:bg-white/5 rounded-full w-1/2 mb-6"></div>
            </div>
            <div className="h-12 bg-gray-200 dark:bg-white/5 rounded-2xl w-full mt-auto"></div>
        </div>
    </div>
);

// ==========================================
// 🚀 MAIN PRODUCTS COMPONENT
// ==========================================

export default function Products() {
    // Core State
    const [products, setProducts] = useState([]);
    const [isInitialLoading, setIsInitialLoading] = useState(true);
    const [isFetchingNextPage, setIsFetchingNextPage] = useState(false);
    
    // UI State
    const [showMobileFilters, setShowMobileFilters] = useState(false);
    const [viewMode, setViewMode] = useState('grid'); 
    
    // Simulated Live Data
    const [activeViewers, setActiveViewers] = useState({});
    
    // Filters & Sorting
    const [searchQuery, setSearchQuery] = useState('');
    const [sortType, setSortType] = useState('newest');
    const [wishlist, setWishlist] = useState([]); 
    const [category, setCategory] = useState('All');
    const [minPrice, setMinPrice] = useState(0);
    const [maxPrice, setMaxPrice] = useState(100000);
    const [availableCategories, setAvailableCategories] = useState(['All', 'Electronics', 'Clothing', 'Home', 'Accessories']);

    // Pagination
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [isFiltering, setIsFiltering] = useState(false);

    // Q&A Modal
    const [qaModalProduct, setQaModalProduct] = useState(null); 
    const [qaList, setQaList] = useState([]); 
    const [newQuestion, setNewQuestion] = useState("");

    // Variant Selection
    const [selectedColors, setSelectedColors] = useState({});
    const [selectedSizes, setSelectedSizes] = useState({});
    const [activeImages, setActiveImages] = useState({});

    const { addToCart } = useCart();
    const userId = localStorage.getItem('userId');

    const getImageUrl = (imageName) => {
        if (!imageName) return null;
        if (imageName.startsWith('http')) return imageName;
        return `/uploads/${imageName}`;
    };

    // 📡 API FETCH LOGIC
    const fetchProductsPage = useCallback(async (pageNumber) => {
        if (pageNumber === 0) setIsInitialLoading(true);
        else setIsFetchingNextPage(true); 

        try {
            const res = await API.get(`/products/paged?page=${pageNumber}&size=12`);
            setProducts(prev => {
                // 🚀 FIX: Added fallback empty arrays (|| []) to prevent undefined array crashes
                const newData = pageNumber === 0 ? (res.data?.content || []) : [...prev, ...(res.data?.content || []).filter(newP => !prev.some(p => p.id === newP.id))];
                
                const viewers = {};
                // 🚀 FIX: Added optional chaining (?) to prevent forEach crash if newData is somehow undefined
                newData?.forEach(p => { viewers[p.id] = Math.floor(Math.random() * 42) + 3; });
                setActiveViewers(v => ({...v, ...viewers}));

                return newData;
            });
            // 🚀 FIX: Safely check for .last
            setHasMore(!res.data?.last);
            if (pageNumber === 0) {
                // 🚀 FIX: Safely map through the content
                const uniqueCategories = ['All', ...new Set((res.data?.content || []).map(p => p.category).filter(Boolean))];
                if (uniqueCategories.length > 1) setAvailableCategories(uniqueCategories);
            }
        } catch (error) { toast.error("Network Error: Failed to sync matrix."); } 
        finally { setIsInitialLoading(false); setIsFetchingNextPage(false); }
    }, []);

    const fetchWishlist = useCallback(async () => {
        try {
            if(userId) {
                const response = await API.get(`/wishlist/${userId}`);
                setWishlist(response.data.map(item => item.productId));
            }
        } catch (error) { console.error("Wishlist sync failed", error); }
    }, [userId]);

    useEffect(() => { if (!isFiltering) fetchProductsPage(page); }, [page, isFiltering, fetchProductsPage]);
    useEffect(() => { fetchWishlist(); }, [fetchWishlist]);

    const observer = useRef();
    const lastProductElementRef = useCallback(node => {
        if (isInitialLoading || isFetchingNextPage) return; 
        if (observer.current) observer.current.disconnect(); 
        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && hasMore && !isFiltering) setPage(prevPage => prevPage + 1); 
        });
        if (node) observer.current.observe(node);
    }, [isInitialLoading, isFetchingNextPage, hasMore, isFiltering]);

    // 🎛️ FILTER LOGIC
    const applyFilters = async () => {
        setIsInitialLoading(true); setIsFiltering(true); setShowMobileFilters(false);
        try {
            const res = await API.get(`/products/filter?category=${category}&minPrice=${minPrice}&maxPrice=${maxPrice}`);
            // 🚀 FIX: Added fallback array
            setProducts(res.data || []); setHasMore(false); toast.success("Matrix parameters updated! 🎛️");
        } catch (error) { toast.error("Failed to compile filters."); } 
        finally { setIsInitialLoading(false); }
    };

    const resetFilters = () => {
        setCategory('All'); setMinPrice(0); setMaxPrice(100000); setSearchQuery('');
        setIsFiltering(false); setPage(0); setProducts([]); setShowMobileFilters(false); fetchProductsPage(0);
    };

    // 🛒 INTERACTIONS
    const handleAddToCart = async (product, selectedVariant = null) => {
        const currentStock = selectedVariant ? selectedVariant.variantStock : product.stock;
        if (currentStock <= 0) return toast.error("Asset unavailable. Stock depleted.");

        if (navigator.onLine) {
            addToCart(product, selectedVariant);
            toast.success(
                <div className="flex flex-col">
                    <span className="font-bold text-gray-900 dark:text-white"><ScrambleText text="Asset Secured" /></span>
                    <span className="text-xs text-gray-500 dark:text-cyan-400 font-mono mt-1">{product.name} {selectedVariant ? `[${selectedVariant.size}, ${selectedVariant.color}]` : ''}</span>
                </div>, { duration: 3000, style: { background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', color: '#fff', border: '1px solid rgba(6,182,212,0.2)' } }
            );
        } else {
            try {
                const cleanProduct = JSON.parse(JSON.stringify(product));
                const cleanVariant = selectedVariant ? JSON.parse(JSON.stringify(selectedVariant)) : null;
                await OfflineStorage.saveForSync('ADD_TO_CART', { product: cleanProduct, selectedVariant: cleanVariant });
                toast(<div className="flex flex-col"><span className="font-bold text-blue-500">Offline Mode 📶</span><span className="text-xs text-gray-400">Cached locally for network sync.</span></div>, { icon: '📁' });
                addToCart(product, selectedVariant);
            } catch (err) { toast.error("Cache memory failed."); }
        }
    };

    const toggleWishlist = async (productId) => {
        if (!userId) return toast.error("Authentication required to tag assets.");
        const isSaved = wishlist.includes(productId);
        try {
            if (isSaved) {
                await API.delete(`/wishlist/${userId}/${productId}`);
                setWishlist(wishlist.filter(id => id !== productId));
                toast("Asset removed from watchlist.");
            } else {
                await API.post('/wishlist', { userId: parseInt(userId), productId: productId });
                setWishlist([...wishlist, productId]);
                toast.success("Asset tagged to watchlist! 🎯");
            }
        } catch (error) { toast.error("Database connection failed."); }
    };

    const handleAddReview = async (productId, rating) => {
        if (!userId) return toast.error("Authentication required.");
        try {
            await API.post('/reviews', { userId: parseInt(userId), productId: productId, rating: rating, comment: "Quick Rating" });
            toast.success(`Telemetry recorded: ${rating} Stars ⭐`);
            if(isFiltering) applyFilters(); else fetchProductsPage(0); 
        } catch (error) { toast.error("Transmission failed."); }
    };

    const openQaModal = async (product) => {
        setQaModalProduct(product);
        try {
            const res = await API.get(`/qa/product/${product.id}`);
            setQaList(res.data);
        } catch (err) { toast.error("Failed to connect to comms network."); }
    };

    const submitQuestion = async (e) => {
        e.preventDefault();
        if (!userId) return toast.error("Authentication required.");
        try {
            await API.post('/qa/ask', { productId: qaModalProduct.id, userId: parseInt(userId), customerName: "Operative", question: newQuestion });
            toast.success("Transmission sent to Command Center.");
            setNewQuestion(""); openQaModal(qaModalProduct); 
        } catch (err) { toast.error("Transmission failed."); }
    };

    // 🚀 FIX: Added (products || []) to safeguard the .filter function
    let processedProducts = (products || []).filter(p => p?.name?.toLowerCase().includes(searchQuery.toLowerCase()));
    if (sortType === 'priceLow') processedProducts.sort((a, b) => a.price - b.price);
    else if (sortType === 'priceHigh') processedProducts.sort((a, b) => b.price - a.price);
    else processedProducts.sort((a, b) => b.id - a.id); 

    const [heroRef, heroVisible] = useIntersectionObserver();

    const telemetryData = [
        { label: "LATENCY", value: "0.08ms", color: "blue", darkColor: "cyan" },
        { label: "ENCRYPTION", value: "AES-256", color: "purple", darkColor: "purple" },
        { label: "NODES", value: "42K LIVE", color: "green", darkColor: "emerald" },
        { label: "PACKET DROP", value: "0.00%", color: "red", darkColor: "rose" },
        { label: "UPTIME", value: "99.999%", color: "indigo", darkColor: "indigo" },
        { label: "HASH RATE", value: "480 TH/s", color: "yellow", darkColor: "yellow" },
    ];

    return (
        <div className="min-h-screen bg-[#f8fafc] dark:bg-[#000000] pb-32 pt-4 md:py-12 transition-colors duration-700 relative overflow-hidden">
            
            {/* 🌌 GPU-ACCELERATED DUAL-THEME AMBIENT LAYER */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[-20%] w-[100vw] h-[100vw] sm:w-[60vw] sm:h-[60vw] bg-[radial-gradient(circle,rgba(59,130,246,0.1)_0%,transparent_60%)] dark:bg-[radial-gradient(circle,rgba(6,182,212,0.06)_0%,transparent_60%)] rounded-full blur-[100px] mix-blend-multiply dark:mix-blend-screen animate-pulse" style={{ animationDuration: '8s' }}></div>
                <div className="absolute top-[40%] right-[-20%] w-[90vw] h-[90vw] sm:w-[50vw] sm:h-[50vw] bg-[radial-gradient(circle,rgba(168,85,247,0.1)_0%,transparent_60%)] dark:bg-[radial-gradient(circle,rgba(217,70,239,0.04)_0%,transparent_60%)] rounded-full blur-[100px] mix-blend-multiply dark:mix-blend-screen animate-pulse" style={{ animationDuration: '12s', animationDelay: '2s' }}></div>
                <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.02)_1px,transparent_1px)] dark:bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:64px_64px] sm:bg-[size:100px_100px] [mask-image:radial-gradient(ellipse_100%_100%_at_50%_0%,#000_10%,transparent_80%)]"></div>
            </div>

            {/* 🚀 HEADER */}
            <div ref={heroRef} className={`relative z-10 mb-4 sm:mb-6 text-center max-w-3xl mx-auto pt-4 sm:pt-8 transition-all duration-1000 ${heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
                <div className="inline-flex items-center gap-2 px-4 py-1.5 sm:px-6 sm:py-2 rounded-full bg-white dark:bg-[#050505] border border-gray-200 dark:border-white/[0.08] backdrop-blur-xl mb-4 sm:mb-6 shadow-sm dark:shadow-[0_0_20px_rgba(0,0,0,0.5)] mx-auto">
                    <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-blue-500 dark:bg-cyan-500 animate-pulse shadow-[0_0_10px_#06b6d4]"></span>
                    <span className="text-[8px] sm:text-[10px] font-black tracking-[0.4em] uppercase text-gray-500 dark:text-gray-400">ASSET ARMORY</span>
                </div>
                <h2 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-b from-gray-900 to-gray-500 dark:from-white dark:via-gray-200 dark:to-gray-600 tracking-tighter mb-2 drop-shadow-sm dark:drop-shadow-[0_5px_15px_rgba(0,0,0,1)]">
                    Hardware <span className="text-blue-600 dark:text-transparent dark:bg-clip-text dark:bg-gradient-to-r dark:from-cyan-400 dark:to-purple-500">Matrix.</span>
                </h2>
            </div>

            {/* 📊 TELEMETRY BAR */}
            <div className="relative z-10 border-y border-gray-200 dark:border-white/[0.05] bg-white/80 dark:bg-black/80 backdrop-blur-xl py-3 overflow-hidden mb-6 shadow-sm">
                <div className="absolute inset-0 bg-gradient-to-r from-white via-transparent to-white dark:from-black dark:via-transparent dark:to-black z-10 pointer-events-none"></div>
                <div className="flex w-[400%] sm:w-[200%] animate-[slideLeft_40s_linear_infinite]">
                    {[...telemetryData, ...telemetryData].map((stat, idx) => (
                        <div key={idx} className="flex-1 flex items-center justify-center gap-2 px-4 min-w-[120px] sm:min-w-[150px]">
                            <span className={`w-1.5 h-1.5 bg-${stat.color}-500 dark:bg-${stat.darkColor}-500 rounded-full animate-pulse`}></span>
                            <span className="text-[9px] sm:text-[10px] font-black tracking-widest text-gray-500 dark:text-gray-400 uppercase whitespace-nowrap">
                                {stat.label}: <span className="text-gray-900 dark:text-white">{stat.value}</span>
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* 📱 MOBILE ACTION BAR (iOS Sticky Style) */}
            <div className="relative z-40 lg:hidden flex gap-2 mb-6 sticky top-[64px] sm:top-[80px] bg-[#f8fafc]/90 dark:bg-[#000]/90 backdrop-blur-xl py-3 px-4 -mx-4 border-b border-gray-200 dark:border-white/[0.05]">
                <div className="relative flex-1 group">
                    <span className="absolute left-4 top-3.5 text-gray-400 dark:text-gray-500 text-sm">🔍</span>
                    <input type="text" placeholder="Query Matrix..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-3 rounded-2xl border border-gray-200 dark:border-white/[0.05] bg-white dark:bg-[#050505] text-gray-900 dark:text-white shadow-sm outline-none focus:border-blue-500 dark:focus:border-cyan-500 transition-all font-bold text-sm placeholder-gray-400"/>
                </div>
                <button onClick={() => setShowMobileFilters(true)} className="px-4 bg-white dark:bg-[#050505] border border-gray-200 dark:border-white/[0.05] rounded-2xl shadow-sm text-gray-900 dark:text-white font-bold flex items-center gap-2 active:scale-95 transition-transform">🎛️</button>
            </div>

            <div className="relative z-10 max-w-[100rem] mx-auto flex flex-col lg:flex-row gap-8 px-4 sm:px-6 lg:px-8">
                
                {/* 🎛️ COMMAND CONSOLE (Mobile Bottom Sheet & Desktop Sidebar) */}
                <div className={`fixed inset-0 z-50 bg-black/60 backdrop-blur-sm lg:relative lg:bg-transparent lg:z-0 transition-opacity duration-300 ${showMobileFilters ? 'opacity-100 visible' : 'opacity-0 invisible lg:opacity-100 lg:visible'}`}>
                    <div className={`absolute bottom-0 w-full h-[85vh] bg-white dark:bg-[#050505] rounded-t-[2.5rem] lg:relative lg:h-auto lg:w-72 lg:rounded-[2.5rem] p-6 sm:p-8 shadow-2xl lg:shadow-xl dark:shadow-[0_0_50px_rgba(0,0,0,0.9)] border border-gray-100 dark:border-white/[0.05] lg:sticky lg:top-28 transition-transform duration-300 transform ${showMobileFilters ? 'translate-y-0' : 'translate-y-full lg:translate-y-0'} flex flex-col`}>
                        
                        {/* Mobile Drag Handle */}
                        <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-700 rounded-full mx-auto mb-6 lg:hidden"></div>

                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2 tracking-tighter"><ScrambleText text="PARAMETERS" /></h2>
                            <button onClick={() => setShowMobileFilters(false)} className="lg:hidden text-gray-400 hover:text-gray-900 dark:hover:text-white text-xl font-bold bg-gray-100 dark:bg-white/10 w-8 h-8 rounded-full flex items-center justify-center">✕</button>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                            <div className="mb-8">
                                <h3 className="text-[10px] font-black text-blue-600 dark:text-cyan-500 uppercase tracking-[0.2em] mb-4">Classification</h3>
                                <div className="flex flex-wrap gap-2">
                                    {availableCategories.map(cat => (
                                        <button key={cat} onClick={() => setCategory(cat)} 
                                            className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all border ${category === cat ? 'bg-blue-600 dark:bg-cyan-500 text-white dark:text-black border-blue-600 dark:border-cyan-400 shadow-[0_0_15px_rgba(59,130,246,0.4)] dark:shadow-[0_0_15px_rgba(6,182,212,0.4)] scale-105' : 'bg-gray-50 dark:bg-white/[0.02] text-gray-500 dark:text-gray-400 border-gray-200 dark:border-white/[0.05] active:bg-gray-100 dark:active:bg-white/[0.05]'}`}>
                                            {cat}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="mb-8">
                                <h3 className="text-[10px] font-black text-purple-600 dark:text-purple-500 uppercase tracking-[0.2em] mb-4">Value Threshold (₹)</h3>
                                <div className="flex items-center gap-3">
                                    <div className="relative w-full group">
                                        <span className="absolute left-3 top-3 text-[10px] font-black text-gray-400 group-focus-within:text-purple-500 transition-colors">MIN</span>
                                        <input type="number" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} className="w-full p-3 pt-7 rounded-2xl border border-gray-200 dark:border-white/[0.05] bg-gray-50 dark:bg-[#0a0a0a] text-gray-900 dark:text-white text-sm outline-none focus:border-purple-500 dark:focus:border-purple-400 font-bold transition-colors shadow-inner"/>
                                        <div className="h-1 w-full bg-gray-200 dark:bg-white/10 mt-2 rounded-full overflow-hidden"><div className="h-full bg-purple-500" style={{width: `${(minPrice/100000)*100}%`}}></div></div>
                                    </div>
                                    <div className="relative w-full group">
                                        <span className="absolute left-3 top-3 text-[10px] font-black text-gray-400 group-focus-within:text-purple-500 transition-colors">MAX</span>
                                        <input type="number" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} className="w-full p-3 pt-7 rounded-2xl border border-gray-200 dark:border-white/[0.05] bg-gray-50 dark:bg-[#0a0a0a] text-gray-900 dark:text-white text-sm outline-none focus:border-purple-500 dark:focus:border-purple-400 font-bold transition-colors shadow-inner"/>
                                        <div className="h-1 w-full bg-gray-200 dark:bg-white/10 mt-2 rounded-full overflow-hidden"><div className="h-full bg-purple-500" style={{width: `${(maxPrice/100000)*100}%`}}></div></div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col gap-3 pt-4 border-t border-gray-100 dark:border-white/[0.05] mt-auto pb-safe">
                            <button onClick={applyFilters} className="w-full bg-gray-900 dark:bg-white text-white dark:text-black font-black py-4 rounded-2xl transition-transform active:scale-95 shadow-lg dark:shadow-[0_0_20px_rgba(255,255,255,0.2)]">Execute Compile</button>
                            <button onClick={resetFilters} className="w-full bg-gray-100 dark:bg-white/[0.05] text-gray-600 dark:text-gray-300 font-bold py-4 rounded-2xl transition-transform active:scale-95">Purge Cache</button>
                        </div>
                    </div>
                </div>

                {/* 🛍️ THE ASSET MATRIX */}
                <div className="flex-1 flex flex-col min-h-screen">
                    
                    {/* Desktop Command Bar */}
                    <div className="hidden lg:flex bg-white/80 dark:bg-[#050505]/80 backdrop-blur-3xl p-3 rounded-2xl border border-gray-100 dark:border-white/[0.05] mb-8 justify-between items-center shadow-sm dark:shadow-[0_0_30px_rgba(0,0,0,0.8)]">
                        <div className="flex items-center gap-4">
                            <div className="relative w-[28rem]">
                                <span className="absolute left-4 top-3.5 text-gray-400">🔍</span>
                                <input type="text" placeholder="Query asset database..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-12 pr-4 py-3 rounded-xl bg-gray-50 dark:bg-[#0a0a0a] border border-transparent dark:border-white/[0.02] text-gray-900 dark:text-white focus:ring-1 focus:ring-blue-500 dark:focus:ring-cyan-500 outline-none transition-all font-bold text-sm"/>
                            </div>
                            <div className="bg-gray-100 dark:bg-[#0a0a0a] rounded-xl p-1 flex border border-gray-200 dark:border-white/[0.02]">
                                <button onClick={()=>setViewMode('grid')} className={`p-2 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-white dark:bg-[#222] shadow-sm text-blue-600 dark:text-cyan-400' : 'text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}>⊞</button>
                                <button onClick={()=>setViewMode('list')} className={`p-2 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-white dark:bg-[#222] shadow-sm text-blue-600 dark:text-cyan-400' : 'text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}>⊟</button>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-4">
                            <span className="text-[10px] font-black tracking-widest text-gray-400 uppercase hidden xl:block"><ScrambleText text={`${processedProducts.length} ASSETS ONLINE`} /></span>
                            <select value={sortType} onChange={(e) => setSortType(e.target.value)} className="px-5 py-3 rounded-xl bg-gray-50 dark:bg-[#0a0a0a] border border-transparent dark:border-white/[0.02] font-black text-sm text-gray-700 dark:text-gray-300 outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer transition-colors">
                                <option value="newest">TIMESTAMP: NEWEST</option>
                                <option value="priceLow">VALUE: ASCENDING</option>
                                <option value="priceHigh">VALUE: DESCENDING</option>
                            </select>
                        </div>
                    </div>

                    {/* Dynamic Rendering */}
                    {isInitialLoading ? (
                        <div className={`grid gap-4 sm:gap-6 ${viewMode === 'list' ? 'grid-cols-1 xl:grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-3'}`}>
                            {[...Array(6)].map((_, i) => <SkeletonCard key={i} viewMode={viewMode} />)}
                        </div>
                    ) : processedProducts.length === 0 ? (
                        <div className="bg-white/80 dark:bg-[#050505]/80 backdrop-blur-3xl rounded-[2rem] sm:rounded-[3rem] p-10 sm:p-16 text-center border border-gray-100 dark:border-white/[0.05] shadow-2xl mt-6 sm:mt-10">
                            <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-6 bg-gray-100 dark:bg-white/5 rounded-full flex items-center justify-center text-3xl sm:text-4xl shadow-inner border border-gray-200 dark:border-white/10">⚠️</div>
                            <h2 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white mb-4 tracking-tight"><ScrambleText text="NULL RESPONSE" /></h2>
                            <p className="text-sm sm:text-base text-gray-500 font-medium mb-8 max-w-md mx-auto">The matrix returned zero assets matching your parameters. Purge filters to retry.</p>
                            <button onClick={resetFilters} className="bg-blue-600 dark:bg-cyan-500 text-white dark:text-black font-black px-8 py-4 sm:px-10 rounded-full active:scale-95 transition-transform shadow-lg shadow-blue-500/30 dark:shadow-[0_0_20px_rgba(6,182,212,0.4)]">Initialize Purge</button>
                        </div>
                    ) : (
                        <div className={`grid gap-4 sm:gap-6 lg:gap-8 ${viewMode === 'list' ? 'grid-cols-1 xl:grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-3'}`}>
                            {processedProducts.map((product, index) => {
                                const isSaved = wishlist.includes(product.id);
                                const isLastElement = processedProducts.length === index + 1;
                                
                                const hasVariants = product.variants && product.variants.length > 0;
                                const colors = hasVariants ? [...new Set(product.variants.map(v => v.color))] : [];
                                const sizes = hasVariants ? [...new Set(product.variants.map(v => v.size))] : [];
                                
                                const activeColor = selectedColors[product.id] || colors[0];
                                const activeSize = selectedSizes[product.id] || sizes[0];
                                const currentVariant = hasVariants ? product.variants.find(v => v.color === activeColor && v.size === activeSize) : null;
                                
                                const displayStock = currentVariant ? currentVariant.variantStock : product.stock;
                                const displayImage = activeImages[product.id] || (currentVariant?.variantImageUrl || product.imageUrl);
                                
                                const viewers = activeViewers[product.id] || 3;

                                return (
                                    <TiltCard key={product.id} depleted={displayStock === 0} className={`group relative flex bg-white dark:bg-[#050505] border border-gray-100 dark:border-white/[0.05] rounded-[2rem] sm:rounded-[2.5rem] p-4 sm:p-5 shadow-sm hover:shadow-xl dark:shadow-[0_5px_20px_rgba(0,0,0,0.8)] dark:hover:shadow-[0_0_40px_rgba(6,182,212,0.15)] transition-all duration-500 md:hover:-translate-y-2 dark:md:hover:border-cyan-500/30 animate-[fadeIn_0.5s_ease-out_backwards] ${viewMode === 'list' ? 'flex-col sm:flex-row gap-4 sm:gap-6' : 'flex-col'}`} style={{animationDelay: `${index * 0.05}s`}}>
                                        
                                        <div className="absolute inset-0 rounded-[2rem] sm:rounded-[2.5rem] pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-700 dark:bg-gradient-to-b dark:from-cyan-500/5 dark:to-transparent blur-xl hidden md:block"></div>

                                        <div className={`relative overflow-hidden rounded-2xl sm:rounded-[1.5rem] bg-gray-50 dark:bg-[#0a0a0a] shadow-inner border border-transparent dark:border-white/[0.02] flex-shrink-0 ${viewMode === 'list' ? 'w-full sm:w-48 sm:h-48 mb-2 sm:mb-0' : 'aspect-square w-full mb-4 sm:mb-6'}`}>
                                            
                                            <button onClick={() => toggleWishlist(product.id)} className="absolute top-3 left-3 sm:top-4 sm:left-4 z-30 p-2.5 sm:p-3 bg-white/90 dark:bg-[#000]/60 backdrop-blur-md border border-gray-200 dark:border-white/10 rounded-full shadow-md active:scale-90 transition-transform md:hover:scale-110">
                                                <svg className={`w-4 h-4 sm:w-5 sm:h-5 ${isSaved ? 'text-red-500 fill-current drop-shadow-[0_0_5px_rgba(239,68,68,0.8)]' : 'text-gray-400 dark:text-gray-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path></svg>
                                            </button>

                                            <div className="absolute bottom-3 left-3 sm:bottom-4 sm:left-4 z-30 bg-black/70 backdrop-blur-md border border-white/10 text-white text-[8px] sm:text-[9px] font-bold tracking-widest px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full flex items-center gap-1.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                                                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-ping"></span> {viewers} VIEWING
                                            </div>

                                            {displayStock > 0 && displayStock <= 5 && (
                                                <div className="absolute top-3 right-3 sm:top-4 sm:right-4 z-30 bg-orange-500/90 backdrop-blur-sm border border-orange-400 text-white text-[8px] sm:text-[9px] font-black uppercase tracking-[0.2em] px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full shadow-[0_0_15px_rgba(249,115,22,0.5)] animate-pulse pointer-events-none">Low: {displayStock}</div>
                                            )}
                                            {displayStock === 0 && (
                                                <div className="absolute top-3 right-3 sm:top-4 sm:right-4 z-30 bg-red-500/90 backdrop-blur-sm border border-red-400 text-white text-[8px] sm:text-[9px] font-black uppercase tracking-[0.2em] px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full shadow-[0_0_15px_rgba(239,68,68,0.5)] pointer-events-none">Depleted</div>
                                            )}

                                            <Link to={`/product/${product.id}`} className="w-full h-full flex items-center justify-center">
                                                {displayImage ? (
                                                    <img src={getImageUrl(displayImage)} alt={product.name} className={`h-full w-full object-cover transition-transform duration-700 sm:group-hover:scale-110 ${displayStock === 0 ? 'grayscale opacity-50 dark:opacity-30' : ''}`} loading="lazy"/>
                                                ) : <div className="text-4xl sm:text-6xl opacity-50 flex items-center justify-center h-full w-full pointer-events-none">📦</div>}
                                            </Link>
                                        </div>
                                        
                                        <div className="flex-1 flex flex-col justify-between relative z-10">
                                            <div>
                                                <div className="flex justify-between items-start mb-2">
                                                    <p className="text-[8px] sm:text-[9px] font-black text-blue-600 dark:text-cyan-500 uppercase tracking-[0.3em]">{product.category || 'Gear'}</p>
                                                    <div className="flex items-center gap-1 group/rating">
                                                        <div className="flex -space-x-1 cursor-pointer">
                                                            {[1, 2, 3, 4, 5].map(star => (
                                                                <span key={star} onClick={(e) => { e.preventDefault(); handleAddReview(product.id, star); }} className={`text-xs transition-transform active:scale-125 sm:hover:-translate-y-1 ${star <= Math.round(product.averageRating || 0) ? 'text-yellow-400 dark:text-yellow-500 drop-shadow-[0_0_5px_rgba(234,179,8,0.5)]' : 'text-gray-200 dark:text-gray-800'}`}>★</span>
                                                            ))}
                                                        </div>
                                                        <span className="text-[9px] sm:text-[10px] font-bold text-gray-400 ml-1">({product.reviewCount || 0})</span>
                                                    </div>
                                                </div>
                                                
                                                <Link to={`/product/${product.id}`}>
                                                    <h3 className={`font-black text-gray-900 dark:text-white leading-tight mb-2 sm:mb-3 transition-colors duration-300 hover:text-blue-600 dark:hover:text-cyan-400 tracking-tight ${viewMode === 'list' ? 'text-xl sm:text-2xl line-clamp-2 sm:line-clamp-2' : 'text-lg sm:text-xl line-clamp-2'}`}>
                                                        {product.name}
                                                    </h3>
                                                </Link>
                                                
                                                {viewMode === 'list' && <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mb-4 line-clamp-2 hidden sm:block">{product.description || "Premium high-fidelity asset engineered for absolute performance. Secured via quantum encryption."}</p>}

                                                {hasVariants && (
                                                    <div className="space-y-3 mb-4 bg-gray-50 dark:bg-[#0a0a0a] p-2.5 sm:p-3 rounded-2xl border border-gray-100 dark:border-white/[0.02]">
                                                        <div className="flex flex-wrap gap-2 sm:gap-2.5">
                                                            {colors.map(c => (
                                                                <button key={c} onClick={(e) => {
                                                                    e.preventDefault(); setSelectedColors(prev => ({...prev, [product.id]: c}));
                                                                    const v = product.variants.find(vx => vx.color === c);
                                                                    if(v && v.variantImageUrl) setActiveImages(prev => ({...prev, [product.id]: v.variantImageUrl}));
                                                                }}
                                                                className={`relative w-6 h-6 sm:w-7 sm:h-7 rounded-full transition-all duration-300 flex items-center justify-center cursor-pointer ${activeColor === c ? 'scale-110 shadow-[0_0_10px_rgba(0,0,0,0.1)] dark:shadow-[0_0_10px_rgba(255,255,255,0.2)]' : 'active:scale-95 sm:hover:scale-105 opacity-60 hover:opacity-100'}`}>
                                                                    <span className="absolute inset-0 rounded-full" style={{ backgroundColor: c.toLowerCase() }}></span>
                                                                    {activeColor === c && <span className="absolute inset-[-3px] sm:inset-[-4px] rounded-full border-[1.5px] sm:border-2 border-gray-900 dark:border-white opacity-50 pointer-events-none"></span>}
                                                                </button>
                                                            ))}
                                                        </div>
                                                        <div className="flex gap-2 flex-wrap">
                                                            {sizes.map(s => (
                                                                <button key={s} onClick={(e) => { e.preventDefault(); setSelectedSizes(prev => ({...prev, [product.id]: s})); }}
                                                                className={`px-3 py-1.5 sm:py-1 text-[9px] sm:text-[10px] font-black uppercase tracking-widest rounded-lg transition-all active:scale-95 cursor-pointer ${activeSize === s ? 'bg-gray-900 text-white dark:bg-white dark:text-black shadow-md' : 'bg-white dark:bg-[#111] border border-gray-200 dark:border-white/10 text-gray-500 sm:hover:border-gray-400 dark:sm:hover:border-white/30'}`}>
                                                                    {s}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                                
                                                <div className="flex items-end justify-between mb-4 sm:mb-5">
                                                    <div>
                                                        <p className="text-[8px] sm:text-[9px] font-bold text-gray-400 tracking-widest uppercase mb-0.5">Asset Value</p>
                                                        <p className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white tracking-tighter">₹{product.price?.toLocaleString()}</p>
                                                    </div>
                                                    {displayStock > 0 && (
                                                        <div className="text-right">
                                                            <p className="text-[8px] sm:text-[9px] font-bold text-gray-400 tracking-widest uppercase mb-0.5">Est. Dispatch</p>
                                                            <p className="text-[10px] sm:text-xs font-black text-emerald-600 dark:text-emerald-400 font-mono tracking-wider">{Math.floor(Math.random() * 24 + 1)}h {Math.floor(Math.random() * 60)}m</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex gap-2 sm:gap-3 mt-auto">
                                                <button onClick={() => openQaModal(product)} className="w-12 sm:w-14 bg-gray-100 dark:bg-white/[0.05] border border-transparent dark:border-white/[0.05] text-gray-600 dark:text-gray-300 rounded-[1rem] sm:rounded-2xl flex items-center justify-center active:scale-95 transition-all sm:hover:bg-gray-200 dark:sm:hover:bg-white/10 cursor-pointer" title="Comms Channel">💬</button>
                                                <button onClick={() => handleAddToCart(product, currentVariant)} disabled={displayStock === 0} 
                                                    className={`flex-1 py-3 sm:py-3.5 rounded-[1rem] sm:rounded-2xl font-black text-xs sm:text-sm active:scale-95 transition-all duration-300 ${displayStock === 0 ? 'bg-gray-100 dark:bg-[#111] text-gray-400 dark:text-gray-600 border border-gray-200 dark:border-white/5 shadow-none cursor-not-allowed' : 'bg-blue-600 dark:bg-cyan-500 text-white dark:text-black sm:hover:bg-blue-700 dark:sm:hover:bg-cyan-400 shadow-md sm:shadow-lg shadow-blue-500/20 dark:shadow-[0_0_20px_rgba(6,182,212,0.4)] cursor-pointer'}`}>
                                                    {displayStock === 0 ? 'DEPLETED' : 'SECURE ASSET'}
                                                </button>
                                            </div>
                                        </div>
                                        <div ref={isLastElement ? lastProductElementRef : null} className="absolute bottom-0 w-full h-1 pointer-events-none"></div>
                                    </TiltCard>
                                );
                            })}
                        </div>
                    )}

                    {isFetchingNextPage && <div className="flex justify-center py-8 sm:py-12"><div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-blue-600 dark:border-cyan-500"></div></div>}
                    {!hasMore && !isInitialLoading && !isFiltering && processedProducts.length > 0 && <div className="text-center py-10 sm:py-16 text-[9px] sm:text-[10px] text-gray-400 font-black uppercase tracking-[0.4em]"><ScrambleText text="END OF TRANSMISSION" /></div>}
                </div>
            </div>

            {/* 🚀 COMMAND CENTER Q&A MODAL */}
            {qaModalProduct && (
                <div className="fixed inset-0 z-[100] bg-black/60 dark:bg-black/90 backdrop-blur-sm sm:backdrop-blur-xl flex items-end lg:items-center justify-center sm:p-4 transition-opacity animate-[fadeIn_0.3s_ease-out]">
                    <div className="bg-white dark:bg-[#050505] border border-gray-200 dark:border-white/10 w-full max-w-3xl rounded-t-[2rem] lg:rounded-[3rem] overflow-hidden shadow-2xl dark:shadow-[0_0_100px_rgba(0,0,0,0.9)] flex flex-col h-[85vh] animate-[slideUp_0.3s_ease-out]">
                        
                        <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-700 rounded-full mx-auto mt-4 mb-2 lg:hidden"></div>

                        <div className="p-4 sm:p-8 border-b border-gray-100 dark:border-white/[0.05] flex justify-between items-center bg-white dark:bg-[#0a0a0a] relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 dark:bg-cyan-500/10 blur-2xl pointer-events-none hidden sm:block"></div>
                            <div className="relative z-10">
                                <h2 className="text-[10px] sm:text-xs font-black text-blue-600 dark:text-cyan-500 uppercase tracking-[0.2em] sm:tracking-[0.3em] mb-1">Secure Comms Channel</h2>
                                <h3 className="text-lg sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight line-clamp-1">{qaModalProduct.name}</h3>
                            </div>
                            <button onClick={() => setQaModalProduct(null)} className="relative z-10 text-gray-500 hover:text-gray-900 dark:hover:text-white text-lg sm:text-xl font-bold bg-gray-100 dark:bg-white/[0.05] border border-gray-200 dark:border-white/10 w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center shadow-sm transition-colors cursor-pointer">✕</button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-4 sm:space-y-6 custom-scrollbar bg-gray-50 dark:bg-transparent">
                            {qaList.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-center opacity-50">
                                    <div className="text-4xl mb-4">📡</div>
                                    <p className="text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] text-gray-500"><ScrambleText text="Channel Empty. Awaiting transmission." /></p>
                                </div>
                            ) : (
                                qaList.map(qa => (
                                    <div key={qa.id} className="border-b border-gray-200 dark:border-white/[0.05] pb-4 sm:pb-6 last:border-0 last:pb-0">
                                        <div className="flex gap-3 sm:gap-4 mb-2 sm:mb-3">
                                            <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 flex items-center justify-center text-[10px] sm:text-xs shadow-sm">👤</div>
                                            <div>
                                                <p className="text-[9px] sm:text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5 sm:mb-1">Operative Query</p>
                                                <p className="font-bold text-gray-900 dark:text-white text-xs sm:text-sm md:text-base leading-relaxed">{qa.question}</p>
                                            </div>
                                        </div>
                                        {qa.answer ? (
                                            <div className="ml-9 sm:ml-12 bg-blue-50 dark:bg-cyan-500/5 border border-blue-100 dark:border-cyan-500/20 p-3 sm:p-4 rounded-xl sm:rounded-2xl relative">
                                                <p className="text-[9px] sm:text-[10px] font-black text-blue-600 dark:text-cyan-400 uppercase tracking-[0.2em] mb-1.5 sm:mb-2 flex items-center gap-1.5 sm:gap-2"><span className="w-1.5 h-1.5 bg-blue-600 dark:bg-cyan-400 rounded-full animate-pulse"></span> Command Response</p>
                                                <p className="text-gray-700 dark:text-gray-300 font-medium text-xs sm:text-sm leading-relaxed">{qa.answer}</p>
                                            </div>
                                        ) : (
                                            <p className="ml-9 sm:ml-12 text-[10px] sm:text-xs font-bold text-gray-400 animate-pulse">Processing transmission...</p>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>

                        <form onSubmit={submitQuestion} className="p-4 sm:p-6 border-t border-gray-200 dark:border-white/[0.05] bg-white dark:bg-[#0a0a0a] flex gap-2 sm:gap-4 pb-safe relative z-10 shadow-[0_-10px_20px_rgba(0,0,0,0.05)] dark:shadow-none">
                            <input type="text" required value={newQuestion} onChange={(e) => setNewQuestion(e.target.value)} placeholder="Transmit query..." 
                                className="flex-1 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#050505] text-gray-900 dark:text-white outline-none focus:border-blue-500 dark:focus:border-cyan-500 shadow-inner font-medium text-xs sm:text-sm transition-colors cursor-text"/>
                            <button type="submit" className="bg-gray-900 dark:bg-white text-white dark:text-black font-black px-6 sm:px-8 py-3 sm:py-4 rounded-xl sm:rounded-2xl transition-transform active:scale-95 shadow-md dark:shadow-[0_0_20px_rgba(255,255,255,0.2)] cursor-pointer text-xs sm:text-sm">SEND</button>
                        </form>
                    </div>
                </div>
            )}

            <style dangerouslySetInnerHTML={{__html: `
                @keyframes slideUp { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
                @keyframes gradientMove { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes slideLeft { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
                @keyframes scan { 0% { transform: translateY(-100%); } 100% { transform: translateY(100%); } }
                @keyframes glitch { 0% { transform: translate(0) } 20% { transform: translate(-2px, 2px) } 40% { transform: translate(-2px, -2px) } 60% { transform: translate(2px, 2px) } 80% { transform: translate(2px, -2px) } 100% { transform: translate(0) } }
                @keyframes scrollWheel { 0% { transform: translateY(0); opacity: 1; } 100% { transform: translateY(12px); opacity: 0; } }
                .pb-safe { padding-bottom: env(safe-area-inset-bottom, 80px); }
            `}} />
        </div>
    );
}