import React, { useEffect, useState, useRef } from "react"; 
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useCart } from "../context/CartContext"; 
import { useTheme } from "../context/ThemeContext";
import API from '../services/api'; 
import toast from 'react-hot-toast';

function Navbar() {
    const navigate = useNavigate();
    const location = useLocation();
    const { cartCount } = useCart(); 
    const { isDarkMode, toggleDarkMode } = useTheme();
    
    const [token, setToken] = useState(localStorage.getItem('token'));
    const [role, setRole] = useState(localStorage.getItem('role'));
    const userId = localStorage.getItem('userId');
    
    const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false); 
    const [currentLang, setCurrentLang] = useState('en');

    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const [isListening, setIsListening] = useState(false);
    
    const [walletBalance, setWalletBalance] = useState(0);
    const fileInputRef = useRef(null);

    // ==========================================
    // 🌍 INVISIBLE TRANSLATION ENGINE
    // ==========================================
    useEffect(() => {
        if (!window.googleTranslateElementInit) {
            const script = document.createElement('script');
            script.src = '//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
            script.async = true;
            document.body.appendChild(script);

            window.googleTranslateElementInit = () => {
                new window.google.translate.TranslateElement({
                    pageLanguage: 'en',
                    includedLanguages: 'en,hi,te,ta,kn,ml,bn,gu,mr,fr,es,de,zh-CN,ar',
                    autoDisplay: false
                }, 'google_translate_element');
            };
        }
    }, []);

    const changeLanguage = (langCode, langName) => {
        setCurrentLang(langCode);
        setIsLangMenuOpen(false);

        const select = document.querySelector('.goog-te-combo');
        if (select) {
            select.value = langCode;
            select.dispatchEvent(new Event('change'));
            toast.success(`Language changed to ${langName} 🌐`);
        } else {
            toast.error("Translation engine initializing, please wait...");
        }
    };

    // ==========================================
    // ⚙️ CORE NAVBAR LOGIC
    // ==========================================
    useEffect(() => {
        setToken(localStorage.getItem('token'));
        setRole(localStorage.getItem('role'));
        setIsLangMenuOpen(false);
        setShowDropdown(false);
        setIsMobileMenuOpen(false); 
        
        if (userId) API.get(`/orders/wallet/${userId}`).then(res => setWalletBalance(res.data)).catch(() => {});
        else setWalletBalance(0);
    }, [location, userId]);

    useEffect(() => {
        if (isMobileMenuOpen) document.body.style.overflow = 'hidden';
        else document.body.style.overflow = 'unset';
    }, [isMobileMenuOpen]);

    useEffect(() => {
        if (!searchQuery.trim() || searchQuery === "Scanning image... 🤖" || searchQuery === "Matches Found ✨") {
            if (searchQuery === "") { setSearchResults([]); setShowDropdown(false); }
            return;
        }
        const delayDebounceFn = setTimeout(async () => {
            setIsSearching(true); setShowDropdown(true);
            try {
                const res = await API.get(`/products/search?name=${searchQuery}`);
                setSearchResults(res.data.slice(0, 5)); 
            } catch (error) { console.error("Search error", error); } 
            finally { setIsSearching(false); }
        }, 300);
        return () => clearTimeout(delayDebounceFn);
    }, [searchQuery]);

    const handleLogout = () => {
        localStorage.clear(); setToken(null); setRole(null); setWalletBalance(0);
        toast.success("Successfully signed out!"); navigate('/login');
    };

    const handleVoiceSearch = () => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) return toast.error("Browser doesn't support Voice Search.");
        const recognition = new SpeechRecognition();
        
        recognition.lang = currentLang === 'hi' ? 'hi-IN' : currentLang === 'te' ? 'te-IN' : 'en-US';
        
        recognition.onstart = () => { setIsListening(true); setSearchQuery(''); };
        recognition.onresult = (event) => { setSearchQuery(event.results[0][0].transcript.replace(/\.$/, '')); setShowDropdown(true); };
        recognition.onerror = () => setIsListening(false);
        recognition.onend = () => setIsListening(false);
        recognition.start();
    };

    const handleVisualSearch = async (e) => {
        const file = e.target.files[0]; if (!file) return;
        setIsSearching(true); setShowDropdown(true); setSearchQuery("Scanning image... 🤖"); 
        const formData = new FormData(); formData.append('image', file);
        try {
            const res = await API.post('/products/visual-search', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
            setSearchResults(res.data); setSearchQuery("Matches Found ✨");
        } catch (error) { toast.error("Image search failed."); setShowDropdown(false); setSearchQuery(""); } 
        finally { setIsSearching(false); e.target.value = null; }
    };

    const isActive = (path) => location.pathname === path ? "text-blue-600 dark:text-cyan-400 font-black border-b-2 border-blue-600 dark:border-cyan-400 pb-1" : "text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-cyan-400 transition-colors duration-200 font-bold";

    const SearchBar = () => (
        <div className="relative flex items-center w-full">
            <span className="absolute left-4 text-gray-400 text-sm">🔍</span>
            <input 
                type="text" 
                placeholder={isListening ? "Listening..." : "Search for products..."} 
                value={searchQuery} 
                onChange={(e) => setSearchQuery(e.target.value)} 
                onFocus={() => searchQuery.trim() && setShowDropdown(true)} 
                className={`w-full bg-gray-100/80 dark:bg-[#111]/80 text-gray-900 dark:text-white px-5 py-3 pl-11 pr-20 rounded-full text-sm font-medium outline-none transition-all border shadow-inner ${isListening ? 'border-red-500 ring-2 ring-red-500/20' : 'border-transparent focus:border-blue-500 dark:focus:border-cyan-500 focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-cyan-500/20 dark:border-white/[0.02]'}`} 
            />
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleVisualSearch} />
            <div className="absolute right-2 flex items-center gap-1">
                <button type="button" onClick={handleVoiceSearch} className={`p-2 rounded-full transition-transform duration-300 ${isListening ? 'text-red-500 bg-red-100 dark:bg-red-500/20 animate-pulse scale-110' : 'text-gray-400 hover:text-blue-600 dark:hover:text-cyan-400 hover:bg-white dark:hover:bg-[#222]'}`}>
                    {isListening ? <span className="text-sm">🛑</span> : <span className="text-sm">🎙️</span>}
                </button>
                <button type="button" onClick={() => fileInputRef.current.click()} className="p-2 rounded-full text-gray-400 hover:text-purple-600 dark:hover:text-fuchsia-400 hover:bg-white dark:hover:bg-[#222] transition-colors duration-300">
                    <span className="text-sm">📷</span>
                </button>
            </div>
            {showDropdown && (
                <div className="absolute top-full left-0 right-0 mt-3 bg-white/95 dark:bg-[#0a0a0a]/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-100 dark:border-white/10 overflow-hidden z-50 animate-[fadeIn_0.2s_ease-out]">
                    {isSearching ? <div className="p-4 text-center font-bold text-gray-500 text-sm animate-pulse">Searching...</div> : 
                    searchResults.length > 0 ? (
                        <div className="max-h-[60vh] md:max-h-[300px] overflow-y-auto custom-scrollbar p-2">
                            {searchResults.map(product => (
                                <div key={product.id} onClick={() => { navigate(`/product/${product.id}`); setSearchQuery(''); setShowDropdown(false); }} className="flex items-center gap-4 p-3 hover:bg-gray-50 dark:hover:bg-white/[0.05] cursor-pointer rounded-xl transition-colors">
                                    <div className="w-12 h-12 bg-gray-100 dark:bg-[#111] rounded-xl overflow-hidden border border-gray-200 dark:border-white/5 flex-shrink-0">
                                        {product.imageUrl ? <img src={product.imageUrl.startsWith('http') ? product.imageUrl : `/uploads/${product.imageUrl}`} alt={product.name} className="w-full h-full object-cover" /> : <span className="flex items-center justify-center h-full text-xl opacity-50">📦</span>}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="text-sm font-bold text-gray-900 dark:text-white truncate">{product.name}</h4>
                                        <p className="text-xs text-blue-600 dark:text-cyan-400 font-black">₹{product.price.toLocaleString()}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : <div className="p-4 text-center text-sm font-bold text-gray-500">No items found.</div>}
                </div>
            )}
        </div>
    );

    return (
        <>
            {/* Translate Hider */}
            <div id="google_translate_element" className="hidden"></div>
            <style dangerouslySetInnerHTML={{__html: `
                .goog-te-banner-frame.skiptranslate, iframe.goog-te-banner-frame, .skiptranslate > iframe { display: none !important; visibility: hidden !important; }
                body { top: 0px !important; position: static !important; }
                html { top: 0px !important; position: static !important; }
                #goog-gt-tt, .goog-te-balloon-frame { display: none !important; }
                .goog-tooltip { display: none !important; }
                .goog-text-highlight { background-color: transparent !important; box-shadow: none !important; }
                font { background-color: transparent !important; }
            `}} />

            {/* 💎 MAIN NAVBAR */}
            <nav className="sticky top-0 z-[100] bg-white/80 dark:bg-[#020202]/80 backdrop-blur-2xl border-b border-gray-200/50 dark:border-white/[0.05] shadow-[0_4px_30px_rgba(0,0,0,0.03)] dark:shadow-[0_4px_30px_rgba(0,0,0,0.5)] transition-colors duration-500">
                <div className="max-w-[100rem] mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16 md:h-20 gap-4">
                        
                        {/* Mobile Menu Toggle */}
                        <button onClick={() => setIsMobileMenuOpen(true)} className="md:hidden p-2 -ml-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl transition-colors active:scale-95">
                            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h16M4 18h8"></path></svg>
                        </button>

                        {/* Brand Logo */}
                        <Link to="/" className="flex items-center gap-2.5 group flex-shrink-0">
                            <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-tr from-blue-600 to-indigo-600 dark:from-cyan-400 dark:to-purple-500 rounded-xl flex items-center justify-center transform group-hover:rotate-12 group-hover:scale-105 transition-all duration-300 shadow-lg shadow-blue-500/30 dark:shadow-[0_0_20px_rgba(6,182,212,0.4)]">
                                <span className="text-white dark:text-black font-black text-lg md:text-xl">P</span>
                            </div>
                            <span className="text-xl md:text-2xl font-black text-gray-900 dark:text-white tracking-tighter hidden sm:block group-hover:text-blue-600 dark:group-hover:text-cyan-400 transition-colors">ProCart</span>
                        </Link>

                        {/* Desktop Search */}
                        <div className="hidden md:block flex-1 max-w-xl mx-8">
                            <SearchBar />
                        </div>

                        {/* Desktop Navigation Links */}
                        <div className="hidden lg:flex space-x-8 items-center text-xs uppercase tracking-widest">
                            <Link to="/products" className={isActive('/products')}>Shop</Link>
                            {token && role === 'ADMIN' && <Link to="/admin" className={isActive('/admin')}>Admin</Link>}
                            {token && <Link to="/orders" className={isActive('/orders')}>Orders</Link>}
                            {token && <Link to="/track" className={`flex items-center gap-1.5 ${isActive('/track')}`}><span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span> Track Order</Link>}
                        </div>
                        
                        {/* Right Side Icons & Actions */}
                        <div className="flex items-center gap-1.5 md:gap-2 ml-auto">
                            
                            {token && (
                                <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-yellow-50 dark:bg-yellow-500/10 text-yellow-700 dark:text-yellow-500 rounded-full font-black text-[10px] uppercase tracking-widest border border-yellow-200 dark:border-yellow-500/20 cursor-default shadow-sm mr-2">
                                    🟡 {walletBalance}
                                </div>
                            )}

                            {token && (
                                <Link to="/wishlist" className="hidden md:flex items-center justify-center w-10 h-10 rounded-full bg-gray-50 dark:bg-white/[0.02] text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 hover:scale-105 active:scale-95 transition-all duration-300 border border-gray-200/50 dark:border-white/[0.05]">
                                    <span className="text-lg">❤️</span>
                                </Link>
                            )}

                            <Link to="/cart" className="relative hidden md:flex items-center justify-center w-10 h-10 rounded-full bg-gray-50 dark:bg-white/[0.02] text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 hover:scale-105 active:scale-95 transition-all duration-300 border border-gray-200/50 dark:border-white/[0.05]">
                                <span className="text-lg">🛒</span>
                                {cartCount > 0 && <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center animate-bounce shadow-md border-2 border-white dark:border-[#020202]">{cartCount}</span>}
                            </Link>

                            {token && (
                                <Link to="/profile" className="hidden md:flex items-center justify-center w-10 h-10 rounded-full bg-gray-50 dark:bg-white/[0.02] text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 hover:scale-105 active:scale-95 transition-all duration-300 border border-gray-200/50 dark:border-white/[0.05]">
                                    <span className="text-lg">👤</span>
                                </Link>
                            )}

                            <button onClick={toggleDarkMode} className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-50 dark:bg-white/[0.02] text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 hover:scale-105 active:scale-95 transition-all duration-300 border border-gray-200/50 dark:border-white/[0.05]">
                                {isDarkMode ? '🌙' : '☀️'}
                            </button>

                            <div className="relative hidden sm:block">
                                <button onClick={() => setIsLangMenuOpen(!isLangMenuOpen)} className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-50 dark:bg-white/[0.02] text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 hover:scale-105 active:scale-95 transition-all duration-300 border border-gray-200/50 dark:border-white/[0.05]">
                                    <span className="text-lg">🌐</span>
                                </button>
                                {isLangMenuOpen && (
                                    <div className="absolute right-0 mt-3 w-40 bg-white/95 dark:bg-[#0a0a0a]/95 backdrop-blur-xl rounded-2xl shadow-2xl dark:shadow-[0_0_30px_rgba(0,0,0,0.8)] border border-gray-100 dark:border-white/10 overflow-hidden z-50 p-2 animate-[fadeIn_0.2s_ease-out]">
                                        <button onClick={() => changeLanguage('en', 'English')} className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-bold transition-colors ${currentLang === 'en' ? 'bg-blue-50 dark:bg-cyan-500/10 text-blue-600 dark:text-cyan-400' : 'hover:bg-gray-50 dark:hover:bg-white/[0.05] text-gray-700 dark:text-gray-300'}`}>🇬🇧 English</button>
                                        <button onClick={() => changeLanguage('hi', 'Hindi')} className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-bold transition-colors ${currentLang === 'hi' ? 'bg-blue-50 dark:bg-cyan-500/10 text-blue-600 dark:text-cyan-400' : 'hover:bg-gray-50 dark:hover:bg-white/[0.05] text-gray-700 dark:text-gray-300'}`}>🇮🇳 हिंदी</button>
                                        <button onClick={() => changeLanguage('te', 'Telugu')} className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-bold transition-colors ${currentLang === 'te' ? 'bg-blue-50 dark:bg-cyan-500/10 text-blue-600 dark:text-cyan-400' : 'hover:bg-gray-50 dark:hover:bg-white/[0.05] text-gray-700 dark:text-gray-300'}`}>🇮🇳 తెలుగు</button>
                                        <button onClick={() => changeLanguage('ta', 'Tamil')} className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-bold transition-colors ${currentLang === 'ta' ? 'bg-blue-50 dark:bg-cyan-500/10 text-blue-600 dark:text-cyan-400' : 'hover:bg-gray-50 dark:hover:bg-white/[0.05] text-gray-700 dark:text-gray-300'}`}>🇮🇳 தமிழ்</button>
                                        <button onClick={() => changeLanguage('ml', 'Malayalam')} className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-bold transition-colors ${currentLang === 'ml' ? 'bg-blue-50 dark:bg-cyan-500/10 text-blue-600 dark:text-cyan-400' : 'hover:bg-gray-50 dark:hover:bg-white/[0.05] text-gray-700 dark:text-gray-300'}`}>🇮🇳 മലയാളം</button>
                                    </div>
                                )}
                            </div>

                            {token ? (
                                <button onClick={handleLogout} className="hidden sm:flex items-center px-6 py-2.5 text-xs uppercase tracking-widest font-black text-white dark:text-black bg-red-500 dark:bg-rose-500 hover:bg-red-600 dark:hover:bg-rose-400 rounded-full shadow-lg ml-2 hover:-translate-y-0.5 active:scale-95 transition-all">Sign Out</button>
                            ) : (
                                <Link to="/login" className="hidden sm:flex items-center px-6 py-2.5 text-xs uppercase tracking-widest font-black text-white dark:text-black bg-gray-900 dark:bg-white hover:bg-blue-600 dark:hover:bg-cyan-400 rounded-full shadow-lg ml-2 hover:-translate-y-0.5 active:scale-95 transition-all">Login</Link>
                            )}
                        </div>

                    </div>
                </div>

                {/* Mobile Search Bar integrated cleanly into the header */}
                <div className="md:hidden px-4 pb-4">
                    <SearchBar />
                </div>
            </nav>

            {/* 📱 PREMIUM IOS-STYLE MOBILE DRAWER */}
            <div className={`fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${isMobileMenuOpen ? 'opacity-100 visible' : 'opacity-0 invisible'}`} onClick={() => setIsMobileMenuOpen(false)}></div>

            <div className={`fixed inset-y-0 left-0 z-[120] w-[85%] max-w-sm bg-[#f8fafc] dark:bg-[#000000] shadow-2xl border-r border-gray-200 dark:border-white/10 transform transition-transform duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] flex flex-col ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                
                {/* Drawer Header */}
                <div className="p-6 bg-white dark:bg-[#0a0a0a] border-b border-gray-100 dark:border-white/5 rounded-b-3xl shadow-sm">
                    <div className="flex justify-between items-start mb-6">
                        <div className="w-14 h-14 bg-gradient-to-tr from-blue-600 to-indigo-600 dark:from-cyan-400 dark:to-purple-500 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30 dark:shadow-[0_0_20px_rgba(6,182,212,0.4)] text-white dark:text-black text-2xl font-black">
                            {token ? '👤' : 'P'}
                        </div>
                        <button onClick={() => setIsMobileMenuOpen(false)} className="w-8 h-8 bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 rounded-full flex items-center justify-center text-gray-600 dark:text-gray-300 font-bold transition-colors">✕</button>
                    </div>
                    {token ? (
                        <>
                            <h2 className="text-xl font-black text-gray-900 dark:text-white tracking-tight mb-1 truncate">Welcome Back</h2>
                            <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-4">{role === 'ADMIN' ? 'Administrator' : 'Premium Member'}</p>
                            <div className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-50 dark:bg-yellow-500/10 text-yellow-700 dark:text-yellow-500 rounded-xl font-black text-[10px] uppercase tracking-widest border border-yellow-200 dark:border-yellow-500/20 shadow-sm">
                                🟡 {walletBalance} ProCoins
                            </div>
                        </>
                    ) : (
                        <>
                            <h2 className="text-xl font-black text-gray-900 dark:text-white tracking-tight mb-2">Guest Mode</h2>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-6">Login to track your orders and save items.</p>
                            <Link to="/login" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center justify-center w-full py-3.5 bg-gray-900 dark:bg-white text-white dark:text-black rounded-xl font-black text-sm uppercase tracking-widest shadow-lg active:scale-95 transition-transform">Sign In / Register</Link>
                        </>
                    )}
                </div>

                {/* Drawer Content (iOS Control Center Style Cards) */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                    
                    {/* Navigation Block */}
                    <div className="bg-white dark:bg-[#0a0a0a] rounded-2xl p-2 border border-gray-100 dark:border-white/5 shadow-sm">
                        <Link to="/" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-4 px-4 py-3.5 text-gray-800 dark:text-gray-200 font-bold hover:bg-gray-50 dark:hover:bg-white/[0.02] rounded-xl transition-colors">
                            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-cyan-500/10 flex items-center justify-center text-lg">🏠</div>
                            Home
                        </Link>
                        <Link to="/products" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-4 px-4 py-3.5 text-gray-800 dark:text-gray-200 font-bold hover:bg-gray-50 dark:hover:bg-white/[0.02] rounded-xl transition-colors">
                            <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-500/10 flex items-center justify-center text-lg">🛍️</div>
                            Shop Products
                        </Link>
                        <Link to="/cart" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-4 px-4 py-3.5 text-gray-800 dark:text-gray-200 font-bold hover:bg-gray-50 dark:hover:bg-white/[0.02] rounded-xl transition-colors">
                            <div className="relative w-8 h-8 rounded-lg bg-orange-50 dark:bg-orange-500/10 flex items-center justify-center text-lg">
                                🛒
                                {cartCount > 0 && <span className="absolute -top-1 -right-1 bg-red-500 w-3.5 h-3.5 rounded-full border border-white dark:border-black"></span>}
                            </div>
                            My Cart
                        </Link>
                    </div>

                    {/* User Account Block */}
                    {token && (
                        <div className="bg-white dark:bg-[#0a0a0a] rounded-2xl p-2 border border-gray-100 dark:border-white/5 shadow-sm">
                            <Link to="/orders" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-4 px-4 py-3.5 text-gray-800 dark:text-gray-200 font-bold hover:bg-gray-50 dark:hover:bg-white/[0.02] rounded-xl transition-colors">
                                <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-lg">📦</div>
                                Order History
                            </Link>
                            <Link to="/track" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-4 px-4 py-3.5 text-gray-800 dark:text-gray-200 font-bold hover:bg-gray-50 dark:hover:bg-white/[0.02] rounded-xl transition-colors">
                                <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-lg">🚚</div>
                                Track Delivery
                            </Link>
                            <Link to="/wishlist" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-4 px-4 py-3.5 text-gray-800 dark:text-gray-200 font-bold hover:bg-gray-50 dark:hover:bg-white/[0.02] rounded-xl transition-colors">
                                <div className="w-8 h-8 rounded-lg bg-red-50 dark:bg-rose-500/10 flex items-center justify-center text-lg">❤️</div>
                                Saved Items
                            </Link>
                            <Link to="/profile" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-4 px-4 py-3.5 text-gray-800 dark:text-gray-200 font-bold hover:bg-gray-50 dark:hover:bg-white/[0.02] rounded-xl transition-colors">
                                <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-white/10 flex items-center justify-center text-lg">⚙️</div>
                                Account Settings
                            </Link>
                        </div>
                    )}

                    {/* Admin Block */}
                    {token && role === 'ADMIN' && (
                        <div className="bg-red-50/50 dark:bg-red-500/5 rounded-2xl p-2 border border-red-100 dark:border-red-500/10 shadow-sm">
                            <Link to="/admin" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-4 px-4 py-3.5 text-red-700 dark:text-red-400 font-bold hover:bg-red-100/50 dark:hover:bg-red-500/10 rounded-xl transition-colors">
                                <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-500/20 flex items-center justify-center text-lg">🛡️</div>
                                Admin Dashboard
                            </Link>
                        </div>
                    )}

                    {/* Translation Block */}
                    <div className="bg-white dark:bg-[#0a0a0a] rounded-2xl p-4 border border-gray-100 dark:border-white/5 shadow-sm">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 text-center">Language Options</p>
                        <div className="grid grid-cols-2 gap-2">
                            <button onClick={() => changeLanguage('en', 'English')} className={`py-2.5 rounded-xl font-bold text-xs transition-colors ${currentLang === 'en' ? 'bg-blue-600 dark:bg-cyan-500 text-white dark:text-black shadow-md' : 'bg-gray-50 dark:bg-[#111] text-gray-600 dark:text-gray-300'}`}>English</button>
                            <button onClick={() => changeLanguage('hi', 'Hindi')} className={`py-2.5 rounded-xl font-bold text-xs transition-colors ${currentLang === 'hi' ? 'bg-blue-600 dark:bg-cyan-500 text-white dark:text-black shadow-md' : 'bg-gray-50 dark:bg-[#111] text-gray-600 dark:text-gray-300'}`}>हिंदी</button>
                            <button onClick={() => changeLanguage('te', 'Telugu')} className={`py-2.5 rounded-xl font-bold text-xs transition-colors ${currentLang === 'te' ? 'bg-blue-600 dark:bg-cyan-500 text-white dark:text-black shadow-md' : 'bg-gray-50 dark:bg-[#111] text-gray-600 dark:text-gray-300'}`}>తెలుగు</button>
                            <button onClick={() => changeLanguage('ta', 'Tamil')} className={`py-2.5 rounded-xl font-bold text-xs transition-colors ${currentLang === 'ta' ? 'bg-blue-600 dark:bg-cyan-500 text-white dark:text-black shadow-md' : 'bg-gray-50 dark:bg-[#111] text-gray-600 dark:text-gray-300'}`}>தமிழ்</button>
                        </div>
                    </div>
                </div>

                {/* Mobile Sign Out */}
                {token && (
                    <div className="p-4 bg-white dark:bg-[#0a0a0a] border-t border-gray-100 dark:border-white/5 pb-safe rounded-t-3xl shadow-[0_-5px_15px_rgba(0,0,0,0.02)] dark:shadow-none mt-2">
                        <button onClick={() => { setIsMobileMenuOpen(false); handleLogout(); }} className="w-full flex justify-center items-center gap-2 py-4 bg-red-50 dark:bg-rose-500/10 text-red-600 dark:text-rose-500 font-black text-sm uppercase tracking-widest rounded-xl active:scale-95 transition-transform">
                            <span className="text-lg">🚪</span> Sign Out
                        </button>
                    </div>
                )}
            </div>

            <style dangerouslySetInnerHTML={{__html: `
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                .pb-safe { padding-bottom: env(safe-area-inset-bottom, 20px); }
            `}} />
        </>
    );
}

export default Navbar;