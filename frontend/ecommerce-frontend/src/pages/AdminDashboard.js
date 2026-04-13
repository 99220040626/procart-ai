import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../services/api';
import toast from 'react-hot-toast';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

import SockJS from 'sockjs-client';
import { Client } from '@stomp/stompjs';

function AdminDashboard() {
    const [orders, setOrders] = useState([]);
    const [products, setProducts] = useState([]);
    const [users, setUsers] = useState([]); 
    const [analytics, setAnalytics] = useState(null);
    const [activeTab, setActiveTab] = useState('analytics'); 
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    const [newProduct, setNewProduct] = useState({ name: '', price: '', stock: '', category: '', searchTags: '', detailedDescription: '' });
    const [selectedImage, setSelectedImage] = useState(null);
    const [galleryFiles, setGalleryFiles] = useState([]); 
    const [selectedModel, setSelectedModel] = useState(null); 

    const [editingProduct, setEditingProduct] = useState(null);
    
    // 🚀 Selected Order State for the X-Ray Modal
    const [selectedOrder, setSelectedOrder] = useState(null);

    const [unansweredQA, setUnansweredQA] = useState([]);
    const [replyText, setReplyText] = useState({});

    const [excelFile, setExcelFile] = useState(null);
    const [isUploadingExcel, setIsUploadingExcel] = useState(false);

    const [audits, setAudits] = useState([]);
    const [liveAlerts, setLiveAlerts] = useState([]);
    const [systemTime, setSystemTime] = useState(new Date());

    const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#14b8a6'];

    const getImageUrl = (url) => {
        if (!url) return '';
        return url.startsWith('http') ? url : `/uploads/${url}`;
    };

    useEffect(() => {
        const timer = setInterval(() => setSystemTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        const role = localStorage.getItem('role');
        if (role !== 'ADMIN') {
            toast.error("Security Lock: Admin Authorization Required.");
            navigate('/');
            return;
        }
        fetchData();

        const socketUrl = window.location.protocol === 'https:' 
            ? `https://${window.location.host}/ws` 
            : 'http://localhost:8080/ws';

        const socket = new SockJS(socketUrl);

        const stompClient = new Client({
            webSocketFactory: () => socket,
            reconnectDelay: 5000,
            onConnect: () => {
                console.log('🟢 [SYS] UPLINK ESTABLISHED WITH COMMAND CENTER');

                stompClient.subscribe('/topic/admin/alerts', (message) => {
                    const alertMsg = message.body;
                    toast.error(alertMsg, { duration: 8000, style: { background: '#580000', color: '#fff', border: '1px solid #ff0000' } });
                    setLiveAlerts(prev => [{ time: new Date().toLocaleTimeString(), msg: alertMsg, type: 'fraud' }, ...prev].slice(0, 8));
                });

                stompClient.subscribe('/topic/admin/sales', (message) => {
                    const saleMsg = message.body;
                    toast.success(saleMsg, { duration: 5000, style: { background: '#002200', color: '#00ff00', border: '1px solid #00ff00' } });
                    setLiveAlerts(prev => [{ time: new Date().toLocaleTimeString(), msg: saleMsg, type: 'sale' }, ...prev].slice(0, 8));
                });
            },
        });

        stompClient.activate();
        return () => stompClient.deactivate();
    }, [navigate]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const productsRes = await API.get('/products');
            setProducts(productsRes.data.sort((a, b) => b.id - a.id));
        } catch (err) { console.error(err); }

        try {
            const ordersRes = await API.get('/orders');
            setOrders(ordersRes.data.sort((a, b) => b.id - a.id));
        } catch (err) { console.warn("Orders offline"); }

        try {
            const usersRes = await API.get('/admin/users');
            setUsers(usersRes.data.sort((a, b) => b.id - a.id));
        } catch (err) { console.warn("Users offline"); }

        try {
            const analyticsRes = await API.get('/analytics/dashboard');
            setAnalytics(analyticsRes.data);
        } catch (err) { console.warn("Analytics offline"); }

        try {
            const qaRes = await API.get('/qa/admin/unanswered');
            setUnansweredQA(qaRes.data);
        } catch (err) { console.warn("Q&A offline"); }

        try {
            const auditRes = await API.get('/products/audit');
            setAudits(auditRes.data);
        } catch (err) { console.warn("Audits offline"); }

        setLoading(false);
    };

    const handleUpdateStatus = async (orderId, newStatus, e) => {
        if(e) e.stopPropagation(); 
        try {
            await API.put(`/orders/${orderId}/status`, { status: newStatus });
            toast.success(`[SYS] Order #${orderId} -> ${newStatus}`);
            fetchData(); 
            // Update selected order in real-time so modal reflects it immediately
            if (selectedOrder && selectedOrder.id === orderId) {
                setSelectedOrder(prev => ({...prev, status: newStatus}));
            }
        } catch (error) { toast.error("Command Failed."); }
    };

    const handleUpdateTracking = async (orderId, e) => {
        if(e) e.stopPropagation();
        const msg = window.prompt("TERMINAL: Input new coordinate data (e.g., 'Arrived at AP Hub'):");
        if (msg) {
            try {
                await API.put(`/orders/${orderId}/tracking`, { message: msg });
                toast.success("[SYS] Coordinate uploaded. 📍");
                fetchData(); 
            } catch (error) { toast.error("Command Failed."); }
        }
    };

    const handleAddProduct = async (e) => {
        e.preventDefault();
        const formData = new FormData();
        formData.append('name', newProduct.name);
        formData.append('price', newProduct.price);
        formData.append('stock', newProduct.stock);
        formData.append('category', newProduct.category);
        formData.append('searchTags', newProduct.searchTags);
        formData.append('detailedDescription', newProduct.detailedDescription);
        
        if (selectedImage) formData.append('image', selectedImage);
        if (selectedModel) formData.append('model', selectedModel); 
        
        if (galleryFiles && galleryFiles.length > 0) {
            for (let i = 0; i < galleryFiles.length; i++) {
                formData.append('gallery', galleryFiles[i]);
            }
        }
        try {
            await API.post('/products', formData, { headers: { 'Content-Type': 'multipart/form-data' }});
            toast.success("[SYS] Asset injected to mainframe. 🛍️");
            setNewProduct({ name: '', price: '', stock: '', category: '', searchTags: '', detailedDescription: '' });
            setSelectedImage(null);
            setSelectedModel(null); 
            setGalleryFiles([]); 
            fetchData(); 
        } catch (error) { toast.error("Injection Failed."); }
    };

    const handleSaveEdit = async (e) => {
        e.preventDefault();
        try {
            await API.put(`/products/${editingProduct.id}`, editingProduct);
            toast.success("[SYS] Asset parameters overwritten. ✏️");
            setEditingProduct(null); 
            fetchData(); 
        } catch (error) { toast.error("Overwrite Failed."); }
    };

    const handleExcelUpload = async (e) => {
        e.preventDefault();
        if (!excelFile) return toast.error("[SYS] Provide datalink (.xlsx).");
        const formData = new FormData();
        formData.append('file', excelFile);
        setIsUploadingExcel(true);
        const toastId = toast.loading("Executing bulk datalink... ⏳");
        try {
            const res = await API.post('/products/bulk-upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
            toast.success(res.data.message || "[SYS] Datalink complete. 🚀", { id: toastId });
            setExcelFile(null);
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.error || "Datalink severed.", { id: toastId });
        } finally {
            setIsUploadingExcel(false);
            document.getElementById('excel-upload-input').value = "";
        }
    };

    const handleDeleteProduct = async (productId) => {
        if (!window.confirm("WARNING: Initiating Soft-Delete protocol. Confirm?")) return;
        try {
            await API.delete(`/products/${productId}`);
            toast.success("[SYS] Asset purged.");
            fetchData();
        } catch (error) { toast.error("Purge Failed."); }
    };

    const handleReplyQA = async (qaId) => {
        try {
            await API.put(`/qa/answer/${qaId}`, { answer: replyText[qaId] });
            toast.success("[SYS] Comms dispatched.");
            fetchData(); 
        } catch (error) { toast.error("Comms Failed."); }
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'SUCCESS': return 'bg-green-500/10 text-green-500 border border-green-500/30';
            case 'SHIPPED': return 'bg-blue-500/10 text-blue-500 border border-blue-500/30';
            case 'DELIVERED': return 'bg-purple-500/10 text-purple-400 border border-purple-500/30';
            case 'PENDING': return 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/30';
            default: return 'bg-gray-800 text-gray-300 border border-gray-600';
        }
    };

    return (
        <div className="min-h-screen bg-slate-100 dark:bg-[#050505] py-8 px-4 sm:px-6 lg:px-8 transition-colors duration-300 font-sans relative">
            
            <div className="max-w-[1400px] mx-auto relative z-10">
                <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 border-b-2 border-gray-200 dark:border-gray-800 pb-4">
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <span className="relative flex h-4 w-4">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-4 w-4 bg-green-500"></span>
                            </span>
                            <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tighter uppercase">Command Center</h1>
                        </div>
                        <p className="text-xs font-mono font-bold text-gray-500 tracking-widest uppercase ml-7">System Status: Nominal | Uplink: Active</p>
                    </div>
                    <div className="mt-4 md:mt-0 text-right">
                        <p className="text-sm font-mono font-black text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-4 py-2 rounded-lg border border-blue-200 dark:border-blue-800">
                            UTC {systemTime.toISOString().split('T')[1].substring(0, 8)} | LOCAL {systemTime.toLocaleTimeString()}
                        </p>
                    </div>
                </div>

                {liveAlerts.length > 0 && (
                    <div className="mb-8 p-1 bg-[#0a0f1c] rounded-xl border border-gray-800 shadow-2xl overflow-hidden">
                        <div className="bg-gradient-to-r from-gray-900 to-gray-800 px-4 py-2 flex items-center justify-between border-b border-gray-800">
                            <span className="text-[10px] font-mono text-gray-400 uppercase tracking-widest">Live Activity Stream / Socket_Active</span>
                            <div className="flex gap-1.5"><div className="w-2 h-2 rounded-full bg-red-500"></div><div className="w-2 h-2 rounded-full bg-yellow-500"></div><div className="w-2 h-2 rounded-full bg-green-500"></div></div>
                        </div>
                        <div className="p-4 h-32 overflow-y-auto custom-scrollbar font-mono text-xs flex flex-col gap-1">
                            {liveAlerts.map((alert, i) => (
                                <div key={i} className={`flex items-start gap-3 ${alert.type === 'fraud' ? 'text-red-400' : 'text-green-400'}`}>
                                    <span className="opacity-50">[{alert.time}]</span>
                                    <span>{alert.type === 'fraud' ? '[SECURITY]' : '[TRANSACTION]'} {alert.msg}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="flex flex-wrap gap-2 bg-white dark:bg-[#0a0a0a] p-2 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 mb-8">
                    {[
                        { id: 'analytics', icon: '📊', label: 'Analytics' },
                        { id: 'orders', icon: '📦', label: 'Ledger' },
                        { id: 'products', icon: '🏷️', label: 'Inventory' },
                        { id: 'users', icon: '👥', label: 'Entities' },
                        { id: 'qa', icon: '💬', label: 'Comms', count: unansweredQA.length },
                        { id: 'audit', icon: '📜', label: 'Sys_Logs' }
                    ].map(tab => (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex-1 min-w-[120px] px-4 py-3 rounded-xl font-bold text-sm tracking-wide transition-all ${activeTab === tab.id ? 'bg-gray-900 dark:bg-blue-600 text-white shadow-lg dark:shadow-blue-900/50' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5'}`}>
                            {tab.icon} {tab.label} {tab.count > 0 && <span className="ml-1 bg-red-500 text-white px-2 py-0.5 rounded-md text-[10px] animate-pulse">{tab.count}</span>}
                        </button>
                    ))}
                </div>

                {loading ? (
                    <div className="text-center py-32 flex flex-col items-center justify-center">
                        <div className="relative w-24 h-24 mb-8">
                            <div className="absolute inset-0 border-4 border-gray-800 rounded-full shadow-[0_0_15px_rgba(59,130,246,0.2)]"></div>
                            <div className="absolute inset-0 border-4 border-blue-500 rounded-full border-t-transparent animate-spin" style={{ animationDuration: '0.8s' }}></div>
                            <div className="absolute inset-3 border-4 border-indigo-500 rounded-full border-b-transparent animate-spin" style={{ animationDuration: '1.2s', animationDirection: 'reverse' }}></div>
                            <div className="absolute inset-0 flex items-center justify-center text-blue-500 font-black text-2xl animate-pulse">P</div>
                        </div>
                        <p className="font-mono text-blue-500 font-black uppercase tracking-[0.3em] text-sm animate-pulse">Synchronizing Mainframe...</p>
                    </div>
                ) : (
                    <div className="bg-white dark:bg-[#0a0a0a] rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden min-h-[500px]">
                        
                        {activeTab === 'analytics' && (
                            analytics ? (
                                <div className="p-6 md:p-8">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                                        <div className="bg-white dark:bg-[#111111] p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm relative overflow-hidden transition-transform hover:-translate-y-1 duration-300">
                                            <div className="absolute top-0 right-0 p-4 opacity-5 text-6xl">💰</div>
                                            <p className="text-gray-500 dark:text-gray-400 font-bold uppercase tracking-widest text-[10px] mb-1">Gross Volume (INR)</p>
                                            <h3 className="text-4xl font-mono font-black text-gray-900 dark:text-green-400 tracking-tighter">₹{analytics.totalRevenue.toLocaleString()}</h3>
                                            <p className="text-green-500 text-xs font-bold mt-2 flex items-center gap-1"><span className="animate-bounce">↑</span> System Live</p>
                                        </div>
                                        <div className="bg-white dark:bg-[#111111] p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm relative overflow-hidden transition-transform hover:-translate-y-1 duration-300">
                                            <div className="absolute top-0 right-0 p-4 opacity-5 text-6xl">📦</div>
                                            <p className="text-gray-500 dark:text-gray-400 font-bold uppercase tracking-widest text-[10px] mb-1">Total Transactions</p>
                                            <h3 className="text-4xl font-mono font-black text-gray-900 dark:text-blue-400 tracking-tighter">{analytics.totalOrders}</h3>
                                            <p className="text-blue-500 text-xs font-bold mt-2">Verified Ledger</p>
                                        </div>
                                        <div className="bg-white dark:bg-[#111111] p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm relative overflow-hidden transition-transform hover:-translate-y-1 duration-300">
                                            <div className="absolute top-0 right-0 p-4 opacity-5 text-6xl">🏷️</div>
                                            <p className="text-gray-500 dark:text-gray-400 font-bold uppercase tracking-widest text-[10px] mb-1">Active Assets</p>
                                            <h3 className="text-4xl font-mono font-black text-gray-900 dark:text-purple-400 tracking-tighter">{analytics.totalProducts}</h3>
                                            <p className="text-purple-500 text-xs font-bold mt-2">Database Synced</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                        <div className="bg-gray-50 dark:bg-[#111111] p-6 rounded-2xl border border-gray-200 dark:border-gray-800">
                                            <div className="flex justify-between items-center mb-6 border-b border-gray-200 dark:border-gray-800 pb-2">
                                                <h3 className="text-gray-900 dark:text-gray-300 font-bold uppercase tracking-widest text-xs">Asset Distribution</h3>
                                            </div>
                                            <div className="h-[300px]">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <PieChart>
                                                        <Pie 
                                                            data={analytics.pieChartData} 
                                                            cx="50%" cy="50%" 
                                                            innerRadius={75} outerRadius={110} 
                                                            paddingAngle={3} 
                                                            dataKey="value" 
                                                            stroke="none"
                                                            isAnimationActive={true}
                                                            animationBegin={0}
                                                            animationDuration={400} 
                                                            animationEasing="ease-in-out"
                                                        >
                                                            {analytics.pieChartData.map((entry, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}
                                                        </Pie>
                                                        <Tooltip contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: '8px', color: '#fff', fontFamily: 'monospace' }} itemStyle={{ color: '#fff' }} />
                                                        <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px', fontFamily: 'monospace', color: '#888', paddingTop: '20px' }}/>
                                                    </PieChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </div>
                                        <div className="bg-gray-50 dark:bg-[#111111] p-6 rounded-2xl border border-gray-200 dark:border-gray-800">
                                            <div className="flex justify-between items-center mb-6 border-b border-gray-200 dark:border-gray-800 pb-2">
                                                <h3 className="text-gray-900 dark:text-gray-300 font-bold uppercase tracking-widest text-xs">Volume by Sector</h3>
                                            </div>
                                            <div className="h-[300px]">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <BarChart data={analytics.pieChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#333" opacity={0.3} />
                                                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#888', fontSize: 9, fontFamily: 'monospace'}} />
                                                        <YAxis axisLine={false} tickLine={false} tick={{fill: '#888', fontSize: 10, fontFamily: 'monospace'}} />
                                                        <Tooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: '8px', color: '#fff', fontFamily: 'monospace' }} />
                                                        <Bar 
                                                            dataKey="value" 
                                                            radius={[6, 6, 0, 0]}
                                                            isAnimationActive={true}
                                                            animationBegin={0}
                                                            animationDuration={400}
                                                            animationEasing="ease-in-out"
                                                        >
                                                            {analytics.pieChartData.map((entry, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}
                                                        </Bar>
                                                    </BarChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (<div className="p-20 text-center font-mono text-gray-500">NO DATA AVAILABLE. SYSTEM WAITING.</div>)
                        )}

                        {activeTab === 'users' && (
                            <div className="overflow-x-auto custom-scrollbar">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-gray-100 dark:bg-[#111] border-b border-gray-200 dark:border-gray-800 text-[10px] uppercase text-gray-500 font-black tracking-widest">
                                            <th className="p-4 pl-6">Entity ID</th><th className="p-4">Designation</th><th className="p-4">Comms Link</th><th className="p-4">Clearance</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800 font-mono text-sm">
                                        {users.map(user => (
                                            <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-[#151515] transition-colors">
                                                <td className="p-4 pl-6 text-gray-900 dark:text-gray-300">#{user.id}</td>
                                                <td className="p-4">
                                                    <div className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                                        {user.name}
                                                        {user.role === 'GUEST' && <span className="text-[9px] bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-400 px-2 py-0.5 rounded tracking-widest border border-gray-600">GHOST</span>}
                                                    </div>
                                                </td>
                                                <td className="p-4 text-gray-500">{user.email}</td>
                                                <td className="p-4">
                                                    <span className={`px-2 py-1 rounded text-[10px] font-black tracking-widest ${
                                                        user.role === 'ADMIN' ? 'bg-red-100 text-red-600 dark:bg-red-500/10 dark:text-red-500' : 
                                                        user.role === 'GUEST' ? 'bg-gray-200 text-gray-600 dark:bg-gray-800 dark:text-gray-400' : 
                                                        'bg-blue-100 text-blue-600 dark:bg-blue-500/10 dark:text-blue-500'
                                                    }`}>
                                                        {user.role}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {activeTab === 'orders' && (
                            <div className="overflow-x-auto custom-scrollbar">
                                {orders.length === 0 ? (
                                    <div className="p-20 text-center font-mono text-gray-500">LEDGER EMPTY.</div>
                                ) : (
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-gray-100 dark:bg-[#111] border-b border-gray-200 dark:border-gray-800 text-[10px] uppercase text-gray-500 font-black tracking-widest">
                                                <th className="p-4 pl-6">TXN ID</th><th className="p-4">Asset</th><th className="p-4">Vol</th><th className="p-4">Vector</th><th className="p-4">Status</th><th className="p-4 text-right pr-6">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                            {orders.map(order => {
                                                const product = products.find(p => p.id === order.productId);
                                                return (
                                                    <tr key={order.id} onClick={() => setSelectedOrder(order)} className="hover:bg-gray-50 dark:hover:bg-[#151515] transition-colors group cursor-pointer">
                                                        <td className="p-4 pl-6 font-mono text-sm text-gray-900 dark:text-gray-300">
                                                            #{order.id}<div className="text-[9px] text-blue-500 mt-1 tracking-widest">USR: {order.userId}</div>
                                                        </td>
                                                        <td className="p-4">
                                                            <div className="flex items-center gap-3">
                                                                <div className="h-10 w-10 rounded border border-gray-200 dark:border-gray-800 overflow-hidden flex-shrink-0 bg-gray-50 dark:bg-[#111]">
                                                                    {product?.imageUrl ? <img src={getImageUrl(product.imageUrl)} alt="" className="h-full w-full object-cover"/> : <span className="text-xs flex items-center justify-center h-full w-full">N/A</span>}
                                                                </div>
                                                                <div>
                                                                    <div className="font-bold text-sm text-gray-900 dark:text-gray-200 line-clamp-1">{product ? product.name : 'Unknown Asset'}</div>
                                                                    <div className="text-[9px] font-mono text-gray-500 mt-0.5">AST_ID: {order.productId}</div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="p-4 font-mono text-sm dark:text-gray-300">{order.quantity}</td>
                                                        <td className="p-4 max-w-[150px]">
                                                            <div className="text-xs font-mono text-gray-600 dark:text-gray-400 truncate">{order.shippingAddress || 'N/A'}</div>
                                                            <div className="text-[10px] font-mono text-blue-500 mt-0.5">{order.phoneNumber || 'N/A'}</div>
                                                        </td>
                                                        <td className="p-4"><span className={`px-2 py-1 rounded font-mono text-[9px] uppercase tracking-widest ${getStatusBadge(order.status)}`}>{order.status}</span></td>
                                                        <td className="p-4 text-right pr-6 space-x-1 opacity-20 group-hover:opacity-100 transition-opacity">
                                                            <button onClick={(e) => handleUpdateStatus(order.id, 'SHIPPED', e)} className="px-2 py-1 bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:text-white hover:bg-blue-600 dark:hover:bg-blue-600 font-mono text-[10px] rounded transition-colors">SHIP</button>
                                                            <button onClick={(e) => handleUpdateStatus(order.id, 'DELIVERED', e)} className="px-2 py-1 bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:text-white hover:bg-purple-600 dark:hover:bg-purple-600 font-mono text-[10px] rounded transition-colors">DLVR</button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        )}

                        {activeTab === 'products' && (
                            <div className="p-6 md:p-8">
                                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
                                    <div className="xl:col-span-2 bg-gray-50 dark:bg-[#111] p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-inner">
                                        <div className="flex items-center gap-2 mb-6 border-b border-gray-200 dark:border-gray-800 pb-3">
                                            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                                            <h3 className="font-bold text-sm uppercase tracking-widest text-gray-900 dark:text-gray-300">Manual Asset Injection</h3>
                                        </div>
                                        <form onSubmit={handleAddProduct} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div><label className="block text-[10px] font-mono text-gray-500 uppercase tracking-widest mb-1">Nomenclature</label><input type="text" required value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} className="w-full p-2.5 rounded text-sm bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white outline-none focus:border-blue-500 font-mono" placeholder="MK-II Laptop" /></div>
                                            <div><label className="block text-[10px] font-mono text-gray-500 uppercase tracking-widest mb-1">Class</label><input type="text" value={newProduct.category} onChange={e => setNewProduct({...newProduct, category: e.target.value})} className="w-full p-2.5 rounded text-sm bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white outline-none focus:border-blue-500 font-mono" placeholder="Electronics" /></div>
                                            <div><label className="block text-[10px] font-mono text-gray-500 uppercase tracking-widest mb-1">Value (INR)</label><input type="number" required value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: e.target.value})} className="w-full p-2.5 rounded text-sm bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white outline-none focus:border-blue-500 font-mono" placeholder="9999" /></div>
                                            <div><label className="block text-[10px] font-mono text-gray-500 uppercase tracking-widest mb-1">Units Available</label><input type="number" required value={newProduct.stock} onChange={e => setNewProduct({...newProduct, stock: e.target.value})} className="w-full p-2.5 rounded text-sm bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white outline-none focus:border-blue-500 font-mono" placeholder="50" /></div>
                                            
                                            <div className="md:col-span-2">
                                                <label className="block text-[10px] font-mono text-gray-500 uppercase tracking-widest mb-1">AI NLP Tags</label>
                                                <input type="text" value={newProduct.searchTags} onChange={e => setNewProduct({...newProduct, searchTags: e.target.value})} className="w-full p-2.5 rounded text-sm bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white outline-none focus:border-purple-500 font-mono" placeholder="tag1, tag2" />
                                            </div>

                                            <div className="md:col-span-2">
                                                <label className="block text-[10px] font-mono text-gray-500 uppercase tracking-widest mb-1">Specification Matrix</label>
                                                <textarea rows="3" value={newProduct.detailedDescription} onChange={e => setNewProduct({...newProduct, detailedDescription: e.target.value})} className="w-full p-2.5 rounded text-sm bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white outline-none focus:border-blue-500 font-mono resize-none"></textarea>
                                            </div>

                                            <div className="md:col-span-2 flex flex-col sm:flex-row gap-4 border-t border-gray-200 dark:border-gray-800 pt-4">
                                                <div className="flex-1">
                                                    <p className="text-[10px] font-mono text-gray-500 mb-1">Alpha Render (Img)</p>
                                                    <input type="file" onChange={e => setSelectedImage(e.target.files[0])} className="w-full text-[10px] font-mono text-gray-500 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:bg-gray-200 dark:file:bg-gray-800 file:text-gray-700 dark:file:text-gray-300" />
                                                </div>
                                                <div className="flex-1">
                                                    <p className="text-[10px] font-mono text-gray-500 mb-1">Beta Renders (Multi)</p>
                                                    <input type="file" multiple onChange={e => setGalleryFiles(e.target.files)} className="w-full text-[10px] font-mono text-gray-500 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:bg-gray-200 dark:file:bg-gray-800 file:text-gray-700 dark:file:text-gray-300" />
                                                </div>
                                                <div className="flex-1">
                                                    <p className="text-[10px] font-mono text-indigo-500 mb-1">AR Matrix (.glb)</p>
                                                    <input type="file" accept=".glb,.gltf" onChange={e => setSelectedModel(e.target.files[0])} className="w-full text-[10px] font-mono text-indigo-500 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:bg-indigo-100 dark:file:bg-indigo-900/30 file:text-indigo-700 dark:file:text-indigo-300" />
                                                </div>
                                            </div>
                                            
                                            <button type="submit" className="md:col-span-2 mt-2 bg-blue-600 text-white font-mono text-xs uppercase tracking-widest font-bold py-3 rounded hover:bg-blue-500 transition-colors">Execute Upload</button>
                                        </form>
                                    </div>
                                    
                                    <div className="bg-gray-900 dark:bg-[#0a0a0a] p-6 rounded-2xl border border-gray-800 flex flex-col justify-between relative overflow-hidden">
                                        <div className="absolute -right-10 -top-10 opacity-5 text-9xl">📊</div>
                                        <div>
                                            <h3 className="font-bold text-sm uppercase tracking-widest text-green-400 mb-2 border-b border-gray-800 pb-2">Bulk Datalink</h3>
                                            <p className="text-[10px] font-mono text-gray-500 mb-4">REQ_FORMAT: Name | Price | Stock | Class | URL</p>
                                        </div>
                                        <form onSubmit={handleExcelUpload}>
                                            <input type="file" id="excel-upload-input" accept=".xlsx, .xls, .csv" onChange={e => setExcelFile(e.target.files[0])} className="w-full mb-4 text-[10px] font-mono text-gray-400 file:mr-2 file:py-1.5 file:px-3 file:rounded file:border-0 file:bg-gray-800 file:text-gray-300 cursor-pointer" />
                                            <button type="submit" disabled={isUploadingExcel} className="w-full bg-green-600 text-white font-mono text-xs uppercase tracking-widest font-bold py-3 rounded hover:bg-green-500 transition-colors disabled:opacity-50">{isUploadingExcel ? 'Processing...' : 'Initialize Transfer'}</button>
                                        </form>
                                    </div>
                                </div>
                                
                                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                    {products.map(product => (
                                        <div key={product.id} className="bg-white dark:bg-[#111] border border-gray-200 dark:border-gray-800 rounded-xl p-3 hover:border-blue-500/50 transition-colors group">
                                            <div className="aspect-square bg-gray-50 dark:bg-[#0a0a0a] rounded-lg mb-3 overflow-hidden flex items-center justify-center relative">
                                                {product.imageUrl ? <img src={getImageUrl(product.imageUrl)} alt={product.name} className="object-cover w-full h-full mix-blend-multiply dark:mix-blend-normal" /> : <span className="text-2xl opacity-20">📦</span>}
                                                {product.modelUrl && <span className="absolute top-1 right-1 bg-indigo-600/90 backdrop-blur text-white text-[8px] font-bold px-1.5 py-0.5 rounded">3D</span>}
                                                <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                                    <button onClick={() => setEditingProduct(product)} className="w-8 h-8 rounded bg-blue-600 text-white text-xs flex items-center justify-center">✎</button>
                                                    <button onClick={() => handleDeleteProduct(product.id)} className="w-8 h-8 rounded bg-red-600 text-white text-xs flex items-center justify-center">✕</button>
                                                </div>
                                            </div>
                                            <div className="font-mono text-[9px] text-gray-400 mb-1 flex justify-between"><span>#{product.id}</span><span>{product.stock} UT</span></div>
                                            <h3 className="font-bold text-xs text-gray-900 dark:text-gray-200 truncate">{product.name}</h3>
                                            <p className="text-blue-600 dark:text-blue-400 font-mono text-sm font-bold mt-1">₹{product.price?.toLocaleString()}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {activeTab === 'qa' && (
                            <div className="p-6 md:p-8">
                                <h2 className="text-sm font-bold uppercase tracking-widest text-gray-900 dark:text-gray-300 mb-6 border-b border-gray-200 dark:border-gray-800 pb-2">Pending Transmissions ({unansweredQA.length})</h2>
                                {unansweredQA.length === 0 ? (
                                    <div className="text-center py-20 font-mono text-gray-500">COMMS CHANNEL CLEAR.</div>
                                ) : (
                                    <div className="grid gap-4">
                                        {unansweredQA.map(qa => {
                                            const product = products.find(p => p.id === qa.productId);
                                            return (
                                                <div key={qa.id} className="bg-gray-50 dark:bg-[#111] p-4 rounded-xl border border-gray-200 dark:border-gray-800 flex flex-col md:flex-row gap-4 items-center">
                                                    <div className="md:w-1/4 w-full">
                                                        <span className="text-[10px] font-mono text-blue-500 uppercase tracking-widest">AST_REF: {qa.productId}</span>
                                                        <h3 className="font-bold text-xs text-gray-900 dark:text-gray-300 line-clamp-1">{product?.name || "Unknown"}</h3>
                                                    </div>
                                                    <div className="flex-1 w-full">
                                                        <div className="bg-white dark:bg-[#0a0a0a] border border-gray-200 dark:border-gray-800 p-3 rounded text-sm text-gray-900 dark:text-gray-200 mb-3 font-mono">
                                                            <span className="text-[10px] text-gray-500 block mb-1">[{qa.customerName || "Entity"}] queries:</span> {qa.question}
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <input type="text" placeholder="Draft transmission..." value={replyText[qa.id] || ''} onChange={(e) => setReplyText({...replyText, [qa.id]: e.target.value})} className="flex-1 p-2 rounded text-sm border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#0a0a0a] text-gray-900 dark:text-white outline-none focus:border-blue-500 font-mono" />
                                                            <button onClick={() => handleReplyQA(qa.id)} className="bg-blue-600 text-white font-mono text-[10px] uppercase font-bold px-4 rounded hover:bg-blue-500 transition">Broadcast</button>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'audit' && (
                            <div className="p-6 md:p-8 bg-[#050505]">
                                <div className="flex justify-between items-center mb-6 border-b border-gray-800 pb-2">
                                    <h2 className="text-sm font-bold uppercase tracking-widest text-green-500">System Logs / Audit Trail</h2>
                                    <span className="text-[10px] font-mono text-gray-500 animate-pulse">REC: ACTIVE</span>
                                </div>
                                {audits.length === 0 ? (
                                    <div className="text-center py-20 font-mono text-gray-500">NO LOGS FOUND.</div>
                                ) : (
                                    <div className="font-mono text-[10px] sm:text-xs">
                                        {audits.map((audit) => (
                                            <div key={audit.id} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 py-2 border-b border-gray-900 hover:bg-[#111] transition-colors px-2">
                                                <span className="text-gray-500 whitespace-nowrap">[{new Date(audit.timestamp).toISOString().replace('T', ' ').substring(0, 19)}]</span>
                                                <span className={`w-16 flex-shrink-0 ${audit.action === 'CREATED' ? 'text-green-500' : audit.action === 'DELETED' ? 'text-red-500' : audit.action === 'UPDATED' ? 'text-blue-500' : 'text-purple-500'}`}>[{audit.action}]</span>
                                                <span className="text-gray-300 flex-1">{audit.details}</span>
                                                {audit.productId !== 0 && <span className="text-gray-600 hidden sm:block">AST:#{audit.productId}</span>}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* 📝 MODIFY ASSET MODAL */}
                {editingProduct && (
                    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-[fadeIn_0.3s_ease-out]">
                        <div className="bg-white dark:bg-[#111] w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl border border-gray-200 dark:border-gray-800 flex flex-col max-h-[90vh] animate-[slideUp_0.3s_ease-out]">
                            <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-[#0a0a0a]">
                                <h2 className="text-sm font-bold uppercase tracking-widest text-gray-900 dark:text-gray-300">Modify Parameters</h2>
                                <button onClick={() => setEditingProduct(null)} className="text-gray-400 hover:text-gray-900 dark:hover:text-white font-mono text-lg">✕</button>
                            </div>
                            
                            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                                <form id="edit-form" onSubmit={handleSaveEdit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="sm:col-span-2">
                                        <label className="block text-[10px] font-mono text-gray-500 uppercase tracking-widest mb-1">Asset ID: {editingProduct.id}</label>
                                        <input type="text" required value={editingProduct.name} onChange={e => setEditingProduct({...editingProduct, name: e.target.value})} className="w-full p-2.5 rounded border border-gray-300 dark:border-gray-800 bg-white dark:bg-[#0a0a0a] text-gray-900 dark:text-white outline-none focus:border-blue-500 font-mono text-sm" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-mono text-gray-500 uppercase tracking-widest mb-1">Value (INR)</label>
                                        <input type="number" required value={editingProduct.price} onChange={e => setEditingProduct({...editingProduct, price: e.target.value})} className="w-full p-2.5 rounded border border-gray-300 dark:border-gray-800 bg-white dark:bg-[#0a0a0a] text-gray-900 dark:text-white outline-none focus:border-blue-500 font-mono text-sm" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-mono text-gray-500 uppercase tracking-widest mb-1">Inventory Count</label>
                                        <input type="number" required value={editingProduct.stock} onChange={e => setEditingProduct({...editingProduct, stock: e.target.value})} className="w-full p-2.5 rounded border border-gray-300 dark:border-gray-800 bg-white dark:bg-[#0a0a0a] text-gray-900 dark:text-white outline-none focus:border-blue-500 font-mono text-sm" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-mono text-gray-500 uppercase tracking-widest mb-1">Class</label>
                                        <input type="text" value={editingProduct.category || ''} onChange={e => setEditingProduct({...editingProduct, category: e.target.value})} className="w-full p-2.5 rounded border border-gray-300 dark:border-gray-800 bg-white dark:bg-[#0a0a0a] text-gray-900 dark:text-white outline-none focus:border-blue-500 font-mono text-sm" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-mono text-gray-500 uppercase tracking-widest mb-1">NLP Tags</label>
                                        <input type="text" value={editingProduct.searchTags || ''} onChange={e => setEditingProduct({...editingProduct, searchTags: e.target.value})} className="w-full p-2.5 rounded border border-gray-300 dark:border-gray-800 bg-white dark:bg-[#0a0a0a] text-gray-900 dark:text-white outline-none focus:border-blue-500 font-mono text-sm" />
                                    </div>
                                    <div className="sm:col-span-2">
                                        <label className="block text-[10px] font-mono text-gray-500 uppercase tracking-widest mb-1">Matrix Description</label>
                                        <textarea rows="4" value={editingProduct.detailedDescription || ''} onChange={e => setEditingProduct({...editingProduct, detailedDescription: e.target.value})} className="w-full p-2.5 rounded border border-gray-300 dark:border-gray-800 bg-white dark:bg-[#0a0a0a] text-gray-900 dark:text-white outline-none focus:border-blue-500 font-mono text-sm resize-none"></textarea>
                                    </div>
                                </form>
                            </div>
                            
                            <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#0a0a0a] flex justify-end gap-2">
                                <button onClick={() => setEditingProduct(null)} className="px-4 py-2 rounded text-xs font-mono font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-[#111] transition-colors">ABORT</button>
                                <button form="edit-form" type="submit" className="px-6 py-2 rounded text-xs font-mono font-bold bg-blue-600 hover:bg-blue-500 text-white transition-colors">OVERWRITE</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* 🚀 LAPTOP-READY X-RAY TRANSACTION MODAL */}
                {selectedOrder && (() => {
                    const currentOrder = orders.find(o => o.id === selectedOrder.id) || selectedOrder;
                    const product = products.find(p => p.id === currentOrder.productId);
                    const buyer = users.find(u => u.id === currentOrder.userId);
                    const orderTime = currentOrder.orderDate ? new Date(currentOrder.orderDate).toLocaleString('en-IN') : 'Unknown Time';
                    
                    return (
                        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-[fadeIn_0.3s_ease-out]">
                            {/* 🚀 Changed to max-w-6xl for laptop view */}
                            <div className="bg-white dark:bg-[#111] w-full max-w-6xl rounded-2xl overflow-hidden shadow-2xl border border-gray-200 dark:border-gray-800 flex flex-col max-h-[90vh] animate-[slideUp_0.3s_ease-out]">
                                
                                <div className="p-4 md:p-6 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-[#0a0a0a]">
                                    <div>
                                        <h2 className="text-lg font-black uppercase tracking-widest text-gray-900 dark:text-white">Transaction Detail</h2>
                                        <p className="text-xs font-mono text-gray-500 mt-1">TXN_ID: #{currentOrder.id} <span className="mx-2">|</span> UPLINK: SECURE</p>
                                    </div>
                                    <button onClick={() => setSelectedOrder(null)} className="text-gray-400 hover:text-gray-900 dark:hover:text-white font-mono text-2xl font-bold transition-colors">✕</button>
                                </div>

                                <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar bg-gray-50 dark:bg-[#050505]">
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
                                        
                                        {/* Left Column: Product & Screenshot Viewer */}
                                        <div className="space-y-6">
                                            <div className="bg-white dark:bg-[#0a0a0a] p-5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
                                                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 mb-4 border-b border-gray-100 dark:border-gray-800 pb-2">Asset Intelligence</h3>
                                                <div className="flex gap-4">
                                                    <div className="w-20 h-20 rounded-xl bg-gray-100 dark:bg-[#111] overflow-hidden border border-gray-200 dark:border-gray-800 shrink-0">
                                                        {product?.imageUrl ? <img src={getImageUrl(product.imageUrl)} alt="" className="w-full h-full object-cover"/> : <span className="flex items-center justify-center h-full text-2xl">📦</span>}
                                                    </div>
                                                    <div className="flex-1">
                                                        <h4 className="font-bold text-gray-900 dark:text-gray-200 line-clamp-2">{product ? product.name : 'Unknown Asset'}</h4>
                                                        <div className="text-[10px] font-mono text-blue-500 mt-1 mb-2">AST_ID: {currentOrder.productId}</div>
                                                        <div className="flex justify-between items-center bg-gray-50 dark:bg-[#111] px-2 py-1 rounded">
                                                            <span className="text-xs text-gray-500 font-mono">QTY: {currentOrder.quantity}</span>
                                                            <span className="font-black text-blue-600 dark:text-cyan-400 font-mono">₹{(currentOrder.price * currentOrder.quantity).toLocaleString()}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* 🚀 SCREENSHOT VIEWER */}
                                            {(currentOrder.status === 'PENDING' || currentOrder.paymentScreenshot) && (
                                                <div className="bg-white dark:bg-[#0a0a0a] p-5 rounded-2xl border border-yellow-500/50 shadow-sm relative overflow-hidden">
                                                    <div className="absolute top-0 left-0 w-full h-1 bg-yellow-500 animate-pulse"></div>
                                                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-yellow-600 mb-4 pb-2">Manual Payment Verification Matrix</h3>
                                                    <div className="flex items-center justify-center bg-gray-100 dark:bg-[#111] rounded-xl overflow-hidden border border-dashed border-gray-300 dark:border-gray-700 min-h-[250px]">
                                                        {currentOrder.paymentScreenshot ? (
                                                            <a href={currentOrder.paymentScreenshot} target="_blank" rel="noreferrer" className="w-full h-full flex items-center justify-center">
                                                                <img src={currentOrder.paymentScreenshot} alt="UPI Proof" className="w-full h-auto object-contain max-h-96" />
                                                            </a>
                                                        ) : (
                                                            <p className="text-xs font-mono text-gray-500 px-4 text-center py-10">No screenshot attached.<br/>Verify banking logs manually.</p>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Right Column: User & Vector Info & Logistics */}
                                        <div className="space-y-6">
                                            
                                            <div className="bg-white dark:bg-[#0a0a0a] p-5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
                                                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 mb-4 border-b border-gray-100 dark:border-gray-800 pb-2">Logistics Status</h3>
                                                <div className="flex flex-col gap-3">
                                                    <div className="flex justify-between items-center">
                                                        <span className={`px-4 py-2 rounded font-mono text-[10px] uppercase tracking-widest ${getStatusBadge(currentOrder.status)}`}>{currentOrder.status}</span>
                                                        <span className="text-[10px] font-mono text-gray-500">Booked: {orderTime}</span>
                                                    </div>
                                                    {currentOrder.status === 'SHIPPED' && <span className="text-[10px] font-mono text-blue-500 animate-pulse">IN TRANSIT...</span>}
                                                    {currentOrder.status === 'PENDING' && <span className="text-[10px] font-mono text-yellow-500 animate-pulse">WAITING MANUAL APPROVAL...</span>}
                                                </div>
                                            </div>

                                            <div className="bg-white dark:bg-[#0a0a0a] p-5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
                                                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 mb-4 border-b border-gray-100 dark:border-gray-800 pb-2">Entity Data</h3>
                                                <div className="space-y-3">
                                                    <div>
                                                        <span className="text-[9px] font-mono text-gray-500 uppercase block">Identity</span>
                                                        <span className="font-bold text-sm text-gray-900 dark:text-gray-200">{buyer?.name || 'Unknown User'} (USR: {currentOrder.userId})</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-[9px] font-mono text-gray-500 uppercase block">Comms Link</span>
                                                        <span className="font-bold text-sm text-gray-900 dark:text-gray-200">{buyer?.email || 'N/A'}</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-[9px] font-mono text-gray-500 uppercase block">Direct Line</span>
                                                        <span className="font-mono text-sm text-blue-600 dark:text-blue-400">{currentOrder.phoneNumber || 'N/A'}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="bg-white dark:bg-[#0a0a0a] p-5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
                                                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 mb-4 border-b border-gray-100 dark:border-gray-800 pb-2">Delivery Vector</h3>
                                                <p className="font-mono text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                                                    {currentOrder.shippingAddress || 'Coordinates not provided.'}
                                                </p>
                                            </div>
                                        </div>

                                    </div>
                                </div>
                                
                                <div className="p-4 md:p-6 border-t border-gray-200 dark:border-gray-800 bg-gray-100 dark:bg-[#0a0a0a] flex flex-wrap justify-end gap-3">
                                    <button onClick={() => handleUpdateTracking(currentOrder.id)} className="px-4 py-2 bg-indigo-600/10 border border-indigo-500/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-600 hover:text-white rounded text-[10px] font-mono font-bold uppercase tracking-widest transition-colors">
                                        Update Vector
                                    </button>
                                    
                                    {/* 🚀 APPROVE BUTTON */}
                                    <button onClick={() => handleUpdateStatus(currentOrder.id, 'SUCCESS')} className="px-6 py-2 bg-green-600 text-white hover:bg-green-500 rounded text-xs font-mono font-black uppercase tracking-widest transition-colors shadow-lg shadow-green-600/20">
                                        Verify & Approve
                                    </button>
                                    
                                    <button onClick={() => handleUpdateStatus(currentOrder.id, 'SHIPPED')} className="px-4 py-2 bg-blue-600/10 border border-blue-500/30 text-blue-600 dark:text-blue-400 hover:bg-blue-600 hover:text-white rounded text-[10px] font-mono font-bold uppercase tracking-widest transition-colors">
                                        Mark Shipped
                                    </button>
                                    <button onClick={() => handleUpdateStatus(currentOrder.id, 'DELIVERED')} className="px-4 py-2 bg-purple-600/10 border border-purple-500/30 text-purple-600 dark:text-purple-400 hover:bg-purple-600 hover:text-white rounded text-[10px] font-mono font-bold uppercase tracking-widest transition-colors">
                                        Mark Delivered
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })()}

            </div>

            <style dangerouslySetInnerHTML={{__html: `
                @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
            `}} />
        </div>
    );
}

export default AdminDashboard;