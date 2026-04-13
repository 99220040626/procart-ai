import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import API from '../services/api';
import toast from 'react-hot-toast'; 

import { GoogleLogin } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';

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
// 🚀 MAIN LOGIN COMPONENT
// ==========================================
function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    
    const [isForgotPassword, setIsForgotPassword] = useState(false);
    
    // 2FA States
    const [isOtpView, setIsOtpView] = useState(false);
    const [otp, setOtp] = useState('');
    
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        try {
            const response = await API.post('/auth/login', { email, password });
            
            // Intercept Admin 2FA
            if (response.status === 202 && response.data.message === 'OTP_REQUIRED') {
                setIsOtpView(true);
                toast.success("Security Check: Verification code sent! 🛡️");
                setIsLoading(false);
                return; // Stop here, wait for OTP
            }

            // Normal User Flow
            finalizeLogin(response.data);

        } catch (err) {
            setError('Invalid credentials. Please verify your email and password.');
            setIsLoading(false);
        }
    };

    // Handle submitting the 6-digit code
    const handleVerifyOtp = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        try {
            const response = await API.post('/auth/verify-otp', { email, otp });
            toast.success("Admin Verified! Welcome to Command. 👑");
            finalizeLogin(response.data);
        } catch (err) {
            setError("Invalid verification code. Please try again.");
            setIsLoading(false);
        }
    };

    // Helper function to handle saving tokens and navigating
    const finalizeLogin = (data) => {
        localStorage.setItem('token', data.token);
        localStorage.setItem('role', data.role);
        localStorage.setItem('userId', data.userId); 
        localStorage.setItem('email', email); 
        navigate(data.role === 'ADMIN' ? '/admin' : '/products');
    };

    const handleForgotSubmit = async (e) => {
        e.preventDefault();
        if (!email) {
            toast.error("Please enter your email address first.");
            return;
        }
        
        setIsLoading(true);
        try {
            await API.post('/auth/forgot-password', { email });
            toast.success("Reset link sent! Please check your inbox. 📧");
            setIsForgotPassword(false); 
        } catch (err) {
            toast.success("If this email is registered, a reset link has been sent! 📧");
            setIsForgotPassword(false);
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleSuccess = async (credentialResponse) => {
        try {
            const decoded = jwtDecode(credentialResponse.credential);
            const response = await API.post('/auth/google', {
                email: decoded.email,
                name: decoded.name
            });

            localStorage.setItem('token', response.data.token);
            localStorage.setItem('role', response.data.role);
            localStorage.setItem('userId', response.data.userId);
            localStorage.setItem('email', decoded.email);

            toast.success(`Welcome back, ${decoded.name}! 🚀`);
            navigate(response.data.role === 'ADMIN' ? '/admin' : '/products');
            
        } catch (error) {
            console.error("Backend Google Login Error", error);
            toast.error("Could not complete Google login with the server.");
        }
    };

    return (
        <div className="min-h-[calc(100vh-80px)] bg-slate-50 dark:bg-[#000000] flex items-center justify-center p-4 sm:p-6 transition-colors duration-700 relative overflow-hidden">
            
            {/* 🌌 DUAL-THEME AMBIENT GLOW BACKGROUND */}
            <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
                <div className="absolute top-[-10%] left-[-10%] w-[80vw] h-[80vw] sm:w-[50vw] sm:h-[50vw] bg-[radial-gradient(circle,rgba(59,130,246,0.15)_0%,transparent_60%)] dark:bg-[radial-gradient(circle,rgba(6,182,212,0.08)_0%,transparent_60%)] rounded-full blur-[100px] mix-blend-multiply dark:mix-blend-screen animate-pulse" style={{ animationDuration: '10s' }}></div>
                <div className="absolute bottom-[-20%] right-[-10%] w-[90vw] h-[90vw] sm:w-[50vw] sm:h-[50vw] bg-[radial-gradient(circle,rgba(168,85,247,0.15)_0%,transparent_60%)] dark:bg-[radial-gradient(circle,rgba(217,70,239,0.06)_0%,transparent_60%)] rounded-full blur-[100px] mix-blend-multiply dark:mix-blend-screen animate-pulse" style={{ animationDuration: '12s' }}></div>
                <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] dark:bg-[radial-gradient(#334155_1px,transparent_1px)] bg-[size:24px_24px] opacity-60 dark:opacity-40 [mask-image:radial-gradient(ellipse_80%_80%_at_50%_0%,#000_20%,transparent_100%)]"></div>
            </div>

            {/* 🛡️ LOGIN CARD */}
            <div className="relative z-10 w-full max-w-md animate-[fadeIn_0.5s_ease-out]">
                <div className="bg-white/80 dark:bg-[#050505]/80 backdrop-blur-2xl border border-gray-200 dark:border-white/[0.08] rounded-[2rem] sm:rounded-[3rem] p-8 sm:p-12 shadow-2xl dark:shadow-[0_20px_50px_rgba(0,0,0,0.8)] relative overflow-hidden">
                    
                    {/* Error Banner */}
                    {error && (
                        <div className="absolute top-0 left-0 w-full bg-red-500 text-white text-xs font-bold text-center py-2 animate-[fadeIn_0.3s_ease-out] z-20">
                            {error}
                        </div>
                    )}

                    {/* --- 2FA OTP VIEW --- */}
                    {isOtpView ? (
                        <div className="animate-[slideLeft_0.4s_ease-out] text-center pt-2">
                            <div className="w-16 h-16 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-6 border border-red-100 dark:border-red-500/20 shadow-inner">
                                🛡️
                            </div>
                            <h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight mb-2">
                                <ScrambleText text="Security Check" />
                            </h2>
                            <p className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-8">
                                Enter the 6-digit code sent to <span className="font-bold text-gray-700 dark:text-gray-300">{email}</span>.
                            </p>

                            <form onSubmit={handleVerifyOtp} className="space-y-6">
                                <div className="relative group">
                                    <input 
                                        type="text" 
                                        maxLength="6"
                                        placeholder="------" 
                                        value={otp} 
                                        onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))} // Force numbers only
                                        required 
                                        className="w-full text-center tracking-[1em] font-black text-2xl px-5 py-4 bg-gray-50 dark:bg-[#0a0a0a] border border-gray-200 dark:border-white/[0.05] rounded-xl text-gray-900 dark:text-white shadow-inner outline-none focus:border-red-500 dark:focus:border-red-400 focus:ring-1 focus:ring-red-500 dark:focus:ring-red-400 transition-all duration-300"
                                    />
                                </div>
                                
                                <button disabled={isLoading || otp.length !== 6} className={`w-full py-4 rounded-xl font-black text-sm transition-all duration-300 active:scale-95 flex items-center justify-center gap-2 ${isLoading || otp.length !== 6 ? 'bg-gray-300 dark:bg-gray-800 text-gray-500 cursor-not-allowed' : 'bg-red-600 dark:bg-red-500 text-white dark:text-black hover:bg-red-700 dark:hover:bg-red-400 shadow-lg shadow-red-500/30 dark:shadow-[0_0_20px_rgba(239,68,68,0.4)]'}`}>
                                    {isLoading ? <span className="animate-pulse">VERIFYING...</span> : 'VERIFY & ENTER'}
                                </button>
                            </form>
                        </div>
                    ) : 
                    
                    /* --- FORGOT PASSWORD VIEW --- */
                    isForgotPassword ? (
                        <div className="animate-[slideLeft_0.4s_ease-out] pt-2">
                            <div className="text-center mb-8">
                                <div className="w-16 h-16 bg-blue-50 dark:bg-cyan-500/10 text-blue-600 dark:text-cyan-400 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-6 border border-blue-100 dark:border-cyan-500/20 shadow-inner">
                                    🔐
                                </div>
                                <h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight mb-2">
                                    <ScrambleText text="Reset Password" />
                                </h2>
                                <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">
                                    Enter your email address to receive a secure reset link.
                                </p>
                            </div>

                            <form onSubmit={handleForgotSubmit} className="space-y-6">
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 ml-1">Email Address</label>
                                    <div className="relative group">
                                        <span className="absolute left-4 top-3.5 text-gray-400 dark:text-gray-500">✉️</span>
                                        <input 
                                            type="email" 
                                            required
                                            placeholder="you@example.com"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-gray-200 dark:border-white/[0.05] bg-gray-50 dark:bg-[#0a0a0a] text-gray-900 dark:text-white shadow-inner outline-none focus:border-blue-500 dark:focus:border-cyan-500 focus:ring-1 focus:ring-blue-500 dark:focus:ring-cyan-500 transition-all font-bold text-sm"
                                        />
                                    </div>
                                </div>
                                
                                <button disabled={isLoading} className={`w-full py-4 rounded-xl font-black text-sm transition-all duration-300 active:scale-95 flex items-center justify-center gap-2 ${isLoading ? 'bg-gray-300 dark:bg-gray-800 text-gray-500 cursor-not-allowed' : 'bg-blue-600 dark:bg-cyan-500 text-white dark:text-black hover:bg-blue-700 dark:hover:bg-cyan-400 shadow-lg shadow-blue-500/30 dark:shadow-[0_0_20px_rgba(6,182,212,0.4)]'}`}>
                                    {isLoading ? <span className="animate-pulse">TRANSMITTING...</span> : 'SEND RESET LINK'}
                                </button>
                                
                                <button type="button" onClick={() => setIsForgotPassword(false)} className="w-full py-3 text-[11px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                                    ← Return to Login
                                </button>
                            </form>
                        </div>

                    ) : (
                    
                    /* --- STANDARD LOGIN VIEW --- */
                        <div className="animate-[fadeIn_0.5s_ease-out] pt-2">
                            <div className="text-center mb-8">
                                <div className="w-16 h-16 mx-auto bg-blue-50 dark:bg-cyan-500/10 rounded-2xl flex items-center justify-center mb-6 border border-blue-100 dark:border-cyan-500/20 shadow-inner">
                                    <span className="text-3xl">👋</span>
                                </div>
                                <h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight mb-2">
                                    <ScrambleText text="Welcome Back" />
                                </h2>
                                <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">Access your premium dashboard.</p>
                            </div>
                            
                            <form onSubmit={handleLogin} className="space-y-5">
                                
                                {/* Email */}
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 ml-1">Email Address</label>
                                    <div className="relative group">
                                        <span className="absolute left-4 top-3.5 text-gray-400 dark:text-gray-500">✉️</span>
                                        <input 
                                            type="email" 
                                            required
                                            placeholder="you@example.com"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-gray-200 dark:border-white/[0.05] bg-gray-50 dark:bg-[#0a0a0a] text-gray-900 dark:text-white shadow-inner outline-none focus:border-blue-500 dark:focus:border-cyan-500 focus:ring-1 focus:ring-blue-500 dark:focus:ring-cyan-500 transition-all font-bold text-sm"
                                        />
                                    </div>
                                </div>
                                
                                {/* Password */}
                                <div className="space-y-1.5">
                                    <div className="flex justify-between items-center px-1">
                                        <label className="text-[11px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400">Password</label>
                                        <span onClick={() => setIsForgotPassword(true)} className="text-[10px] font-black uppercase tracking-wider text-blue-600 dark:text-cyan-500 hover:text-blue-800 dark:hover:text-cyan-300 cursor-pointer transition-colors">Forgot?</span>
                                    </div>
                                    <div className="relative group">
                                        <span className="absolute left-4 top-3.5 text-gray-400 dark:text-gray-500">🔒</span>
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
                                
                                {/* Submit Button */}
                                <button 
                                    type="submit" 
                                    disabled={isLoading}
                                    className={`w-full mt-6 py-4 rounded-xl font-black text-sm transition-all duration-300 active:scale-95 flex items-center justify-center gap-2 ${isLoading ? 'bg-gray-300 dark:bg-gray-800 text-gray-500 cursor-not-allowed' : 'bg-gray-900 dark:bg-white text-white dark:text-black hover:bg-blue-600 dark:hover:bg-cyan-400 shadow-lg dark:shadow-[0_0_20px_rgba(255,255,255,0.2)]'}`}
                                >
                                    {isLoading ? <span className="animate-pulse">PROCESSING...</span> : "SIGN IN"}
                                </button>
                            </form>

                            {/* Divider */}
                            <div className="mt-8 mb-6 relative">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-gray-200 dark:border-white/10"></div>
                                </div>
                                <div className="relative flex justify-center text-sm">
                                    <span className="px-4 bg-white dark:bg-[#050505] text-[10px] font-black text-gray-400 uppercase tracking-widest">Or connect with</span>
                                </div>
                            </div>

                            {/* Google Login */}
                            <div className="flex justify-center w-full mb-8">
                                <div className="scale-110 transform hover:scale-105 transition-transform duration-300">
                                    <GoogleLogin
                                        onSuccess={handleGoogleSuccess}
                                        onError={() => toast.error('Google authorization failed.')}
                                        useOneTap 
                                        theme="filled_black" 
                                        size="large" 
                                        shape="pill"
                                    />
                                </div>
                            </div>

                            <div className="text-center border-t border-gray-100 dark:border-white/[0.05] pt-6">
                                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                                    New to ProCart?{' '}
                                    <Link to="/register" className="text-blue-600 dark:text-cyan-400 font-bold hover:underline transition-colors">
                                        Create an account
                                    </Link>
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <style dangerouslySetInnerHTML={{__html: `
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                @keyframes slideLeft { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }
            `}} />
        </div>
    );
}

export default Login;