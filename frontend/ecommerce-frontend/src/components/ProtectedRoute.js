import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const ProtectedRoute = ({ children, isAdmin = false }) => {
    const [isVerifying, setIsVerifying] = useState(true);
    const [isAuthorized, setIsAuthorized] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem('token');
        const role = localStorage.getItem('role');

        // Simulate a secure encryption handshake delay (makes the app feel incredibly premium)
        const verifyTimer = setTimeout(() => {
            if (!token) {
                // Not logged in at all
                toast.error("Please log in to access this secure area.", {
                    icon: '🔒',
                    style: {
                        borderRadius: '16px',
                        background: '#050505',
                        color: '#fff',
                        border: '1px solid rgba(255,255,255,0.1)',
                    }
                });
                setIsAuthorized(false);
            } else if (isAdmin && role !== 'ADMIN') {
                // Logged in, but trying to sneak into an Admin-only route
                toast.error("Security Lock: Admin Clearance Required.", {
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
                // Bouncer says: "Right this way."
                setIsAuthorized(true);
            }
            setIsVerifying(false);
        }, 500); // 500ms delay for the visual security scan

        return () => clearTimeout(verifyTimer);
    }, [isAdmin]);

    // 🔒 RESPONSIVE SECURITY SCAN UI (Looks perfect on Mobile & Laptop)
    if (isVerifying) {
        return (
            <div className="fixed inset-0 min-h-screen bg-slate-50 dark:bg-[#000000] flex flex-col items-center justify-center transition-colors duration-700 z-[9999]">
                <div className="relative w-16 h-16 sm:w-20 sm:h-20 mb-6 sm:mb-8">
                    {/* Outer Ring */}
                    <div className={`absolute inset-0 border-t-4 rounded-full animate-spin ${isAdmin ? 'border-red-500 dark:border-rose-600' : 'border-blue-500 dark:border-cyan-500'}`}></div>
                    {/* Inner Ring */}
                    <div className="absolute inset-2 border-r-4 border-gray-900 dark:border-white rounded-full animate-[spin_1s_linear_infinite_reverse]"></div>
                    {/* Center Icon */}
                    <div className="absolute inset-0 flex items-center justify-center text-lg sm:text-xl">
                        {isAdmin ? '🛡️' : '🔒'}
                    </div>
                </div>
                <p className="text-[10px] sm:text-xs font-black text-gray-500 dark:text-gray-400 tracking-[0.3em] sm:tracking-[0.4em] uppercase animate-pulse text-center px-4">
                    {isAdmin ? 'Verifying Admin Clearance...' : 'Authenticating Session...'}
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

export default ProtectedRoute;