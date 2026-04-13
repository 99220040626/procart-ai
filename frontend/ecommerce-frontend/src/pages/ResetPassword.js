import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import API from '../services/api';
import toast from 'react-hot-toast'; 

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
// 🚀 MAIN RESET PASSWORD COMPONENT
// ==========================================
function ResetPassword() {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');

    const handleResetSubmit = async (e) => {
        e.preventDefault();
        
        if (!token) {
            toast.error("Invalid link. Please request a new password reset.");
            return;
        }

        if (password !== confirmPassword) {
            toast.error("Passwords do not match!");
            return;
        }

        if (password.length < 6) {
            toast.error("Password must be at least 6 characters.");
            return;
        }

        setIsLoading(true);
        try {
            await API.post('/auth/reset-password', { 
                token: token, 
                newPassword: password 
            });
            
            toast.success("Password successfully reset! 🎉");
            navigate('/login');
            
        } catch (error) {
            console.error("Reset Error:", error);
            toast.error(error.response?.data || "Link expired. Please request a new one.");
        } finally {
            setIsLoading(false);
        }
    };

    // --- INVALID OR MISSING TOKEN SCREEN ---
    if (!token) {
        return (
            <div className="min-h-[calc(100vh-80px)] bg-slate-50 dark:bg-[#000000] flex items-center justify-center p-4 sm:p-6 transition-colors duration-700 relative overflow-hidden">
                
                {/* 🌌 AMBIENT BACKGROUND */}
                <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
                    <div className="absolute top-[-10%] left-[-10%] w-[80vw] h-[80vw] sm:w-[50vw] sm:h-[50vw] bg-[radial-gradient(circle,rgba(239,68,68,0.15)_0%,transparent_60%)] dark:bg-[radial-gradient(circle,rgba(239,68,68,0.08)_0%,transparent_60%)] rounded-full blur-[100px] animate-pulse" style={{ animationDuration: '10s' }}></div>
                    <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] dark:bg-[radial-gradient(#334155_1px,transparent_1px)] bg-[size:24px_24px] opacity-60 dark:opacity-40 [mask-image:radial-gradient(ellipse_80%_80%_at_50%_0%,#000_20%,transparent_100%)]"></div>
                </div>

                <div className="relative z-10 w-full max-w-md animate-[fadeIn_0.5s_ease-out]">
                    <div className="bg-white/80 dark:bg-[#050505]/80 backdrop-blur-2xl border border-gray-200 dark:border-white/[0.08] rounded-[2rem] sm:rounded-[3rem] p-8 sm:p-12 text-center shadow-2xl dark:shadow-[0_20px_50px_rgba(0,0,0,0.8)]">
                        <div className="w-16 h-16 mx-auto bg-red-50 dark:bg-red-500/10 rounded-2xl flex items-center justify-center mb-6 border border-red-100 dark:border-red-500/20 shadow-inner">
                            <span className="text-3xl">🔗</span>
                        </div>
                        <h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight mb-2">
                            <ScrambleText text="Link Expired" />
                        </h2>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-8 leading-relaxed">
                            This password reset link is invalid or has expired. Please request a new one.
                        </p>
                        <Link to="/login" className="w-full flex items-center justify-center py-4 bg-gray-900 dark:bg-white text-white dark:text-black hover:bg-blue-600 dark:hover:bg-cyan-400 rounded-xl font-black text-sm transition-all duration-300 shadow-lg active:scale-95 uppercase tracking-widest">
                            RETURN TO LOGIN
                        </Link>
                    </div>
                </div>

                <style dangerouslySetInnerHTML={{__html: `@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }`}} />
            </div>
        );
    }

    // --- VALID TOKEN PASSWORD RESET SCREEN ---
    return (
        <div className="min-h-[calc(100vh-80px)] bg-slate-50 dark:bg-[#000000] flex items-center justify-center p-4 sm:p-6 transition-colors duration-700 relative overflow-hidden">
            
            {/* 🌌 DUAL-THEME AMBIENT GLOW BACKGROUND */}
            <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
                <div className="absolute top-[-10%] left-[-10%] w-[80vw] h-[80vw] sm:w-[50vw] sm:h-[50vw] bg-[radial-gradient(circle,rgba(59,130,246,0.15)_0%,transparent_60%)] dark:bg-[radial-gradient(circle,rgba(6,182,212,0.08)_0%,transparent_60%)] rounded-full blur-[100px] mix-blend-multiply dark:mix-blend-screen animate-pulse" style={{ animationDuration: '10s' }}></div>
                <div className="absolute bottom-[-20%] right-[-10%] w-[90vw] h-[90vw] sm:w-[50vw] sm:h-[50vw] bg-[radial-gradient(circle,rgba(168,85,247,0.15)_0%,transparent_60%)] dark:bg-[radial-gradient(circle,rgba(217,70,239,0.06)_0%,transparent_60%)] rounded-full blur-[100px] mix-blend-multiply dark:mix-blend-screen animate-pulse" style={{ animationDuration: '12s' }}></div>
                <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] dark:bg-[radial-gradient(#334155_1px,transparent_1px)] bg-[size:24px_24px] opacity-60 dark:opacity-40 [mask-image:radial-gradient(ellipse_80%_80%_at_50%_0%,#000_20%,transparent_100%)]"></div>
            </div>

            {/* 🛡️ RESET CARD */}
            <div className="relative z-10 w-full max-w-md animate-[fadeIn_0.5s_ease-out]">
                
                <div className="bg-white/80 dark:bg-[#050505]/80 backdrop-blur-2xl border border-gray-200 dark:border-white/[0.08] rounded-[2rem] sm:rounded-[3rem] p-8 sm:p-12 shadow-2xl dark:shadow-[0_20px_50px_rgba(0,0,0,0.8)]">
                    
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 mx-auto bg-blue-50 dark:bg-cyan-500/10 rounded-2xl flex items-center justify-center mb-6 border border-blue-100 dark:border-cyan-500/20 shadow-inner">
                            <span className="text-3xl">🔐</span>
                        </div>
                        <h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight mb-2">
                            <ScrambleText text="New Password" />
                        </h2>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Secure your account with a strong password.</p>
                    </div>

                    <form onSubmit={handleResetSubmit} className="space-y-5">
                        
                        {/* New Password */}
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 ml-1">New Password</label>
                            <div className="relative group">
                                <span className="absolute left-4 top-3.5 text-gray-400 dark:text-gray-500">✨</span>
                                <input 
                                    type="password" 
                                    required
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-gray-200 dark:border-white/[0.05] bg-gray-50 dark:bg-[#0a0a0a] text-gray-900 dark:text-white shadow-inner outline-none focus:border-blue-500 dark:focus:border-cyan-500 focus:ring-1 focus:ring-blue-500 dark:focus:ring-cyan-500 transition-all font-bold text-sm"
                                />
                            </div>
                        </div>

                        {/* Confirm Password */}
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 ml-1">Confirm Password</label>
                            <div className="relative group">
                                <span className="absolute left-4 top-3.5 text-gray-400 dark:text-gray-500">✅</span>
                                <input 
                                    type="password" 
                                    required
                                    placeholder="••••••••"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-gray-200 dark:border-white/[0.05] bg-gray-50 dark:bg-[#0a0a0a] text-gray-900 dark:text-white shadow-inner outline-none focus:border-blue-500 dark:focus:border-cyan-500 focus:ring-1 focus:ring-blue-500 dark:focus:ring-cyan-500 transition-all font-bold text-sm"
                                />
                            </div>
                        </div>

                        {/* Submit Button */}
                        <button 
                            type="submit" 
                            disabled={isLoading}
                            className={`w-full mt-4 py-4 rounded-xl font-black text-sm transition-all duration-300 active:scale-95 flex items-center justify-center gap-2 ${isLoading ? 'bg-gray-300 dark:bg-gray-800 text-gray-500 cursor-not-allowed' : 'bg-blue-600 dark:bg-cyan-500 text-white dark:text-black hover:bg-blue-700 dark:hover:bg-cyan-400 shadow-lg shadow-blue-500/30 dark:shadow-[0_0_20px_rgba(6,182,212,0.4)]'}`}
                        >
                            {isLoading ? (
                                <span className="animate-pulse">SAVING SECURELY...</span>
                            ) : (
                                "SAVE NEW PASSWORD"
                            )}
                        </button>
                    </form>
                </div>
            </div>

            <style dangerouslySetInnerHTML={{__html: `
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
            `}} />
        </div>
    );
}

export default ResetPassword;