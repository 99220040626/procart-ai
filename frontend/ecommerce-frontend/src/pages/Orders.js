import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import API from '../services/api';
import toast from 'react-hot-toast';
import { Client } from '@stomp/stompjs'; 
import SockJS from 'sockjs-client'; 

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
// 🚀 MAIN ORDERS COMPONENT
// ==========================================
export default function Orders() {
    const [orders, setOrders] = useState([]);
    const [products, setProducts] = useState([]); 
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const userId = localStorage.getItem('userId');

    // Scroll Triggers
    const [headerRef, headerVisible] = useIntersectionObserver();

    // Modal State for X-Ray Detailed View
    const [selectedOrder, setSelectedOrder] = useState(null);

    useEffect(() => {
        if (!userId) {
            navigate('/login');
            return;
        }

        const fetchData = async () => {
            try {
                const [ordersRes, productsRes] = await Promise.all([
                    API.get(`/orders/user/${userId}`),
                    API.get('/products')
                ]);
                setOrders(ordersRes.data.sort((a, b) => b.id - a.id));
                setProducts(productsRes.data);
            } catch (error) {
                console.error("Error fetching orders:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();

        // 📡 Live WebSocket Tracking
        const socketUrl = window.location.protocol === 'https:' 
            ? `https://${window.location.host}/ws` 
            : 'https://procart-ai.onrender.com/ws';

        const socket = new SockJS(socketUrl);
        const stompClient = new Client({
            webSocketFactory: () => socket,
            onConnect: () => {
                stompClient.subscribe(`/topic/orders/${userId}`, (message) => {
                    const updatedOrder = JSON.parse(message.body);
                    setOrders(prevOrders => prevOrders.map(o => o.id === updatedOrder.id ? updatedOrder : o));
                    toast.success(
                        <div className="flex flex-col">
                            <span className="font-bold text-emerald-500 uppercase tracking-widest text-[10px]">Order Update</span>
                            <span className="text-sm font-medium">Order #{updatedOrder.id} is now <b className="text-white">{updatedOrder.status}</b> 🚚</span>
                        </div>, {
                        style: { borderRadius: '16px', background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(10px)', color: '#fff', border: '1px solid rgba(16,185,129,0.2)' }
                    });
                });
            }
        });

        stompClient.activate();
        return () => stompClient.deactivate();
    }, [navigate, userId]);

    // Q&A Support Modal State
    const [qaModalProduct, setQaModalProduct] = useState(null); 
    const [qaList, setQaList] = useState([]); 
    const [newQuestion, setNewQuestion] = useState("");

    const getImageUrl = (imageName) => {
        if (!imageName) return null;
        return imageName.startsWith('http') ? imageName : `/uploads/${imageName}`;
    };

    const getProductDetails = (productId) => products.find(p => p.id === productId) || null;

    const downloadInvoice = async (orderId) => {
        const toastId = toast.loading('Generating invoice...');
        try {
            const response = await API.get(`/orders/${orderId}/invoice`, { responseType: 'blob' });
            const blob = new Blob([response.data], { type: 'application/pdf' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `ProCart_Invoice_#${orderId}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.parentNode.removeChild(link);
            toast.success('Invoice downloaded successfully! 📄', { id: toastId });
        } catch (error) {
            toast.error('Failed to generate invoice.', { id: toastId });
        }
    };

    const openSupportModal = async (product, e) => {
        if (e) e.stopPropagation(); // Prevent opening X-Ray modal
        setQaModalProduct(product);
        try {
            const res = await API.get(`/qa/product/${product.id}`);
            setQaList(res.data);
        } catch (err) { toast.error("Could not connect to support."); }
    };

    const submitQuestion = async (e) => {
        e.preventDefault();
        try {
            await API.post('/qa/ask', { productId: qaModalProduct.id, userId: parseInt(userId), customerName: "Customer", question: newQuestion });
            toast.success("Message sent to support team!");
            setNewQuestion(""); openSupportModal(qaModalProduct, null); 
        } catch (err) { toast.error("Failed to send message."); }
    };

    const getStatusUI = (status) => {
        switch (status) {
            case 'PENDING': return { color: 'text-yellow-500', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', icon: '⏳', label: 'Payment pending...' };
            case 'SUCCESS': return { color: 'text-green-500', bg: 'bg-green-500/10', border: 'border-green-500/30', icon: '✅', label: 'Payment success' };
            case 'SHIPPED': return { color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/30', icon: '🚚', label: 'In Transit' };
            case 'DELIVERED': return { color: 'text-purple-500', bg: 'bg-purple-500/10', border: 'border-purple-500/30', icon: '📦', label: 'Delivered' };
            default: return { color: 'text-gray-500', bg: 'bg-gray-500/10', border: 'border-gray-500/30', icon: '•', label: status };
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#f8fafc] dark:bg-[#000000] flex flex-col items-center justify-center transition-colors duration-700">
                <div className="relative w-20 h-20 mb-6">
                    <div className="absolute inset-0 border-t-4 border-blue-600 dark:border-cyan-500 rounded-full animate-spin"></div>
                    <div className="absolute inset-2 border-r-4 border-indigo-500 dark:border-purple-500 rounded-full animate-[spin_1.5s_linear_infinite_reverse]"></div>
                </div>
                <p className="text-[10px] sm:text-xs font-black text-gray-500 dark:text-gray-400 tracking-widest uppercase animate-pulse">Loading Your Orders...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#f8fafc] dark:bg-[#000000] pb-32 pt-8 md:py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-700 relative overflow-hidden animate-[fadeIn_0.5s_ease-out]">
            
            {/* 🌌 CLEAN DOT MATRIX AMBIENT BACKGROUND */}
            <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
                <div className="absolute top-[-10%] left-[-10%] w-[80vw] h-[80vw] bg-[radial-gradient(circle,rgba(59,130,246,0.06)_0%,transparent_70%)] dark:bg-[radial-gradient(circle,rgba(6,182,212,0.04)_0%,transparent_70%)] rounded-full blur-[100px] animate-pulse" style={{ animationDuration: '10s' }}></div>
                <div className="absolute bottom-[-20%] right-[-10%] w-[90vw] h-[90vw] bg-[radial-gradient(circle,rgba(99,102,241,0.06)_0%,transparent_70%)] dark:bg-[radial-gradient(circle,rgba(217,70,239,0.04)_0%,transparent_70%)] rounded-full blur-[100px] animate-pulse" style={{ animationDuration: '12s' }}></div>
                <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] dark:bg-[radial-gradient(#334155_1px,transparent_1px)] bg-[size:24px_24px] opacity-60 dark:opacity-40 [mask-image:radial-gradient(ellipse_80%_80%_at_50%_0%,#000_30%,transparent_100%)]"></div>
            </div>

            <div className="max-w-5xl mx-auto relative z-10">
                
                {/* 🚀 Header Section */}
                <div ref={headerRef} className={`text-center mb-10 sm:mb-16 transition-all duration-1000 ${headerVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
                    <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-white/80 dark:bg-[#0a0a0a]/80 border border-gray-200/50 dark:border-white/[0.05] backdrop-blur-xl mb-4 shadow-sm mx-auto">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_10px_#10b981]"></span>
                        <span className="text-[10px] font-black tracking-widest uppercase text-gray-600 dark:text-gray-300">Live Tracking Connected</span>
                    </div>
                    <h1 className="text-4xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-b from-gray-900 to-gray-500 dark:from-white dark:via-gray-300 dark:to-gray-700 tracking-tighter mb-3">
                        <ScrambleText text="My Orders" />
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">View and track all your recent purchases here.</p>
                </div>

                {orders.length === 0 ? (
                    <div className="bg-white/80 dark:bg-[#050505]/80 backdrop-blur-2xl rounded-[2rem] sm:rounded-[3rem] p-10 sm:p-20 text-center shadow-xl dark:shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-gray-200/50 dark:border-white/[0.05] mt-10">
                        <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-6 bg-gray-50 dark:bg-white/5 rounded-full flex items-center justify-center text-4xl shadow-inner border border-gray-100 dark:border-white/10">📦</div>
                        <h2 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white mb-3 tracking-tight">No Orders Found</h2>
                        <p className="text-gray-500 dark:text-gray-400 mb-8 font-medium text-sm sm:text-base max-w-md mx-auto">Looks like you haven't bought anything yet. Discover our premium collection today.</p>
                        <Link to="/products" className="bg-blue-600 dark:bg-cyan-500 text-white dark:text-black px-8 py-4 rounded-full font-black text-sm transition-transform active:scale-95 shadow-lg shadow-blue-500/30 dark:shadow-[0_0_20px_rgba(6,182,212,0.4)] inline-block hover:scale-105">
                            START SHOPPING
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-6 sm:space-y-8">
                        {orders.map((order, index) => {
                            const product = getProductDetails(order.productId);
                            const ui = getStatusUI(order.status);
                            
                            // 📊 Order Progress Bar Logic (With Tick Marks)
                            const steps = [
                                { id: 'PENDING', label: 'Verifying' },
                                { id: 'SUCCESS', label: 'Verified' },
                                { id: 'SHIPPED', label: 'Shipped' },
                                { id: 'DELIVERED', label: 'Delivered' }
                            ];
                            let currentStepIndex = steps.findIndex(s => s.id === order.status);
                            if (currentStepIndex === -1) currentStepIndex = 0; // default

                            return (
                                <div key={order.id} onClick={() => setSelectedOrder({ order, product })} className="bg-white/90 dark:bg-[#0a0a0a]/90 backdrop-blur-xl rounded-[2rem] p-5 sm:p-8 shadow-sm hover:shadow-xl dark:shadow-[0_10px_30px_rgba(0,0,0,0.2)] dark:hover:shadow-[0_10px_40px_rgba(6,182,212,0.1)] border border-gray-200/50 dark:border-white/[0.05] flex flex-col lg:flex-row gap-6 sm:gap-8 transition-all duration-500 hover:-translate-y-1 animate-[slideUp_0.5s_ease-out_backwards] cursor-pointer group" style={{animationDelay: `${index * 0.05}s`}}>
                                    
                                    {/* Left: Product Image */}
                                    <div className="h-28 w-28 sm:h-40 sm:w-40 bg-gray-50 dark:bg-[#050505] rounded-2xl sm:rounded-[1.5rem] overflow-hidden flex-shrink-0 flex items-center justify-center border border-gray-100 dark:border-white/5 shadow-inner mx-auto lg:mx-0">
                                        {product && product.imageUrl ? (
                                            <img src={getImageUrl(product.imageUrl)} alt={product.name} className="h-full w-full object-cover hover:scale-110 transition-transform duration-700" />
                                        ) : (
                                            <span className="text-4xl opacity-50">📦</span>
                                        )}
                                    </div>

                                    {/* Middle & Right: Details and Progress */}
                                    <div className="flex-1 w-full flex flex-col justify-between">
                                        
                                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-6">
                                            <div className="text-center sm:text-left">
                                                <p className="text-[10px] font-black text-blue-600 dark:text-cyan-500 uppercase tracking-widest mb-1">Order #{order.id}</p>
                                                <Link to={`/product/${order.productId}`} onClick={(e) => e.stopPropagation()}>
                                                    <h3 className="text-lg sm:text-2xl font-black text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-cyan-400 transition-colors tracking-tight line-clamp-1">
                                                        {product ? product.name : 'Premium Item'}
                                                    </h3>
                                                </Link>
                                                <p className="text-gray-500 dark:text-gray-400 mt-1 font-bold text-xs sm:text-sm">Qty: {order.quantity} <span className="mx-2">•</span> ₹{(order.price * order.quantity).toLocaleString()}</p>
                                                
                                                {/* STATUS BADGE */}
                                                <div className={`inline-flex items-center gap-2 mt-3 px-3 py-1 rounded border ${ui.bg} ${ui.border} ${ui.color} ${order.status === 'PENDING' ? 'animate-pulse' : ''}`}>
                                                    <span className="text-xs">{ui.icon}</span>
                                                    <span className="text-[10px] font-black uppercase tracking-widest">{ui.label}</span>
                                                </div>
                                            </div>
                                            
                                            {/* Action Buttons */}
                                            <div className="flex flex-row sm:flex-col justify-center sm:justify-start gap-2">
                                                <button onClick={(e) => openSupportModal(product, e)} className="bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-2">
                                                    💬 Support
                                                </button>
                                                <button onClick={(e) => { e.stopPropagation(); downloadInvoice(order.id); }} className="bg-blue-50 dark:bg-cyan-500/10 hover:bg-blue-100 dark:hover:bg-cyan-500/20 text-blue-700 dark:text-cyan-400 px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-2">
                                                    📄 Invoice
                                                </button>
                                            </div>
                                        </div>
                                        
                                        {/* 🚀 Visual Tracking Timeline (WITH TICK MARKS) */}
                                        <div className="bg-gray-50 dark:bg-[#050505] p-5 sm:p-6 rounded-2xl border border-gray-200 dark:border-white/[0.05] shadow-inner">
                                            <div className="flex items-center justify-between relative">
                                                <div className="absolute top-1/2 left-0 w-full h-1 bg-gray-200 dark:bg-white/10 -translate-y-1/2 z-0 rounded-full"></div>
                                                <div className="absolute top-1/2 left-0 h-1 bg-emerald-500 dark:bg-emerald-400 -translate-y-1/2 z-0 rounded-full transition-all duration-1000" style={{ width: `${(currentStepIndex / (steps.length - 1)) * 100}%` }}></div>

                                                {steps.map((step, stepIdx) => {
                                                    const isCompleted = stepIdx <= currentStepIndex;
                                                    const isCurrent = stepIdx === currentStepIndex;
                                                    return (
                                                        <div key={step.id} className="relative z-10 flex flex-col items-center gap-2 bg-gray-50 dark:bg-[#050505] px-1 sm:px-2">
                                                            <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center border-2 transition-all duration-500 ${isCompleted ? 'bg-emerald-500 border-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)] text-white' : 'bg-gray-200 dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-transparent'} ${isCurrent && order.status !== 'DELIVERED' ? 'animate-pulse scale-110' : ''}`}>
                                                                {/* 🚀 THE TICK MARK ✓ */}
                                                                {isCompleted && <span className="text-[10px] sm:text-xs font-black">✓</span>}
                                                            </div>
                                                            <span className={`text-[8px] sm:text-[10px] font-black uppercase tracking-wider hidden sm:block ${isCompleted ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-600'}`}>
                                                                {step.label}
                                                            </span>
                                                        </div>
                                                    );
                                                })}
                                            </div>

                                            {/* Shipping Details */}
                                            <div className="mt-5 pt-4 border-t border-gray-200 dark:border-white/5 flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
                                                <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                                                    <span className="text-lg">📍</span>
                                                    <p className="text-xs sm:text-sm font-medium line-clamp-1">{order.shippingAddress || 'No address provided'}</p>
                                                </div>
                                            </div>
                                        </div>

                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* 🚀 DETAILED ORDER X-RAY MODAL (WITH VERTICAL TRACKING "LIKE SIDE") */}
            {selectedOrder && (() => {
                const { order, product } = selectedOrder;
                const orderDate = new Date(order.orderDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
                
                // Vertical Steps Logic
                const verticalSteps = [
                    { id: 'PENDING', label: 'Order Placed', desc: 'Awaiting payment verification' },
                    { id: 'SUCCESS', label: 'Payment Verified', desc: 'Admin confirmed your payment' },
                    { id: 'SHIPPED', label: 'Shipped', desc: 'Order dispatched to courier' },
                    { id: 'DELIVERED', label: 'Delivered', desc: 'Package arrived at destination' }
                ];
                const currentStatus = order.status === 'PENDING' ? 'PENDING' : (order.status || 'PENDING');
                let currentVertIndex = verticalSteps.findIndex(s => s.id === currentStatus);
                if (currentVertIndex === -1) currentVertIndex = 0;

                return (
                    <div className="fixed inset-0 z-[150] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-[fadeIn_0.3s_ease-out]">
                        <div className="bg-white dark:bg-[#111827] w-full max-w-4xl rounded-[2.5rem] shadow-2xl border border-gray-200 dark:border-gray-800 flex flex-col max-h-[90vh] animate-[slideUp_0.3s_ease-out] overflow-hidden">
                            
                            <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-[#0a0a0a]">
                                <div>
                                    <h2 className="text-lg font-black uppercase tracking-widest text-gray-900 dark:text-white">Order Details</h2>
                                    <p className="text-xs font-mono text-gray-500 mt-1">TXN: #{order.id} | {orderDate}</p>
                                </div>
                                <button onClick={() => setSelectedOrder(null)} className="text-gray-400 hover:text-gray-900 dark:hover:text-white font-mono text-2xl font-bold transition-colors w-10 h-10 flex items-center justify-center rounded-full bg-gray-200 dark:bg-gray-800">✕</button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar bg-slate-50 dark:bg-[#0a0f1c]">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    
                                    {/* 🚀 LEFT SIDE: VERTICAL TRACKING ("LIKE SIDE") */}
                                    <div className="space-y-6">
                                        <div className="bg-white dark:bg-[#111827] rounded-2xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
                                            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6 border-b border-gray-100 dark:border-gray-800 pb-2">Live Tracking</h4>
                                            
                                            <div className="relative border-l-2 border-gray-200 dark:border-gray-800 ml-3 space-y-8 pb-4 mt-4">
                                                {/* Dynamic Vertical Step Generation */}
                                                {verticalSteps.map((step, idx) => {
                                                    const isCompleted = idx <= currentVertIndex;
                                                    const isCurrent = idx === currentVertIndex;
                                                    return (
                                                        <div key={step.id} className="relative pl-6">
                                                            <div className={`absolute -left-[13px] top-0 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border-2 transition-all duration-500 ${isCompleted ? 'bg-emerald-500 border-emerald-500 text-white shadow-[0_0_10px_rgba(16,185,129,0.4)]' : 'bg-white dark:bg-[#111827] border-gray-300 dark:border-gray-700 text-gray-400'} ${isCurrent ? 'scale-125' : ''}`}>
                                                                {/* 🚀 TICK MARK ✓ ON THE SIDE */}
                                                                {isCompleted ? '✓' : (idx + 1)}
                                                            </div>
                                                            <h5 className={`text-sm font-bold ${isCompleted ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-600'}`}>{step.label}</h5>
                                                            <p className="text-xs text-gray-500 mt-1">{step.desc}</p>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        <div className="bg-blue-50 dark:bg-cyan-500/5 rounded-2xl border border-blue-100 dark:border-cyan-500/20 p-6 text-center shadow-sm">
                                            <h3 className="text-sm font-black text-blue-900 dark:text-cyan-400 mb-2">Need 24/7 Support?</h3>
                                            <p className="text-xs text-blue-700 dark:text-cyan-300/80 mb-4">Our enterprise team is ready to assist you with tracking or queries.</p>
                                            <a href="tel:+916281134837" className="inline-block bg-blue-600 dark:bg-cyan-500 text-white dark:text-black px-6 py-3 rounded-full text-xs font-black uppercase tracking-widest hover:scale-105 transition-transform shadow-md">
                                                📞 Call +91 6281134837
                                            </a>
                                        </div>
                                    </div>

                                    {/* RIGHT SIDE: Details & Proof */}
                                    <div className="space-y-6">
                                        <div className="bg-white dark:bg-[#111827] rounded-2xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
                                            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 border-b border-gray-100 dark:border-gray-800 pb-2">Asset Details</h4>
                                            <div className="flex gap-4 items-center">
                                                <div className="w-16 h-16 bg-gray-50 dark:bg-[#050505] rounded-xl overflow-hidden border border-gray-100 dark:border-gray-800 shrink-0">
                                                    {product?.imageUrl ? <img src={getImageUrl(product.imageUrl)} alt="" className="w-full h-full object-cover"/> : <span className="flex items-center justify-center h-full">📦</span>}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-gray-900 dark:text-white text-sm line-clamp-1">{product?.name}</p>
                                                    <p className="text-xs text-gray-500 mt-1">Qty: {order.quantity}</p>
                                                    <p className="text-sm font-black text-blue-600 dark:text-cyan-400 mt-1">₹{(order.price * order.quantity).toLocaleString()}</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* 📸 USER SCREENSHOT VERIFICATION */}
                                        {order.paymentScreenshot && (
                                            <div className="bg-white dark:bg-[#111827] rounded-2xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
                                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 border-b border-gray-100 dark:border-gray-800 pb-2">Your Uploaded Payment Proof</h4>
                                                <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#050505] flex items-center justify-center py-4">
                                                    <img src={order.paymentScreenshot} alt="Payment Proof" className="max-w-full max-h-64 object-contain rounded" />
                                                </div>
                                            </div>
                                        )}

                                        <div className="bg-white dark:bg-[#111827] rounded-2xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
                                            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 border-b border-gray-100 dark:border-gray-800 pb-2">Shipping Destination</h4>
                                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                                                {order.shippingAddress || 'Address not recorded.'}
                                            </p>
                                            <p className="text-xs font-bold text-gray-500 mt-3 flex items-center gap-2">
                                                <span>📱</span> {order.phoneNumber || 'Phone missing'}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* 🚀 CUSTOMER SUPPORT MODAL */}
            {qaModalProduct && (
                <div className="fixed inset-0 z-[200] bg-black/60 dark:bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4 transition-opacity animate-[fadeIn_0.3s_ease-out]">
                    <div className="bg-white dark:bg-[#0a0a0a] border border-gray-200 dark:border-white/10 w-full max-w-2xl rounded-t-[2rem] sm:rounded-[3rem] overflow-hidden shadow-2xl flex flex-col h-[85vh] sm:max-h-[80vh] animate-[slideUp_0.3s_ease-out]">
                        
                        <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-700 rounded-full mx-auto mt-4 mb-2 sm:hidden"></div>

                        <div className="p-4 sm:p-8 border-b border-gray-100 dark:border-white/[0.05] flex justify-between items-center relative overflow-hidden">
                            <div className="relative z-10">
                                <h2 className="text-[10px] sm:text-xs font-black text-blue-600 dark:text-cyan-500 uppercase tracking-widest mb-1">Customer Support</h2>
                                <h3 className="text-lg sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight line-clamp-1">{qaModalProduct.name}</h3>
                            </div>
                            <button onClick={() => setQaModalProduct(null)} className="relative z-10 text-gray-500 hover:text-gray-900 dark:hover:text-white text-lg font-bold bg-gray-100 dark:bg-white/[0.05] w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-colors">✕</button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-4 sm:space-y-6 custom-scrollbar bg-gray-50 dark:bg-transparent">
                            {qaList.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-center opacity-50">
                                    <div className="text-4xl mb-4">💬</div>
                                    <p className="text-xs font-black uppercase tracking-widest text-gray-500">No messages yet. How can we help?</p>
                                </div>
                            ) : (
                                qaList.map(qa => (
                                    <div key={qa.id} className="border-b border-gray-200 dark:border-white/[0.05] pb-4 sm:pb-6 last:border-0 last:pb-0">
                                        <div className="flex gap-3 sm:gap-4 mb-2">
                                            <div className="w-8 h-8 rounded-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 flex items-center justify-center text-xs shadow-sm">👤</div>
                                            <div>
                                                <p className="text-[9px] sm:text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">You</p>
                                                <p className="font-bold text-gray-900 dark:text-white text-xs sm:text-sm leading-relaxed">{qa.question}</p>
                                            </div>
                                        </div>
                                        {qa.answer ? (
                                            <div className="ml-11 sm:ml-12 bg-blue-50 dark:bg-cyan-500/10 border border-blue-100 dark:border-cyan-500/20 p-3 sm:p-4 rounded-xl sm:rounded-2xl">
                                                <p className="text-[9px] sm:text-[10px] font-black text-blue-600 dark:text-cyan-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5"><span className="w-1.5 h-1.5 bg-blue-600 dark:bg-cyan-400 rounded-full"></span> Support Reply</p>
                                                <p className="text-gray-700 dark:text-gray-300 font-medium text-xs sm:text-sm leading-relaxed">{qa.answer}</p>
                                            </div>
                                        ) : (
                                            <p className="ml-11 sm:ml-12 text-[10px] sm:text-xs font-bold text-gray-400 animate-pulse">Our team is reviewing your message...</p>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>

                        <form onSubmit={submitQuestion} className="p-4 sm:p-6 border-t border-gray-200 dark:border-white/[0.05] bg-white dark:bg-[#050505] flex gap-2 sm:gap-4 pb-safe relative z-10 shadow-[0_-10px_20px_rgba(0,0,0,0.05)] dark:shadow-none">
                            <input type="text" required value={newQuestion} onChange={(e) => setNewQuestion(e.target.value)} placeholder="Type your message..." 
                                className="flex-1 p-3 sm:p-4 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#0a0a0a] text-gray-900 dark:text-white outline-none focus:border-blue-500 dark:focus:border-cyan-500 font-medium text-xs sm:text-sm transition-colors"/>
                            <button type="submit" className="bg-blue-600 dark:bg-cyan-500 text-white dark:text-black font-black px-6 sm:px-8 py-3 sm:py-4 rounded-xl active:scale-95 transition-transform shadow-md text-xs sm:text-sm">SEND</button>
                        </form>
                    </div>
                </div>
            )}

            <style dangerouslySetInnerHTML={{__html: `
                @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                .pb-safe { padding-bottom: env(safe-area-inset-bottom, 80px); }
            `}} />
        </div>
    );
}