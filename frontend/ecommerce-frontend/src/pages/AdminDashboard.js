import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../services/api';
import toast from 'react-hot-toast';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// 🚀 NEW: Import WebSocket tools
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

    const [unansweredQA, setUnansweredQA] = useState([]);
    const [replyText, setReplyText] = useState({});

    const [excelFile, setExcelFile] = useState(null);
    const [isUploadingExcel, setIsUploadingExcel] = useState(false);

    const [audits, setAudits] = useState([]);
    
    // 🚀 NEW: State to hold live WebSocket messages
    const [liveAlerts, setLiveAlerts] = useState([]);

    const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#ec4899'];

    useEffect(() => {
        const role = localStorage.getItem('role');
        if (role !== 'ADMIN') {
            toast.error("Access Denied. Admins only.");
            navigate('/');
            return;
        }
        fetchData();

        // 🚀 NEW: Connect to the Java Server's Live Stream!
        // 🚀 SMART SOCKET: Automatically detects if it needs a secure HTTPS connection!
const socketUrl = window.location.protocol === 'https:' 
    ? `https://${window.location.host}/ws` 
    : 'http://localhost:8080/ws';

const socket = new SockJS(socketUrl);



        const stompClient = new Client({
            webSocketFactory: () => socket,
            reconnectDelay: 5000,
            onConnect: () => {
                console.log('🟢 Connected to ProCart Live Command Center');

                // Listen for AI Fraud Blocks
                stompClient.subscribe('/topic/admin/alerts', (message) => {
                    const alertMsg = message.body;
                    toast.error(alertMsg, { duration: 8000, style: { background: '#580000', color: '#fff', fontWeight: 'bold' } });
                    setLiveAlerts(prev => [{ time: new Date().toLocaleTimeString(), msg: alertMsg, type: 'fraud' }, ...prev].slice(0, 5));
                });

                // Listen for High Value Sales
                stompClient.subscribe('/topic/admin/sales', (message) => {
                    const saleMsg = message.body;
                    toast.success(saleMsg, { duration: 5000, style: { background: '#003314', color: '#fff', fontWeight: 'bold' } });
                    setLiveAlerts(prev => [{ time: new Date().toLocaleTimeString(), msg: saleMsg, type: 'sale' }, ...prev].slice(0, 5));
                });
            },
        });

        stompClient.activate();

        // Cleanup when leaving the page
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
        } catch (err) { console.warn("Orders not ready"); }

        try {
            const usersRes = await API.get('/admin/users');
            setUsers(usersRes.data.sort((a, b) => b.id - a.id));
        } catch (err) { console.warn("Users not ready"); }

        try {
            const analyticsRes = await API.get('/analytics/dashboard');
            setAnalytics(analyticsRes.data);
        } catch (err) { console.warn("Analytics not ready"); }

        try {
            const qaRes = await API.get('/qa/admin/unanswered');
            setUnansweredQA(qaRes.data);
        } catch (err) { console.warn("Q&A not ready"); }

        try {
            const auditRes = await API.get('/products/audit');
            setAudits(auditRes.data);
        } catch (err) { console.warn("Audits not ready"); }

        setLoading(false);
    };

    const handleUpdateStatus = async (orderId, newStatus) => {
        try {
            await API.put(`/orders/${orderId}/status`, { status: newStatus });
            toast.success(`Order #${orderId} marked as ${newStatus}`);
            fetchData(); 
        } catch (error) { toast.error("Could not update"); }
    };

    const handleUpdateTracking = async (orderId) => {
        const msg = window.prompt("Enter new package location (e.g., 'Arrived at Andhra Pradesh Facility'):");
        if (msg) {
            try {
                await API.put(`/orders/${orderId}/tracking`, { message: msg });
                toast.success("Tracking timeline updated! 📍");
                fetchData(); 
            } catch (error) { toast.error("Could not update tracking."); }
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
            toast.success("Product added successfully! 🛍️");
            setNewProduct({ name: '', price: '', stock: '', category: '', searchTags: '', detailedDescription: '' });
            setSelectedImage(null);
            setSelectedModel(null); 
            setGalleryFiles([]); 
            fetchData(); 
        } catch (error) { toast.error("Failed to add product."); }
    };

    const handleSaveEdit = async (e) => {
        e.preventDefault();
        try {
            await API.put(`/products/${editingProduct.id}`, editingProduct);
            toast.success("Product updated successfully! ✏️");
            setEditingProduct(null); 
            fetchData(); 
        } catch (error) { 
            toast.error("Failed to update product."); 
        }
    };

    const handleExcelUpload = async (e) => {
        e.preventDefault();
        if (!excelFile) return toast.error("Please select an Excel file first!");
        const formData = new FormData();
        formData.append('file', excelFile);
        setIsUploadingExcel(true);
        const toastId = toast.loading("Processing bulk upload... ⏳");
        try {
            const res = await API.post('/products/bulk-upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
            toast.success(res.data.message || "Bulk upload successful! 🚀", { id: toastId });
            setExcelFile(null);
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.error || "Upload failed.", { id: toastId });
        } finally {
            setIsUploadingExcel(false);
            document.getElementById('excel-upload-input').value = "";
        }
    };

    const handleDeleteProduct = async (productId) => {
        if (!window.confirm("Are you sure you want to delete this product? It will be soft-deleted.")) return;
        try {
            await API.delete(`/products/${productId}`);
            toast.success("Product deleted successfully.");
            fetchData();
        } catch (error) { toast.error("Could not delete product."); }
    };

    const handleReplyQA = async (qaId) => {
        try {
            await API.put(`/qa/answer/${qaId}`, { answer: replyText[qaId] });
            toast.success("Reply posted publicly!");
            fetchData(); 
        } catch (error) { toast.error("Failed to post reply."); }
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'SUCCESS': return 'bg-green-100 dark:bg-green-500/20 text-green-800 dark:text-green-400';
            case 'SHIPPED': return 'bg-blue-100 dark:bg-blue-500/20 text-blue-800 dark:text-blue-400';
            case 'DELIVERED': return 'bg-purple-100 dark:bg-purple-500/20 text-purple-800 dark:text-purple-400';
            default: return 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300';
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#0a0f1c] py-10 px-4 sm:px-6 lg:px-8 transition-colors duration-300">
            <div className="max-w-7xl mx-auto">
                
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
                    <h1 className="text-4xl font-black text-gray-900 dark:text-white tracking-tight">Admin Control Panel ⚙️</h1>
                    <div className="flex flex-wrap mt-4 md:mt-0 gap-2 bg-white dark:bg-[#111827] p-1.5 rounded-xl shadow-sm border border-gray-200 dark:border-white/5">
                        <button onClick={() => setActiveTab('analytics')} className={`px-5 py-2 rounded-lg font-bold text-sm transition-all ${activeTab === 'analytics' ? 'bg-gray-900 dark:bg-blue-600 text-white shadow-md' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}>📊 Analytics</button>
                        <button onClick={() => setActiveTab('orders')} className={`px-5 py-2 rounded-lg font-bold text-sm transition-all ${activeTab === 'orders' ? 'bg-gray-900 dark:bg-blue-600 text-white shadow-md' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}>📦 Orders</button>
                        <button onClick={() => setActiveTab('products')} className={`px-5 py-2 rounded-lg font-bold text-sm transition-all ${activeTab === 'products' ? 'bg-gray-900 dark:bg-blue-600 text-white shadow-md' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}>🏷️ Products</button>
                        <button onClick={() => setActiveTab('users')} className={`px-5 py-2 rounded-lg font-bold text-sm transition-all ${activeTab === 'users' ? 'bg-gray-900 dark:bg-blue-600 text-white shadow-md' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}>👥 Users</button>
                        <button onClick={() => setActiveTab('qa')} className={`px-5 py-2 rounded-lg font-bold text-sm transition-all ${activeTab === 'qa' ? 'bg-gray-900 dark:bg-blue-600 text-white shadow-md' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}>💬 Q&A {unansweredQA.length > 0 && <span className="ml-1 bg-red-500 text-white px-2 py-0.5 rounded-full text-xs">{unansweredQA.length}</span>}</button>
                        <button onClick={() => setActiveTab('audit')} className={`px-5 py-2 rounded-lg font-bold text-sm transition-all ${activeTab === 'audit' ? 'bg-gray-900 dark:bg-blue-600 text-white shadow-md' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}>📜 Logs</button>
                    </div>
                </div>

                {/* 🚀 NEW: LIVE WEBSOCKET TICKER */}
                {liveAlerts.length > 0 && (
                    <div className="mb-8 p-4 bg-gray-900 dark:bg-[#111827] rounded-2xl border border-blue-500/30 shadow-lg">
                        <div className="flex items-center gap-3 mb-2">
                            <span className="relative flex h-3 w-3">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                            </span>
                            <h3 className="text-white font-bold text-sm tracking-widest uppercase">Live Activity Stream</h3>
                        </div>
                        <div className="flex flex-col gap-2">
                            {liveAlerts.map((alert, i) => (
                                <div key={i} className={`p-3 rounded-lg border flex items-center gap-3 animate-fade-in-down ${alert.type === 'fraud' ? 'bg-red-500/10 border-red-500/50 text-red-200' : 'bg-green-500/10 border-green-500/50 text-green-200'}`}>
                                    <span className="text-xs font-mono opacity-60">{alert.time}</span>
                                    <span className="font-bold text-sm">{alert.msg}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {loading ? (
                    <div className="text-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-blue-500 mx-auto"></div></div>
                ) : (
                    <div className="bg-white dark:bg-[#111827] rounded-3xl shadow-xl dark:shadow-blue-900/10 border border-gray-100 dark:border-white/5 overflow-hidden transition-colors duration-300">
                        
                        {/* ANALYTICS TAB */}
                        {activeTab === 'analytics' && (
                            analytics ? (
                                <div className="p-6 sm:p-8">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                                        <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/10 p-6 rounded-2xl border border-green-100 dark:border-green-500/20 flex flex-col justify-center items-center text-center">
                                            <p className="text-green-600 dark:text-green-400 font-bold uppercase tracking-widest text-xs mb-2">Total Revenue</p>
                                            <h3 className="text-4xl font-black text-green-700 dark:text-green-300">₹{analytics.totalRevenue.toLocaleString()}</h3>
                                        </div>
                                        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/10 p-6 rounded-2xl border border-blue-100 dark:border-blue-500/20 flex flex-col justify-center items-center text-center">
                                            <p className="text-blue-600 dark:text-blue-400 font-bold uppercase tracking-widest text-xs mb-2">Total Orders</p>
                                            <h3 className="text-4xl font-black text-blue-700 dark:text-blue-300">{analytics.totalOrders}</h3>
                                        </div>
                                        <div className="bg-gradient-to-br from-purple-50 to-fuchsia-50 dark:from-purple-900/20 dark:to-fuchsia-900/10 p-6 rounded-2xl border border-purple-100 dark:border-purple-500/20 flex flex-col justify-center items-center text-center">
                                            <p className="text-purple-600 dark:text-purple-400 font-bold uppercase tracking-widest text-xs mb-2">Active Inventory</p>
                                            <h3 className="text-4xl font-black text-purple-700 dark:text-purple-300">{analytics.totalProducts} Items</h3>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                        <div className="bg-slate-50 dark:bg-black/20 p-6 rounded-2xl border border-gray-100 dark:border-white/5">
                                            <h3 className="text-gray-900 dark:text-white font-black mb-6 text-lg text-center">Inventory by Category</h3>
                                            <div className="h-[300px]"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={analytics.pieChartData} cx="50%" cy="50%" innerRadius={70} outerRadius={100} paddingAngle={5} dataKey="value">{analytics.pieChartData.map((entry, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}</Pie><Tooltip contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} /><Legend verticalAlign="bottom" height={36}/></PieChart></ResponsiveContainer></div>
                                        </div>
                                        <div className="bg-slate-50 dark:bg-black/20 p-6 rounded-2xl border border-gray-100 dark:border-white/5">
                                            <h3 className="text-gray-900 dark:text-white font-black mb-6 text-lg text-center">Category Distribution</h3>
                                            <div className="h-[300px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={analytics.pieChartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#9ca3af" opacity={0.2} /><XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 12}} /><YAxis axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 12}} /><Tooltip cursor={{fill: 'rgba(59, 130, 246, 0.1)'}} contentStyle={{ borderRadius: '10px', border: 'none' }} /><Bar dataKey="value" radius={[6, 6, 0, 0]}>{analytics.pieChartData.map((entry, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}</Bar></BarChart></ResponsiveContainer></div>
                                        </div>
                                    </div>
                                </div>
                            ) : (<div className="p-20 text-center text-gray-500 dark:text-gray-400 font-bold">Analytics data is not yet available.</div>)
                        )}

                        {/* USERS TAB */}
                        {activeTab === 'users' && (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-gray-50 dark:bg-black/20 border-b border-gray-100 dark:border-white/5 text-sm uppercase text-gray-500 dark:text-gray-400 font-black">
                                            <th className="p-5">User ID</th>
                                            <th className="p-5">Name / Account Type</th>
                                            <th className="p-5">Email Address</th>
                                            <th className="p-5">Role</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                                        {users.map(user => (
                                            <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors duration-200">
                                                <td className="p-5 font-bold dark:text-white">#{user.id}</td>
                                                <td className="p-5">
                                                    <div className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                                        {user.name}
                                                        {user.name === 'Guest Shopper' && (
                                                            <span className="text-[10px] bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 px-2 py-0.5 rounded-md uppercase tracking-wider">Ghost Profile 👻</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="p-5 text-gray-600 dark:text-gray-400 font-medium">{user.email}</td>
                                                <td className="p-5">
                                                    <span className={`px-3 py-1.5 rounded-full text-[10px] font-black tracking-widest ${user.role === 'ADMIN' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'}`}>
                                                        {user.role}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* ORDERS TAB */}
                        {activeTab === 'orders' && (
                            <div className="overflow-x-auto">
                                {orders.length === 0 ? (
                                    <div className="p-20 text-center text-gray-500 dark:text-gray-400 font-bold">No orders found.</div>
                                ) : (
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-gray-50 dark:bg-black/20 border-b border-gray-100 dark:border-white/5 text-sm uppercase text-gray-500 dark:text-gray-400 font-black">
                                                <th className="p-5">Order ID</th><th className="p-5">Product Details</th><th className="p-5">Qty</th><th className="p-5">Delivery Info</th><th className="p-5">Status</th><th className="p-5 text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                                            {orders.map(order => {
                                                const product = products.find(p => p.id === order.productId);
                                                return (
                                                    <tr key={order.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors duration-200">
                                                        <td className="p-5"><div className="font-bold dark:text-white">#{order.id}</div><div className="text-xs font-bold text-blue-500 mt-1">User ID: {order.userId}</div></td>
                                                        <td className="p-5">
                                                            <div className="flex items-center gap-3">
                                                                <div className="h-12 w-12 rounded-xl bg-gray-100 dark:bg-gray-800 overflow-hidden flex-shrink-0 flex items-center justify-center">
                                                                    {product?.imageUrl ? <img src={product.imageUrl.startsWith('http') ? product.imageUrl : `http://localhost:8080/uploads/${product.imageUrl}`} alt="" className="h-full w-full object-cover"/> : <span className="text-xl">📦</span>}
                                                                </div>
                                                                <div>
                                                                    <div className="font-bold text-gray-900 dark:text-white line-clamp-1">{product ? product.name : 'Unknown'}</div>
                                                                    <div className="text-xs font-bold text-gray-400 mt-0.5">Product ID: {order.productId}</div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="p-5 dark:text-gray-300 font-black text-lg">{order.quantity}</td>
                                                        <td className="p-5">
                                                            <div className="text-sm font-medium text-gray-800 dark:text-gray-300 max-w-[200px] truncate mb-1">{order.shippingAddress || 'No Address'}</div>
                                                            <div className="text-xs font-bold text-blue-600 dark:text-blue-400">📞 {order.phoneNumber || 'N/A'}</div>
                                                        </td>
                                                        <td className="p-5"><span className={`px-3 py-1.5 rounded-full text-[10px] font-black tracking-widest ${getStatusBadge(order.status)}`}>{order.status}</span></td>
                                                        <td className="p-5 text-right space-x-2">
                                                            <button onClick={() => handleUpdateStatus(order.id, 'SHIPPED')} className="px-3 py-1.5 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold text-xs rounded-lg hover:bg-blue-100">Ship</button>
                                                            <button onClick={() => handleUpdateTracking(order.id)} className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold text-xs rounded-lg hover:bg-indigo-100">Update Loc</button>
                                                            <button onClick={() => handleUpdateStatus(order.id, 'DELIVERED')} className="px-3 py-1.5 bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 font-bold text-xs rounded-lg hover:bg-purple-100">Deliver</button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        )}

                        {/* PRODUCTS TAB */}
                        {activeTab === 'products' && (
                            <div className="p-8">
                                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
                                    <div className="xl:col-span-2 bg-slate-50 dark:bg-black/20 p-6 rounded-2xl border border-gray-200 dark:border-white/5">
                                        <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-4">➕ Add Single Product</h3>
                                        <form onSubmit={handleAddProduct} className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                                            <div><label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Name</label><input type="text" required value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} className="w-full p-2.5 rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-[#0a0f1c] text-gray-900 dark:text-white outline-none focus:border-blue-500" placeholder="MacBook Pro" /></div>
                                            <div><label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Category</label><input type="text" value={newProduct.category} onChange={e => setNewProduct({...newProduct, category: e.target.value})} className="w-full p-2.5 rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-[#0a0f1c] text-gray-900 dark:text-white outline-none focus:border-blue-500" placeholder="Laptops" /></div>
                                            <div><label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Price (₹)</label><input type="number" required value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: e.target.value})} className="w-full p-2.5 rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-[#0a0f1c] text-gray-900 dark:text-white outline-none focus:border-blue-500" placeholder="99999" /></div>
                                            <div><label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Stock</label><input type="number" required value={newProduct.stock} onChange={e => setNewProduct({...newProduct, stock: e.target.value})} className="w-full p-2.5 rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-[#0a0f1c] text-gray-900 dark:text-white outline-none focus:border-blue-500" placeholder="50" /></div>
                                            
                                            <div className="md:col-span-2">
                                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">
                                                    AI Search Tags <span className="text-xs font-normal text-gray-400">(Comma separated)</span>
                                                </label>
                                                <input type="text" value={newProduct.searchTags} onChange={e => setNewProduct({...newProduct, searchTags: e.target.value})} className="w-full p-2.5 rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-[#0a0f1c] text-gray-900 dark:text-white outline-none focus:border-purple-500" placeholder="shoe, sneaker, boot" />
                                            </div>

                                            <div className="md:col-span-2">
                                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Detailed Description</label>
                                                <textarea rows="4" value={newProduct.detailedDescription} onChange={e => setNewProduct({...newProduct, detailedDescription: e.target.value})} className="w-full p-2.5 rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-[#0a0f1c] text-gray-900 dark:text-white outline-none focus:border-blue-500" placeholder="Product details..."></textarea>
                                            </div>

                                            <div className="md:col-span-2 mt-2">
                                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Product Media</label>
                                                <div className="flex flex-col gap-4">
                                                    <div className="flex flex-col sm:flex-row gap-4">
                                                        <div className="w-full">
                                                            <p className="text-xs text-gray-500 mb-1">Main Cover Image</p>
                                                            <input type="file" onChange={e => setSelectedImage(e.target.files[0])} className="w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-blue-50 dark:file:bg-blue-500/10 file:text-blue-700 dark:file:text-blue-400" />
                                                        </div>
                                                        <div className="w-full">
                                                            <p className="text-xs text-gray-500 mb-1">Extra Gallery Images</p>
                                                            <input type="file" multiple onChange={e => setGalleryFiles(e.target.files)} className="w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-purple-50 dark:file:bg-purple-500/10 file:text-purple-700 dark:file:text-purple-400" />
                                                        </div>
                                                    </div>
                                                    <div className="w-full p-4 bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-800 rounded-xl">
                                                        <p className="text-xs font-bold text-indigo-700 dark:text-indigo-400 mb-2">🧊 3D AR Model (.glb or .gltf)</p>
                                                        <input type="file" accept=".glb,.gltf" onChange={e => setSelectedModel(e.target.files[0])} className="w-full text-sm text-indigo-600 dark:text-indigo-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-white dark:file:bg-indigo-500/20 file:text-indigo-700 dark:file:text-indigo-300" />
                                                    </div>
                                                </div>
                                            </div>
                                            <button type="submit" className="bg-gray-900 dark:bg-blue-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-gray-800 dark:hover:bg-blue-500 transition md:col-span-2 mt-4 shadow-lg">Upload Complete Product</button>
                                        </form>
                                    </div>
                                    
                                    {/* BULK UPLOAD */}
                                    <div className="bg-green-50 dark:bg-green-900/10 p-6 rounded-2xl border border-green-200 dark:border-green-500/20 flex flex-col justify-between">
                                        <div>
                                            <h3 className="font-bold text-lg text-green-900 dark:text-green-400 mb-2">📊 Bulk Upload (Excel)</h3>
                                            <p className="text-sm text-green-700 dark:text-green-500/70 mb-4">Columns: <strong className="text-green-800 dark:text-green-400">Name | Price | Stock | Category | Image URL</strong></p>
                                        </div>
                                        <form onSubmit={handleExcelUpload}>
                                            <input type="file" id="excel-upload-input" accept=".xlsx, .xls, .csv" onChange={e => setExcelFile(e.target.files[0])} className="w-full mb-4 text-sm text-green-700 dark:text-green-400 file:mr-4 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-bold file:bg-green-200 dark:file:bg-green-500/20 file:text-green-800 dark:file:text-green-300 hover:file:bg-green-300 cursor-pointer" />
                                            <button type="submit" disabled={isUploadingExcel} className="w-full bg-green-600 dark:bg-green-500 text-white font-bold py-3 px-4 rounded-lg hover:bg-green-700 dark:hover:bg-green-400 transition shadow-lg disabled:opacity-50">{isUploadingExcel ? 'Processing...' : 'Upload Data'}</button>
                                        </form>
                                    </div>
                                </div>
                                
                                {/* PRODUCT GRID */}
                                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
                                    {products.map(product => (
                                        <div key={product.id} className="bg-white dark:bg-[#111827] border border-gray-100 dark:border-white/5 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all duration-300">
                                            <div className="aspect-square bg-gray-50 dark:bg-black/40 rounded-xl mb-4 overflow-hidden flex items-center justify-center transition-colors duration-300 relative group">
                                                {product.imageUrl ? <img src={product.imageUrl.startsWith('http') ? product.imageUrl : `http://localhost:8080/uploads/${product.imageUrl}`} alt={product.name} className="object-cover w-full h-full" /> : <span className="text-4xl">📦</span>}
                                                {product.searchTags && (
                                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-4 text-center">
                                                        <p className="text-white text-xs font-bold break-words">AI Tags: {product.searchTags}</p>
                                                    </div>
                                                )}
                                                {product.modelUrl && (
                                                    <span className="absolute top-2 right-2 bg-indigo-600 text-white text-[10px] font-bold px-2 py-1 rounded-md shadow-sm">3D</span>
                                                )}
                                            </div>
                                            <h3 className="font-bold text-gray-900 dark:text-white truncate">{product.name}</h3>
                                            <p className="text-blue-600 dark:text-blue-400 font-black">₹{product.price?.toLocaleString()}</p>
                                            <div className="flex justify-between items-center mt-4 border-t border-gray-100 dark:border-white/5 pt-4">
                                                <span className="text-xs font-bold text-gray-500 dark:text-gray-400">Stock: {product.stock}</span>
                                                <div className="flex gap-2">
                                                    <button onClick={() => setEditingProduct(product)} className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 px-3 py-1.5 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-500/20">Edit</button>
                                                    <button onClick={() => handleDeleteProduct(product.id)} className="text-xs font-bold text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-500/10 px-3 py-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-500/20">Delete</button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Q&A TAB */}
                        {activeTab === 'qa' && (
                            <div className="p-8">
                                <h2 className="text-xl font-bold mb-6 dark:text-white">Customer Questions ({unansweredQA.length})</h2>
                                {unansweredQA.length === 0 ? (
                                    <div className="text-center py-10 text-gray-500">All caught up! No pending questions. 🎉</div>
                                ) : (
                                    <div className="grid gap-6">
                                        {unansweredQA.map(qa => {
                                            const product = products.find(p => p.id === qa.productId);
                                            return (
                                                <div key={qa.id} className="bg-slate-50 dark:bg-black/20 p-6 rounded-2xl border border-gray-200 dark:border-white/5 flex flex-col md:flex-row gap-6">
                                                    <div className="md:w-1/4">
                                                        <span className="text-xs font-bold text-blue-500 uppercase tracking-wider">Product #{qa.productId}</span>
                                                        <h3 className="font-bold text-gray-900 dark:text-white line-clamp-2">{product?.name || "Loading..."}</h3>
                                                    </div>
                                                    <div className="flex-1">
                                                        <p className="text-sm font-bold text-gray-500 mb-1">{qa.customerName || "Customer"} asked:</p>
                                                        <p className="text-gray-900 dark:text-white font-medium text-lg mb-4">"{qa.question}"</p>
                                                        <div className="flex gap-2">
                                                            <input type="text" placeholder="Type your official answer..." value={replyText[qa.id] || ''} onChange={(e) => setReplyText({...replyText, [qa.id]: e.target.value})} className="flex-1 p-3 rounded-xl border border-gray-300 dark:border-white/10 bg-white dark:bg-[#0a0f1c] text-gray-900 dark:text-white outline-none focus:border-blue-500" />
                                                            <button onClick={() => handleReplyQA(qa.id)} className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 rounded-xl transition">Reply</button>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* AUDIT LOGS TAB */}
                        {activeTab === 'audit' && (
                            <div className="p-8">
                                <h2 className="text-xl font-bold mb-6 dark:text-white">Security & Audit Logs 📜</h2>
                                {audits.length === 0 ? (
                                    <div className="text-center py-10 text-gray-500">No logs recorded yet.</div>
                                ) : (
                                    <div className="relative border-l-4 border-gray-200 dark:border-gray-800 ml-4 py-4">
                                        {audits.map((audit) => (
                                            <div key={audit.id} className="mb-8 ml-8 relative group">
                                                <div className={`absolute -left-[42px] top-1 h-5 w-5 rounded-full border-4 border-white dark:border-[#111827] ${audit.action === 'CREATED' ? 'bg-green-500' : audit.action === 'DELETED' ? 'bg-red-500' : audit.action === 'UPDATED' ? 'bg-blue-500' : 'bg-purple-500'}`}></div>
                                                <div className="bg-slate-50 dark:bg-black/20 p-5 rounded-2xl border border-gray-200 dark:border-white/5 shadow-sm">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <span className={`text-xs font-black uppercase tracking-widest px-2.5 py-1 rounded-lg ${audit.action === 'CREATED' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : audit.action === 'DELETED' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : audit.action === 'UPDATED' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'}`}>{audit.action}</span>
                                                        <span className="text-xs font-bold text-gray-400 dark:text-gray-500">{new Date(audit.timestamp).toLocaleString()}</span>
                                                    </div>
                                                    <p className="text-gray-900 dark:text-white font-medium">{audit.details}</p>
                                                    {audit.productId !== 0 && <p className="text-xs text-gray-500 mt-2">Target Product ID: #{audit.productId}</p>}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* FULL SCREEN EDIT MODAL */}
                {editingProduct && (
                    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                        <div className="bg-white dark:bg-[#111827] w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
                            <div className="p-6 border-b border-gray-100 dark:border-white/10 flex justify-between items-center bg-gray-50 dark:bg-black/20">
                                <h2 className="text-xl font-black text-gray-900 dark:text-white">✏️ Edit Product Info</h2>
                                <button onClick={() => setEditingProduct(null)} className="text-gray-400 hover:text-gray-900 dark:hover:text-white text-2xl font-bold">✕</button>
                            </div>
                            
                            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                                <form id="edit-form" onSubmit={handleSaveEdit} className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                    <div className="sm:col-span-2">
                                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Name</label>
                                        <input type="text" required value={editingProduct.name} onChange={e => setEditingProduct({...editingProduct, name: e.target.value})} className="w-full p-3 rounded-xl border border-gray-300 dark:border-white/10 bg-white dark:bg-[#0a0f1c] text-gray-900 dark:text-white outline-none focus:border-blue-500 transition-colors" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Price (₹)</label>
                                        <input type="number" required value={editingProduct.price} onChange={e => setEditingProduct({...editingProduct, price: e.target.value})} className="w-full p-3 rounded-xl border border-gray-300 dark:border-white/10 bg-white dark:bg-[#0a0f1c] text-gray-900 dark:text-white outline-none focus:border-blue-500 transition-colors" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Stock Quantity</label>
                                        <input type="number" required value={editingProduct.stock} onChange={e => setEditingProduct({...editingProduct, stock: e.target.value})} className="w-full p-3 rounded-xl border border-gray-300 dark:border-white/10 bg-white dark:bg-[#0a0f1c] text-gray-900 dark:text-white outline-none focus:border-blue-500 transition-colors" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Category</label>
                                        <input type="text" value={editingProduct.category || ''} onChange={e => setEditingProduct({...editingProduct, category: e.target.value})} className="w-full p-3 rounded-xl border border-gray-300 dark:border-white/10 bg-white dark:bg-[#0a0f1c] text-gray-900 dark:text-white outline-none focus:border-blue-500 transition-colors" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">AI Search Tags</label>
                                        <input type="text" value={editingProduct.searchTags || ''} onChange={e => setEditingProduct({...editingProduct, searchTags: e.target.value})} className="w-full p-3 rounded-xl border border-gray-300 dark:border-white/10 bg-white dark:bg-[#0a0f1c] text-gray-900 dark:text-white outline-none focus:border-blue-500 transition-colors" />
                                    </div>
                                    <div className="sm:col-span-2">
                                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Detailed Description (Amazon Style)</label>
                                        <textarea rows="5" value={editingProduct.detailedDescription || ''} onChange={e => setEditingProduct({...editingProduct, detailedDescription: e.target.value})} className="w-full p-3 rounded-xl border border-gray-300 dark:border-white/10 bg-white dark:bg-[#0a0f1c] text-gray-900 dark:text-white outline-none focus:border-blue-500 transition-colors"></textarea>
                                    </div>
                                </form>
                            </div>
                            
                            <div className="p-6 border-t border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-black/20 flex justify-end gap-3">
                                <button onClick={() => setEditingProduct(null)} className="px-6 py-3 rounded-xl font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10 transition-colors">Cancel</button>
                                <button form="edit-form" type="submit" className="px-8 py-3 rounded-xl font-black bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/30 transition-transform active:scale-95">Save</button>
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}

export default AdminDashboard;