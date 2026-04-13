import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
// 🚀 MAIN REGISTER COMPONENT
// ==========================================
export default function Register() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: ''
    });
    const [isLoading, setIsLoading] = useState(false);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            // Adjust this endpoint if your backend uses a different URL (like /users/register)
            await API.post('/auth/register', formData);
            toast.success("Account created! Welcome to the Matrix. 🚀");
            navigate('/login');
        } catch (error) {
            toast.error(error.response?.data?.message || "Registration failed. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-[calc(100vh-80px)] bg-slate-50 dark:bg-[#000000] flex items-center justify-center p-4 sm:p-6 transition-colors duration-700 relative overflow-hidden">
            
            {/* 🌌 DUAL-THEME AMBIENT GLOW BACKGROUND */}
            <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
                <div className="absolute top-[-10%] left-[-10%] w-[80vw] h-[80vw] sm:w-[50vw] sm:h-[50vw] bg-[radial-gradient(circle,rgba(59,130,246,0.15)_0%,transparent_60%)] dark:bg-[radial-gradient(circle,rgba(6,182,212,0.08)_0%,transparent_60%)] rounded-full blur-[100px] mix-blend-multiply dark:mix-blend-screen animate-pulse" style={{ animationDuration: '10s' }}></div>
                <div className="absolute bottom-[-20%] right-[-10%] w-[90vw] h-[90vw] sm:w-[50vw] sm:h-[50vw] bg-[radial-gradient(circle,rgba(168,85,247,0.15)_0%,transparent_60%)] dark:bg-[radial-gradient(circle,rgba(217,70,239,0.06)_0%,transparent_60%)] rounded-full blur-[100px] mix-blend-multiply dark:mix-blend-screen animate-pulse" style={{ animationDuration: '12s' }}></div>
                
                {/* Clean Dot Matrix */}
                <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] dark:bg-[radial-gradient(#334155_1px,transparent_1px)] bg-[size:24px_24px] opacity-60 dark:opacity-40 [mask-image:radial-gradient(ellipse_80%_80%_at_50%_0%,#000_20%,transparent_100%)]"></div>
            </div>

            {/* 🛡️ REGISTRATION CARD */}
            <div className="relative z-10 w-full max-w-md animate-[fadeIn_0.5s_ease-out]">
                
                <div className="bg-white/80 dark:bg-[#050505]/80 backdrop-blur-2xl border border-gray-200 dark:border-white/[0.08] rounded-[2rem] sm:rounded-[3rem] p-8 sm:p-12 shadow-2xl dark:shadow-[0_20px_50px_rgba(0,0,0,0.8)]">
                    
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 mx-auto bg-blue-50 dark:bg-cyan-500/10 rounded-2xl flex items-center justify-center mb-6 border border-blue-100 dark:border-cyan-500/20 shadow-inner">
                            <span className="text-3xl">👋</span>
                        </div>
                        <h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight mb-2">
                            <ScrambleText text="Create an Account" />
                        </h2>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Join the ultimate premium shopping experience.</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        
                        {/* Full Name */}
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 ml-1">Full Name</label>
                            <div className="relative group">
                                <span className="absolute left-4 top-3.5 text-gray-400 dark:text-gray-500">👤</span>
                                <input 
                                    type="text" 
                                    name="name"
                                    required
                                    placeholder="John Doe"
                                    value={formData.name}
                                    onChange={handleChange}
                                    className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-gray-200 dark:border-white/[0.05] bg-gray-50 dark:bg-[#0a0a0a] text-gray-900 dark:text-white shadow-inner outline-none focus:border-blue-500 dark:focus:border-cyan-500 focus:ring-1 focus:ring-blue-500 dark:focus:ring-cyan-500 transition-all font-bold text-sm"
                                />
                            </div>
                        </div>

                        {/* Email */}
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 ml-1">Email Address</label>
                            <div className="relative group">
                                <span className="absolute left-4 top-3.5 text-gray-400 dark:text-gray-500">✉️</span>
                                <input 
                                    type="email" 
                                    name="email"
                                    required
                                    placeholder="john@example.com"
                                    value={formData.email}
                                    onChange={handleChange}
                                    className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-gray-200 dark:border-white/[0.05] bg-gray-50 dark:bg-[#0a0a0a] text-gray-900 dark:text-white shadow-inner outline-none focus:border-blue-500 dark:focus:border-cyan-500 focus:ring-1 focus:ring-blue-500 dark:focus:ring-cyan-500 transition-all font-bold text-sm"
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 ml-1">Password</label>
                            <div className="relative group">
                                <span className="absolute left-4 top-3.5 text-gray-400 dark:text-gray-500">🔒</span>
                                <input 
                                    type="password" 
                                    name="password"
                                    required
                                    placeholder="••••••••"
                                    value={formData.password}
                                    onChange={handleChange}
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
                                <span className="animate-pulse">PROCESSING...</span>
                            ) : (
                                "REGISTER NOW"
                            )}
                        </button>
                    </form>

                    <div className="mt-8 text-center border-t border-gray-100 dark:border-white/[0.05] pt-6">
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                            Already have an account?{' '}
                            <Link to="/login" className="text-blue-600 dark:text-cyan-400 font-bold hover:underline transition-colors">
                                Log in
                            </Link>
                        </p>
                    </div>
                </div>
            </div>

            <style dangerouslySetInnerHTML={{__html: `
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
            `}} />
        </div>
    );
}