import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import API from '../services/api';
import { useCart } from '../context/CartContext';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

// ==========================================
// 🧩 CONSTANTS & HELPERS
// ==========================================
const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1560393464-5c69a73c5770?q=80&w=800&auto=format&fit=crop';
const BACKEND_URL = 'https://procart-ai.onrender.com';

const getImageUrl = (url) => {
    if (!url) return FALLBACK_IMAGE;
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:image')) {
        return url;
    }
    return `${BACKEND_URL}/uploads/${url}`;
};

// ==========================================
// 🧩 PREMIUM TEXT EFFECT (Memoized)
// ==========================================
const ScrambleText = memo(({ text }) => {
    const [displayText, setDisplayText] = useState(text);
    const [isHovered, setIsHovered] = useState(false);
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    
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

    return (
        <span 
            onMouseEnter={() => setIsHovered(true)} 
            onMouseLeave={() => setIsHovered(false)} 
            className="inline-block transition-all cursor-default"
        >
            {displayText}
        </span>
    );
});

// ==========================================
// 🔍 HIGH-RES ZOOM LENS COMPONENT
// ==========================================
const ImageMagnifier = memo(({ src, alt, isFading }) => {
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [showMagnifier, setShowMagnifier] = useState(false);
    const [imgSrc, setImgSrc] = useState(src);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        setImgSrc(src);
        setIsLoaded(false);
    }, [src]);

    const handleMouseMove = useCallback((e) => {
        const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
        const x = ((e.pageX - left) / width) * 100;
        const y = ((e.pageY - top) / height) * 100;
        setPosition({ x, y });
    }, []);

    return (
        <div 
            className={`relative w-full h-full overflow-hidden transition-all duration-500 ease-in-out ${isFading ? 'opacity-0 scale-95' : 'opacity-100 scale-100'} cursor-crosshair rounded-[2rem]`}
            onMouseEnter={() => setShowMagnifier(true)}
            onMouseLeave={() => setShowMagnifier(false)}
            onMouseMove={handleMouseMove}
        >
            {!isLoaded && (
                <div className="absolute inset-0 bg-neutral-200 dark:bg-neutral-800 animate-pulse rounded-[2rem]" />
            )}
            <img 
                src={imgSrc} 
                alt={alt} 
                onLoad={() => setIsLoaded(true)}
                onError={() => { setImgSrc(FALLBACK_IMAGE); setIsLoaded(true); }}
                className={`w-full h-full object-contain transition-opacity duration-700 ${isLoaded ? 'opacity-100' : 'opacity-0'}`} 
                loading="eager" 
                decoding="async"
            />
            
            <div 
                className="absolute inset-0 z-50 bg-no-repeat pointer-events-none hidden md:block transition-opacity duration-300 ease-out rounded-[2rem]"
                style={{
                    opacity: showMagnifier && isLoaded ? 1 : 0,
                    backgroundImage: `url(${imgSrc})`,
                    backgroundPosition: `${position.x}% ${position.y}%`,
                    backgroundSize: '250%',
                    backgroundColor: 'transparent'
                }}
            />
        </div>
    );
});

// ==========================================
// 🖼️ PURE EXPLORATION MODE (FULL-SCREEN LIGHTBOX)
// ==========================================
const FullScreenGalleryModal = memo(({ images, startIndex, onClose }) => {
    const [currentIndex, setCurrentIndex] = useState(startIndex);
    
    const prevImage = useCallback((e) => { 
        e.stopPropagation(); 
        setCurrentIndex(prev => (prev === 0 ? images.length - 1 : prev - 1)); 
    }, [images.length]);
    
    const nextImage = useCallback((e) => { 
        e.stopPropagation(); 
        setCurrentIndex(prev => (prev === images.length - 1 ? 0 : prev + 1)); 
    }, [images.length]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'ArrowLeft') prevImage(e);
            else if (e.key === 'ArrowRight') nextImage(e);
            else if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        document.body.style.overflow = 'hidden'; 
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = 'unset'; 
        };
    }, [prevImage, nextImage, onClose]);

    return (
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-2xl flex flex-col" 
            onClick={onClose}
        >
            <div className="flex justify-between items-center p-6 border-b border-white/10">
                <span className="text-[10px] font-black text-white/50 uppercase tracking-[0.4em]">
                    Image {currentIndex + 1} of {images.length}
                </span>
                <button 
                    onClick={onClose} 
                    className="w-12 h-12 rounded-full flex items-center justify-center bg-white/10 text-white font-bold text-xl hover:bg-white/20 active:scale-95 transition-all"
                >✕</button>
            </div>

            <div className="flex-1 flex items-center justify-center p-4 sm:p-10 lg:p-16 relative">
                <button onClick={prevImage} className="absolute left-6 w-14 h-14 rounded-full flex items-center justify-center bg-white/5 border border-white/10 text-white hover:bg-white/20 active:scale-95 transition-all z-20 group backdrop-blur-md">
                    <span className="text-xl transition-transform group-hover:-translate-x-1">←</span>
                </button>

                <AnimatePresence mode="wait">
                    <motion.div 
                        key={currentIndex}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 1.05 }}
                        transition={{ duration: 0.3 }}
                        className="max-w-[85vw] max-h-[75vh] w-full h-full flex items-center justify-center" 
                        onClick={(e) => e.stopPropagation()}
                    >
                        <img 
                            src={getImageUrl(images[currentIndex])} 
                            alt="Full Screen Product View" 
                            className="max-w-full max-h-full object-contain drop-shadow-2xl" 
                            loading="lazy"
                            onError={(e) => e.target.src = FALLBACK_IMAGE}
                        />
                    </motion.div>
                </AnimatePresence>

                <button onClick={nextImage} className="absolute right-6 w-14 h-14 rounded-full flex items-center justify-center bg-white/5 border border-white/10 text-white hover:bg-white/20 active:scale-95 transition-all z-20 group backdrop-blur-md">
                    <span className="text-xl transition-transform group-hover:translate-x-1">→</span>
                </button>
            </div>

            <div className="p-6 border-t border-white/10 flex justify-center pb-safe">
                <div className="inline-flex gap-3 bg-white/5 p-3 rounded-3xl border border-white/10 backdrop-blur-md">
                    {images.map((img, idx) => (
                        <button 
                            key={idx} 
                            onClick={(e) => { e.stopPropagation(); setCurrentIndex(idx); }} 
                            className={`relative w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 transition-all border-2 ${currentIndex === idx ? 'border-white scale-110 shadow-[0_0_20px_rgba(255,255,255,0.3)]' : 'border-transparent hover:border-white/30 opacity-50 hover:opacity-100'}`}
                        >
                            <img src={getImageUrl(img)} alt="Thumbnail" className="w-full h-full object-cover" loading="lazy" onError={(e) => e.target.src = FALLBACK_IMAGE} />
                        </button>
                    ))}
                </div>
            </div>
        </motion.div>
    );
});

// ==========================================
// 💀 PREMIUM SKELETON LOADER
// ==========================================
const ProductSkeleton = () => (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 pt-6 pb-32 md:py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
            <div className="w-48 h-6 bg-neutral-200 dark:bg-neutral-800 rounded-full animate-pulse mb-10"></div>
            <div className="bg-white dark:bg-neutral-900 rounded-[3rem] shadow-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden mb-12 flex flex-col lg:flex-row min-h-[600px]">
                <div className="w-full lg:w-1/2 p-8 lg:p-12 flex flex-col items-center justify-center border-b lg:border-b-0 lg:border-r border-neutral-200 dark:border-neutral-800">
                    <div className="w-full max-w-md aspect-square bg-neutral-200 dark:bg-neutral-800 rounded-[2rem] animate-pulse mb-6"></div>
                    <div className="flex gap-4">
                        {[1,2,3].map(i => <div key={i} className="w-20 h-20 bg-neutral-200 dark:bg-neutral-800 rounded-2xl animate-pulse"></div>)}
                    </div>
                </div>
                <div className="w-full lg:w-1/2 p-8 lg:p-16 flex flex-col justify-center">
                    <div className="w-24 h-6 bg-neutral-200 dark:bg-neutral-800 rounded-full animate-pulse mb-6"></div>
                    <div className="w-3/4 h-12 bg-neutral-200 dark:bg-neutral-800 rounded-xl animate-pulse mb-4"></div>
                    <div className="w-1/2 h-12 bg-neutral-200 dark:bg-neutral-800 rounded-xl animate-pulse mb-8"></div>
                    <div className="w-full h-24 bg-neutral-200 dark:bg-neutral-800 rounded-xl animate-pulse mb-10"></div>
                    <div className="flex gap-4">
                        <div className="w-32 h-14 bg-neutral-200 dark:bg-neutral-800 rounded-2xl animate-pulse"></div>
                        <div className="flex-1 h-14 bg-neutral-200 dark:bg-neutral-800 rounded-2xl animate-pulse"></div>
                    </div>
                </div>
            </div>
        </div>
    </div>
);

// ==========================================
// 🚀 MAIN PRODUCT DETAIL COMPONENT
// ==========================================
function ProductDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { addToCart } = useCart();
    
    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [mainImage, setMainImage] = useState('');
    const [isFading, setIsFading] = useState(false);
    const [quantity, setQuantity] = useState(1);
    const [show3D, setShow3D] = useState(false);
    const [activeViewers, setActiveViewers] = useState(0);

    const [isFullGalleryOpen, setIsFullGalleryOpen] = useState(false);
    const [fullGalleryStartIndex, setFullGalleryStartIndex] = useState(0);

    useEffect(() => {
        const fetchProduct = async () => {
            try {
                setLoading(true);
                const res = await API.get(`/products/${id}`);
                setProduct(res.data);
                setMainImage(res.data.imageUrl);
                setActiveViewers(Math.floor(Math.random() * 45) + 5); 
            } catch (err) {
                toast.error("Product not found!");
                navigate('/products', { replace: true });
            } finally {
                setLoading(false);
            }
        };
        fetchProduct();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, [id, navigate]);

    const galleryImages = useMemo(() => {
        if (!product) return [];
        return product.galleryImages && product.galleryImages.length > 0 
            ? [product.imageUrl, ...product.galleryImages] 
            : [product.imageUrl];
    }, [product]);

    const has3DModel = useMemo(() => !!(product && product.modelUrl), [product]);
    const actual3DModelUrl = has3DModel ? getImageUrl(product.modelUrl) : null;

    const handleImageSwap = useCallback((newImgUrl) => {
        if (newImgUrl === mainImage) return; 
        setIsFading(true);
        setTimeout(() => { 
            setMainImage(newImgUrl); 
            setIsFading(false); 
        }, 200);
    }, [mainImage]);

    const openFullGallery = useCallback((imgUrl) => {
        const index = galleryImages.indexOf(imgUrl);
        setFullGalleryStartIndex(index !== -1 ? index : 0);
        setIsFullGalleryOpen(true);
    }, [galleryImages]);

    const handleAddToCart = useCallback(() => {
        if (!product || product.stock === 0) { 
            toast.error("Currently out of stock."); 
            return; 
        }
        for (let i = 0; i < quantity; i++) { 
            addToCart(product); 
        }
        toast.success(
            <div className="flex flex-col">
                <span className="font-bold text-neutral-900 dark:text-white">
                    <ScrambleText text="Added to Collection" />
                </span>
                <span className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                    {quantity}x {product.name}
                </span>
            </div>,
            { 
                duration: 4000, 
                style: { 
                    background: 'rgba(10,10,10,0.85)', 
                    backdropFilter: 'blur(16px)', 
                    color: '#fff', 
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '16px'
                } 
            }
        );
    }, [product, quantity, addToCart]);

    if (loading) return <ProductSkeleton />;
    if (!product) return null;

    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="min-h-screen bg-neutral-50 dark:bg-[#030303] pt-6 pb-32 md:py-12 transition-colors duration-700 relative overflow-hidden"
        >
            <AnimatePresence>
                {isFullGalleryOpen && (
                    <FullScreenGalleryModal 
                        images={galleryImages} 
                        startIndex={fullGalleryStartIndex} 
                        onClose={() => setIsFullGalleryOpen(false)} 
                    />
                )}
            </AnimatePresence>

            {/* Ambient Background Glow */}
            <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
                <div className="absolute top-[-10%] left-[-10%] w-[80vw] h-[80vw] bg-[radial-gradient(circle,rgba(255,255,255,0.03)_0%,transparent_70%)] rounded-full blur-[120px]"></div>
                <div className="absolute inset-0 bg-[radial-gradient(#e5e5e5_1px,transparent_1px)] dark:bg-[radial-gradient(#1a1a1a_1px,transparent_1px)] bg-[size:32px_32px] opacity-40 [mask-image:radial-gradient(ellipse_80%_80%_at_50%_0%,#000_20%,transparent_100%)]"></div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                
                {/* Minimalist Breadcrumbs */}
                <nav className="flex items-center text-[10px] font-bold text-neutral-500 mb-8 uppercase tracking-[0.2em] bg-white/50 dark:bg-white/[0.02] backdrop-blur-xl w-fit px-5 py-2.5 rounded-full border border-neutral-200 dark:border-white/[0.05] shadow-sm">
                    <Link to="/" className="hover:text-neutral-900 dark:hover:text-white transition-colors">HOME</Link>
                    <span className="mx-3 opacity-50">/</span>
                    <Link to="/products" className="hover:text-neutral-900 dark:hover:text-white transition-colors">SHOP</Link>
                    <span className="mx-3 opacity-50">/</span>
                    <span className="text-neutral-900 dark:text-white truncate max-w-[200px]">{product.name}</span>
                </nav>

                <div className="bg-white/70 dark:bg-[#0a0a0a]/70 backdrop-blur-3xl rounded-[2.5rem] shadow-2xl dark:shadow-[0_20px_60px_-15px_rgba(0,0,0,1)] border border-neutral-200/50 dark:border-white/[0.05] overflow-hidden mb-8 transition-colors duration-300">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
                        
                        {/* 📸 LEFT: STAGE */}
                        <div className="p-6 sm:p-10 lg:p-14 flex flex-col items-center justify-center border-b lg:border-b-0 lg:border-r border-neutral-200/50 dark:border-white/[0.05] relative min-h-[500px] lg:min-h-[650px] bg-neutral-50/30 dark:bg-black/20">
                            
                            <div className="absolute top-8 right-8 z-20 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl border border-neutral-200 dark:border-white/10 text-neutral-900 dark:text-white text-[10px] font-bold tracking-widest px-4 py-2 rounded-full flex items-center gap-2 shadow-sm">
                                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span> 
                                {activeViewers} VIEWING
                            </div>

                            {has3DModel && (
                                <button 
                                    onClick={() => setShow3D(!show3D)} 
                                    className="absolute top-8 left-8 z-20 bg-neutral-900 dark:bg-white backdrop-blur-xl text-white dark:text-black px-6 py-2.5 rounded-full font-black text-[10px] tracking-widest uppercase shadow-xl hover:scale-105 transition-transform flex items-center gap-2"
                                >
                                    {show3D ? '⏏️ 2D' : '🧊 3D'}
                                </button>
                            )}

                            <div 
                                onClick={() => !show3D && mainImage && openFullGallery(mainImage)} 
                                className={`w-full max-w-lg rounded-[2rem] overflow-hidden flex items-center justify-center mb-8 relative group cursor-pointer transition-all duration-500 ${show3D ? 'bg-transparent' : 'bg-white dark:bg-neutral-900 shadow-sm border border-neutral-100 dark:border-white/[0.03]'}`} 
                                style={{ aspectRatio: '1 / 1' }}
                            >
                                {!show3D && (
                                    <div className="absolute inset-0 z-10 bg-black/40 backdrop-blur-[2px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
                                        <span className="text-white font-bold tracking-widest text-[11px] uppercase bg-white/10 backdrop-blur-md px-6 py-3 rounded-full border border-white/20">
                                            Expand
                                        </span>
                                    </div>
                                )}

                                {show3D && has3DModel ? (
                                    <model-viewer 
                                        src={actual3DModelUrl} 
                                        alt="3D model" 
                                        camera-controls 
                                        auto-rotate 
                                        ar 
                                        style={{ width: '100%', height: '100%', zIndex: 10 }}
                                    >
                                        <button slot="ar-button" className="absolute bottom-6 left-1/2 transform -translate-x-1/2 bg-white text-black px-6 py-3 rounded-full font-bold text-xs tracking-widest uppercase shadow-2xl z-20">VIEW IN AR</button>
                                    </model-viewer>
                                ) : (
                                    mainImage ? (
                                        <ImageMagnifier src={getImageUrl(mainImage)} alt={product.name} isFading={isFading} />
                                    ) : (
                                        <span className="text-6xl opacity-20 relative z-10">📦</span>
                                    )
                                )}
                            </div>

                            {/* 🖼️ Thumbnails */}
                            {!show3D && galleryImages.length > 1 && (
                                <div className="w-full max-w-lg relative">
                                    <div className="flex gap-4 overflow-x-auto py-2 px-2 custom-scrollbar snap-x justify-start sm:justify-center">
                                        {galleryImages.map((img, idx) => {
                                            const isActive = mainImage === img;
                                            return (
                                                <button 
                                                    key={idx} 
                                                    onClick={() => handleImageSwap(img)} 
                                                    className={`relative w-20 h-20 sm:w-24 sm:h-24 rounded-[1.25rem] overflow-hidden flex-shrink-0 snap-center transition-all duration-300 border bg-white dark:bg-neutral-900 ${isActive ? 'border-neutral-900 dark:border-white shadow-lg scale-[1.02]' : 'border-neutral-200 dark:border-neutral-800 opacity-60 hover:opacity-100 hover:border-neutral-400 dark:hover:border-neutral-600'}`}
                                                >
                                                    <img src={getImageUrl(img)} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-cover" loading="lazy" onError={(e) => e.target.src = FALLBACK_IMAGE} />
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* 💻 RIGHT: INFO */}
                        <div className="p-8 sm:p-12 lg:p-16 flex flex-col justify-center">
                            <div className="mb-6 flex flex-wrap items-center gap-3">
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-900 dark:text-white bg-neutral-100 dark:bg-white/10 px-4 py-1.5 rounded-full border border-neutral-200 dark:border-white/10">
                                    {product.category}
                                </span>
                                <div className="flex items-center gap-1.5 bg-neutral-900 dark:bg-white px-3 py-1.5 rounded-full">
                                    <span className="text-white dark:text-black text-[10px]">★</span>
                                    <span className="text-[10px] font-black tracking-widest text-white dark:text-black">
                                        {product.averageRating > 0 ? product.averageRating.toFixed(1) : "NEW"}
                                    </span>
                                </div>
                            </div>
                            
                            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-neutral-900 dark:text-white tracking-tighter mb-6 leading-[1.05]">
                                {product.name}
                            </h1>
                            
                            <div className="flex flex-col sm:flex-row sm:items-end gap-4 sm:gap-6 mb-8">
                                <span className="text-4xl sm:text-5xl lg:text-5xl font-medium text-neutral-900 dark:text-white tracking-tight">
                                    ₹{product.price?.toLocaleString('en-IN')}
                                </span>
                                {product.stock > 0 ? (
                                    <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-neutral-900 dark:bg-white"></span> IN STOCK ({product.stock})
                                    </span>
                                ) : (
                                    <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest mb-2">OUT OF STOCK</span>
                                )}
                            </div>
                            
                            <p className="text-neutral-500 dark:text-neutral-400 text-base sm:text-lg mb-12 font-medium leading-relaxed">
                                {product.shortDescription || "Experience unparalleled quality and design. Crafted for those who demand the best."}
                            </p>
                            
                            <hr className="border-neutral-200 dark:border-white/[0.05] mb-10" />
                            
                            <div className="flex flex-col sm:flex-row gap-4">
                                <div className="flex items-center justify-between bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-white/10 p-1.5 w-full sm:w-48 shadow-sm">
                                    <button onClick={() => setQuantity(q => Math.max(1, q - 1))} className="w-12 h-12 flex items-center justify-center hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-colors font-medium text-xl text-neutral-500 dark:text-neutral-400">−</button>
                                    <span className="flex-1 text-center font-bold text-lg text-neutral-900 dark:text-white">{quantity}</span>
                                    <button onClick={() => setQuantity(q => Math.min(product.stock, q + 1))} className="w-12 h-12 flex items-center justify-center hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-colors font-medium text-xl text-neutral-500 dark:text-neutral-400">+</button>
                                </div>
                                
                                <motion.button 
                                    whileTap={product.stock > 0 ? { scale: 0.98 } : {}}
                                    onClick={handleAddToCart} 
                                    disabled={product.stock === 0} 
                                    className={`flex-1 font-bold text-sm tracking-[0.1em] py-5 sm:py-0 rounded-2xl transition-all flex items-center justify-center gap-3 ${product.stock === 0 ? 'bg-neutral-100 dark:bg-neutral-900 text-neutral-400 cursor-not-allowed' : 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 shadow-xl hover:shadow-2xl hover:-translate-y-0.5'}`}
                                >
                                    {product.stock === 0 ? 'UNAVAILABLE' : <ScrambleText text="ADD TO BAG" />}
                                </motion.button>
                            </div>
                            
                            <div className="flex gap-6 mt-10 pt-8 border-t border-neutral-200 dark:border-white/[0.05]">
                                <div className="flex items-center gap-2 text-[10px] font-bold text-neutral-500 uppercase tracking-widest">
                                    <svg className="w-4 h-4 text-neutral-900 dark:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
                                    SECURE
                                </div>
                                <div className="flex items-center gap-2 text-[10px] font-bold text-neutral-500 uppercase tracking-widest">
                                    <svg className="w-4 h-4 text-neutral-900 dark:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"/></svg>
                                    FREE RETURNS
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Details Section */}
                <div className="bg-white/70 dark:bg-[#0a0a0a]/70 backdrop-blur-3xl rounded-[2.5rem] shadow-xl border border-neutral-200/50 dark:border-white/[0.05] p-8 sm:p-12 lg:p-16">
                    <div className="flex items-center gap-4 mb-10 border-b border-neutral-200 dark:border-white/[0.05] pb-8">
                        <h2 className="text-2xl sm:text-3xl font-medium text-neutral-900 dark:text-white tracking-tight">
                            Details & Specs
                        </h2>
                    </div>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 lg:gap-20">
                        <div className="lg:col-span-2">
                            <h3 className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.2em] mb-6">Overview</h3>
                            <p className="text-neutral-600 dark:text-neutral-300 leading-relaxed text-base sm:text-lg whitespace-pre-line font-medium">
                                {product.detailedDescription || product.description || "Detailed specifications not provided."}
                            </p>
                        </div>
                        
                        <div className="bg-neutral-50 dark:bg-neutral-900/50 rounded-3xl p-8 border border-neutral-200 dark:border-white/[0.05] relative overflow-hidden">
                            <h3 className="text-[10px] font-bold text-neutral-900 dark:text-white uppercase tracking-[0.2em] mb-8 relative z-10">Technical</h3>
                            <div className="space-y-5 relative z-10 text-neutral-900 dark:text-white">
                                <div className="flex justify-between items-center border-b border-neutral-200 dark:border-white/5 pb-5">
                                    <span className="text-xs font-bold text-neutral-500">BRAND</span>
                                    <span className="text-sm font-medium">Originals</span>
                                </div>
                                <div className="flex justify-between items-center border-b border-neutral-200 dark:border-white/5 pb-5">
                                    <span className="text-xs font-bold text-neutral-500">CATEGORY</span>
                                    <span className="text-sm font-medium uppercase tracking-wider">{product.category}</span>
                                </div>
                                <div className="flex justify-between items-center border-b border-neutral-200 dark:border-white/5 pb-5">
                                    <span className="text-xs font-bold text-neutral-500">MODEL YEAR</span>
                                    <span className="text-sm font-medium">2026</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-bold text-neutral-500">SKU</span>
                                    <span className="text-sm font-medium uppercase">{product._id?.substring(0,8) || 'N/A'}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 📱 MOBILE STICKY BUY BAR */}
            <div className="lg:hidden fixed bottom-0 left-0 w-full bg-white/90 dark:bg-black/90 backdrop-blur-2xl border-t border-neutral-200 dark:border-white/10 p-4 pb-safe z-50 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] dark:shadow-[0_-10px_40px_rgba(0,0,0,0.5)] flex items-center justify-between gap-4">
                <div className="flex flex-col">
                    <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-widest">Total</span>
                    <span className="text-xl font-medium text-neutral-900 dark:text-white">
                        ₹{(product.price * quantity).toLocaleString('en-IN')}
                    </span>
                </div>
                <button 
                    onClick={handleAddToCart} 
                    disabled={product.stock === 0} 
                    className={`flex-1 font-bold text-xs tracking-[0.1em] py-4 rounded-xl transition-transform active:scale-95 ${product.stock === 0 ? 'bg-neutral-100 dark:bg-neutral-900 text-neutral-400' : 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900'}`}
                >
                    {product.stock === 0 ? 'UNAVAILABLE' : 'ADD TO BAG'}
                </button>
            </div>

            <style dangerouslySetInnerHTML={{__html: `
                .pb-safe { padding-bottom: env(safe-area-inset-bottom, 24px); }
                .custom-scrollbar::-webkit-scrollbar { height: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(150,150,150,0.3); border-radius: 4px; }
            `}} />
        </motion.div>
    );
}

export default memo(ProductDetail);