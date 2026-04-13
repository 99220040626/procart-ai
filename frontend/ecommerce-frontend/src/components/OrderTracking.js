import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import API from '../services/api';
import toast from 'react-hot-toast';

import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import SockJS from 'sockjs-client';
import { Client } from '@stomp/stompjs';

// Fix Leaflet Default Icon
let DefaultIcon = L.icon({
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// Premium Custom Icons
const truckIcon = new L.Icon({ iconUrl: 'https://cdn-icons-png.flaticon.com/512/1048/1048329.png', iconSize: [40, 40], iconAnchor: [20, 20], className: 'drop-shadow-lg' });
const homeIcon = new L.Icon({ iconUrl: 'https://cdn-icons-png.flaticon.com/512/25/25694.png', iconSize: [35, 35], iconAnchor: [17, 35], className: 'drop-shadow-lg' });
const facilityIcon = new L.Icon({ iconUrl: 'https://cdn-icons-png.flaticon.com/512/2775/2775994.png', iconSize: [30, 30], className: 'drop-shadow-md' });

const warehouse = [17.3850, 78.4867]; // Hyderabad Hub

// ==========================================
// 🧩 PREMIUM TEXT EFFECT & HOOKS
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

// 📐 EXACT GEOMETRY ENGINE
function calculateDistance(coord1, coord2) {
    const R = 6371; 
    const dLat = (coord2[0] - coord1[0]) * Math.PI / 180;
    const dLon = (coord2[1] - coord1[1]) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(coord1[0] * Math.PI / 180) * Math.cos(coord2[0] * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// ==========================================
// 🚀 MAIN TRACKING COMPONENT
// ==========================================
function OrderTracking() {
    const [allOrders, setAllOrders] = useState([]);
    const [order, setOrder] = useState(null); 
    const [route, setRoute] = useState([]); 
    const [truckPos, setTruckPos] = useState(null);
    const [transitHub, setTransitHub] = useState(null); 
    
    const [progress, setProgress] = useState(0);
    const [targetProgress, setTargetProgress] = useState(0); 
    const [loading, setLoading] = useState(true);

    const userId = localStorage.getItem('userId');
    const activeTrackingRef = useRef(null); 

    useEffect(() => {
        const fetchOrdersAndGeocode = async () => {
            try {
                const res = await API.get(`/orders/user/${userId}`);
                if (res.data && res.data.length > 0) {
                    const sortedOrders = res.data.sort((a, b) => b.id - a.id);
                    setAllOrders(sortedOrders);
                    selectOrderToTrack(sortedOrders[0]); 
                } else {
                    setLoading(false);
                }
            } catch (error) {
                toast.error("Failed to load tracking data.");
                setLoading(false);
            }
        };
        if (userId) fetchOrdersAndGeocode();

        // 📡 Live WebSocket Tracking
        const socketUrl = window.location.protocol === 'https:' ? `https://${window.location.host}/ws` : 'http://localhost:8080/ws';
        const socket = new SockJS(socketUrl);
        const stompClient = new Client({
            webSocketFactory: () => socket,
            onConnect: () => {
                stompClient.subscribe(`/topic/orders/${userId}`, (message) => {
                    const updatedOrder = JSON.parse(message.body);
                    setAllOrders(prev => prev.map(o => o.id === updatedOrder.id ? updatedOrder : o));
                    if (activeTrackingRef.current === updatedOrder.id) {
                        selectOrderToTrack(updatedOrder);
                    }
                    toast.success(`Order #${updatedOrder.id} is now ${updatedOrder.status} 🚚`);
                });
            }
        });
        stompClient.activate();
        return () => stompClient.deactivate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId]);

    const selectOrderToTrack = async (selectedOrder) => {
        activeTrackingRef.current = selectedOrder.id;
        setOrder(selectedOrder);
        setLoading(false);
        
        let finalDestination = [20.5937, 78.9629]; 
        const rawAddress = selectedOrder.shippingAddress || "";

        // 🚀 LATLNG PIN EXTRACTOR
        if (rawAddress.includes('LATLNG:')) {
            try {
                const coordsPart = rawAddress.split('LATLNG:')[1].trim();
                const [lat, lng] = coordsPart.split(',');
                finalDestination = [parseFloat(lat), parseFloat(lng)];
            } catch(e) {}
        } 
        
        if (finalDestination[0] === 20.5937) {
            let searchQueries = [];
            if (rawAddress.includes('|')) {
                const parts = rawAddress.split('|').map(p => p.trim());
                if (parts.length >= 7) {
                    searchQueries.push(`${parts[1]}, ${parts[6]}`); 
                    searchQueries.push(`${parts[2]}, ${parts[6]}`);
                    if (parts[6] && parts[6].length === 6) searchQueries.push(`${parts[6]}, India`);
                    searchQueries.push(`${parts[2]}, ${parts[3]}`); 
                }
            } else {
                let safeAddress = rawAddress.replace(/[.#]/g, ',').replace(/\b\d+[-/A-Za-z0-9]*\b\s*,?\s*/g, '').trim();
                const uniqueParts = [...new Set(safeAddress.split(',').map(p => p.trim()).filter(p => p.length > 2))];
                if (uniqueParts.length > 0) searchQueries.push(uniqueParts.join(', '));
                if (uniqueParts.length >= 2) searchQueries.push(uniqueParts.slice(-2).join(', '));
            }

            for (let query of searchQueries) {
                try {
                    const url = `https://nominatim.openstreetmap.org/search?format=json&countrycodes=in&limit=1&q=${encodeURIComponent(query)}`;
                    const geoRes = await fetch(url);
                    const geoData = await geoRes.json();
                    if (geoData && geoData.length > 0) {
                        finalDestination = [parseFloat(geoData[0].lat), parseFloat(geoData[0].lon)];
                        break; 
                    }
                } catch (geoError) {}
            }
        }

        // 🌍 TRANSIT ROUTING ENGINE
        let dynamicTransitHub = null;
        let tp = 0;
        let customRoute = [warehouse];
        const msg = selectedOrder.trackingMessage || "";
        
        if (selectedOrder.status === 'DELIVERED') {
            tp = 1;
            customRoute.push(finalDestination);
        } else if (selectedOrder.status === 'SHIPPED') {
            let extractedCity = null;
            const msgClean = msg.toLowerCase().replace(/[^a-z0-9\s]/g, '');
            const match = msgClean.match(/(?:at|in|to|from|reached|arrived|scan|hub|facility)\s+([a-z]+(?:\s+[a-z]+)?)/i);
            
            if (match && match[1]) {
                extractedCity = match[1].replace(/hub|facility|center/gi, '').trim();
            }

            if (extractedCity && extractedCity.length > 2) {
                try {
                    const tRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&countrycodes=in&limit=1&q=${encodeURIComponent(extractedCity)}`);
                    const tData = await tRes.json();
                    if (tData && tData.length > 0) {
                        dynamicTransitHub = {
                            name: extractedCity,
                            coords: [parseFloat(tData[0].lat), parseFloat(tData[0].lon)]
                        };
                    }
                } catch(e) {}
            }

            if (dynamicTransitHub) {
                const d1 = calculateDistance(warehouse, dynamicTransitHub.coords);
                const d2 = calculateDistance(dynamicTransitHub.coords, finalDestination);
                const totalDistance = d1 + d2;
                tp = totalDistance > 0 ? (d1 / totalDistance) : 0.5;
                customRoute.push(dynamicTransitHub.coords);
                customRoute.push(finalDestination);
            } else {
                tp = 0.05; 
                customRoute.push(finalDestination);
            }
        } else {
            tp = 0; 
            customRoute.push(finalDestination);
        }

        setTransitHub(dynamicTransitHub);
        setRoute(customRoute);
        setTruckPos(warehouse); 
        setTargetProgress(tp);
        setProgress(0); 
    };

    // 🚚 THE ANIMATION TIMER
    useEffect(() => {
        if (route.length === 0 || progress >= targetProgress) return; 
        const interval = setInterval(() => {
            setProgress((prev) => {
                const nextStep = prev + 0.01; 
                if (nextStep >= targetProgress) {
                    clearInterval(interval);
                    return targetProgress; 
                }
                return nextStep; 
            });
        }, 20);
        return () => clearInterval(interval);
    }, [route, targetProgress, progress]);

    // 🗺️ 🚀 THE TRUE GEOSPATIAL INTERPOLATION ENGINE
    useEffect(() => {
        if (route.length < 2) return;
        if (progress <= 0) return setTruckPos(route[0]);
        if (progress >= 1) return setTruckPos(route[route.length - 1]);

        let segmentDistances = [];
        let totalDist = 0;
        for (let i = 0; i < route.length - 1; i++) {
            const d = calculateDistance(route[i], route[i+1]);
            segmentDistances.push(d);
            totalDist += d;
        }

        if (totalDist === 0) return setTruckPos(route[0]);

        const targetDist = progress * totalDist;
        let walkedDist = 0;

        for (let i = 0; i < route.length - 1; i++) {
            const segDist = segmentDistances[i];
            if (walkedDist + segDist >= targetDist || i === route.length - 2) {
                let segProgress = segDist > 0 ? (targetDist - walkedDist) / segDist : 0;
                segProgress = Math.max(0, Math.min(1, segProgress)); 

                const startPoint = route[i];
                const endPoint = route[i+1];

                const currentLat = startPoint[0] + (endPoint[0] - startPoint[0]) * segProgress;
                const currentLng = startPoint[1] + (endPoint[1] - startPoint[1]) * segProgress;
                
                setTruckPos([currentLat, currentLng]);
                break;
            }
            walkedDist += segDist;
        }
    }, [progress, route]);

    if (loading) {
        return (
            <div className="min-h-screen bg-[#f8fafc] dark:bg-[#000000] flex flex-col items-center justify-center transition-colors duration-700">
                <div className="relative w-20 h-20 mb-6">
                    <div className="absolute inset-0 border-t-4 border-blue-600 dark:border-cyan-500 rounded-full animate-spin"></div>
                    <div className="absolute inset-2 border-r-4 border-indigo-500 dark:border-purple-500 rounded-full animate-[spin_1.5s_linear_infinite_reverse]"></div>
                </div>
                <p className="text-[10px] sm:text-xs font-black text-gray-500 dark:text-gray-400 tracking-widest uppercase animate-pulse">Loading Map...</p>
            </div>
        );
    }
    
    if (!order) {
        return (
            <div className="min-h-screen bg-[#f8fafc] dark:bg-[#000000] flex flex-col items-center justify-center transition-colors duration-700 p-6">
                <span className="text-6xl mb-6">📭</span>
                <h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight text-center">No Active Orders</h2>
                <p className="text-gray-500 dark:text-gray-400 mt-2 text-center">Place an order to see live tracking details here.</p>
            </div>
        );
    }

    const isVisuallyShipped = order.status === 'SHIPPED' || order.status === 'DELIVERED';

    return (
        <div className="min-h-screen bg-[#f8fafc] dark:bg-[#000000] pb-32 pt-8 md:py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-700 relative overflow-hidden animate-[fadeIn_0.5s_ease-out]">
            
            {/* 🌌 CLEAN DOT MATRIX AMBIENT BACKGROUND */}
            <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
                <div className="absolute top-[-10%] left-[-10%] w-[80vw] h-[80vw] bg-[radial-gradient(circle,rgba(59,130,246,0.06)_0%,transparent_70%)] dark:bg-[radial-gradient(circle,rgba(6,182,212,0.05)_0%,transparent_70%)] rounded-full blur-[100px] animate-pulse" style={{ animationDuration: '10s' }}></div>
                <div className="absolute bottom-[-20%] right-[-10%] w-[90vw] h-[90vw] bg-[radial-gradient(circle,rgba(99,102,241,0.06)_0%,transparent_70%)] dark:bg-[radial-gradient(circle,rgba(217,70,239,0.05)_0%,transparent_70%)] rounded-full blur-[100px] animate-pulse" style={{ animationDuration: '12s' }}></div>
                <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] dark:bg-[radial-gradient(#334155_1px,transparent_1px)] bg-[size:24px_24px] opacity-60 dark:opacity-40 [mask-image:radial-gradient(ellipse_80%_80%_at_50%_0%,#000_30%,transparent_100%)]"></div>
            </div>

            <div className="max-w-6xl mx-auto relative z-10">
                
                {/* 📋 Header & Dropdown */}
                <div className="mb-8 bg-white/80 dark:bg-[#050505]/80 backdrop-blur-xl p-6 sm:p-8 rounded-[2rem] shadow-lg dark:shadow-[0_0_30px_rgba(0,0,0,0.5)] border border-gray-200/50 dark:border-white/[0.05] flex flex-col sm:flex-row items-center justify-between gap-6">
                    <div className="text-center sm:text-left">
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 dark:bg-cyan-500/10 border border-blue-100 dark:border-cyan-500/20 mb-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 dark:bg-cyan-400 animate-pulse"></span>
                            <span className="text-[10px] font-black tracking-widest uppercase text-blue-600 dark:text-cyan-400">GPS Active</span>
                        </div>
                        <h1 className="text-3xl sm:text-4xl font-black text-gray-900 dark:text-white tracking-tight">
                            <ScrambleText text="Live Tracking" />
                        </h1>
                    </div>
                    
                    <select 
                        value={order.id} 
                        onChange={(e) => {
                            activeTrackingRef.current = null;
                            selectOrderToTrack(allOrders.find(o => o.id === parseInt(e.target.value)));
                        }}
                        className="p-4 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#111] text-gray-900 dark:text-white font-bold outline-none cursor-pointer focus:ring-2 focus:ring-blue-500 transition-all w-full sm:w-auto min-w-[250px] shadow-inner"
                    >
                        {allOrders.map(o => (
                            <option key={o.id} value={o.id}>Order #{o.id} • {o.status}</option>
                        ))}
                    </select>
                </div>

                {/* 🚀 Active Status Banner */}
                {isVisuallyShipped && (
                    <div className={`p-5 sm:p-6 rounded-t-[2rem] shadow-lg flex items-center gap-4 sm:gap-6 animate-fade-in-up border-b border-white/20 transition-colors ${order.status === 'DELIVERED' ? 'bg-gradient-to-r from-emerald-500 to-green-600' : 'bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-cyan-500 dark:to-blue-600'}`}>
                        <div className="w-12 h-12 sm:w-16 sm:h-16 bg-white/20 rounded-full flex items-center justify-center text-2xl sm:text-3xl shrink-0 backdrop-blur-md">
                            <span className={order.status !== 'DELIVERED' ? 'animate-pulse' : ''}>{order.status === 'DELIVERED' ? '🎉' : '🚚'}</span>
                        </div>
                        <div>
                            <p className="text-[10px] sm:text-xs font-black text-white/80 uppercase tracking-widest mb-1 drop-shadow-sm">Latest Scan</p>
                            <p className="font-black text-lg sm:text-2xl text-white tracking-tight drop-shadow-md">{order.status === 'DELIVERED' ? 'Delivered successfully!' : (order.trackingMessage || 'Processing at Hub')}</p>
                        </div>
                    </div>
                )}

                {/* 🗺️ Main Map & Details Layout */}
                <div className={`grid grid-cols-1 lg:grid-cols-3 gap-0 bg-white/90 dark:bg-[#0a0a0a]/90 backdrop-blur-2xl shadow-2xl border border-gray-200/50 dark:border-white/[0.05] overflow-hidden mb-10 ${(!isVisuallyShipped) ? 'rounded-[2rem]' : 'rounded-b-[2rem] rounded-tr-[2rem]'}`}>
                    
                    {/* Left: The Map Container */}
                    <div className="lg:col-span-2 h-[350px] sm:h-[450px] lg:h-[650px] relative z-10 bg-gray-100 dark:bg-[#020202] border-b lg:border-b-0 lg:border-r border-gray-200 dark:border-white/[0.05]">
                        
                        {/* 🚨 THE MAGIC TRICK: This single class seamlessly inverts the map in Dark Mode! */}
                        <div className="absolute inset-0 [&_.leaflet-layer]:dark:invert [&_.leaflet-layer]:dark:hue-rotate-180 [&_.leaflet-layer]:dark:brightness-90 [&_.leaflet-layer]:dark:contrast-100 transition-all duration-700 z-0">
                            {route.length > 0 && truckPos && (
                                <MapContainer key={`${order.id}-${route.length}`} center={truckPos} zoom={5} style={{ height: '100%', width: '100%' }}>
                                    <TileLayer 
                                        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" 
                                        attribution='&copy; <a href="https://carto.com/">Carto</a>'
                                    />
                                    
                                    {route.map((pos, index) => {
                                        if (index === 0) return <Marker key="start" position={pos} icon={facilityIcon}><Popup><b className="text-gray-900">Hyderabad</b><br/>Main Hub</Popup></Marker>;
                                        if (index === route.length - 1) return <Marker key="end" position={pos} icon={homeIcon}><Popup><b className="text-green-600">Destination</b><br/>Delivery Location</Popup></Marker>;
                                        return <Marker key={`transit-${index}`} position={pos} icon={facilityIcon}><Popup><b className="text-blue-600">Transit Hub</b><br/>{transitHub?.name}</Popup></Marker>;
                                    })}

                                    <Marker position={truckPos} icon={truckIcon} zIndexOffset={1000}>
                                        <Popup><b className="text-gray-900">ProCart Delivery</b></Popup>
                                    </Marker>

                                    <Polyline positions={route} color="#3b82f6" weight={5} dashArray="10, 10" className="animate-pulse" opacity={0.8} />
                                </MapContainer>
                            )}
                        </div>
                    </div>

                    {/* Right: The Tracking Details */}
                    <div className="p-6 sm:p-8 flex flex-col h-full relative z-10 bg-white dark:bg-transparent">
                        
                        <div className="mb-8 pb-8 border-b border-gray-100 dark:border-white/10">
                            <h3 className="font-black text-gray-900 dark:text-white text-xl sm:text-2xl mb-6 tracking-tight">Delivery Details</h3>
                            <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] mb-2">Shipping To</p>
                            
                            <div className="bg-gray-50 dark:bg-[#111] p-4 sm:p-5 rounded-2xl border border-gray-200 dark:border-white/5 shadow-inner">
                                <p className="text-gray-800 dark:text-gray-200 font-medium text-sm leading-relaxed whitespace-pre-wrap">
                                    {order.shippingAddress || 'Address not provided'}
                                </p>
                            </div>
                            
                            <div className="mt-8">
                                <div className="flex justify-between items-center mb-3">
                                    <span className="font-black text-gray-900 dark:text-white uppercase tracking-widest text-[10px] sm:text-xs">Journey Progress</span>
                                    <span className={`font-black text-lg sm:text-xl ${progress >= 0.99 ? 'text-emerald-500' : 'text-blue-600 dark:text-cyan-400'}`}>
                                        {Math.round(progress * 100)}%
                                    </span>
                                </div>
                                <div className="w-full bg-gray-100 dark:bg-[#111] h-3 sm:h-4 rounded-full overflow-hidden shadow-inner relative border border-gray-200 dark:border-white/5">
                                    <div className={`h-full transition-all duration-500 absolute left-0 top-0 bottom-0 ${progress >= 0.99 ? 'bg-emerald-500' : 'bg-blue-600 dark:bg-cyan-500 shadow-[0_0_10px_rgba(59,130,246,0.8)]'}`} style={{ width: `${progress * 100}%` }}></div>
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                            <h3 className="font-black text-gray-900 dark:text-white text-lg mb-6">Timeline</h3>
                            <div className="border-l-2 border-gray-200 dark:border-gray-800 ml-4 pl-6 relative space-y-8 pb-4">
                                
                                <div className="relative">
                                    <span className="absolute -left-[33px] bg-gray-900 dark:bg-gray-100 text-white dark:text-black w-6 h-6 rounded-full flex items-center justify-center text-xs shadow-md">✓</span>
                                    <p className="font-black text-gray-900 dark:text-white">Order Confirmed</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-0.5">Processed securely.</p>
                                </div>

                                <div className="relative">
                                    <span className={`absolute -left-[33px] ${isVisuallyShipped ? 'bg-blue-600 dark:bg-cyan-500 text-white dark:text-black shadow-md' : 'bg-gray-100 dark:bg-[#111] border-2 border-gray-200 dark:border-gray-800 text-gray-400'} w-6 h-6 rounded-full flex items-center justify-center text-xs transition-colors duration-500`}>
                                        {isVisuallyShipped ? '✓' : '📦'}
                                    </span>
                                    <p className={`font-black ${isVisuallyShipped ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-600'}`}>Shipped</p>
                                </div>

                                {isVisuallyShipped && (
                                    <div className="relative">
                                        <span className="absolute -left-[33px] bg-indigo-500 dark:bg-purple-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs shadow-md animate-bounce">📍</span>
                                        <p className="font-black text-indigo-600 dark:text-purple-400">Current Status</p>
                                        <p className="text-xs sm:text-sm font-bold text-gray-700 dark:text-gray-300 mt-1">{order.trackingMessage || 'In transit to destination.'}</p>
                                    </div>
                                )}

                                <div className="relative">
                                    <span className={`absolute -left-[33px] ${order.status === 'DELIVERED' ? 'bg-emerald-500 text-white shadow-md' : 'bg-gray-100 dark:bg-[#111] border-2 border-gray-200 dark:border-gray-800 text-gray-400'} w-6 h-6 rounded-full flex items-center justify-center text-xs transition-colors duration-500`}>
                                        {order.status === 'DELIVERED' ? '✓' : '🏠'}
                                    </span>
                                    <p className={`font-black ${order.status === 'DELIVERED' ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400 dark:text-gray-600'}`}>Delivered</p>
                                </div>

                            </div>
                        </div>

                    </div>
                </div>
            </div>

            <style dangerouslySetInnerHTML={{__html: `
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                @keyframes fade-in-up { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
            `}} />
        </div>
    );
}

export default OrderTracking;