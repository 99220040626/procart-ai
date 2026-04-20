import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../services/api';
import toast from 'react-hot-toast';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import SockJS from 'sockjs-client';
import { Client } from '@stomp/stompjs';

// 🚀 PERFORMANCE FIX: Extracted Clock to prevent global dashboard re-renders every second
const SystemClock = () => {
    const [time, setTime] = useState(new Date());
    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);
    return (
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800/50 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 shadow-sm">
            {time.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} • {time.toLocaleTimeString()}
        </p>
    );
};

function AdminDashboard() {
    const [orders, setOrders] = useState([]);
    const [products, setProducts] = useState([]);
    const [users, setUsers] = useState([]); 
    const [analytics, setAnalytics] = useState(null);
    const [activeTab, setActiveTab] = useState('analytics'); 
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    // Form States
    const [newProduct, setNewProduct] = useState({ name: '', price: '', stock: '', category: '', searchTags: '', detailedDescription: '' });
    const [selectedImage, setSelectedImage] = useState(null);
    const [galleryFiles, setGalleryFiles] = useState([]); 
    const [selectedModel, setSelectedModel] = useState(null); 
    const [editingProduct, setEditingProduct] = useState(null);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [unansweredQA, setUnansweredQA] = useState([]);
    const [replyText, setReplyText] = useState({});
    const [excelFile, setExcelFile] = useState(null);
    const [isUploadingExcel, setIsUploadingExcel] = useState(false);
    const [audits, setAudits] = useState([]);
    const [liveAlerts, setLiveAlerts] = useState([]);

    const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#14b8a6'];

    const getImageUrl = (url) => {
        if (!url) return '';
        return url.startsWith('http') ? url : `/uploads/${url}`;
    };

    useEffect(() => {
        const role = localStorage.getItem('role');
        if (role !== 'ADMIN') {
            toast.error("Unauthorized access. Admin privileges required.");
            navigate('/');
            return;
        }
        fetchData();

        const socketUrl = window.location.protocol === 'https:' 
            ? `https://${window.location.host}/ws` 
            : 'https://procart-ai.onrender.com/ws';

        const socket = new SockJS(socketUrl);
        const stompClient = new Client({
            webSocketFactory: () => socket,
            reconnectDelay: 5000,
            onConnect: () => {
                stompClient.subscribe('/topic/admin/alerts', (message) => {
                    const alertMsg = message.body;
                    toast.error(alertMsg, { icon: '🚨' });
                    setLiveAlerts(prev => [{ time: new Date().toLocaleTimeString(), msg: alertMsg, type: 'fraud' }, ...prev].slice(0, 8));
                });
                stompClient.subscribe('/topic/admin/sales', (message) => {
                    const saleMsg = message.body;
                    toast.success(saleMsg, { icon: '💰' });
                    setLiveAlerts(prev => [{ time: new Date().toLocaleTimeString(), msg: saleMsg, type: 'sale' }, ...prev].slice(0, 8));
                });
            },
        });

        stompClient.activate();
        return () => stompClient.deactivate();
    }, [navigate]);

    // 🚀 PERFORMANCE FIX: Concurrent fetching drastically reduces load time
    const fetchData = async () => {
        setLoading(true);
        try {
            const [productsRes, ordersRes, usersRes, analyticsRes, qaRes, auditRes] = await Promise.allSettled([
                API.get('/products'),
                API.get('/orders'),
                API.get('/admin/users'),
                API.get('/analytics/dashboard'),
                API.get('/qa/admin/unanswered'),
                API.get('/products/audit')
            ]);

            if (productsRes.status === 'fulfilled') setProducts(productsRes.value.data.sort((a, b) => b.id - a.id));
            if (ordersRes.status === 'fulfilled') setOrders(ordersRes.value.data.sort((a, b) => b.id - a.id));
            if (usersRes.status === 'fulfilled') setUsers(usersRes.value.data.sort((a, b) => b.id - a.id));
            if (analyticsRes.status === 'fulfilled') setAnalytics(analyticsRes.value.data);
            if (qaRes.status === 'fulfilled') setUnansweredQA(qaRes.value.data);
            if (auditRes.status === 'fulfilled') setAudits(auditRes.value.data);
            
        } catch (error) {
            toast.error("Failed to sync some dashboard modules.");
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateStatus = async (orderId, newStatus, e) => {
        if(e) e.stopPropagation(); 
        try {
            await API.put(`/orders/${orderId}/status`, { status: newStatus });
            toast.success(`Order #${orderId} updated to ${newStatus}`);
            fetchData(); 
            if (selectedOrder && selectedOrder.id === orderId) {
                setSelectedOrder(prev => ({...prev, status: newStatus}));
            }
        } catch (error) { toast.error("Failed to update status."); }
    };

    const handleUpdateTracking = async (orderId, e) => {
        if(e) e.stopPropagation();
        const msg = window.prompt("Enter new tracking update (e.g., 'Arrived at hub'):");
        if (msg) {
            try {
                await API.put(`/orders/${orderId}/tracking`, { message: msg });
                toast.success("Tracking updated.");
                fetchData(); 
            } catch (error) { toast.error("Failed to update tracking."); }
        }
    };

    const handleAddProduct = async (e) => {
        e.preventDefault();
        const formData = new FormData();
        Object.keys(newProduct).forEach(key => formData.append(key, newProduct[key]));
        
        if (selectedImage) formData.append('image', selectedImage);
        if (selectedModel) formData.append('model', selectedModel); 
        
        if (galleryFiles && galleryFiles.length > 0) {
            Array.from(galleryFiles).forEach(file => formData.append('gallery', file));
        }

        try {
            await API.post('/products', formData, { headers: { 'Content-Type': 'multipart/form-data' }});
            toast.success("Product added successfully.");
            setNewProduct({ name: '', price: '', stock: '', category: '', searchTags: '', detailedDescription: '' });
            setSelectedImage(null); setSelectedModel(null); setGalleryFiles([]); 
            fetchData(); 
        } catch (error) { toast.error("Failed to add product."); }
    };

    const handleSaveEdit = async (e) => {
        e.preventDefault();
        try {
            await API.put(`/products/${editingProduct.id}`, editingProduct);
            toast.success("Product updated successfully.");
            setEditingProduct(null); 
            fetchData(); 
        } catch (error) { toast.error("Failed to update product."); }
    };

    const handleExcelUpload = async (e) => {
        e.preventDefault();
        if (!excelFile) return toast.error("Please provide an Excel file.");
        const formData = new FormData();
        formData.append('file', excelFile);
        setIsUploadingExcel(true);
        const toastId = toast.loading("Processing bulk upload...");
        try {
            const res = await API.post('/products/bulk-upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
            toast.success(res.data.message || "Bulk upload complete.", { id: toastId });
            setExcelFile(null);
            document.getElementById('excel-upload-input').value = "";
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.error || "Bulk upload failed.", { id: toastId });
        } finally {
            setIsUploadingExcel(false);
        }
    };

    const handleDeleteProduct = async (productId) => {
        if (!window.confirm("Are you sure you want to delete this product?")) return;
        try {
            await API.delete(`/products/${productId}`);
            toast.success("Product removed.");
            fetchData();
        } catch (error) { toast.error("Failed to remove product."); }
    };

    const handleReplyQA = async (qaId) => {
        if (!replyText[qaId]) return toast.error("Please enter a reply.");
        try {
            await API.put(`/qa/answer/${qaId}`, { answer: replyText[qaId] });
            toast.success("Reply sent.");
            setReplyText(prev => { const next = {...prev}; delete next[qaId]; return next; });
            fetchData(); 
        } catch (error) { toast.error("Failed to send reply."); }
    };

    const getStatusBadge = (status) => {
        const styles = {
            SUCCESS: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400',
            SHIPPED: 'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400',
            DELIVERED: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400',
            PENDING: 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',
        };
        return styles[status] || 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400';
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#0a0a0a] text-slate-900 dark:text-slate-100 py-8 px-4 sm:px-6 lg:px-8 font-sans transition-colors duration-300">
            <div className="max-w-[1400px] mx-auto">
                
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">PortCart AI Overview</h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage operations, products, and analytics centrally.</p>
                    </div>
                    <SystemClock />
                </div>

                {/* Live Alerts - Premium subtle styling */}
                {liveAlerts.length > 0 && (
                    <div className="mb-8 bg-white dark:bg-[#111] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                        <div className="px-4 py-3 bg-slate-50 dark:bg-[#151515] border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 tracking-wide uppercase">Live Activity Stream</span>
                            <span className="flex h-2 w-2 relative">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </span>
                        </div>
                        <div className="p-2 h-28 overflow-y-auto custom-scrollbar flex flex-col gap-1">
                            {liveAlerts.map((alert, i) => (
                                <div key={i} className="flex items-center gap-3 px-3 py-1.5 rounded-lg text-sm transition hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                    <span className="text-xs text-slate-400 font-medium">{alert.time}</span>
                                    <span className={alert.type === 'fraud' ? 'text-red-600 dark:text-red-400' : 'text-slate-700 dark:text-slate-300'}>
                                        {alert.msg}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Segmented Control Tabs (Apple/Stripe Style) */}
                <div className="flex overflow-x-auto custom-scrollbar bg-slate-200/50 dark:bg-slate-800/50 p-1.5 rounded-xl mb-8 border border-slate-200 dark:border-slate-700 w-fit max-w-full">
                    {[
                        { id: 'analytics', label: 'Analytics' },
                        { id: 'orders', label: 'Transactions' },
                        { id: 'products', label: 'Products' },
                        { id: 'users', label: 'Customers' },
                        { id: 'qa', label: 'Q&A', count: unansweredQA.length },
                        { id: 'audit', label: 'Audit Logs' }
                    ].map(tab => (
                        <button 
                            key={tab.id} 
                            onClick={() => setActiveTab(tab.id)} 
                            className={`relative px-5 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-all duration-200 ${
                                activeTab === tab.id 
                                ? 'bg-white dark:bg-[#1a1a1a] text-indigo-600 dark:text-indigo-400 shadow-sm ring-1 ring-slate-900/5 dark:ring-white/10' 
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700/50'
                            }`}
                        >
                            {tab.label}
                            {tab.count > 0 && (
                                <span className="ml-2 inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400 text-xs font-bold">
                                    {tab.count}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* Main Content Area */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-32">
                        <div className="w-8 h-8 border-4 border-indigo-200 dark:border-indigo-900 border-t-indigo-600 dark:border-t-indigo-400 rounded-full animate-spin mb-4"></div>
                        <p className="text-sm font-medium text-slate-500">Syncing workspace...</p>
                    </div>
                ) : (
                    <div className="bg-white dark:bg-[#111] rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden min-h-[500px] transition-all">
                        
                        {activeTab === 'analytics' && analytics && (
                            <div className="p-6 lg:p-8">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                                    {/* Metric Cards */}
                                    {[
                                        { label: 'Gross Volume', value: `₹${analytics.totalRevenue.toLocaleString()}`, trend: '+12% this month', color: 'text-indigo-600 dark:text-indigo-400' },
                                        { label: 'Total Orders', value: analytics.totalOrders, trend: 'Verified', color: 'text-emerald-600 dark:text-emerald-400' },
                                        { label: 'Active Products', value: analytics.totalProducts, trend: 'Synced', color: 'text-blue-600 dark:text-blue-400' }
                                    ].map((stat, idx) => (
                                        <div key={idx} className="bg-slate-50 dark:bg-[#151515] p-6 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col justify-center transition hover:shadow-md">
                                            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">{stat.label}</p>
                                            <h3 className={`text-3xl font-bold tracking-tight ${stat.color}`}>{stat.value}</h3>
                                            <p className="text-xs font-medium text-slate-400 mt-2">{stat.trend}</p>
                                        </div>
                                    ))}
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                    {/* Charts Makeover: Cleaner UI, removed harsh grids */}
                                    <div className="bg-slate-50 dark:bg-[#151515] p-6 rounded-xl border border-slate-200 dark:border-slate-800">
                                        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-6">Sales Distribution</h3>
                                        <div className="h-[300px]">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Pie data={analytics.pieChartData} cx="50%" cy="50%" innerRadius={80} outerRadius={110} paddingAngle={4} dataKey="value" stroke="none">
                                                        {analytics.pieChartData.map((entry, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}
                                                    </Pie>
                                                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                                    <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }}/>
                                                </PieChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>
                                    
                                    <div className="bg-slate-50 dark:bg-[#151515] p-6 rounded-xl border border-slate-200 dark:border-slate-800">
                                        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-6">Category Volume</h3>
                                        <div className="h-[300px]">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={analytics.pieChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#888" opacity={0.1} />
                                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#888', fontSize: 12}} dy={10} />
                                                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#888', fontSize: 12}} />
                                                    <Tooltip cursor={{fill: 'rgba(0,0,0,0.05)'}} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                                    <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                                                        {analytics.pieChartData.map((entry, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}
                                                    </Bar>
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'users' && (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50 dark:bg-[#151515] border-b border-slate-200 dark:border-slate-800 text-xs text-slate-500 font-medium">
                                            <th className="p-4 pl-6 font-medium">User ID</th>
                                            <th className="p-4 font-medium">Customer Details</th>
                                            <th className="p-4 font-medium">Email Address</th>
                                            <th className="p-4 font-medium">Role</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50 text-sm">
                                        {users.map(user => (
                                            <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-[#1a1a1a] transition-colors">
                                                <td className="p-4 pl-6 text-slate-500 font-mono text-xs">{user.id}</td>
                                                <td className="p-4 font-medium text-slate-900 dark:text-slate-100">{user.name}</td>
                                                <td className="p-4 text-slate-500">{user.email}</td>
                                                <td className="p-4">
                                                    <span className={`inline-flex px-2.5 py-1 rounded-md text-xs font-medium ${
                                                        user.role === 'ADMIN' ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400' : 
                                                        'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
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
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50 dark:bg-[#151515] border-b border-slate-200 dark:border-slate-800 text-xs text-slate-500">
                                            <th className="p-4 pl-6 font-medium">Txn ID</th>
                                            <th className="p-4 font-medium">Product</th>
                                            <th className="p-4 font-medium">Amount</th>
                                            <th className="p-4 font-medium">Customer Info</th>
                                            <th className="p-4 font-medium">Status</th>
                                            <th className="p-4 text-right pr-6 font-medium">Quick Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                                        {orders.map(order => {
                                            const product = products.find(p => p.id === order.productId);
                                            return (
                                                <tr key={order.id} onClick={() => setSelectedOrder(order)} className="hover:bg-slate-50 dark:hover:bg-[#1a1a1a] transition-colors group cursor-pointer text-sm">
                                                    <td className="p-4 pl-6 font-mono text-slate-500 text-xs">
                                                        #{order.id}
                                                    </td>
                                                    <td className="p-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="h-10 w-10 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0">
                                                                {product?.imageUrl ? <img src={getImageUrl(product.imageUrl)} alt={product.name} className="h-full w-full object-cover"/> : <div className="h-full w-full flex items-center justify-center text-slate-400 text-xs">N/A</div>}
                                                            </div>
                                                            <div>
                                                                <div className="font-medium text-slate-900 dark:text-slate-100 line-clamp-1">{product?.name || 'Deleted Product'}</div>
                                                                <div className="text-xs text-slate-500 mt-0.5">Qty: {order.quantity}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="p-4 font-medium text-slate-900 dark:text-slate-100">
                                                        ₹{(order.price * order.quantity).toLocaleString()}
                                                    </td>
                                                    <td className="p-4">
                                                        <div className="text-slate-900 dark:text-slate-200 line-clamp-1">{order.shippingAddress?.split(',')[0] || 'No Address'}</div>
                                                        <div className="text-xs text-slate-500 mt-0.5">{order.phoneNumber || 'No Phone'}</div>
                                                    </td>
                                                    <td className="p-4">
                                                        <span className={`inline-flex px-2.5 py-1 rounded-md text-xs font-medium ${getStatusBadge(order.status)}`}>
                                                            {order.status}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 text-right pr-6 space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button onClick={(e) => handleUpdateStatus(order.id, 'SHIPPED', e)} className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-md text-xs font-medium transition-colors shadow-sm">Ship</button>
                                                        <button onClick={(e) => handleUpdateStatus(order.id, 'DELIVERED', e)} className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 rounded-md text-xs font-medium transition-colors">Complete</button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {activeTab === 'products' && (
                            <div className="p-6 lg:p-8">
                                {/* Product Upload & Bulk Upload forms with Premium Inputs */}
                                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 mb-10">
                                    <div className="xl:col-span-2 bg-slate-50 dark:bg-[#151515] p-6 rounded-2xl border border-slate-200 dark:border-slate-800">
                                        <h3 className="font-semibold text-slate-900 dark:text-white mb-6">Add New Product</h3>
                                        <form onSubmit={handleAddProduct} className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                            {/* Clean standard inputs */}
                                            <div>
                                                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">Product Name</label>
                                                <input type="text" required value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#1a1a1a] text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-sm" placeholder="e.g. AirPods Pro" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">Category</label>
                                                <input type="text" value={newProduct.category} onChange={e => setNewProduct({...newProduct, category: e.target.value})} className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#1a1a1a] text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-sm" placeholder="e.g. Electronics" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">Price (₹)</label>
                                                <input type="number" required value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: e.target.value})} className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#1a1a1a] text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-sm" placeholder="999" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">Initial Stock</label>
                                                <input type="number" required value={newProduct.stock} onChange={e => setNewProduct({...newProduct, stock: e.target.value})} className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#1a1a1a] text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-sm" placeholder="50" />
                                            </div>
                                            
                                            <div className="md:col-span-2">
                                                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">Detailed Description</label>
                                                <textarea rows="3" value={newProduct.detailedDescription} onChange={e => setNewProduct({...newProduct, detailedDescription: e.target.value})} className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#1a1a1a] text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-sm resize-none" placeholder="Product features and specifications..."></textarea>
                                            </div>

                                            <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                                                {/* File inputs styled elegantly */}
                                                <div>
                                                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">Primary Image</label>
                                                    <input type="file" accept="image/*" onChange={e => setSelectedImage(e.target.files[0])} className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-slate-100 dark:file:bg-slate-800 file:text-slate-700 dark:file:text-slate-300 hover:file:bg-slate-200 dark:hover:file:bg-slate-700 transition" />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">Gallery Images</label>
                                                    <input type="file" multiple accept="image/*" onChange={e => setGalleryFiles(e.target.files)} className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-slate-100 dark:file:bg-slate-800 file:text-slate-700 dark:file:text-slate-300 hover:file:bg-slate-200 transition" />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-indigo-600 dark:text-indigo-400 mb-1.5">3D Model (.glb)</label>
                                                    <input type="file" accept=".glb,.gltf" onChange={e => setSelectedModel(e.target.files[0])} className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-indigo-50 dark:file:bg-indigo-900/20 file:text-indigo-700 dark:file:text-indigo-300 hover:file:bg-indigo-100 transition" />
                                                </div>
                                            </div>
                                            
                                            <button type="submit" className="md:col-span-2 mt-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 px-4 rounded-lg transition shadow-sm text-sm">Create Product</button>
                                        </form>
                                    </div>
                                    
                                    {/* Bulk Upload Card */}
                                    <div className="bg-indigo-50 dark:bg-indigo-900/10 p-6 rounded-2xl border border-indigo-100 dark:border-indigo-500/20 flex flex-col justify-between">
                                        <div>
                                            <h3 className="font-semibold text-indigo-900 dark:text-indigo-300 mb-2">Bulk Import</h3>
                                            <p className="text-sm text-indigo-700/70 dark:text-indigo-400/70 mb-6">Upload an Excel/CSV file to create multiple products at once.</p>
                                        </div>
                                        <form onSubmit={handleExcelUpload} className="bg-white dark:bg-[#1a1a1a] p-4 rounded-xl border border-indigo-100 dark:border-slate-800">
                                            <input type="file" id="excel-upload-input" accept=".xlsx, .xls, .csv" onChange={e => setExcelFile(e.target.files[0])} className="w-full mb-4 text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-slate-100 dark:file:bg-slate-800 file:text-slate-700 cursor-pointer transition" />
                                            <button type="submit" disabled={isUploadingExcel} className="w-full bg-indigo-600 text-white font-medium py-2.5 rounded-lg hover:bg-indigo-700 transition shadow-sm text-sm disabled:opacity-50 disabled:cursor-not-allowed">
                                                {isUploadingExcel ? 'Importing...' : 'Upload Data'}
                                            </button>
                                        </form>
                                    </div>
                                </div>
                                
                                {/* Product Grid */}
                                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                                    {products.map(product => (
                                        <div key={product.id} className="group relative flex flex-col bg-white dark:bg-[#151515] rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden hover:shadow-md transition duration-200">
                                            <div className="aspect-square bg-slate-100 dark:bg-[#1a1a1a] relative flex items-center justify-center p-4">
                                                {product.imageUrl ? <img src={getImageUrl(product.imageUrl)} alt={product.name} className="w-full h-full object-contain mix-blend-multiply dark:mix-blend-normal" /> : <span className="text-slate-300">No Image</span>}
                                                {product.modelUrl && <span className="absolute top-2 right-2 bg-white/90 dark:bg-black/90 backdrop-blur shadow-sm text-indigo-600 dark:text-indigo-400 text-[10px] font-bold px-2 py-1 rounded-md">3D</span>}
                                                
                                                {/* Hover Overlay Actions */}
                                                <div className="absolute inset-0 bg-black/40 dark:bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 backdrop-blur-[2px]">
                                                    <button onClick={() => setEditingProduct(product)} className="p-2 bg-white text-slate-900 rounded-full hover:scale-110 transition-transform shadow-lg" aria-label="Edit">
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                                                    </button>
                                                    <button onClick={() => handleDeleteProduct(product.id)} className="p-2 bg-red-500 text-white rounded-full hover:scale-110 transition-transform shadow-lg" aria-label="Delete">
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="p-4 flex flex-col flex-grow">
                                                <div className="flex justify-between items-start mb-1">
                                                    <h3 className="font-medium text-sm text-slate-900 dark:text-slate-100 line-clamp-2">{product.name}</h3>
                                                </div>
                                                <div className="mt-auto pt-3 flex items-center justify-between">
                                                    <span className="font-semibold text-slate-900 dark:text-white text-sm">₹{product.price?.toLocaleString()}</span>
                                                    <span className="text-xs text-slate-500 font-medium bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">{product.stock} in stock</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {activeTab === 'qa' && (
                            <div className="p-6 lg:p-8 max-w-4xl mx-auto">
                                <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">Customer Questions ({unansweredQA.length})</h2>
                                {unansweredQA.length === 0 ? (
                                    <div className="text-center py-20 text-slate-500">All questions answered! 🎉</div>
                                ) : (
                                    <div className="space-y-4">
                                        {unansweredQA.map(qa => {
                                            const product = products.find(p => p.id === qa.productId);
                                            return (
                                                <div key={qa.id} className="bg-slate-50 dark:bg-[#151515] p-5 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row gap-6">
                                                    <div className="sm:w-1/3">
                                                        <span className="inline-flex text-xs font-medium bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 px-2 py-0.5 rounded mb-2">Product Request</span>
                                                        <h3 className="font-medium text-sm text-slate-900 dark:text-slate-200 mb-1">{product?.name || "Unknown Product"}</h3>
                                                        <p className="text-xs text-slate-500">From: {qa.customerName || "Customer"}</p>
                                                    </div>
                                                    <div className="flex-1 flex flex-col justify-center">
                                                        <div className="bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-slate-700 p-4 rounded-lg text-sm text-slate-700 dark:text-slate-300 mb-3 shadow-sm">
                                                            <strong className="text-slate-900 dark:text-white mr-2">Q:</strong>{qa.question}
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <input type="text" placeholder="Type your response..." value={replyText[qa.id] || ''} onChange={(e) => setReplyText({...replyText, [qa.id]: e.target.value})} className="flex-1 px-4 py-2 rounded-lg text-sm border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#1a1a1a] text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all" />
                                                            <button onClick={() => handleReplyQA(qa.id)} className="bg-indigo-600 text-white font-medium px-5 rounded-lg hover:bg-indigo-700 transition shadow-sm text-sm whitespace-nowrap">Reply</button>
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
                            <div className="p-6 lg:p-8">
                                <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">System Audit Logs</h2>
                                {audits.length === 0 ? (
                                    <div className="text-center py-20 text-slate-500">No recent activity.</div>
                                ) : (
                                    <div className="bg-white dark:bg-[#151515] border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                                        <div className="divide-y divide-slate-100 dark:divide-slate-800/50">
                                            {audits.map((audit) => (
                                                <div key={audit.id} className="flex items-center gap-4 p-4 hover:bg-slate-50 dark:hover:bg-[#1a1a1a] transition-colors text-sm">
                                                    <span className="text-slate-400 font-mono text-xs w-36 shrink-0">{new Date(audit.timestamp).toLocaleString()}</span>
                                                    <span className={`px-2.5 py-1 rounded-md text-xs font-medium w-24 text-center shrink-0 ${
                                                        audit.action === 'CREATED' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' : 
                                                        audit.action === 'DELETED' ? 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400' : 
                                                        'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400'
                                                    }`}>
                                                        {audit.action}
                                                    </span>
                                                    <span className="text-slate-700 dark:text-slate-300 flex-1">{audit.details}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* MODALS */}

                {/* Edit Product Modal */}
                {editingProduct && (
                    <div className="fixed inset-0 z-50 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-[fadeIn_0.2s_ease-out]">
                        <div className="bg-white dark:bg-[#151515] w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh] animate-[slideUp_0.3s_ease-out]">
                            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-[#111]">
                                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Edit Product</h2>
                                <button onClick={() => setEditingProduct(null)} className="text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 p-2 rounded-full transition-colors">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                                </button>
                            </div>
                            
                            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                                <form id="edit-form" onSubmit={handleSaveEdit} className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                    <div className="sm:col-span-2">
                                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">Product Name</label>
                                        <input type="text" required value={editingProduct.name} onChange={e => setEditingProduct({...editingProduct, name: e.target.value})} className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#1a1a1a] text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-sm" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">Price (₹)</label>
                                        <input type="number" required value={editingProduct.price} onChange={e => setEditingProduct({...editingProduct, price: e.target.value})} className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#1a1a1a] text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-sm" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">Stock</label>
                                        <input type="number" required value={editingProduct.stock} onChange={e => setEditingProduct({...editingProduct, stock: e.target.value})} className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#1a1a1a] text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-sm" />
                                    </div>
                                    <div className="sm:col-span-2">
                                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">Detailed Description</label>
                                        <textarea rows="4" value={editingProduct.detailedDescription || ''} onChange={e => setEditingProduct({...editingProduct, detailedDescription: e.target.value})} className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#1a1a1a] text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-sm resize-none"></textarea>
                                    </div>
                                </form>
                            </div>
                            
                            <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#111] flex justify-end gap-3">
                                <button onClick={() => setEditingProduct(null)} className="px-5 py-2.5 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors">Cancel</button>
                                <button form="edit-form" type="submit" className="px-5 py-2.5 rounded-lg text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white transition-colors shadow-sm">Save Changes</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Premium Transaction Modal (X-Ray Replaced) */}
                {selectedOrder && (() => {
                    const currentOrder = orders.find(o => o.id === selectedOrder.id) || selectedOrder;
                    const product = products.find(p => p.id === currentOrder.productId);
                    const buyer = users.find(u => u.id === currentOrder.userId);
                    
                    return (
                        <div className="fixed inset-0 z-[100] bg-slate-900/40 dark:bg-black/60 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-[fadeIn_0.2s_ease-out]">
                            <div className="bg-white dark:bg-[#151515] w-full max-w-5xl rounded-2xl overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh] animate-[slideUp_0.3s_ease-out]">
                                
                                <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-[#151515]">
                                    <div>
                                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Transaction Details</h2>
                                        <p className="text-sm text-slate-500 mt-1">ID: #{currentOrder.id} • {new Date(currentOrder.orderDate || Date.now()).toLocaleString()}</p>
                                    </div>
                                    <button onClick={() => setSelectedOrder(null)} className="text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 p-2 rounded-full transition-colors">
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                                    </button>
                                </div>

                                <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar bg-slate-50 dark:bg-[#0a0a0a]">
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                        
                                        <div className="space-y-6">
                                            {/* Product Summary Card */}
                                            <div className="bg-white dark:bg-[#151515] p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                                                <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-5">Item Summary</h3>
                                                <div className="flex gap-5">
                                                    <div className="w-24 h-24 rounded-xl bg-slate-100 dark:bg-slate-800 overflow-hidden border border-slate-200 dark:border-slate-700 shrink-0">
                                                        {product?.imageUrl ? <img src={getImageUrl(product.imageUrl)} alt={product?.name} className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center text-slate-400">No Image</div>}
                                                    </div>
                                                    <div className="flex-1 flex flex-col justify-center">
                                                        <h4 className="font-semibold text-slate-900 dark:text-white text-lg">{product?.name || 'Unknown Product'}</h4>
                                                        <div className="mt-auto flex justify-between items-center py-2">
                                                            <span className="text-sm text-slate-500">Qty: {currentOrder.quantity}</span>
                                                            <span className="font-bold text-lg text-slate-900 dark:text-white">₹{(currentOrder.price * currentOrder.quantity).toLocaleString()}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Payment Verification Card */}
                                            {(currentOrder.status === 'PENDING' || currentOrder.paymentScreenshot) && (
                                                <div className="bg-white dark:bg-[#151515] p-6 rounded-2xl border border-amber-200 dark:border-amber-900/50 shadow-sm relative">
                                                    <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-5 flex items-center gap-2">
                                                        Payment Verification <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                                                    </h3>
                                                    <div className="bg-slate-50 dark:bg-[#1a1a1a] rounded-xl overflow-hidden border border-dashed border-slate-300 dark:border-slate-700 min-h-[200px] flex items-center justify-center">
                                                        {currentOrder.paymentScreenshot ? (
                                                            <a href={currentOrder.paymentScreenshot} target="_blank" rel="noreferrer" className="w-full h-full p-2">
                                                                <img src={currentOrder.paymentScreenshot} alt="Payment Proof" className="w-full h-auto object-contain max-h-64 rounded-lg hover:opacity-90 transition" />
                                                            </a>
                                                        ) : (
                                                            <p className="text-sm text-slate-500 text-center py-10">No payment receipt attached.</p>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <div className="space-y-6">
                                            {/* Customer Details Card */}
                                            <div className="bg-white dark:bg-[#151515] p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                                                <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-5">Customer Information</h3>
                                                <div className="space-y-4">
                                                    <div className="grid grid-cols-3 text-sm">
                                                        <span className="text-slate-500">Name</span>
                                                        <span className="col-span-2 font-medium text-slate-900 dark:text-white">{buyer?.name || 'Guest User'}</span>
                                                    </div>
                                                    <div className="grid grid-cols-3 text-sm">
                                                        <span className="text-slate-500">Email</span>
                                                        <span className="col-span-2 font-medium text-slate-900 dark:text-white">{buyer?.email || 'N/A'}</span>
                                                    </div>
                                                    <div className="grid grid-cols-3 text-sm">
                                                        <span className="text-slate-500">Phone</span>
                                                        <span className="col-span-2 font-medium text-slate-900 dark:text-white">{currentOrder.phoneNumber || 'N/A'}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Logistics Card */}
                                            <div className="bg-white dark:bg-[#151515] p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                                                <div className="flex justify-between items-center mb-5">
                                                    <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Logistics & Shipping</h3>
                                                    <span className={`px-3 py-1 rounded-full text-xs font-bold tracking-wide ${getStatusBadge(currentOrder.status)}`}>
                                                        {currentOrder.status}
                                                    </span>
                                                </div>
                                                <div className="bg-slate-50 dark:bg-[#1a1a1a] p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                                                    <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                                                        {currentOrder.shippingAddress || 'No shipping address provided.'}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                    </div>
                                </div>
                                
                                {/* Bottom Action Bar */}
                                <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#151515] flex flex-wrap justify-between items-center gap-4">
                                    <button onClick={() => handleUpdateTracking(currentOrder.id)} className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-medium transition-colors">
                                        Update Tracking
                                    </button>
                                    
                                    <div className="flex gap-3">
                                        {currentOrder.status === 'PENDING' && (
                                            <button onClick={() => handleUpdateStatus(currentOrder.id, 'SUCCESS')} className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm">
                                                Verify & Approve
                                            </button>
                                        )}
                                        {['SUCCESS', 'PENDING'].includes(currentOrder.status) && (
                                            <button onClick={() => handleUpdateStatus(currentOrder.id, 'SHIPPED')} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm">
                                                Mark as Shipped
                                            </button>
                                        )}
                                        {currentOrder.status === 'SHIPPED' && (
                                            <button onClick={() => handleUpdateStatus(currentOrder.id, 'DELIVERED')} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm">
                                                Mark as Delivered
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })()}

            </div>

            <style dangerouslySetInnerHTML={{__html: `
                @keyframes slideUp { from { transform: translateY(10px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background-color: rgba(156, 163, 175, 0.3); border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background-color: rgba(156, 163, 175, 0.5); }
            `}} />
        </div>
    );
}

export default AdminDashboard;