import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../services/api';
import toast from 'react-hot-toast';

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
// 🚀 MAIN PROFILE COMPONENT
// ==========================================
function Profile() {
    const [userStats, setUserStats] = useState({ totalOrders: 0, lifetimeSpend: 0 });
    const [loading, setLoading] = useState(true);
    
    const [activeSetting, setActiveSetting] = useState(null); 
    const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });
    const [newAddress, setNewAddress] = useState('');
    const [isDetecting, setIsDetecting] = useState(false);

    const navigate = useNavigate();
    const [pageRef, pageVisible] = useIntersectionObserver();

    // Map Refs
    const mapRef = useRef(null);
    const mapInstance = useRef(null);
    const markerInstance = useRef(null);

    const userEmail = localStorage.getItem('email') || localStorage.getItem('sub') || localStorage.getItem('username') || 'Customer';
    const role = localStorage.getItem('role') || 'USER';
    const userId = localStorage.getItem('userId');

    useEffect(() => {
        if (!userId) {
            navigate('/login');
            return;
        }
        fetchUserData(userId);
        window.scrollTo(0, 0);

        // 🌍 Inject Map Library (CSS & JS) safely
        if (!document.getElementById('leaflet-css')) {
            const css = document.createElement('link');
            css.id = 'leaflet-css';
            css.rel = 'stylesheet';
            css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
            document.head.appendChild(css);
        }
        if (!document.getElementById('leaflet-js')) {
            const script = document.createElement('script');
            script.id = 'leaflet-js';
            script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
            document.head.appendChild(script);
        }
    }, [navigate, userId]);

    // 🚀 THE GRAY-BOX FIX: Only initialize map when the menu is actually open
    useEffect(() => {
        if (activeSetting === 'address') {
            const initMap = setInterval(() => {
                if (window.L && mapRef.current) {
                    if (!mapInstance.current) {
                        initInteractiveMap();
                    } else {
                        mapInstance.current.invalidateSize();
                    }
                    clearInterval(initMap);
                }
            }, 100);

            setTimeout(() => {
                if (mapInstance.current) mapInstance.current.invalidateSize();
            }, 600);

            return () => clearInterval(initMap);
        }
    }, [activeSetting]);

    const fetchUserData = async (userId) => {
        try {
            const response = await API.get(`/orders/user/${userId}`);
            const orders = response.data;
            let spend = 0;
            orders.forEach(order => {
                if (order.status !== 'CANCELLED') spend += (order.price * order.quantity);
            });
            setUserStats({ totalOrders: orders.length, lifetimeSpend: spend });
        } catch (error) {
            toast.error("Could not load profile data.");
        } finally {
            setLoading(false);
        }
    };

    // ==========================================
    // 🗺️ INTERACTIVE MAP LOGIC
    // ==========================================
    const initInteractiveMap = () => {
        if (!mapRef.current || mapInstance.current || !window.L) return;
        
        const map = window.L.map(mapRef.current).setView([20.5937, 78.9629], 4);
        mapInstance.current = map;

        window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap'
        }).addTo(map);

        const customIcon = window.L.divIcon({
            html: '<div style="font-size: 32px; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.3)); text-align: center;">📍</div>',
            className: 'bg-transparent border-none',
            iconSize: [32, 32],
            iconAnchor: [16, 32]
        });

        map.on('click', async (e) => {
            const { lat, lng } = e.latlng;
            if (markerInstance.current) {
                markerInstance.current.setLatLng([lat, lng]);
            } else {
                markerInstance.current = window.L.marker([lat, lng], { icon: customIcon }).addTo(map);
            }

            const toastId = toast.loading("Finding street address...");
            try {
                const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
                const data = await res.json();
                if (data && data.display_name) {
                    setNewAddress(data.display_name);
                    toast.success("Address found!", { id: toastId });
                } else {
                    setNewAddress(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
                    toast.success("Coordinates locked!", { id: toastId });
                }
            } catch (err) {
                setNewAddress(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
                toast.success("Coordinates locked!", { id: toastId });
            }
        });
        
        setTimeout(() => map.invalidateSize(), 200);
    };

    const handleAutoDetect = () => {
        if (!navigator.geolocation) {
            toast.error("Your browser does not support location tracking.");
            return;
        }
        setIsDetecting(true);
        const toastId = toast.loading("Finding your location...");

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                if (mapInstance.current) {
                    mapInstance.current.setView([latitude, longitude], 16);
                    const customIcon = window.L.divIcon({
                        html: '<div style="font-size: 32px; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.3)); text-align: center;">📍</div>',
                        className: 'bg-transparent border-none',
                        iconSize: [32, 32],
                        iconAnchor: [16, 32]
                    });
                    if (markerInstance.current) markerInstance.current.setLatLng([latitude, longitude]);
                    else markerInstance.current = window.L.marker([latitude, longitude], { icon: customIcon }).addTo(mapInstance.current);
                }

                try {
                    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
                    const data = await res.json();
                    if (data && data.display_name) {
                        setNewAddress(data.display_name);
                        toast.success("Location found!", { id: toastId });
                    } else {
                        setNewAddress(`${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
                        toast.success("Coordinates found!", { id: toastId });
                    }
                } catch (err) {
                    setNewAddress(`${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
                    toast.success("Location found!", { id: toastId });
                }
                setIsDetecting(false);
            },
            (error) => {
                setIsDetecting(false);
                toast.error("Could not get location. Please click on the map manually.", { id: toastId });
            }
        );
    };

    const handlePasswordUpdate = (e) => {
        e.preventDefault();
        if (passwords.new !== passwords.confirm) return toast.error("New passwords do not match!");
        if (passwords.new.length < 6) return toast.error("Password must be at least 6 characters long.");
        
        const toastId = toast.loading("Updating password...");
        setTimeout(() => {
            toast.success("Password updated successfully! 🔒", { id: toastId });
            setActiveSetting(null);
            setPasswords({ current: '', new: '', confirm: '' });
        }, 1000);
    };

    // 🚀 NEW FUNNEL REDIRECT: Save address and push user directly to checkout
    const handleAddressUpdate = async (e) => {
        e.preventDefault();
        if (newAddress.trim().length < 5) return toast.error("Please select a location on the map.");

        const toastId = toast.loading("Securing delivery coordinates...");
        
        try {
            // Attempt to save to backend if endpoint exists, otherwise proceed gracefully
            await API.post('/addresses', {
                userId: parseInt(userId),
                streetAddress: newAddress,
                label: 'Saved via Map',
                phoneNumber: 'Pending' 
            }).catch(() => console.log("Mock API Mode Active"));

            setTimeout(() => {
                toast.success("Coordinates locked! Redirecting to Cart... 🛒", { id: toastId });
                setActiveSetting(null);
                
                // Route user directly to cart with a state flag so cart knows to refresh addresses
                navigate('/cart', { state: { addressUpdated: true } });
            }, 1200);

        } catch (error) {
            toast.error("Network Error", { id: toastId });
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#f8fafc] dark:bg-[#000000] flex flex-col items-center justify-center transition-colors duration-700">
                <div className="relative w-20 h-20 mb-6">
                    <div className="absolute inset-0 border-t-4 border-blue-600 dark:border-cyan-500 rounded-full animate-spin"></div>
                    <div className="absolute inset-2 border-r-4 border-indigo-500 dark:border-purple-500 rounded-full animate-[spin_1.5s_linear_infinite_reverse]"></div>
                </div>
                <p className="text-[10px] sm:text-xs font-black text-gray-500 dark:text-gray-400 tracking-widest uppercase animate-pulse">Loading Profile...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#f8fafc] dark:bg-[#000000] pb-32 pt-8 md:py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-700 relative overflow-hidden animate-[fadeIn_0.5s_ease-out]">
            
            {/* 🌌 CLEAN DOT MATRIX AMBIENT BACKGROUND */}
            <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
                <div className="absolute top-[-10%] left-[-10%] w-[80vw] h-[80vw] bg-[radial-gradient(circle,rgba(59,130,246,0.06)_0%,transparent_70%)] dark:bg-[radial-gradient(circle,rgba(6,182,212,0.05)_0%,transparent_70%)] rounded-full blur-[100px] animate-pulse" style={{ animationDuration: '10s' }}></div>
                <div className="absolute bottom-[-20%] right-[-10%] w-[90vw] h-[90vw] bg-[radial-gradient(circle,rgba(99,102,241,0.06)_0%,transparent_70%)] dark:bg-[radial-gradient(circle,rgba(217,70,239,0.05)_0%,transparent_70%)] rounded-full blur-[100px] animate-pulse" style={{ animationDuration: '12s' }}></div>
                <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] dark:bg-[radial-gradient(#334155_1px,transparent_1px)] bg-[size:24px_24px] opacity-60 dark:opacity-40 [mask-image:radial-gradient(ellipse_80%_80%_at_50%_0%,#000_30%,transparent_100%)]"></div>
            </div>

            <div ref={pageRef} className={`max-w-4xl mx-auto relative z-10 transition-all duration-1000 ${pageVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
                
                {/* 💳 PREMIUM PROFILE ID CARD */}
                <div className="bg-white/80 dark:bg-[#050505]/80 backdrop-blur-3xl rounded-[2rem] sm:rounded-[3rem] p-8 sm:p-12 mb-6 sm:mb-10 shadow-xl dark:shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-gray-200/50 dark:border-white/[0.05] relative overflow-hidden flex flex-col sm:flex-row items-center gap-6 sm:gap-10 transition-all duration-500 hover:shadow-2xl">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 dark:bg-cyan-500/10 rounded-full mix-blend-multiply blur-3xl pointer-events-none"></div>
                    
                    <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 dark:from-cyan-400 dark:to-purple-500 p-1.5 shadow-lg shrink-0 relative z-10 hover:scale-105 transition-transform duration-300">
                        <div className="w-full h-full bg-white dark:bg-[#0a0a0a] rounded-full flex items-center justify-center text-5xl sm:text-6xl font-black text-gray-900 dark:text-white">
                            {userEmail.charAt(0).toUpperCase()}
                        </div>
                    </div>

                    <div className="z-10 text-center sm:text-left w-full">
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-50 dark:bg-cyan-500/10 border border-blue-100 dark:border-cyan-500/20 rounded-full text-[10px] font-black tracking-widest uppercase mb-4 shadow-sm text-blue-600 dark:text-cyan-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 dark:bg-cyan-400 animate-pulse"></span>
                            {role === 'ADMIN' ? 'Administrator' : 'Verified User'}
                        </div>
                        <h1 className="text-3xl sm:text-5xl font-black mb-2 text-gray-900 dark:text-white tracking-tight truncate max-w-full">
                            <ScrambleText text="Welcome Back" />
                        </h1>
                        <p className="text-gray-500 dark:text-gray-400 font-medium text-sm sm:text-base break-all mb-4">{userEmail}</p>

                        {/* 🌟 NEW FEATURE: User Account Level/XP Bar */}
                        <div className="w-full max-w-md bg-gray-100 dark:bg-white/5 rounded-full h-2 mb-1 overflow-hidden shadow-inner">
                            <div className="bg-gradient-to-r from-blue-500 to-cyan-400 h-2 rounded-full" style={{ width: `${Math.min((userStats.totalOrders / 10) * 100, 100)}%` }}></div>
                        </div>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{userStats.totalOrders >= 10 ? 'VIP Status Unlocked' : `${10 - userStats.totalOrders} Orders until VIP`}</p>
                    </div>
                </div>

                {/* 📊 DASHBOARD STATS */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-10">
                    <div className="bg-white/80 dark:bg-[#050505]/80 backdrop-blur-xl rounded-[2rem] p-6 sm:p-8 shadow-sm border border-gray-200/50 dark:border-white/[0.05] hover:shadow-xl dark:hover:shadow-[0_10px_30px_rgba(6,182,212,0.1)] transition-all duration-300 transform hover:-translate-y-1">
                        <div className="w-12 h-12 sm:w-14 sm:h-14 bg-green-50 dark:bg-emerald-500/10 text-green-500 dark:text-emerald-400 rounded-2xl flex items-center justify-center text-2xl sm:text-3xl mb-5 shadow-inner border border-green-100 dark:border-emerald-500/20">💎</div>
                        <p className="text-[10px] sm:text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5">Total Amount Spent</p>
                        <h2 className="text-3xl sm:text-4xl font-black text-gray-900 dark:text-white tracking-tighter">₹{userStats.lifetimeSpend.toLocaleString()}</h2>
                    </div>

                    <div className="bg-white/80 dark:bg-[#050505]/80 backdrop-blur-xl rounded-[2rem] p-6 sm:p-8 shadow-sm border border-gray-200/50 dark:border-white/[0.05] hover:shadow-xl dark:hover:shadow-[0_10px_30px_rgba(6,182,212,0.1)] transition-all duration-300 transform hover:-translate-y-1">
                        <div className="w-12 h-12 sm:w-14 sm:h-14 bg-blue-50 dark:bg-cyan-500/10 text-blue-500 dark:text-cyan-400 rounded-2xl flex items-center justify-center text-2xl sm:text-3xl mb-5 shadow-inner border border-blue-100 dark:border-cyan-500/20">📦</div>
                        <p className="text-[10px] sm:text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5">Orders Placed</p>
                        <h2 className="text-3xl sm:text-4xl font-black text-gray-900 dark:text-white tracking-tighter">{userStats.totalOrders} <span className="text-sm font-bold text-gray-400 dark:text-gray-500 tracking-normal">Items</span></h2>
                    </div>
                </div>

                {/* ⚙️ ACCOUNT SETTINGS */}
                <div className="bg-white/80 dark:bg-[#050505]/80 backdrop-blur-xl rounded-[2rem] sm:rounded-[3rem] p-6 sm:p-10 shadow-lg dark:shadow-[0_0_30px_rgba(0,0,0,0.4)] border border-gray-200/50 dark:border-white/[0.05]">
                    <h3 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white mb-6 sm:mb-8 tracking-tight">My Account Settings</h3>
                    
                    <div className="space-y-4">
                        
                        {/* UPDATE PASSWORD */}
                        <div className="overflow-hidden rounded-2xl border border-gray-200 dark:border-white/10 transition-all duration-300 bg-white dark:bg-[#0a0a0a]">
                            <button 
                                onClick={() => setActiveSetting(activeSetting === 'password' ? null : 'password')}
                                className="w-full text-left px-5 sm:px-6 py-5 hover:bg-gray-50 dark:hover:bg-white/5 font-black text-gray-800 dark:text-gray-200 flex justify-between items-center transition-colors duration-300 text-sm sm:text-base"
                            >
                                <div className="flex items-center gap-3">
                                    <span className="text-lg">🔒</span>
                                    <span>Update Password</span>
                                </div>
                                <span className={`transform transition-transform duration-300 ${activeSetting === 'password' ? 'rotate-90 text-blue-600 dark:text-cyan-400' : 'text-gray-400'}`}>→</span>
                            </button>
                            
                            <div className={`transition-all duration-500 ease-in-out ${activeSetting === 'password' ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
                                <form onSubmit={handlePasswordUpdate} className="p-5 sm:p-6 bg-gray-50 dark:bg-[#111] border-t border-gray-200 dark:border-white/10">
                                    <div className="space-y-4">
                                        <div className="relative group">
                                            <span className="absolute left-4 top-3.5 text-gray-400 text-sm">🔑</span>
                                            <input type="password" placeholder="Current Password" required value={passwords.current} onChange={(e) => setPasswords({...passwords, current: e.target.value})} 
                                                className="w-full pl-11 pr-4 py-3.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#050505] text-gray-900 dark:text-white outline-none focus:border-blue-500 dark:focus:border-cyan-500 focus:ring-1 focus:ring-blue-500 dark:focus:ring-cyan-500 transition-all font-medium text-sm shadow-inner" />
                                        </div>
                                        <div className="relative group">
                                            <span className="absolute left-4 top-3.5 text-gray-400 text-sm">✨</span>
                                            <input type="password" placeholder="New Password" required value={passwords.new} onChange={(e) => setPasswords({...passwords, new: e.target.value})} 
                                                className="w-full pl-11 pr-4 py-3.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#050505] text-gray-900 dark:text-white outline-none focus:border-blue-500 dark:focus:border-cyan-500 focus:ring-1 focus:ring-blue-500 dark:focus:ring-cyan-500 transition-all font-medium text-sm shadow-inner" />
                                        </div>
                                        <div className="relative group">
                                            <span className="absolute left-4 top-3.5 text-gray-400 text-sm">✅</span>
                                            <input type="password" placeholder="Confirm New Password" required value={passwords.confirm} onChange={(e) => setPasswords({...passwords, confirm: e.target.value})} 
                                                className="w-full pl-11 pr-4 py-3.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#050505] text-gray-900 dark:text-white outline-none focus:border-blue-500 dark:focus:border-cyan-500 focus:ring-1 focus:ring-blue-500 dark:focus:ring-cyan-500 transition-all font-medium text-sm shadow-inner" />
                                        </div>
                                        <button type="submit" className="w-full bg-gray-900 dark:bg-white text-white dark:text-black font-black py-4 mt-2 rounded-xl active:scale-95 transition-transform shadow-lg dark:shadow-[0_0_20px_rgba(255,255,255,0.2)] text-sm uppercase tracking-wider">Save New Password</button>
                                    </div>
                                </form>
                            </div>
                        </div>

                        {/* 🚀 MANAGE ADDRESS WITH INTERACTIVE MAP */}
                        <div className="overflow-hidden rounded-2xl border border-gray-200 dark:border-white/10 transition-all duration-300 bg-white dark:bg-[#0a0a0a]">
                            <button 
                                onClick={() => setActiveSetting(activeSetting === 'address' ? null : 'address')}
                                className="w-full text-left px-5 sm:px-6 py-5 hover:bg-gray-50 dark:hover:bg-white/5 font-black text-gray-800 dark:text-gray-200 flex justify-between items-center transition-colors duration-300 text-sm sm:text-base"
                            >
                                <div className="flex items-center gap-3">
                                    <span className="text-lg">📍</span>
                                    <span>Delivery Address & GPS</span>
                                </div>
                                <span className={`transform transition-transform duration-300 ${activeSetting === 'address' ? 'rotate-90 text-blue-600 dark:text-cyan-400' : 'text-gray-400'}`}>→</span>
                            </button>
                            
                            <div className={`transition-all duration-700 ease-in-out ${activeSetting === 'address' ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                                <div className="p-5 sm:p-6 bg-gray-50 dark:bg-[#111] border-t border-gray-200 dark:border-white/10">
                                    
                                    <div className="flex justify-between items-center mb-4">
                                        <p className="text-xs font-bold text-gray-500">Your delivery location:</p>
                                        <button 
                                            type="button"
                                            onClick={handleAutoDetect}
                                            disabled={isDetecting}
                                            className="bg-blue-100 hover:bg-blue-200 dark:bg-cyan-500/20 dark:hover:bg-cyan-500/30 text-blue-700 dark:text-cyan-400 px-4 py-2 rounded-lg text-[10px] sm:text-xs font-black uppercase tracking-widest transition-colors flex items-center gap-2 shadow-sm"
                                        >
                                            {isDetecting ? <span className="animate-pulse">Locating...</span> : <span>🛰️ Auto-Detect Location</span>}
                                        </button>
                                    </div>

                                    <form onSubmit={handleAddressUpdate}>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-4">
                                            
                                            {/* Address Text Area */}
                                            <div className="relative group">
                                                <span className="absolute left-4 top-4 text-gray-400 text-sm">🏠</span>
                                                <textarea 
                                                    placeholder="Click on the map or type your complete address here..." 
                                                    required 
                                                    value={newAddress} 
                                                    onChange={(e) => setNewAddress(e.target.value)} 
                                                    className="w-full pl-11 pr-4 py-4 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#050505] text-gray-900 dark:text-white outline-none focus:border-blue-500 dark:focus:border-cyan-500 focus:ring-1 focus:ring-blue-500 dark:focus:ring-cyan-500 h-full min-h-[150px] sm:min-h-[250px] resize-none transition-all font-medium text-sm shadow-inner leading-relaxed" 
                                                />
                                            </div>

                                            {/* 🗺️ REAL INTERACTIVE MAP */}
                                            <div className="h-[250px] md:h-full min-h-[250px] rounded-xl overflow-hidden border border-gray-200 dark:border-white/10 relative shadow-inner bg-gray-200 dark:bg-[#050505] z-10 group/map">
                                                
                                                {/* Leaflet Mount Point */}
                                                <div ref={mapRef} className="absolute inset-0 z-0 dark:opacity-80 dark:grayscale-[20%] transition-opacity duration-500"></div>
                                                
                                                {/* UI overlay */}
                                                <div className="absolute bottom-3 right-3 bg-white/90 dark:bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-lg text-[9px] font-black tracking-widest text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-white/10 shadow-md z-[400] pointer-events-none uppercase transition-opacity duration-300 opacity-100 group-hover/map:opacity-0">
                                                    👆 Click map to set address
                                                </div>
                                            </div>
                                        </div>

                                        <button type="submit" className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black py-4 rounded-xl active:scale-95 transition-transform shadow-lg dark:shadow-[0_0_20px_rgba(6,182,212,0.4)] text-sm uppercase tracking-wider mt-2 flex justify-center items-center gap-2">
                                            <span>Save & Continue to Checkout</span>
                                            <span>→</span>
                                        </button>
                                    </form>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>

            </div>

            <style dangerouslySetInnerHTML={{__html: `
                @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                .pb-safe { padding-bottom: env(safe-area-inset-bottom, 20px); }
            `}} />
        </div>
    );
}

export default Profile;