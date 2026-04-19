import React, { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import API from '../services/api';
import toast from 'react-hot-toast';

import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix missing Leaflet icons due to Webpack/React integration issues
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// ==========================================
// UTILS
// ==========================================
const getImageUrl = (url) => {
    if (!url) return '';
    // If it's already a full HTTP URL, return as is
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    // Force the connection to the secure Render backend
    return `https://procart-ai.onrender.com/uploads/${url}`;
};

// ==========================================
// COMPONENT: LOCATION MARKER
// ==========================================
function LocationMarker({ position, setPosition, setAddressData }) {
    const map = useMapEvents({
        async click(e) {
            const { lat, lng } = e.latlng;
            setPosition({ lat, lng });
            toast.loading("Scanning GPS Coordinates...", { id: 'geo' });
            
            try {
                const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
                const data = await res.json();
                
                if (data && data.address) {
                    setAddressData(prev => ({
                        ...prev,
                        villageStreet: data.address.village || data.address.suburb || data.address.neighbourhood || data.address.road || prev.villageStreet,
                        mandal: data.address.town || data.address.county || data.address.city_district || prev.mandal,
                        district: data.address.city || data.address.state_district || prev.district,
                        state: data.address.state || prev.state,
                        pincode: data.address.postcode || prev.pincode
                    }));
                    toast.success("Location Auto-Filled! 📍", { id: 'geo' });
                    map.flyTo([lat, lng], 14);
                } else {
                    toast.dismiss('geo');
                }
            } catch(err) {
                toast.error("Failed to auto-detect text, but GPS is locked.", { id: 'geo' });
            }
        },
    });

    return position === null ? null : <Marker position={position}></Marker>;
}

// ==========================================
// COMPONENT: SKELETON LOADER
// ==========================================
const SkeletonCartItem = () => (
    <li className="p-6 md:p-8 flex flex-col md:flex-row items-center gap-6 animate-pulse">
        <div className="h-32 w-32 flex-shrink-0 rounded-3xl bg-gray-200 dark:bg-gray-800"></div>
        <div className="flex-1 w-full space-y-4">
            <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-1/4"></div>
            <div className="h-6 bg-gray-200 dark:bg-gray-800 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-1/2"></div>
            <div className="flex justify-between mt-4">
                <div className="h-8 bg-gray-200 dark:bg-gray-800 rounded w-24"></div>
                <div className="h-8 bg-gray-200 dark:bg-gray-800 rounded w-16"></div>
            </div>
        </div>
    </li>
);

// ==========================================
// MAIN COMPONENT: CART
// ==========================================
function Cart() {
    const { cart, removeFromCart, clearCart, cartTotal } = useCart();
    
    // Core States
    const [isLoading, setIsLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isPaymentOpen, setIsPaymentOpen] = useState(false); 
    
    // Payment States
    const [paymentStatus, setPaymentStatus] = useState("init");
    const [txnId, setTxnId] = useState(null);
    const [screenshotFile, setScreenshotFile] = useState(null); 
    
    // Address & User States
    const [savedAddresses, setSavedAddresses] = useState([]);
    const [selectedAddressId, setSelectedAddressId] = useState(null);
    const [isAddingNew, setIsAddingNew] = useState(false);
    const [guestEmail, setGuestEmail] = useState('');
    const [newLabel, setNewLabel] = useState('Home');
    const [phoneNumber, setPhoneNumber] = useState(''); 
    
    const [addressData, setAddressData] = useState({
        doorNo: '', villageStreet: '', mandal: '', district: '', state: '', pincode: ''
    });
    const [mapPos, setMapPos] = useState({ lat: 15.9129, lng: 79.7400 });
    
    // Discount & Wallet States
    const [promoCode, setPromoCode] = useState('');
    const [discount, setDiscount] = useState(0); 
    const [walletBalance, setWalletBalance] = useState(0);
    const [useCoins, setUseCoins] = useState(false);
    
    const navigate = useNavigate();
    const location = useLocation(); 
    
    // Optimization: Memoize computations
    const safeCart = useMemo(() => cart || [], [cart]);
    const userId = useMemo(() => localStorage.getItem('userId'), []);

    const subtotal = cartTotal || 0;
    const discountAmount = useMemo(() => (subtotal * discount) / 100, [subtotal, discount]);
    const preCoinTotal = useMemo(() => subtotal - discountAmount, [subtotal, discountAmount]);
    const maxCoinsToUse = useMemo(() => Math.min(walletBalance, preCoinTotal), [walletBalance, preCoinTotal]);
    const finalTotal = useMemo(() => preCoinTotal - (useCoins ? maxCoinsToUse : 0), [preCoinTotal, useCoins, maxCoinsToUse]);

    const formattedDeliveryDate = useMemo(() => {
        const d = new Date();
        d.setDate(d.getDate() + 3); 
        return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    }, []);

    // Payment Logic Constants
    const upiId = "6281134837@ybl";
    const payeeName = "MANYAM SIVA SANTHOSH KUMAR REDDY";
    const upiLink = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(payeeName)}&am=${finalTotal}&cu=INR`;
    const primaryQr = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(upiLink)}`;
    const fallbackQr = `https://quickchart.io/qr?text=${encodeURIComponent(upiLink)}&size=300&margin=2`;

    // ==========================================
    // DATA FETCHING & SIDE EFFECTS
    // ==========================================
    const fetchUserData = useCallback(async () => {
        setIsLoading(true);
        try {
            if (userId) {
                const [addressRes, walletRes] = await Promise.all([
                    API.get(`/addresses/${userId}`).catch(() => ({ data: [] })),
                    API.get(`/orders/wallet/${userId}`).catch(() => ({ data: 0 }))
                ]);

                const addresses = addressRes.data || [];
                setSavedAddresses(addresses);
                
                if (addresses.length > 0) {
                    const latestAddress = addresses[addresses.length - 1];
                    setSelectedAddressId(latestAddress.id);
                    setPhoneNumber(latestAddress.phoneNumber === 'Pending' ? '' : latestAddress.phoneNumber); 
                    setIsAddingNew(false);
                } else { 
                    setIsAddingNew(true); 
                }
                
                setWalletBalance(walletRes.data || 0);
            } else {
                setIsAddingNew(true);
            }
        } catch (error) {
            console.error("Failed to load user data", error);
        } finally {
            // Simulate minimum loading time for smooth transition
            setTimeout(() => setIsLoading(false), 500);
        }
    }, [userId]);

    useEffect(() => {
        fetchUserData();

        if (location.state?.addressUpdated) {
            toast.success("Profile Address Synced to Checkout");
            window.history.replaceState({}, document.title); 
        }
    }, [fetchUserData, location.state]);

    // ==========================================
    // HANDLERS
    // ==========================================
    const getCompiledAddress = useCallback(() => {
        const gpsStr = ` | LATLNG:${mapPos.lat.toFixed(5)},${mapPos.lng.toFixed(5)}`;
        let textPart = `${addressData.doorNo} | ${addressData.villageStreet} | ${addressData.mandal} | ${addressData.district} | ${addressData.state} | IN | ${addressData.pincode}`;
        
        if (textPart.length > 180) {
            textPart = textPart.substring(0, 180).trim() + "..";
        }
        return textPart + gpsStr;
    }, [addressData, mapPos]);

    const handleSelectAddress = (address) => {
        setSelectedAddressId(address.id);
        setPhoneNumber(address.phoneNumber === 'Pending' ? '' : address.phoneNumber);
        setIsAddingNew(false);
    };

    const handleDeleteAddress = async (e, addressId) => {
        e.stopPropagation(); 
        
        if (addressId.toString().startsWith('temp_')) {
            setSavedAddresses(prev => prev.filter(a => a.id !== addressId));
            if (selectedAddressId === addressId) setSelectedAddressId(null);
            toast.success("Unsaved address removed locally.");
            return;
        }

        const toastId = toast.loading("Removing address...");
        try {
            await API.delete(`/addresses/${addressId}`);
            toast.success("Address removed", { id: toastId });
            setSavedAddresses(prev => prev.filter(a => a.id !== addressId));
            if (selectedAddressId === addressId) setSelectedAddressId(null);
        } catch (error) {
            toast.error("Failed to remove address", { id: toastId });
        }
    };

    const handleAutoLocate = () => {
        if ('geolocation' in navigator) {
            toast.loading("Accessing Satellite GPS...", { id: 'gps' });
            navigator.geolocation.getCurrentPosition(
                async (pos) => {
                    const { latitude, longitude } = pos.coords;
                    setMapPos({ lat: latitude, lng: longitude });
                    
                    try {
                        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
                        const data = await res.json();
                        if (data && data.address) {
                            setAddressData(prev => ({
                                ...prev,
                                villageStreet: data.address.village || data.address.suburb || data.address.neighbourhood || data.address.road || prev.villageStreet,
                                mandal: data.address.town || data.address.county || data.address.city_district || prev.mandal,
                                district: data.address.city || data.address.state_district || prev.district,
                                state: data.address.state || prev.state,
                                pincode: data.address.postcode || prev.pincode
                            }));
                            toast.success("GPS Lock Established! 🛰️", { id: 'gps' });
                        }
                    } catch(e) { toast.dismiss('gps'); }
                },
                () => toast.error("GPS access denied. Please click map manually.", { id: 'gps' })
            );
        }
    };

    const handleSaveNewAddress = () => {
        if (phoneNumber.trim().length < 10) return toast.error("Please enter a valid 10-digit Mobile Number.");
        if (!addressData.villageStreet || !addressData.district || !addressData.state) return toast.error("Please fill required text fields.");
        if (!addressData.pincode) return toast.error("Please ensure the Pincode is filled.");
        
        const finalAddress = getCompiledAddress();
        const fakeLockedAddress = {
            id: 'temp_' + Date.now(), 
            label: newLabel,
            streetAddress: finalAddress,
            phoneNumber: phoneNumber
        };
        
        setSavedAddresses(prev => [fakeLockedAddress, ...prev]);
        setSelectedAddressId(fakeLockedAddress.id);
        setIsAddingNew(false);
        toast.success("Coordinates Locked! Ready for Payment. 📍");
    };

    const handleApplyPromo = async () => {
        if (!promoCode.trim()) return;
        try {
            const response = await API.post('/promo/validate', { code: promoCode });
            setDiscount(response.data.discount);
            toast.success(`Elite Discount Applied: -${response.data.discount}% 💎`);
        } catch (error) { 
            setDiscount(0); 
            toast.error("Invalid Code"); 
        }
    };

    const handleInitiateCheckout = () => {
        if (!userId && (!guestEmail || !guestEmail.includes("@"))) return toast.error("Please enter a valid email address.");
        
        const cleanPhone = phoneNumber.replace(/\D/g, '');
        if (cleanPhone.length < 10) return toast.error("Valid 10-digit contact number required.");
        
        if (isAddingNew) return toast.error("Please click 'Lock Coordinates' before paying.");
        if (finalTotal < 0) return toast.error("Total cannot be negative.");
        
        setPaymentStatus("init");
        setTxnId(null);
        setScreenshotFile(null); 
        setIsPaymentOpen(true); 
    };

    const handlePhonePeClick = () => {
        setIsProcessing(true);
        setTimeout(() => {
            setTxnId("TXN" + Date.now());
            setPaymentStatus("qr"); 
            setIsProcessing(false);
        }, 1200);
    };

    const getBase64 = (file) => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });

    const handlePaymentSuccess = async () => {
        if (!screenshotFile) {
            return toast.error("Please attach the payment screenshot before confirming.", { duration: 4000 });
        }

        setIsPaymentOpen(false); 
        setIsProcessing(true);  
        const toastId = toast.loading("Verifying Secure Transaction...");

        let shippingStr = isAddingNew ? getCompiledAddress() : 
            (savedAddresses.find(a => a.id === selectedAddressId)?.streetAddress || getCompiledAddress());

        try {
            let screenshotBase64 = await getBase64(screenshotFile);

            if (userId) {
                await API.post('/orders/user-checkout', {
                    userId: parseInt(userId, 10),
                    shippingAddress: shippingStr,
                    phoneNumber: phoneNumber,
                    discount: discount,
                    coinsUsed: useCoins ? maxCoinsToUse : 0,
                    screenshotBase64: screenshotBase64, 
                    items: safeCart.map(item => ({ id: item.id, quantity: item.quantity, price: item.price }))
                });

                toast.success(`Payment successful!`, { id: toastId, duration: 4000, icon: '🎉' });
                clearCart(); 
                navigate('/orders'); 
            } else {
                const guestItems = safeCart.map(item => ({ id: item.id, quantity: item.quantity, price: item.price - (item.price * discount / 100) }));
                await API.post('/orders/guest-checkout', {
                    email: guestEmail,
                    shippingAddress: shippingStr,
                    phoneNumber: phoneNumber,
                    screenshotBase64: screenshotBase64, 
                    items: guestItems
                });
                
                toast.success("Guest order placed!", { id: toastId, duration: 4000, icon: '🎉' });
                clearCart(); 
                navigate('/'); 
            }
        } catch (error) {
            toast.error("Transaction Failed: " + (error.response?.data?.error || error.message), { id: toastId });
        } finally {
            setIsProcessing(false);
        }
    };

    // ==========================================
    // RENDER: EMPTY CART
    // ==========================================
    if (!isLoading && safeCart.length === 0) {
        return (
            <div className="min-h-[85vh] flex flex-col items-center justify-center bg-slate-50 dark:bg-[#0a0f1c] px-4 animate-in fade-in duration-700">
                <div className="relative">
                    <div className="text-8xl mb-8 animate-bounce z-10 relative">🛒</div>
                    <div className="absolute inset-0 bg-blue-500/20 blur-3xl rounded-full scale-150"></div>
                </div>
                <h2 className="text-4xl font-black text-gray-900 dark:text-white mb-4 tracking-tighter">Your bag is empty.</h2>
                <p className="text-gray-500 font-medium mb-8 text-center max-w-md">Looks like you haven't added anything to your bag yet. Let's get you set up with some premium gear.</p>
                <Link to="/products" className="bg-gradient-to-r from-gray-900 to-gray-800 dark:from-blue-600 dark:to-indigo-600 text-white px-10 py-4 rounded-full font-black hover:scale-105 transition-all shadow-2xl shadow-blue-500/25 active:scale-95">Continue Shopping</Link>
            </div>
        );
    }

    // ==========================================
    // RENDER: ACTIVE CART
    // ==========================================
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#0a0f1c] pt-8 pb-32 px-4 sm:px-6 lg:px-8 transition-colors duration-300 relative selection:bg-blue-500/30">
            
            {/* HYBRID PHONEPE PAYMENT MODAL */}
            {isPaymentOpen && (
                <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-xl flex items-center justify-center p-4 animate-[fadeIn_0.3s_ease-out]">
                    <div className="bg-white/95 dark:bg-[#0a0a0a]/95 backdrop-blur-3xl w-full max-w-sm p-8 rounded-[2.5rem] shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-gray-200/50 dark:border-white/[0.08] flex flex-col items-center text-center relative animate-[slideUp_0.4s_ease-out]">
                        <button onClick={() => setIsPaymentOpen(false)} disabled={isProcessing} className="absolute top-6 right-6 w-8 h-8 rounded-full bg-gray-100 dark:bg-white/10 flex items-center justify-center text-gray-500 hover:text-gray-900 dark:hover:text-white font-bold transition-colors">✕</button>
                        <div className="w-16 h-16 bg-purple-50 dark:bg-purple-500/10 text-purple-600 rounded-2xl flex items-center justify-center text-3xl mb-4 border border-purple-100 dark:border-purple-500/20 shadow-inner">पे</div>
                        <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight mb-1">PhonePe Gateway</h2>
                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                            Amount Due: <span className="text-blue-600 dark:text-cyan-400 text-sm tracking-normal">₹{finalTotal.toLocaleString()}</span>
                        </p>
                        
                        {paymentStatus === "init" ? (
                            <>
                                <div className="mb-8 w-full bg-gray-50 dark:bg-[#111] p-4 rounded-2xl border border-gray-100 dark:border-white/5 shadow-inner">
                                    <div className="flex items-center justify-center gap-1.5 mb-1">
                                        <span className="text-purple-600 text-sm">✓</span>
                                        <p className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">UAT Secure Test Mode</p>
                                    </div>
                                    <p className="text-[10px] text-gray-400 mt-3 uppercase tracking-wider font-bold">Generate QR for Instant Pay</p>
                                </div>
                                <div className="w-full flex flex-col gap-3">
                                    <button onClick={handlePhonePeClick} disabled={isProcessing} className="w-full py-4 rounded-xl font-black text-sm transition-all duration-300 active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed bg-purple-600 text-white shadow-lg shadow-purple-600/30 uppercase tracking-widest">
                                        {isProcessing ? 'CONNECTING...' : 'GENERATE PHONEPE QR'}
                                    </button>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="bg-white p-3 rounded-3xl shadow-inner border border-gray-200 mb-4 w-48 h-48 flex items-center justify-center relative overflow-hidden group">
                                    <div className="absolute inset-0 bg-gradient-to-b from-purple-500/20 to-transparent h-12 w-full -translate-y-full animate-[scan_2.5s_ease-in-out_infinite] z-20 pointer-events-none border-b border-purple-500/40"></div>
                                    <img 
                                        src={primaryQr} 
                                        onError={(e) => { e.target.onerror = null; e.target.src = fallbackQr; }}
                                        alt="Secure UPI QR Code" 
                                        className="w-full h-full object-contain relative z-10 rounded-xl" 
                                    />
                                </div>
                                <div className="w-full bg-gray-50 dark:bg-[#111] p-3 rounded-xl border border-gray-100 dark:border-white/5 shadow-inner mb-4">
                                    <p className="text-xs font-bold text-gray-900 dark:text-white truncate px-2">{payeeName}</p>
                                    <p className="text-[10px] font-mono text-gray-400 mt-1">{upiId}</p>
                                    <p className="text-[9px] font-mono text-purple-500 mt-2">TXN: {txnId}</p>
                                </div>
                                <div className="w-full mb-6 flex flex-col items-center">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-indigo-500 mb-2 block">Attach Payment Screenshot</label>
                                    <input 
                                        type="file" accept="image/*" 
                                        onChange={(e) => setScreenshotFile(e.target.files[0])} 
                                        className="w-full text-[10px] font-mono text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-indigo-100 dark:file:bg-indigo-900/30 file:text-indigo-700 dark:file:text-indigo-300 cursor-pointer hover:file:bg-indigo-200 dark:hover:file:bg-indigo-800/40 transition-colors" 
                                    />
                                </div>
                                <button onClick={handlePaymentSuccess} disabled={isProcessing || !screenshotFile} className="w-full py-4 rounded-xl font-black text-sm transition-all duration-300 active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 uppercase tracking-widest">
                                    {isProcessing ? 'VERIFYING...' : 'I HAVE PAID'}
                                </button>
                            </>
                        )}
                        <button onClick={() => setIsPaymentOpen(false)} disabled={isProcessing} className="w-full py-3 mt-2 rounded-xl font-bold text-[10px] uppercase tracking-[0.2em] text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors">Cancel Request</button>
                    </div>
                </div>
            )}

            {/* PROCESSING OVERLAY */}
            {isProcessing && !isPaymentOpen && (
                <div className="fixed inset-0 z-[110] bg-white/70 dark:bg-[#0a0f1c]/80 backdrop-blur-xl flex items-center justify-center animate-in fade-in duration-200">
                    <div className="flex flex-col items-center bg-white dark:bg-[#111827] p-10 rounded-[2.5rem] shadow-2xl border border-gray-100 dark:border-white/10">
                        <div className="w-16 h-16 border-4 border-gray-200 dark:border-gray-700 border-t-blue-600 dark:border-t-blue-500 rounded-full animate-spin mb-6"></div>
                        <p className="font-black text-gray-900 dark:text-white text-lg tracking-tight mb-2">Securing Connection...</p>
                        <p className="text-sm font-bold text-gray-400 animate-pulse">Running Encrypted Handshake</p>
                    </div>
                </div>
            )}

            <div className="max-w-7xl mx-auto">
                {/* PROGRESS INDICATOR */}
                <div className="flex justify-center mb-10 hidden sm:flex">
                    <div className="flex items-center gap-4 text-xs font-black uppercase tracking-widest">
                        <span className="text-blue-600 dark:text-blue-400 flex items-center gap-2"><span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">1</span> Cart</span>
                        <div className="w-12 h-[2px] bg-blue-600 dark:bg-blue-400"></div>
                        <span className="text-blue-600 dark:text-blue-400 flex items-center gap-2"><span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">2</span> Delivery</span>
                        <div className="w-12 h-[2px] bg-gray-200 dark:bg-gray-800"></div>
                        <span className="text-gray-400 dark:text-gray-500 flex items-center gap-2"><span className="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">3</span> Payment</span>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                    
                    {/* LEFT COLUMN: CART ITEMS */}
                    <div className="lg:col-span-7 flex flex-col h-full">
                        <div className="flex justify-between items-end mb-6">
                            <h1 className="text-4xl md:text-5xl font-black text-gray-900 dark:text-white tracking-tighter">Your Bag</h1>
                            <p className="text-gray-500 font-bold uppercase tracking-widest text-xs bg-gray-100 dark:bg-white/5 px-4 py-2 rounded-full">{safeCart.length} Items</p>
                        </div>

                        <div className="bg-white dark:bg-[#111827] rounded-[2.5rem] shadow-xl dark:shadow-none border border-gray-100 dark:border-white/5 overflow-hidden relative">
                            <ul className="divide-y divide-gray-100 dark:divide-white/5">
                                {isLoading ? (
                                    <>
                                        <SkeletonCartItem />
                                        <SkeletonCartItem />
                                    </>
                                ) : (
                                    safeCart.map((item) => (
                                        <li key={item.cartItemId || item.id} className="p-6 md:p-8 flex flex-col md:flex-row items-center gap-6 hover:bg-gray-50/50 dark:hover:bg-white/[0.02] transition-colors group">
                                            <Link to={`/product/${item.id}`} className="h-32 w-32 flex-shrink-0 overflow-hidden rounded-3xl bg-gray-50 dark:bg-black/40 flex items-center justify-center border border-gray-100 dark:border-white/5 group-hover:scale-105 transition-transform duration-300">
                                                {item.imageUrl ? (
                                                    <img src={getImageUrl(item.imageUrl)} alt={item.name} loading="lazy" className="h-full w-full object-cover dark:mix-blend-normal transition-opacity duration-300" />
                                                ) : <span className="text-4xl">📦</span>}
                                            </Link>
                                            <div className="flex-1 text-center md:text-left w-full">
                                                <div className="flex justify-between items-start mb-2">
                                                    <div>
                                                        <p className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-1">{item.category || 'Premium'}</p>
                                                        <Link to={`/product/${item.id}`} className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white hover:text-blue-600 transition-colors line-clamp-2">{item.name}</Link>
                                                    </div>
                                                    <p className="text-2xl font-black text-gray-900 dark:text-white tracking-tighter hidden md:block">₹{(item.price * item.quantity).toLocaleString()}</p>
                                                </div>
                                                <p className="text-2xl font-black text-gray-900 dark:text-white tracking-tighter md:hidden mb-2">₹{(item.price * item.quantity).toLocaleString()}</p>
                                                {item.selectedVariant && <p className="text-sm font-medium text-gray-500 mb-3">Color: {item.selectedVariant.color} • Size: {item.selectedVariant.size}</p>}
                                                <div className="flex items-center justify-between mt-4">
                                                    <div className="inline-flex items-center gap-4 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 px-4 py-2 rounded-xl">
                                                        <span className="text-xs font-black text-gray-500 uppercase tracking-widest">Qty</span>
                                                        <span className="text-lg font-black text-gray-900 dark:text-white">{item.quantity}</span>
                                                    </div>
                                                    <button onClick={() => removeFromCart(item.cartItemId || item.id)} className="text-sm font-bold text-gray-400 hover:text-red-500 transition-colors underline decoration-transparent hover:decoration-red-500 underline-offset-4 active:scale-95">Remove</button>
                                                </div>
                                            </div>
                                        </li>
                                    ))
                                )}
                            </ul>
                        </div>
                        
                        <div className="mt-8 bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 rounded-2xl p-6 flex items-start gap-4">
                            <span className="text-2xl">🚚</span>
                            <div>
                                <h4 className="font-black text-green-800 dark:text-green-400 text-lg">Free Premium Delivery</h4>
                                <p className="text-green-700 dark:text-green-500/80 font-medium text-sm">Order now and expect delivery by <strong className="text-green-900 dark:text-green-300">{formattedDeliveryDate}</strong>.</p>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT COLUMN: CHECKOUT & ADDRESS */}
                    <div className="lg:col-span-5 relative">
                        <div className="bg-white/80 dark:bg-[#111827]/80 backdrop-blur-3xl rounded-[2.5rem] shadow-2xl dark:shadow-none border border-gray-100 dark:border-white/10 overflow-hidden lg:sticky lg:top-28 transition-all duration-300 hover:border-gray-200 dark:hover:border-white/20">
                            
                            {/* ADDRESS SECTION */}
                            <div className="p-6 sm:p-8 border-b border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-black/20">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-lg font-black text-gray-900 dark:text-white tracking-tight">Shipping Details</h3>
                                    {userId && savedAddresses.length > 0 && !isAddingNew && (
                                        <button onClick={() => setIsAddingNew(true)} className="text-xs font-black text-blue-600 uppercase tracking-widest bg-blue-50 dark:bg-blue-500/10 px-3 py-1.5 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-colors active:scale-95">+ Add New</button>
                                    )}
                                </div>
                                
                                {isLoading ? (
                                    <div className="h-32 bg-gray-200 dark:bg-gray-800 rounded-2xl animate-pulse"></div>
                                ) : (
                                    <>
                                        {userId && !isAddingNew && savedAddresses.length > 0 && (
                                            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                                                <div className="space-y-3 max-h-56 overflow-y-auto custom-scrollbar pr-2 mb-4">
                                                    {savedAddresses.map(addr => (
                                                        <div 
                                                            key={addr.id} 
                                                            onClick={() => handleSelectAddress(addr)} 
                                                            className={`group p-4 rounded-2xl border-2 transition-all duration-300 cursor-pointer flex justify-between items-center ${selectedAddressId === addr.id ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-500/10 shadow-md' : 'border-gray-100 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-600'}`}
                                                        >
                                                            <div className="flex-1">
                                                                <div className="flex items-center gap-3 mb-1">
                                                                    <span className="text-xl">{addr.label === 'Home' ? '🏠' : (addr.label === 'Office' ? '🏢' : '📍')}</span>
                                                                    <span className="font-black text-sm uppercase tracking-widest text-gray-900 dark:text-white">{addr.label}</span>
                                                                    {selectedAddressId === addr.id && <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse ml-2"></span>}
                                                                </div>
                                                                <p className="text-xs font-medium text-gray-500 ml-8 line-clamp-1">{addr.streetAddress.split('|')[0]}</p>
                                                            </div>
                                                            <button 
                                                                onClick={(e) => handleDeleteAddress(e, addr.id)}
                                                                className={`p-2 rounded-full transition-colors ${selectedAddressId === addr.id ? 'text-gray-400 hover:text-red-500 hover:bg-white dark:hover:bg-black/50' : 'text-transparent group-hover:text-gray-400 hover:text-red-500'}`}
                                                                title="Remove Address"
                                                            >🗑️</button>
                                                        </div>
                                                    ))}
                                                </div>

                                                <div className="bg-white dark:bg-black/40 p-4 sm:p-5 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm mt-4 transition-colors focus-within:border-blue-500 dark:focus-within:border-blue-500">
                                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2 block">Verify Order Contact (Editable)</label>
                                                    <div className="relative group">
                                                        <span className="absolute left-4 top-3.5 text-gray-400 text-sm transition-colors group-focus-within:text-blue-500">📱</span>
                                                        <input 
                                                            type="tel" 
                                                            value={phoneNumber === 'Pending' ? '' : phoneNumber} 
                                                            onChange={(e) => setPhoneNumber(e.target.value)} 
                                                            placeholder="Enter 10-Digit Mobile Number" 
                                                            className="w-full pl-11 pr-4 py-3.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#050505] text-gray-900 dark:text-white outline-none focus:border-blue-500 transition-all font-bold text-sm shadow-inner hover:border-gray-300 dark:hover:border-gray-600"
                                                        />
                                                    </div>
                                                    {(!phoneNumber || phoneNumber === 'Pending' || phoneNumber.replace(/\D/g, '').length < 10) && (
                                                        <p className="text-[9px] text-red-500 font-bold mt-2 flex items-center gap-1 animate-in slide-in-from-top-1">
                                                            <span>⚠️</span> Valid 10-digit number required for delivery
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {isAddingNew && (
                                            <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                                                {!userId && <input type="email" value={guestEmail} onChange={(e) => setGuestEmail(e.target.value)} placeholder="Email for Receipt" className="w-full p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-black/40 dark:text-white text-sm font-medium outline-none focus:border-blue-500 transition-all mb-4 hover:border-gray-300 dark:hover:border-gray-600 shadow-sm" />}
                                                
                                                <div className="flex gap-2 mb-4">
                                                    {['Home', 'Office', 'Other'].map(lbl => (
                                                        <button key={lbl} onClick={() => setNewLabel(lbl)} className={`flex-1 py-2 text-xs font-black rounded-xl border transition-all active:scale-95 ${newLabel === lbl ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20' : 'bg-white dark:bg-black/40 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>{lbl}</button>
                                                    ))}
                                                </div>
                                                
                                                <input type="tel" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} placeholder="10-Digit Mobile Number" className="w-full p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-black/40 dark:text-white text-sm font-medium outline-none focus:border-blue-500 transition-all mb-4 hover:border-gray-300 dark:hover:border-gray-600 shadow-sm" />
                                                
                                                <div className="bg-gray-100/50 dark:bg-black/40 p-4 rounded-xl border border-gray-200 dark:border-gray-800 mb-4 shadow-inner">
                                                    <div className="flex justify-between items-end mb-3">
                                                        <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-500">Coordinate Matrix</h4>
                                                        <button onClick={handleAutoLocate} className="text-[9px] font-black bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-400 transition-colors shadow shadow-blue-500/30 active:scale-95">LOCATE ME 🛰️</button>
                                                    </div>

                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                                                        {['Door/Building', 'Street/Village', 'Mandal/Area', 'District/City', 'State', 'PIN Code'].map((label, idx) => {
                                                            const keys = ['doorNo', 'villageStreet', 'mandal', 'district', 'state', 'pincode'];
                                                            const key = keys[idx];
                                                            const placeholders = ['2-9', 'Nandhipalli', 'Badvel', 'Kadapa', 'Andhra Pradesh', '516227'];
                                                            return (
                                                                <div key={key}>
                                                                    <label className="block text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-1">{label}</label>
                                                                    <input type="text" value={addressData[key]} onChange={e => setAddressData({...addressData, [key]: e.target.value})} className="w-full p-2.5 rounded-lg bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-700 outline-none focus:border-blue-500 text-gray-900 dark:text-white text-xs font-mono transition-colors hover:border-gray-300 dark:hover:border-gray-600" placeholder={placeholders[idx]} />
                                                                </div>
                                                            )
                                                        })}
                                                    </div>

                                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-indigo-500 mb-2 mt-4">Drop Exact Delivery Pin</h4>
                                                    <div className="h-48 w-full rounded-lg overflow-hidden border border-gray-300 dark:border-gray-700 relative z-0">
                                                        <Suspense fallback={<div className="w-full h-full bg-gray-200 dark:bg-gray-800 animate-pulse" />}>
                                                            <MapContainer center={[mapPos.lat, mapPos.lng]} zoom={6} style={{ height: '100%', width: '100%' }}>
                                                                <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
                                                                <LocationMarker position={mapPos} setPosition={setMapPos} setAddressData={setAddressData} />
                                                            </MapContainer>
                                                        </Suspense>
                                                    </div>
                                                    <p className="text-[9px] text-gray-400 mt-1 text-center">Click the map to drop your delivery pin.</p>
                                                </div>

                                                <button onClick={handleSaveNewAddress} className="w-full bg-gray-900 dark:bg-blue-600 text-white py-3.5 rounded-xl font-black text-sm hover:opacity-90 transition-all shadow-md shadow-blue-500/20 active:scale-[0.98]">Lock Coordinates</button>
                                                
                                                {userId && savedAddresses.length > 0 && (
                                                    <button onClick={() => setIsAddingNew(false)} className="w-full text-xs font-bold text-gray-500 mt-4 hover:text-gray-900 dark:hover:text-white transition-colors">Cancel</button>
                                                )}
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>

                            {/* PAYMENT SUMMARY SECTION */}
                            <div className="p-6 sm:p-8">
                                <div className="flex gap-2 mb-8 group">
                                    <input type="text" placeholder="Promo Code" value={promoCode} onChange={(e) => setPromoCode(e.target.value.toUpperCase())} className="flex-1 p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-black/40 dark:text-white text-sm font-black outline-none focus:border-blue-500 transition-all uppercase hover:border-gray-300 dark:hover:border-gray-600" />
                                    <button onClick={handleApplyPromo} className="bg-gray-900 dark:bg-gray-800 text-white px-6 rounded-xl font-black hover:bg-blue-600 dark:hover:bg-blue-600 transition-all shadow-md active:scale-95">Apply</button>
                                </div>

                                {userId && walletBalance > 0 && (
                                    <div className="flex justify-between items-center bg-gradient-to-r from-yellow-500/10 to-orange-500/5 p-4 rounded-2xl border border-yellow-500/30 mb-8 transition-all hover:border-yellow-500/50">
                                        <div>
                                            <p className="font-black text-yellow-600 dark:text-yellow-500 text-sm">🟡 {walletBalance.toLocaleString()} ProCoins</p>
                                            <p className="text-[10px] font-bold text-yellow-700/60 dark:text-yellow-500/60 uppercase tracking-widest mt-0.5">Available Balance</p>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input type="checkbox" className="sr-only peer" checked={useCoins} onChange={() => setUseCoins(!useCoins)} />
                                            <div className="w-12 h-7 bg-gray-200 dark:bg-gray-800 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-yellow-500 shadow-inner border border-gray-300 dark:border-gray-700 peer-checked:border-yellow-500"></div>
                                        </label>
                                    </div>
                                )}

                                <div className="space-y-4 mb-6 border-b border-dashed border-gray-200 dark:border-gray-700 pb-6">
                                    <div className="flex justify-between text-sm font-bold text-gray-500 dark:text-gray-400"><span>Subtotal</span><span className="text-gray-900 dark:text-white">₹{subtotal.toLocaleString()}</span></div>
                                    <div className="flex justify-between text-sm font-bold text-gray-500 dark:text-gray-400"><span>Shipping</span><span className="text-green-500 bg-green-50 dark:bg-green-500/10 px-2 py-0.5 rounded text-xs">FREE</span></div>
                                    {discount > 0 && <div className="flex justify-between text-sm font-bold text-green-500 bg-green-50 dark:bg-green-500/10 px-2 py-1 -mx-2 rounded-lg animate-in fade-in slide-in-from-right-4 duration-300"><span>Discount ({discount}%)</span><span>- ₹{discountAmount.toLocaleString()}</span></div>}
                                    {useCoins && <div className="flex justify-between text-sm font-bold text-yellow-600 bg-yellow-50 dark:bg-yellow-500/10 px-2 py-1 -mx-2 rounded-lg animate-in fade-in slide-in-from-right-4 duration-300"><span>Coins Applied</span><span>- ₹{maxCoinsToUse.toLocaleString()}</span></div>}
                                </div>
                                
                                <div className="flex justify-between items-end mb-8">
                                    <div>
                                        <span className="text-xs font-black text-gray-400 uppercase tracking-widest block mb-1">Total</span>
                                        <span className="text-xs font-bold text-gray-400">Includes all taxes</span>
                                    </div>
                                    <span className="text-4xl font-black text-gray-900 dark:text-white tracking-tighter">₹{finalTotal.toLocaleString()}</span>
                                </div>
                                
                                <button onClick={handleInitiateCheckout} disabled={isProcessing || isAddingNew || isLoading} className="group relative w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-6 rounded-[2rem] font-black text-xl hover:shadow-2xl hover:shadow-purple-500/30 transition-all active:scale-[0.98] disabled:opacity-50 overflow-hidden flex items-center justify-center gap-3">
                                    <span className="relative z-10 text-2xl mb-1">पे</span>
                                    <span className="relative z-10">Proceed to Payment</span>
                                    <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                                </button>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
            
            <style dangerouslySetInnerHTML={{__html: `
                @keyframes scan { 
                    0% { transform: translateY(-100%); } 
                    100% { transform: translateY(500%); } 
                }
                @keyframes slideUp { 
                    from { transform: translateY(20px); opacity: 0; } 
                    to { transform: translateY(0); opacity: 1; } 
                }
                @keyframes fadeIn { 
                    from { opacity: 0; } 
                    to { opacity: 1; } 
                }
            `}} />
        </div>
    );
}

export default Cart;