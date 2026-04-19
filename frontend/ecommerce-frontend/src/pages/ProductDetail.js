import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  memo,
  useRef,
} from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import API from '../services/api';
import { useCart } from '../context/CartContext';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

// ─────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────
const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1560393464-5c69a73c5770?q=80&w=800&auto=format&fit=crop';

const CDN_BASE = import.meta.env.VITE_CDN_BASE || '';

const getImageUrl = (url) => {
  if (!url) return FALLBACK_IMAGE;
  if (url.startsWith('http') || url.startsWith('data:image')) return url;
  return `${CDN_BASE}/uploads/${url}`;
};

// ─────────────────────────────────────────────
// IMAGE PRELOADER UTILITY
// ─────────────────────────────────────────────
const preloadImage = (src) => {
  if (!src || typeof window === 'undefined') return;
  const img = new window.Image();
  img.src = src;
};

// ─────────────────────────────────────────────
// SCRAMBLE TEXT
// ─────────────────────────────────────────────
const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

const ScrambleText = memo(({ text }) => {
  const [displayText, setDisplayText] = useState(text);
  const [isHovered, setIsHovered] = useState(false);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!isHovered) {
      setDisplayText(text);
      return;
    }
    let iteration = 0;
    clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setDisplayText(
        text
          .split('')
          .map((letter, index) => {
            if (index < iteration) return text[index];
            return CHARS[Math.floor(Math.random() * CHARS.length)];
          })
          .join('')
      );
      if (iteration >= text.length) clearInterval(intervalRef.current);
      iteration += 1 / 3;
    }, 30);
    return () => clearInterval(intervalRef.current);
  }, [isHovered, text]);

  return (
    <span
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="inline-block transition-all cursor-default select-none"
    >
      {displayText}
    </span>
  );
});

ScrambleText.displayName = 'ScrambleText';

// ─────────────────────────────────────────────
// IMAGE MAGNIFIER
// ─────────────────────────────────────────────
const ImageMagnifier = memo(({ src, alt, isFading }) => {
  const [position, setPosition] = useState({ x: 50, y: 50 });
  const [showMagnifier, setShowMagnifier] = useState(false);
  const [imgSrc, setImgSrc] = useState(src);
  const [isLoaded, setIsLoaded] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    setImgSrc(src);
    setIsLoaded(false);
  }, [src]);

  const handleMouseMove = useCallback((e) => {
    if (!containerRef.current) return;
    const { left, top, width, height } =
      containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - left) / width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - top) / height) * 100));
    setPosition({ x, y });
  }, []);

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full overflow-hidden transition-all duration-500 ease-in-out rounded-[2rem] cursor-crosshair ${
        isFading ? 'opacity-0 scale-[0.97]' : 'opacity-100 scale-100'
      }`}
      onMouseEnter={() => setShowMagnifier(true)}
      onMouseLeave={() => setShowMagnifier(false)}
      onMouseMove={handleMouseMove}
    >
      {!isLoaded && (
        <div className="absolute inset-0 bg-neutral-100 dark:bg-neutral-800 animate-pulse rounded-[2rem]" />
      )}
      <img
        src={imgSrc}
        alt={alt}
        onLoad={() => setIsLoaded(true)}
        onError={() => {
          setImgSrc(FALLBACK_IMAGE);
          setIsLoaded(true);
        }}
        className={`w-full h-full object-contain transition-opacity duration-500 ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        }`}
        loading="eager"
        decoding="async"
        fetchpriority="high"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 z-50 bg-no-repeat pointer-events-none hidden md:block transition-opacity duration-200 ease-out rounded-[2rem]"
        style={{
          opacity: showMagnifier && isLoaded ? 1 : 0,
          backgroundImage: `url(${imgSrc})`,
          backgroundPosition: `${position.x}% ${position.y}%`,
          backgroundSize: '260%',
        }}
      />
    </div>
  );
});

ImageMagnifier.displayName = 'ImageMagnifier';

// ─────────────────────────────────────────────
// FULLSCREEN GALLERY MODAL
// ─────────────────────────────────────────────
const FullScreenGalleryModal = memo(({ images, startIndex, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(startIndex);

  const prevImage = useCallback(
    (e) => {
      e?.stopPropagation();
      setCurrentIndex((p) => (p === 0 ? images.length - 1 : p - 1));
    },
    [images.length]
  );

  const nextImage = useCallback(
    (e) => {
      e?.stopPropagation();
      setCurrentIndex((p) => (p === images.length - 1 ? 0 : p + 1));
    },
    [images.length]
  );

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'ArrowLeft') prevImage();
      else if (e.key === 'ArrowRight') nextImage();
      else if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handler);
      document.body.style.overflow = '';
    };
  }, [prevImage, nextImage, onClose]);

  // Preload adjacent images
  useEffect(() => {
    const prev = images[(currentIndex - 1 + images.length) % images.length];
    const next = images[(currentIndex + 1) % images.length];
    preloadImage(getImageUrl(prev));
    preloadImage(getImageUrl(next));
  }, [currentIndex, images]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25, ease: 'easeInOut' }}
      className="fixed inset-0 z-[300] bg-black/95 backdrop-blur-2xl flex flex-col"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Product image gallery"
    >
      {/* Header */}
      <div className="flex justify-between items-center px-6 py-5 border-b border-white/[0.06]">
        <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.4em]">
          {currentIndex + 1} / {images.length}
        </span>
        <button
          onClick={onClose}
          aria-label="Close gallery"
          className="w-11 h-11 rounded-full flex items-center justify-center bg-white/[0.06] text-white hover:bg-white/[0.14] active:scale-95 transition-all text-lg font-light"
        >
          ✕
        </button>
      </div>

      {/* Main image */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-16 relative overflow-hidden">
        <button
          onClick={prevImage}
          aria-label="Previous image"
          className="absolute left-4 sm:left-6 z-20 w-13 h-13 rounded-full flex items-center justify-center bg-white/[0.05] border border-white/10 text-white hover:bg-white/[0.15] active:scale-95 transition-all backdrop-blur-md group"
          style={{ width: 52, height: 52 }}
        >
          <span className="text-lg transition-transform group-hover:-translate-x-0.5">←</span>
        </button>

        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, scale: 0.96, x: 20 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 1.02, x: -20 }}
            transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="max-w-[85vw] max-h-[72vh] flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={getImageUrl(images[currentIndex])}
              alt={`Product view ${currentIndex + 1}`}
              className="max-w-full max-h-[72vh] object-contain drop-shadow-2xl select-none"
              loading="lazy"
              onError={(e) => {
                e.target.src = FALLBACK_IMAGE;
              }}
            />
          </motion.div>
        </AnimatePresence>

        <button
          onClick={nextImage}
          aria-label="Next image"
          className="absolute right-4 sm:right-6 z-20 rounded-full flex items-center justify-center bg-white/[0.05] border border-white/10 text-white hover:bg-white/[0.15] active:scale-95 transition-all backdrop-blur-md group"
          style={{ width: 52, height: 52 }}
        >
          <span className="text-lg transition-transform group-hover:translate-x-0.5">→</span>
        </button>
      </div>

      {/* Thumbnails */}
      <div className="p-5 border-t border-white/[0.06] flex justify-center">
        <div className="inline-flex gap-2.5 bg-white/[0.04] p-2.5 rounded-2xl border border-white/[0.06] backdrop-blur-md overflow-x-auto max-w-full">
          {images.map((img, idx) => (
            <button
              key={idx}
              onClick={(e) => {
                e.stopPropagation();
                setCurrentIndex(idx);
              }}
              aria-label={`View image ${idx + 1}`}
              className={`relative flex-shrink-0 w-14 h-14 rounded-xl overflow-hidden transition-all border-2 ${
                currentIndex === idx
                  ? 'border-white scale-105 shadow-[0_0_16px_rgba(255,255,255,0.25)]'
                  : 'border-transparent opacity-40 hover:opacity-80 hover:border-white/30'
              }`}
            >
              <img
                src={getImageUrl(img)}
                alt={`Thumbnail ${idx + 1}`}
                className="w-full h-full object-cover"
                loading="lazy"
                onError={(e) => {
                  e.target.src = FALLBACK_IMAGE;
                }}
              />
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  );
});

FullScreenGalleryModal.displayName = 'FullScreenGalleryModal';

// ─────────────────────────────────────────────
// SKELETON LOADER
// ─────────────────────────────────────────────
const ProductSkeleton = () => (
  <div className="min-h-screen bg-neutral-50 dark:bg-[#030303] pt-6 pb-32 md:py-12 px-4 sm:px-6 lg:px-8">
    <div className="max-w-7xl mx-auto">
      <div className="w-52 h-5 bg-neutral-200 dark:bg-neutral-800 rounded-full animate-pulse mb-10" />
      <div className="bg-white dark:bg-neutral-900 rounded-[2.5rem] shadow-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden mb-8 grid grid-cols-1 lg:grid-cols-2">
        <div className="p-8 lg:p-14 flex flex-col items-center justify-center border-b lg:border-b-0 lg:border-r border-neutral-200 dark:border-neutral-800 min-h-[500px]">
          <div className="w-full max-w-sm aspect-square bg-neutral-200 dark:bg-neutral-800 rounded-[2rem] animate-pulse mb-6" />
          <div className="flex gap-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="w-20 h-20 bg-neutral-200 dark:bg-neutral-800 rounded-2xl animate-pulse"
              />
            ))}
          </div>
        </div>
        <div className="p-8 lg:p-16 flex flex-col justify-center gap-4">
          <div className="w-24 h-5 bg-neutral-200 dark:bg-neutral-800 rounded-full animate-pulse" />
          <div className="w-3/4 h-10 bg-neutral-200 dark:bg-neutral-800 rounded-xl animate-pulse" />
          <div className="w-1/2 h-10 bg-neutral-200 dark:bg-neutral-800 rounded-xl animate-pulse" />
          <div className="w-full h-20 bg-neutral-200 dark:bg-neutral-800 rounded-xl animate-pulse mt-4" />
          <div className="flex gap-4 mt-4">
            <div className="w-32 h-14 bg-neutral-200 dark:bg-neutral-800 rounded-2xl animate-pulse" />
            <div className="flex-1 h-14 bg-neutral-200 dark:bg-neutral-800 rounded-2xl animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  </div>
);

// ─────────────────────────────────────────────
// TRUST BADGES
// ─────────────────────────────────────────────
const TrustBadges = memo(() => (
  <div className="flex flex-wrap gap-5 mt-10 pt-8 border-t border-neutral-200 dark:border-white/[0.05]">
    {[
      {
        icon: (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
          />
        ),
        label: 'Secure Checkout',
      },
      {
        icon: (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
          />
        ),
        label: 'Free Returns',
      },
      {
        icon: (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
          />
        ),
        label: '2-Year Warranty',
      },
    ].map(({ icon, label }) => (
      <div
        key={label}
        className="flex items-center gap-2 text-[10px] font-bold text-neutral-500 uppercase tracking-widest"
      >
        <svg
          className="w-4 h-4 text-neutral-900 dark:text-white flex-shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          {icon}
        </svg>
        {label}
      </div>
    ))}
  </div>
));

TrustBadges.displayName = 'TrustBadges';

// ─────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────
function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [ setError] = useState(null);
  const [mainImage, setMainImage] = useState('');
  const [isFading, setIsFading] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [show3D, setShow3D] = useState(false);
  const [activeViewers] = useState(() => Math.floor(Math.random() * 45) + 5);
  const [isFullGalleryOpen, setIsFullGalleryOpen] = useState(false);
  const [fullGalleryStartIndex, setFullGalleryStartIndex] = useState(0);
  const [addingToCart, setAddingToCart] = useState(false);

  const abortRef = useRef(null);

  useEffect(() => {
    if (!id) return;

    abortRef.current?.abort();
    abortRef.current = new AbortController();

    const fetchProduct = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await API.get(`/products/${id}`, {
          signal: abortRef.current.signal,
        });
        const data = res.data;
        setProduct(data);
        const primaryImg = getImageUrl(data.imageUrl);
        setMainImage(primaryImg);
        preloadImage(primaryImg);
        if (data.galleryImages?.length) {
          preloadImage(getImageUrl(data.galleryImages[0]));
        }
      } catch (err) {
        if (err.name === 'CanceledError' || err.name === 'AbortError') return;
        setError(err);
        toast.error('Product not found.');
        navigate('/products', { replace: true });
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
    window.scrollTo({ top: 0, behavior: 'smooth' });

    return () => abortRef.current?.abort();
  }, [id, navigate]);

  const galleryImages = useMemo(() => {
    if (!product) return [];
    const extras = product.galleryImages?.filter(Boolean) ?? [];
    return product.imageUrl ? [product.imageUrl, ...extras] : extras;
  }, [product]);

  const has3DModel = useMemo(
    () => !!(product?.modelUrl),
    [product]
  );

  const actual3DModelUrl = has3DModel ? getImageUrl(product.modelUrl) : null;

  const handleImageSwap = useCallback(
    (newImgUrl) => {
      const resolved = getImageUrl(newImgUrl);
      if (resolved === mainImage) return;
      setIsFading(true);
      setTimeout(() => {
        setMainImage(resolved);
        setIsFading(false);
      }, 180);
    },
    [mainImage]
  );

  const openFullGallery = useCallback(
    (imgUrl) => {
      const resolved = getImageUrl(imgUrl);
      const raw = galleryImages.find((img) => getImageUrl(img) === resolved);
      const index = raw !== undefined ? galleryImages.indexOf(raw) : 0;
      setFullGalleryStartIndex(index);
      setIsFullGalleryOpen(true);
    },
    [galleryImages]
  );

  const handleAddToCart = useCallback(async () => {
    if (!product || product.stock === 0) {
      toast.error('Currently out of stock.');
      return;
    }
    if (addingToCart) return;
    setAddingToCart(true);
    try {
      for (let i = 0; i < quantity; i++) {
        addToCart(product);
      }
      toast.success(
        <div className="flex flex-col gap-0.5">
          <span className="font-bold text-white text-sm">
            <ScrambleText text="Added to Collection" />
          </span>
          <span className="text-xs text-neutral-400">
            {quantity}× {product.name}
          </span>
        </div>,
        {
          duration: 3500,
          style: {
            background: 'rgba(10,10,10,0.9)',
            backdropFilter: 'blur(20px)',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '16px',
            padding: '14px 18px',
          },
        }
      );
    } finally {
      setTimeout(() => setAddingToCart(false), 800);
    }
  }, [product, quantity, addToCart, addingToCart]);

  const incrementQty = useCallback(
    () => setQuantity((q) => Math.min(product?.stock ?? 1, q + 1)),
    [product]
  );
  const decrementQty = useCallback(
    () => setQuantity((q) => Math.max(1, q - 1)),
    []
  );

  const totalPrice = useMemo(
    () => ((product?.price ?? 0) * quantity).toLocaleString('en-IN'),
    [product, quantity]
  );

  if (loading) return <ProductSkeleton />;
  if (!product) return null;

  const isOutOfStock = product.stock === 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="min-h-screen bg-neutral-50 dark:bg-[#030303] pt-6 pb-32 md:py-12 transition-colors duration-500 relative overflow-hidden"
    >
      {/* Fullscreen Gallery Portal */}
      <AnimatePresence>
        {isFullGalleryOpen && (
          <FullScreenGalleryModal
            images={galleryImages}
            startIndex={fullGalleryStartIndex}
            onClose={() => setIsFullGalleryOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Ambient glow */}
      <div
        aria-hidden="true"
        className="fixed inset-0 pointer-events-none z-0 overflow-hidden"
      >
        <div className="absolute top-[-15%] left-[-10%] w-[70vw] h-[70vw] bg-[radial-gradient(circle,rgba(255,255,255,0.025)_0%,transparent_70%)] rounded-full blur-[140px]" />
        <div className="absolute inset-0 bg-[radial-gradient(#e5e5e5_1px,transparent_1px)] dark:bg-[radial-gradient(#191919_1px,transparent_1px)] bg-[size:32px_32px] opacity-30 [mask-image:radial-gradient(ellipse_80%_80%_at_50%_0%,#000_20%,transparent_100%)]" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">

        {/* Breadcrumbs */}
        <nav
          aria-label="Breadcrumb"
          className="flex items-center text-[10px] font-bold text-neutral-500 mb-8 uppercase tracking-[0.2em] bg-white/60 dark:bg-white/[0.02] backdrop-blur-xl w-fit px-5 py-2.5 rounded-full border border-neutral-200/70 dark:border-white/[0.05] shadow-sm"
        >
          <Link
            to="/"
            className="hover:text-neutral-900 dark:hover:text-white transition-colors"
          >
            Home
          </Link>
          <span className="mx-2.5 opacity-40">/</span>
          <Link
            to="/products"
            className="hover:text-neutral-900 dark:hover:text-white transition-colors"
          >
            Shop
          </Link>
          <span className="mx-2.5 opacity-40">/</span>
          <span
            className="text-neutral-900 dark:text-white truncate max-w-[180px]"
            aria-current="page"
          >
            {product.name}
          </span>
        </nav>

        {/* Main Card */}
        <div className="bg-white/70 dark:bg-[#0a0a0a]/80 backdrop-blur-3xl rounded-[2.5rem] shadow-2xl dark:shadow-[0_32px_80px_-20px_rgba(0,0,0,0.9)] border border-neutral-200/50 dark:border-white/[0.04] overflow-hidden mb-8">
          <div className="grid grid-cols-1 lg:grid-cols-2">

            {/* LEFT: STAGE */}
            <div className="p-6 sm:p-10 lg:p-14 flex flex-col items-center justify-center border-b lg:border-b-0 lg:border-r border-neutral-200/50 dark:border-white/[0.04] relative min-h-[500px] lg:min-h-[640px] bg-neutral-50/40 dark:bg-black/20">

              {/* Live viewers badge */}
              <div
                aria-live="polite"
                className="absolute top-6 right-6 z-20 bg-white/90 dark:bg-neutral-900/90 backdrop-blur-xl border border-neutral-200 dark:border-white/[0.08] text-neutral-700 dark:text-white text-[10px] font-black tracking-widest px-4 py-2 rounded-full flex items-center gap-2 shadow-sm"
              >
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                {activeViewers} VIEWING
              </div>

              {/* 3D Toggle */}
              {has3DModel && (
                <button
                  onClick={() => setShow3D((v) => !v)}
                  className="absolute top-6 left-6 z-20 bg-neutral-900 dark:bg-white text-white dark:text-black px-5 py-2.5 rounded-full font-black text-[10px] tracking-widest uppercase shadow-lg hover:scale-105 active:scale-95 transition-transform flex items-center gap-2"
                >
                  {show3D ? '⏏ 2D' : '🧊 3D'}
                </button>
              )}

              {/* Primary Image */}
              <div
                onClick={() => !show3D && mainImage && openFullGallery(mainImage)}
                role={show3D ? undefined : 'button'}
                aria-label={show3D ? undefined : 'Open full image gallery'}
                tabIndex={show3D ? undefined : 0}
                onKeyDown={(e) => {
                  if (!show3D && (e.key === 'Enter' || e.key === ' ')) {
                    openFullGallery(mainImage);
                  }
                }}
                className={`w-full max-w-lg rounded-[2rem] overflow-hidden flex items-center justify-center mb-8 relative group transition-all duration-500 ${
                  show3D
                    ? ''
                    : 'bg-white dark:bg-neutral-900 shadow-sm border border-neutral-100 dark:border-white/[0.04] cursor-pointer'
                }`}
                style={{ aspectRatio: '1 / 1' }}
              >
                {!show3D && (
                  <div className="absolute inset-0 z-10 bg-black/35 backdrop-blur-[2px] flex items-center justify-center opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-all duration-300 rounded-[2rem]">
                    <span className="text-white font-black tracking-widest text-[11px] uppercase bg-white/10 backdrop-blur-md px-6 py-3 rounded-full border border-white/20">
                      EXPAND
                    </span>
                  </div>
                )}

                {show3D && has3DModel ? (
                  <model-viewer
                    src={actual3DModelUrl}
                    alt={`3D model of ${product.name}`}
                    camera-controls
                    auto-rotate
                    ar
                    style={{ width: '100%', height: '100%', zIndex: 10 }}
                  >
                    <button
                      slot="ar-button"
                      className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white text-black px-6 py-3 rounded-full font-bold text-xs tracking-widest uppercase shadow-2xl z-20"
                    >
                      VIEW IN AR
                    </button>
                  </model-viewer>
                ) : mainImage ? (
                  <ImageMagnifier
                    src={mainImage}
                    alt={product.name}
                    isFading={isFading}
                  />
                ) : (
                  <span className="text-6xl opacity-20">📦</span>
                )}
              </div>

              {/* Thumbnails */}
              {!show3D && galleryImages.length > 1 && (
                <div className="w-full max-w-lg">
                  <div
                    className="flex gap-3 overflow-x-auto py-1.5 px-1 snap-x justify-start sm:justify-center"
                    style={{ scrollbarWidth: 'thin' }}
                  >
                    {galleryImages.map((img, idx) => {
                      const resolved = getImageUrl(img);
                      const isActive = mainImage === resolved;
                      return (
                        <button
                          key={idx}
                          onClick={() => handleImageSwap(img)}
                          aria-label={`View image ${idx + 1}`}
                          aria-pressed={isActive}
                          className={`relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden flex-shrink-0 snap-center transition-all duration-300 border-2 bg-white dark:bg-neutral-900 ${
                            isActive
                              ? 'border-neutral-900 dark:border-white shadow-md scale-[1.04]'
                              : 'border-neutral-200 dark:border-neutral-800 opacity-55 hover:opacity-100 hover:border-neutral-400 dark:hover:border-neutral-600'
                          }`}
                        >
                          <img
                            src={resolved}
                            alt={`Product view ${idx + 1}`}
                            className="w-full h-full object-cover"
                            loading="lazy"
                            onError={(e) => {
                              e.target.src = FALLBACK_IMAGE;
                            }}
                          />
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* RIGHT: INFO */}
            <div className="p-8 sm:p-12 lg:p-16 flex flex-col justify-center">

              {/* Meta row */}
              <div className="mb-6 flex flex-wrap items-center gap-3">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-800 dark:text-white bg-neutral-100 dark:bg-white/[0.08] px-4 py-1.5 rounded-full border border-neutral-200 dark:border-white/10">
                  {product.category}
                </span>
                {product.averageRating > 0 ? (
                  <div className="flex items-center gap-1.5 bg-neutral-900 dark:bg-white px-3 py-1.5 rounded-full">
                    <span className="text-white dark:text-black text-xs leading-none">★</span>
                    <span className="text-[10px] font-black tracking-widest text-white dark:text-black">
                      {product.averageRating.toFixed(1)}
                    </span>
                  </div>
                ) : (
                  <span className="text-[10px] font-black px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 tracking-widest">
                    NEW
                  </span>
                )}
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-[3.25rem] font-black text-neutral-900 dark:text-white tracking-tighter leading-[1.04] mb-6">
                {product.name}
              </h1>

              {/* Price row */}
              <div className="flex flex-col sm:flex-row sm:items-end gap-3 sm:gap-5 mb-8">
                <span className="text-4xl sm:text-5xl font-medium text-neutral-900 dark:text-white tracking-tight">
                  ₹{product.price?.toLocaleString('en-IN') ?? '—'}
                </span>
                {isOutOfStock ? (
                  <span className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-1">
                    OUT OF STOCK
                  </span>
                ) : (
                  <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-1 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    IN STOCK ({product.stock})
                  </span>
                )}
              </div>

              <p className="text-neutral-500 dark:text-neutral-400 text-base sm:text-lg mb-10 font-medium leading-relaxed">
                {product.shortDescription ||
                  'Experience unparalleled quality and design — crafted for those who demand the best.'}
              </p>

              <hr className="border-neutral-200 dark:border-white/[0.05] mb-8" />

              {/* CTA */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex items-center justify-between bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-white/[0.08] p-1.5 w-full sm:w-44 shadow-sm">
                  <button
                    onClick={decrementQty}
                    disabled={quantity <= 1}
                    aria-label="Decrease quantity"
                    className="w-11 h-11 flex items-center justify-center hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-colors font-medium text-xl text-neutral-500 dark:text-neutral-400 disabled:opacity-30"
                  >
                    −
                  </button>
                  <span className="flex-1 text-center font-bold text-lg text-neutral-900 dark:text-white select-none">
                    {quantity}
                  </span>
                  <button
                    onClick={incrementQty}
                    disabled={isOutOfStock || quantity >= product.stock}
                    aria-label="Increase quantity"
                    className="w-11 h-11 flex items-center justify-center hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-colors font-medium text-xl text-neutral-500 dark:text-neutral-400 disabled:opacity-30"
                  >
                    +
                  </button>
                </div>

                <motion.button
                  whileTap={!isOutOfStock && !addingToCart ? { scale: 0.97 } : {}}
                  onClick={handleAddToCart}
                  disabled={isOutOfStock || addingToCart}
                  aria-label={isOutOfStock ? 'Out of stock' : 'Add to bag'}
                  className={`flex-1 font-black text-[11px] tracking-[0.15em] py-5 sm:py-0 rounded-2xl transition-all duration-200 flex items-center justify-center gap-3 ${
                    isOutOfStock
                      ? 'bg-neutral-100 dark:bg-neutral-900 text-neutral-400 cursor-not-allowed'
                      : addingToCart
                      ? 'bg-neutral-700 dark:bg-neutral-200 text-white dark:text-neutral-800 cursor-wait'
                      : 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 shadow-xl hover:shadow-2xl hover:-translate-y-0.5 active:translate-y-0'
                  }`}
                >
                  {isOutOfStock ? (
                    'UNAVAILABLE'
                  ) : addingToCart ? (
                    <span className="flex items-center gap-2">
                      <svg
                        className="animate-spin w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8v8z"
                        />
                      </svg>
                      ADDING…
                    </span>
                  ) : (
                    <ScrambleText text="ADD TO BAG" />
                  )}
                </motion.button>
              </div>

              <TrustBadges />
            </div>
          </div>
        </div>

        {/* Details & Specs */}
        <div className="bg-white/70 dark:bg-[#0a0a0a]/80 backdrop-blur-3xl rounded-[2.5rem] shadow-xl border border-neutral-200/50 dark:border-white/[0.04] p-8 sm:p-12 lg:p-16 mb-8">
          <div className="flex items-center gap-4 mb-10 border-b border-neutral-200 dark:border-white/[0.05] pb-8">
            <h2 className="text-2xl sm:text-3xl font-medium text-neutral-900 dark:text-white tracking-tight">
              Details &amp; Specs
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 lg:gap-20">
            <div className="lg:col-span-2">
              <h3 className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.2em] mb-6">
                Overview
              </h3>
              <p className="text-neutral-600 dark:text-neutral-300 leading-relaxed text-base sm:text-lg whitespace-pre-line font-medium">
                {product.detailedDescription ||
                  product.description ||
                  'Detailed specifications not provided.'}
              </p>
            </div>

            <div className="bg-neutral-50 dark:bg-neutral-900/60 rounded-3xl p-8 border border-neutral-200 dark:border-white/[0.05]">
              <h3 className="text-[10px] font-bold text-neutral-900 dark:text-white uppercase tracking-[0.2em] mb-8">
                Technical
              </h3>
              <dl className="space-y-5 text-neutral-900 dark:text-white">
                {[
                  { label: 'Brand', value: 'Originals' },
                  {
                    label: 'Category',
                    value: product.category,
                    className: 'uppercase tracking-wider',
                  },
                  { label: 'Model Year', value: '2026' },
                  {
                    label: 'SKU',
                    value: product._id?.substring(0, 8)?.toUpperCase() ?? 'N/A',
                    className: 'font-mono',
                  },
                ].map(({ label, value, className = '' }, i, arr) => (
                  <div
                    key={label}
                    className={`flex justify-between items-center pb-5 ${
                      i < arr.length - 1
                        ? 'border-b border-neutral-200 dark:border-white/[0.05]'
                        : ''
                    }`}
                  >
                    <dt className="text-xs font-bold text-neutral-500">{label.toUpperCase()}</dt>
                    <dd className={`text-sm font-medium ${className}`}>{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Sticky Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 w-full bg-white/92 dark:bg-black/92 backdrop-blur-2xl border-t border-neutral-200/70 dark:border-white/[0.08] z-50 shadow-[0_-8px_40px_rgba(0,0,0,0.08)] dark:shadow-[0_-8px_40px_rgba(0,0,0,0.6)]">
        <div className="flex items-center justify-between gap-4 px-5 py-3 pb-[max(12px,env(safe-area-inset-bottom))]">
          <div className="flex flex-col">
            <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest">
              Total
            </span>
            <span className="text-xl font-semibold text-neutral-900 dark:text-white">
              ₹{totalPrice}
            </span>
          </div>
          <button
            onClick={handleAddToCart}
            disabled={isOutOfStock || addingToCart}
            className={`flex-1 font-black text-[11px] tracking-[0.12em] py-4 rounded-xl transition-all active:scale-95 ${
              isOutOfStock
                ? 'bg-neutral-100 dark:bg-neutral-900 text-neutral-400'
                : 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900'
            }`}
          >
            {isOutOfStock ? 'UNAVAILABLE' : addingToCart ? 'ADDING…' : 'ADD TO BAG'}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

export default memo(ProductDetail);