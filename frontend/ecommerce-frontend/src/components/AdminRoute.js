import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const AdminRoute = ({ children }) => {
    const [isVerifying, setIsVerifying] = useState(true);
    const [isAuthorized, setIsAuthorized] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem('token');
        const role = localStorage.getItem('role');

        // Simulate a secure encryption handshake delay (looks very premium)
        const verifyTimer = setTimeout(() => {
            if (!token) {
                // Not logged in at all
                setIsAuthorized(false);
            } else if (role !== 'ADMIN') {
                // Logged in, but trying to sneak into the Admin portal
                toast.error("Security Lock: Admin Authorization Required.", {
                    icon: '🛡️',
                    style: {
                        borderRadius: '16px',
                        background: '#050505',
                        color: '#ef4444',
                        border: '1px solid rgba(239,68,68,0.3)',
                    }
                });
                setIsAuthorized(false);
            } else {
                // Bouncer says: "Right this way, boss."
                setIsAuthorized(true);
            }
            setIsVerifying(false);
        }, 600); // 600ms delay for the visual security scan

        return () => clearTimeout(verifyTimer);
    }, []);

    // 🛡️ RESPONSIVE SECURITY SCAN UI (Looks perfect on Mobile & Laptop)
    if (isVerifying) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-[#000000] flex flex-col items-center justify-center transition-colors duration-700 z-[9999]">
                <div className="relative w-16 h-16 sm:w-20 sm:h-20 mb-6 sm:mb-8">
                    {/* Outer Ring */}
                    <div className="absolute inset-0 border-t-4 border-red-500 dark:border-rose-600 rounded-full animate-spin"></div>
                    {/* Inner Ring */}
                    <div className="absolute inset-2 border-r-4 border-gray-900 dark:border-white rounded-full animate-[spin_1s_linear_infinite_reverse]"></div>
                    {/* Center Icon */}
                    <div className="absolute inset-0 flex items-center justify-center text-lg sm:text-xl">🛡️</div>
                </div>
                <p className="text-[10px] sm:text-xs font-black text-gray-500 dark:text-gray-400 tracking-[0.3em] sm:tracking-[0.4em] uppercase animate-pulse text-center px-4">
                    Verifying Admin Clearance...
                </p>
            </div>
        );
    }

    // 🛑 KICK OUT UNAUTHORIZED USERS
    if (!isAuthorized) {
        const token = localStorage.getItem('token');
        // If no token, kick to login. If logged in but not admin, kick to home.
        return <Navigate to={!token ? "/login" : "/"} replace />;
    }

    // ✅ ACCESS GRANTED
    return children;
};

export default AdminRoute;