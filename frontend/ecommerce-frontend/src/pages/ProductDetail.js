import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import API from '../services/api';
import { useCart } from '../context/CartContext';
import toast from 'react-hot-toast';

// ==========================================
// 🧩 PREMIUM TEXT EFFECT
// ==========================================
const ScrambleText = ({ text }) => {
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

    return <span onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)} className="inline-block transition-all cursor-default">{displayText}</span>;
};

// ==========================================
// 🔍 HIGH-RES ZOOM LENS COMPONENT
// ==========================================
const ImageMagnifier = ({ src, alt, isFading }) => {
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [showMagnifier, setShowMagnifier] = useState(false);

    const handleMouseMove = (e) => {
        const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
        const x = ((e.pageX - left) / width) * 100;
        const y = ((e.pageY - top) / height) * 100;
        setPosition({ x, y });
    };

    return (
        <div 
            className={`relative w-full h-full overflow-hidden transition-opacity duration-300 ${isFading ? 'opacity-0 scale-95' : 'opacity-100 scale-100'} cursor-crosshair`}
            onMouseEnter={() => setShowMagnifier(true)}
            onMouseLeave={() => setShowMagnifier(false)}
            onMouseMove={handleMouseMove}
        >
            <img src={src} alt={alt} className="w-full h-full object-cover transition-transform duration-700" loading="eager" />
            
            <div 
                className={`absolute inset-0 z-50 bg-no-repeat pointer-events-none hidden md:block transition-opacity duration-200 ${showMagnifier ? 'opacity-100' : 'opacity-0'}`}
                style={{
                    backgroundImage: `url(${src})`,
                    backgroundPosition: `${position.x}% ${position.y}%`,
                    backgroundSize: '250%',
                    backgroundColor: 'white'
                }}
            />
        </div>
    );
};

// ==========================================
// 🖼️ PURE EXPLORATION MODE (FULL-SCREEN LIGHTBOX)
// ==========================================
const FullScreenGalleryModal = ({ images, startIndex, onClose }) => {
    const [currentIndex, setCurrentIndex] = useState(startIndex);
    const getImageUrl = (url) => url.startsWith('http') ? url : `/uploads/${url}`;

    const prevImage = (e) => { e.stopPropagation(); setCurrentIndex(prev => (prev === 0 ? images.length - 1 : prev - 1)); };
    const nextImage = (e) => { e.stopPropagation(); setCurrentIndex(prev => (prev === images.length - 1 ? 0 : prev + 1)); };

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'ArrowLeft') prevImage(e);
            else if (e.key === 'ArrowRight') nextImage(e);
            else if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        document.body.style.overflow = 'hidden'; // Lock background scrolling
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = 'unset'; // Restore background scrolling
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <div className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-2xl flex flex-col transition-all duration-300 ease-out animate-[fadeIn_0.3s_ease-out]" onClick={onClose}>
            
            {/* Modal Header */}
            <div className="flex justify-between items-center p-6 border-b border-white/5">
                <span className="text-[10px] font-black text-white/50 uppercase tracking-[0.4em]">Image {currentIndex + 1} of {images.length}</span>
                <button onClick={onClose} className="w-10 h-10 rounded-full flex items-center justify-center bg-white/10 text-white font-bold text-xl hover:bg-white/20 active:scale-95 transition-all">✕ tooltip: Close Gallery</button>
            </div>

            {/* Main Full-Screen Content */}
            <div className="flex-1 flex items-center justify-center p-4 sm:p-10 lg:p-16 relative">
                
                {/* Previous Button */}
                <button onClick={prevImage} className="absolute left-6 w-14 h-14 rounded-full flex items-center justify-center bg-black/50 border border-white/10 text-white hover:bg-black/70 hover:-translate-x-1 active:scale-95 transition-all z-20 group">
                    <span className="text-xl transition-transform group-hover:scale-125">←</span> tooltip: Previous Image
                </button>

                {/* Main Full Image */}
                <div className="max-w-[85vw] max-h-[75vh] p-2 bg-white rounded-3xl shadow-2xl overflow-hidden border border-white/5" onClick={(e) => e.stopPropagation()}>
                    <img src={getImageUrl(images[currentIndex])} alt={`Product full view`} className="w-full h-full object-contain max-h-[75vh]" loading="eager" />
                </div>

                {/* Next Button */}
                <button onClick={nextImage} className="absolute right-6 w-14 h-14 rounded-full flex items-center justify-center bg-black/50 border border-white/10 text-white hover:bg-black/70 hover:translate-x-1 active:scale-95 transition-all z-20 group">
                    <span className="text-xl transition-transform group-hover:scale-125">→</span> tooltip: Next Image
                </button>
            </div>

            {/* Bottom Secondary Thumbnail Track */}
            <div className="p-6 border-t border-white/5 flex justify-center pb-safe">
                <div className="inline-flex gap-3 bg-white/5 p-2 rounded-2xl border border-white/5">
                    {images.map((img, idx) => {
                        const isActive = currentIndex === img;
                        return (
                            <button 
                                key={idx} 
                                onClick={(e) => { e.stopPropagation(); setCurrentIndex(idx); }} 
                                className={`relative w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 transition-all border-2 ${isActive ? 'border-blue-600 dark:border-cyan-400' : 'border-transparent hover:border-white/30'}`}
                            >
                                <img src={getImageUrl(img)} alt={`Thumbnail View`} className="w-full h-full object-cover" loading="lazy" />
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

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

    // New State for Cinematic full-screen gallery
    const [isFullGalleryOpen, setIsFullGalleryOpen] = useState(false);
    const [fullGalleryStartIndex, setFullGalleryStartIndex] = useState(0);

    useEffect(() => {
        const fetchProduct = async () => {
            try {
                const res = await API.get(`/products/${id}`);
                setProduct(res.data);
                setMainImage(res.data.imageUrl);
                setActiveViewers(Math.floor(Math.random() * 45) + 5); 
                setLoading(false);
            } catch (err) {
                toast.error("Product not found!");
                navigate('/products');
            }
        };
        fetchProduct();
        window.scrollTo(0, 0);
    }, [id, navigate]);

    const getImageUrl = (url) => url.startsWith('http') ? url : `/uploads/${url}`;

    const handleImageSwap = (newImgUrl) => {
        if (newImgUrl === mainImage) return; 
        setIsFading(true);
        setTimeout(() => { setMainImage(newImgUrl); setIsFading(false); }, 200);
    };

    // Helper to find the index of the main image in the gallery set
    const openFullGallery = (imgUrl) => {
        const index = galleryImages.indexOf(imgUrl);
        setFullGalleryStartIndex(index !== -1 ? index : 0);
        setIsFullGalleryOpen(true);
    };

    const handleAddToCart = () => {
        if (product.stock === 0) { toast.error("Out of stock."); return; }
        for (let i = 0; i < quantity; i++) { addToCart(product); }
        toast.success(
            <div className="flex flex-col"><span className="font-bold text-gray-900 dark:text-white"><ScrambleText text="Added" /></span><span className="text-xs text-gray-500 dark:text-cyan-400 mt-1">{quantity}x {product.name}</span></div>,
            { duration: 3000, style: { background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', color: '#fff', border: '1px solid rgba(6,182,212,0.2)' } }
        );
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#f8fafc] dark:bg-[#000000] flex flex-col items-center justify-center transition-colors duration-700">
                <div className="relative w-24 h-24 mb-8"><div className="absolute inset-0 border-t-2 border-blue-600 dark:border-cyan-500 rounded-full animate-spin"></div><div className="absolute inset-2 border-r-2 border-purple-600 dark:border-purple-500 rounded-full animate-[spin_1.5s_linear_infinite_reverse]"></div></div>
                <p className="text-xs font-black text-gray-500 dark:text-gray-400 tracking-[0.4em] uppercase animate-pulse">Loading...</p>
            </div>
        );
    }

    const galleryImages = product.galleryImages && product.galleryImages.length > 0 ? [product.imageUrl, ...product.galleryImages] : [product.imageUrl];
    const has3DModel = product && product.modelUrl;
    const actual3DModelUrl = has3DModel ? getImageUrl(product.modelUrl) : null;

    return (
        <>
            {/* Cinematic Full-Screen Gallery Modal */}
            {isFullGalleryOpen && (
                <FullScreenGalleryModal images={galleryImages} startIndex={fullGalleryStartIndex} onClose={() => setIsFullGalleryOpen(false)} />
            )}

            <div className="min-h-screen bg-[#f8fafc] dark:bg-[#000000] pt-6 pb-32 md:py-12 transition-colors duration-700 relative overflow-hidden animate-[fadeIn_0.5s_ease-out]">
                
                {/* Dot Matrix Background */}
                <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
                    <div className="absolute top-[-10%] left-[-10%] w-[80vw] h-[80vw] bg-[radial-gradient(circle,rgba(59,130,246,0.06)_0%,transparent_70%)] dark:bg-[radial-gradient(circle,rgba(6,182,212,0.05)_0%,transparent_70%)] rounded-full blur-[100px] animate-pulse"></div>
                    <div className="absolute bottom-[-20%] right-[-10%] w-[90vw] h-[90vw] bg-[radial-gradient(circle,rgba(99,102,241,0.06)_0%,transparent_70%)] dark:bg-[radial-gradient(circle,rgba(217,70,239,0.05)_0%,transparent_70%)] rounded-full blur-[100px] animate-pulse"></div>
                    <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] dark:bg-[radial-gradient(#334155_1px,transparent_1px)] bg-[size:24px_24px] opacity-60 dark:opacity-40 [mask-image:radial-gradient(ellipse_80%_80%_at_50%_0%,#000_20%,transparent_100%)]"></div>
                </div>

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                    
                    {/* Breadcrumbs */}
                    <nav className="flex items-center text-[9px] sm:text-xs font-black text-gray-500 dark:text-gray-400 mb-6 sm:mb-10 uppercase tracking-[0.2em] sm:tracking-[0.3em] overflow-hidden bg-white/50 dark:bg-white/[0.02] backdrop-blur-md w-fit px-4 py-2 rounded-full border border-gray-200 dark:border-white/[0.05] shadow-sm">
                        <Link to="/" className="hover:text-blue-600 dark:hover:text-cyan-400 transition-colors">HOME</Link><span className="mx-2 sm:mx-3 text-gray-300 dark:text-gray-600">/</span>
                        <Link to="/products" className="hover:text-blue-600 dark:hover:text-cyan-400 transition-colors">SHOP</Link><span className="mx-2 sm:mx-3 text-gray-300 dark:text-gray-600">/</span>
                        <span className="text-gray-900 dark:text-white truncate max-w-[150px] sm:max-w-[300px]">{product.name}</span>
                    </nav>

                    <div className="bg-white/80 dark:bg-[#050505]/80 backdrop-blur-3xl rounded-[2rem] sm:rounded-[3rem] shadow-2xl dark:shadow-[0_0_50px_rgba(0,0,0,0.8)] border border-gray-100 dark:border-white/[0.05] overflow-hidden mb-8 sm:mb-12 transition-colors duration-300">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
                            
                            {/* 📸 LEFT: PRODUCT IMAGE STAGE */}
                            <div className="p-4 sm:p-8 lg:p-12 flex flex-col items-center justify-center border-b lg:border-b-0 lg:border-r border-gray-100 dark:border-white/[0.05] relative min-h-[450px] lg:min-h-[600px] bg-gray-50/50 dark:bg-[#0a0a0a]/50">
                                
                                <div className="absolute top-6 right-6 z-20 bg-white/90 dark:bg-black/70 backdrop-blur-md border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white text-[9px] sm:text-[10px] font-bold tracking-widest px-3 sm:px-4 py-1.5 sm:py-2 rounded-full flex items-center gap-2 shadow-lg">
                                    <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-green-500 rounded-full animate-ping"></span> {activeViewers} VIEWING
                                </div>

                                {has3DModel && (
                                    <button onClick={() => setShow3D(!show3D)} className="absolute top-6 left-6 z-20 bg-indigo-600 dark:bg-indigo-500/20 backdrop-blur-xl text-white dark:text-indigo-400 px-4 sm:px-6 py-2 sm:py-2.5 rounded-full font-black text-[10px] sm:text-xs tracking-widest uppercase shadow-lg hover:scale-105 transition-all flex items-center gap-2 border border-transparent dark:border-indigo-500/30">
                                        {show3D ? '⏏️ VIEW 2D' : '🧊 VIEW 3D'}
                                    </button>
                                )}

                                {/* 🔍 Main Image Stage (Clicks open cinematic gallery) */}
                                <div onClick={() => !show3D && mainImage && openFullGallery(mainImage)} className={`w-full max-w-lg rounded-[2rem] overflow-hidden flex items-center justify-center mb-6 relative group cursor-pointer ${show3D ? 'bg-gray-100 dark:bg-white/5' : 'bg-white dark:bg-[#111] shadow-inner border border-gray-100 dark:border-white/5'}`} style={{ aspectRatio: '1 / 1' }}>
                                    
                                    {!show3D && (
                                        <div className="absolute inset-0 z-10 bg-black/50 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                            <span className="text-white font-black tracking-widest text-[10px] uppercase bg-white/10 px-6 py-3 rounded-full border border-white/20 shadow-lg">Click to Expand Gallery</span>
                                        </div>
                                    )}

                                    {show3D && has3DModel ? (
                                        <model-viewer src={actual3DModelUrl} alt={`A 3D model`} camera-controls auto-rotate ar style={{ width: '100%', height: '100%', minHeight: '400px', zIndex: 10 }}>
                                            <button slot="ar-button" className="absolute bottom-6 left-1/2 transform -translate-x-1/2 bg-blue-600 dark:bg-cyan-500 text-white dark:text-black px-6 py-3 rounded-full font-black text-xs tracking-widest uppercase animate-bounce cursor-pointer border-none outline-none z-20">VIEW IN AR</button>
                                        </model-viewer>
                                    ) : (
                                        mainImage ? (
                                            <ImageMagnifier src={getImageUrl(mainImage)} alt={product.name} isFading={isFading} />
                                        ) : (
                                            <span className="text-6xl sm:text-8xl opacity-50 relative z-10">📦</span>
                                        )
                                    )}
                                </div>

                                {/* 🖼️ Thumbnails */}
                                {!show3D && galleryImages.length > 1 && (
                                    <div className="w-full max-w-lg mt-2 relative">
                                        <div className="flex gap-3 overflow-x-auto py-2 px-2 custom-scrollbar snap-x justify-start sm:justify-center">
                                            {galleryImages.map((img, idx) => {
                                                const isActive = mainImage === img;
                                                return (
                                                    <button key={idx} onClick={() => handleImageSwap(img)} className={`relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden flex-shrink-0 snap-center transition-all duration-300 border-2 bg-white dark:bg-[#111] ${isActive ? 'border-blue-600 dark:border-cyan-400 shadow-[0_0_15px_rgba(37,99,235,0.3)] dark:shadow-[0_0_15px_rgba(6,182,212,0.3)] scale-105' : 'border-gray-200 dark:border-white/10 hover:border-gray-400 dark:hover:border-white/30 opacity-70 hover:opacity-100'}`}>
                                                        <img src={getImageUrl(img)} alt={`View ${idx + 1}`} className="w-full h-full object-cover" loading="lazy" />
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* 💻 RIGHT: PURCHASE DETAILS */}
                            <div className="p-6 sm:p-10 lg:p-16 flex flex-col justify-center">
                                <div className="mb-4 flex flex-wrap items-center gap-2 sm:gap-3">
                                    <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 dark:text-cyan-400 bg-blue-50 dark:bg-cyan-500/10 px-3 sm:px-4 py-1.5 rounded-full border border-blue-100 dark:border-cyan-500/20 category">{product.category}</span>
                                    <div className="flex items-center gap-1 bg-yellow-50 dark:bg-yellow-500/10 px-3 py-1.5 rounded-full border border-yellow-200 dark:border-yellow-500/20 rating"><span className="text-yellow-500 text-xs">★</span><span className="text-[9px] sm:text-[10px] font-black tracking-widest text-yellow-700 dark:text-yellow-500">{product.averageRating > 0 ? product.averageRating.toFixed(1) : "NEW"}</span></div>
                                </div>
                                <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-gray-900 dark:text-white tracking-tighter mb-6 leading-[1.1]">{product.name}</h1>
                                <div className="flex items-end gap-4 mb-6 sm:mb-8 price-section">
                                    <span className="text-4xl sm:text-5xl lg:text-6xl font-black text-blue-600 dark:text-transparent dark:bg-clip-text dark:bg-gradient-to-r dark:from-cyan-400 dark:to-purple-500 tracking-tighter price">₹{product.price?.toLocaleString()}</span>
                                    {product.stock > 0 ? (
                                        <span className="text-[10px] sm:text-xs font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-500/20 mb-2 stock-status flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> IN STOCK</span>
                                    ) : (
                                        <span className="text-[10px] sm:text-xs font-black text-red-600 dark:text-red-400 uppercase tracking-widest bg-red-50 dark:bg-red-500/10 px-3 py-1.5 rounded-xl border border-red-200 dark:border-red-500/20 mb-2 stock-status">OUT OF STOCK</span>
                                    )}
                                </div>
                                <p className="text-gray-600 dark:text-gray-400 text-base sm:text-lg mb-10 description">Premium materials and ultimate performance. Upgrade your daily setup.</p>
                                <hr className="border-gray-100 dark:border-white/[0.05] mb-8" />
                                <div className="flex flex-col sm:flex-row gap-4 actions">
                                    <div className="flex items-center justify-between bg-gray-50 dark:bg-[#0a0a0a] rounded-2xl border border-gray-200 dark:border-white/10 p-1.5 w-full sm:w-48 shadow-inner quantity-selector"><button onClick={() => setQuantity(q => Math.max(1, q - 1))} className="w-12 h-12 flex items-center justify-center hover:bg-white dark:hover:bg-[#111] rounded-xl transition-all font-black text-2xlActive:scale-95 text-gray-500">−</button><span className="flex-1 text-center font-black text-xl text-gray-900 dark:text-white">{quantity}</span><button onClick={() => setQuantity(q => Math.min(product.stock, q + 1))} className="w-12 h-12 flex items-center justify-center hover:bg-white dark:hover:bg-[#111] rounded-xl transition-all font-black text-2xlActive:scale-95 text-gray-500">+</button></div>
                                    <button onClick={handleAddToCart} disabled={product.stock === 0} className={`flex-1 font-black text-lg py-4 sm:py-0 rounded-2xl shadow-xl transition-allActive:scale-95 flex items-center justify-center gap-3 add-to-cart ${product.stock === 0 ? 'bg-gray-200 dark:bg-[#111] text-gray-400 cursor-not-allowed' : 'bg-gray-900 dark:bg-white text-white dark:text-black hover:bg-blue-600 dark:hover:bg-cyan-400 hover:shadow-blue-500/30 dark:hover:shadow-[0_0_30px_rgba(6,182,212,0.4)] hover:-translate-y-1'}`}><svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path></svg>{product.stock === 0 ? 'OUT OF STOCK' : <ScrambleText text="ADD TO CART" />}</button>
                                </div>
                                <div className="flex gap-4 mt-8 pt-6 border-t border-gray-100 dark:border-white/[0.05] badges"><div className="flex items-center gap-2 text-[10px] sm:text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest"><span className="text-emerald-500 text-lg">🛡️</span> SECURE PAY</div><div className="flex items-center gap-2 text-[10px] sm:text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest"><span className="text-blue-500 text-lg">⚡</span> FAST DELIVERY</div></div>
                            </div>
                        </div>
                    </div>

                    {/* Specifications */}
                    <div className="bg-white/80 dark:bg-[#050505]/80 backdrop-blur-3xl rounded-[2rem] sm:rounded-[3rem] shadow-xl dark:shadow-[0_0_30px_rgba(0,0,0,0.5)] border border-gray-100 dark:border-white/[0.05] p-6 sm:p-10 lg:p-16 description-specs">
                        <div className="flex items-center gap-4 mb-8 sm:mb-12 border-b border-gray-100 dark:border-white/[0.05] pb-6 header"><span className="w-3 h-3 bg-purple-500 rounded-full shadow-[0_0_10px_#a855f7]"></span><h2 className="text-2xl sm:text-4xl font-black text-gray-900 dark:text-white tracking-tight uppercase"><ScrambleText text="DETAILS & SPECS" /></h2></div>
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-16"><div className="lg:col-span-2 description"><h3 className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.3em] mb-4">Description</h3><p className="text-gray-600 dark:text-gray-300 leading-relaxed text-base sm:text-lg font-medium whitespace-pre-line">{product.detailedDescription}</p></div><div className="bg-gray-50 dark:bg-[#0a0a0a] rounded-3xl p-6 sm:p-8 border border-gray-200 dark:border-white/[0.05] shadow-inner relative overflow-hidden specs"><div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 blur-2xl pointer-events-none"></div><h3 className="text-[10px] font-black text-purple-600 dark:text-purple-500 uppercase tracking-[0.3em] mb-6 relative z-10">Specifications</h3><div className="space-y-4 relative z-10 text-gray-900 dark:text-white"><div className="flex justify-between items-center border-b border-gray-200 dark:border-white/5 pb-4 spec-item"><span className="text-xs sm:text-sm font-bold text-gray-500 dark:text-gray-400">BRAND</span><span className="text-sm sm:text-base font-black">Originals</span></div><div className="flex justify-between items-center border-b border-gray-200 dark:border-white/5 pb-4 spec-item"><span className="text-xs sm:text-sm font-bold text-gray-500 dark:text-gray-400">CATEGORY</span><span className="text-sm sm:text-base font-black uppercase tracking-wider">{product.category}</span></div><div className="flex justify-between items-center border-b border-gray-200 dark:border-white/5 pb-4 spec-item"><span className="text-xs sm:text-sm font-bold text-gray-500 dark:text-gray-400">MODEL YEAR</span><span className="text-sm sm:text-base font-black">2026</span></div><div className="flex justify-between items-center spec-item"><span className="text-xs sm:text-sm font-bold text-gray-500 dark:text-gray-400">STATUS</span><span className={`text-sm sm:text-base font-black ${product.stock > 0 ? 'text-emerald-500' : 'text-red-500'}`}>{product.stock > 0 ? 'AVAILABLE' : 'UNAVAILABLE'}</span></div></div></div></div>
                    </div>
                </div>

                {/* 📱 MOBILE STICKY BUY BAR */}
                <div className="lg:hidden fixed bottom-0 left-0 w-full bg-white/90 dark:bg-[#050505]/90 backdrop-blur-xl border-t border-gray-200 dark:border-white/10 p-4 pb-safe z-50 shadow-[0_-10px_30px_rgba(0,0,0,0.1)] flex items-center justify-between gap-4 sticky-bar">
                    <div className="flex flex-col price-info"><span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Total Price</span><span className="text-xl font-black text-gray-900 dark:text-white price">₹{(product.price * quantity).toLocaleString()}</span></div>
                    <button onClick={handleAddToCart} disabled={product.stock === 0} className={`flex-1 font-black text-sm py-3.5 rounded-2xl transition-transform active:scale-95 buy-button ${product.stock === 0 ? 'bg-gray-200 dark:bg-[#111] text-gray-400' : 'bg-gray-900 dark:bg-white text-white dark:text-black shadow-lg'}`}>{product.stock === 0 ? 'OUT OF STOCK' : 'ADD TO CART'}</button>
                </div>

                <style dangerouslySetInnerHTML={{__html: `
                    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                    .pb-safe { padding-bottom: env(safe-area-inset-bottom, 20px); }
                `}} />
            </div>
        </>
    );
}

export default ProductDetail;