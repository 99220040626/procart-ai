import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';

// ==========================================
// ⚡ NATIVE SCROLL ANIMATION HOOK
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
// 🎮 ADDICTIVE MINI-GAME COMPONENT
// ==========================================
const QuantumReflexGame = () => {
    const [gameState, setGameState] = useState('idle'); // idle, playing, gameover
    const [score, setScore] = useState(0);
    const [highScore, setHighScore] = useState(parseInt(localStorage.getItem('procartHighScore') || '0'));
    const [targetPos, setTargetPos] = useState({ top: '50%', left: '50%' });
    const [timeLeft, setTimeLeft] = useState(100); 
    const timerRef = useRef(null);

    const startGame = () => {
        setScore(0);
        setGameState('playing');
        setTimeLeft(100);
        moveTarget();
    };

    const moveTarget = () => {
        const top = Math.floor(Math.random() * 80) + 10; 
        const left = Math.floor(Math.random() * 80) + 10;
        setTargetPos({ top: `${top}%`, left: `${left}%` });
    };

    const handleHit = (e) => {
        e.stopPropagation();
        if (gameState !== 'playing') return;
        
        const newScore = score + 1;
        setScore(newScore);
        if (newScore > highScore) {
            setHighScore(newScore);
            localStorage.setItem('procartHighScore', newScore.toString());
        }
        
        setTimeLeft(100);
        moveTarget();
    };

    useEffect(() => {
        if (gameState === 'playing') {
            // Speed logic: Normal speed until 15, then gets progressively faster
            let speedMultiplier = 0.5; 
            if (score >= 15) {
                speedMultiplier = 0.5 + ((score - 14) * 0.15); // Speeds up by 15% per point after 15
            }
            
            // Cap max speed so it's not impossible
            speedMultiplier = Math.min(speedMultiplier, 3.5);

            timerRef.current = setInterval(() => {
                setTimeLeft((prev) => {
                    if (prev <= 0) {
                        setGameState('gameover');
                        clearInterval(timerRef.current);
                        return 0;
                    }
                    return prev - speedMultiplier;
                });
            }, 20);
        }
        return () => clearInterval(timerRef.current);
    }, [gameState, score]);

    return (
        <div className="lg:col-span-2 rounded-[2rem] sm:rounded-[3rem] bg-white dark:bg-[#050505] border border-gray-200 dark:border-white/[0.08] overflow-hidden shadow-lg dark:shadow-2xl flex flex-col h-[350px] relative group">
            <div className="p-6 sm:p-8 flex justify-between items-center z-10 border-b border-gray-100 dark:border-white/[0.05]">
                <div>
                    <h3 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight">Speed Test</h3>
                    <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Test your reflexes</p>
                </div>
                <div className="text-right">
                    <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">High Score: {highScore}</p>
                    <p className="text-2xl font-black text-blue-600 dark:text-cyan-400">{score}</p>
                </div>
            </div>

            {/* Game Arena */}
            <div className="flex-1 relative bg-gray-50 dark:bg-[#0a0a0a] overflow-hidden cursor-crosshair" onClick={() => gameState === 'playing' && setGameState('gameover')}>
                
                {gameState === 'idle' && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-black/50 backdrop-blur-sm z-20">
                        <button onClick={startGame} className="px-8 py-3 bg-blue-600 dark:bg-cyan-500 text-white dark:text-black font-black rounded-full hover:scale-105 transition-transform shadow-lg shadow-blue-500/30">START GAME</button>
                    </div>
                )}

                {gameState === 'gameover' && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 dark:bg-black/80 backdrop-blur-md z-20">
                        <p className="text-2xl font-black text-gray-900 dark:text-white mb-2">TIME'S UP!</p>
                        <p className="text-gray-600 dark:text-gray-400 font-bold mb-6 text-lg">You scored: <span className="text-blue-600 dark:text-cyan-400 text-2xl">{score}</span></p>
                        <button onClick={startGame} className="px-8 py-3 bg-blue-600 dark:bg-cyan-500 text-white dark:text-black font-black rounded-full hover:scale-105 transition-transform shadow-lg shadow-blue-500/30">PLAY AGAIN</button>
                    </div>
                )}

                {/* The Target Node */}
                {gameState === 'playing' && (
                    <div 
                        onClick={handleHit}
                        className="absolute w-10 h-10 -ml-5 -mt-5 rounded-full bg-blue-500 dark:bg-cyan-400 flex items-center justify-center shadow-[0_0_20px_rgba(59,130,246,0.6)] dark:shadow-[0_0_20px_rgba(6,182,212,0.6)] active:scale-90"
                        style={{ top: targetPos.top, left: targetPos.left }}
                    >
                        <div className="w-4 h-4 bg-white rounded-full pointer-events-none"></div>
                    </div>
                )}

                {/* Shrinking Time Bar */}
                {gameState === 'playing' && (
                    <div className="absolute bottom-0 left-0 h-1.5 bg-gray-200 dark:bg-white/10 w-full">
                        <div className="h-full bg-blue-500 dark:bg-cyan-500 transition-all duration-75" style={{ width: `${timeLeft}%` }}></div>
                    </div>
                )}
            </div>
        </div>
    );
};

// ==========================================
// 🚀 MAIN DUAL-THEME HOME COMPONENT
// ==========================================
export default function Home() {
    // Smooth Loading Screen
    const [booting, setBooting] = useState(true);
    const [bootProgress, setBootProgress] = useState(0);

    // Live Dashboard Stats
    const [serverSpeed, setServerSpeed] = useState(12.4);
    const [databaseHealth, setDatabaseHealth] = useState(42.1);
    const [activeUsers, setActiveUsers] = useState(84.2);

    useEffect(() => {
        let progress = 0;
        const interval = setInterval(() => {
            progress += Math.random() * 20;
            if (progress >= 100) {
                setBootProgress(100);
                clearInterval(interval);
                setTimeout(() => setBooting(false), 400); 
            } else { setBootProgress(progress); }
        }, 50);
        return () => clearInterval(interval);
    }, []);

    // Simulate Genuine Live Platform Activity
    useEffect(() => {
        if (booting) return;
        const telemetry = setInterval(() => {
            setServerSpeed(prev => Math.min(100, Math.max(5, prev + (Math.random() * 8 - 4))));
            setDatabaseHealth(prev => Math.min(100, Math.max(20, prev + (Math.random() * 4 - 2))));
            setActiveUsers(prev => Math.min(100, Math.max(40, prev + (Math.random() * 16 - 8))));
        }, 2500);

        return () => clearInterval(telemetry);
    }, [booting]);

    // Scroll Triggers
    const [heroRef, heroVisible] = useIntersectionObserver();
    const [marqueeRef, marqueeVisible] = useIntersectionObserver();
    const [coreRef, coreVisible] = useIntersectionObserver();
    const [bentoRef, bentoVisible] = useIntersectionObserver();
    const [footerRef, footerVisible] = useIntersectionObserver();

    if (booting) {
        return (
            <div className="fixed inset-0 bg-[#f8fafc] dark:bg-[#000] z-[99999] flex flex-col items-center justify-center text-blue-600 dark:text-cyan-500 font-sans px-6 transition-colors duration-500">
                <div className="w-full max-w-xs mb-3 flex justify-between text-[10px] sm:text-xs tracking-[0.3em] font-black uppercase text-gray-400">
                    <span>Initiating Engine</span>
                    <span>{Math.floor(bootProgress)}%</span>
                </div>
                <div className="w-full max-w-xs h-[3px] bg-gray-200 dark:bg-gray-900 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 dark:from-cyan-400 dark:to-purple-500 transition-all duration-75 rounded-full" style={{ width: `${bootProgress}%` }}></div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-[#f8fafc] dark:bg-[#000000] min-h-screen font-sans selection:bg-blue-600 dark:selection:bg-cyan-500 selection:text-white dark:selection:text-black pb-10 relative overflow-hidden text-gray-900 dark:text-white transition-colors duration-700 animate-[fadeIn_0.8s_ease-out]">
            
            {/* 🌌 CLEAN, PREMIUM DOT MATRIX BACKGROUND */}
            <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
                {/* Very subtle ambient glows */}
                <div className="absolute top-[-10%] left-[-10%] w-[80vw] h-[80vw] bg-[radial-gradient(circle,rgba(59,130,246,0.06)_0%,transparent_70%)] dark:bg-[radial-gradient(circle,rgba(6,182,212,0.05)_0%,transparent_70%)] rounded-full blur-[100px] animate-pulse" style={{ animationDuration: '10s' }}></div>
                <div className="absolute bottom-[-20%] right-[-10%] w-[90vw] h-[90vw] bg-[radial-gradient(circle,rgba(99,102,241,0.06)_0%,transparent_70%)] dark:bg-[radial-gradient(circle,rgba(217,70,239,0.05)_0%,transparent_70%)] rounded-full blur-[100px] animate-pulse" style={{ animationDuration: '12s' }}></div>
                
                {/* Vercel-Style Premium Dot Matrix */}
                <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] dark:bg-[radial-gradient(#334155_1px,transparent_1px)] bg-[size:24px_24px] opacity-60 dark:opacity-40 [mask-image:radial-gradient(ellipse_80%_80%_at_50%_0%,#000_10%,transparent_100%)]"></div>
            </div>

            {/* ========================================== */}
            {/* 🚀 STAGE 1: CINEMATIC HERO SECTION */}
            {/* ========================================== */}
            <div ref={heroRef} className={`relative z-10 pt-20 pb-32 sm:pt-32 sm:pb-40 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto flex flex-col items-center text-center transition-all duration-1000 ease-out ${heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
                
                {/* Greeting Pill */}
                <div className="group inline-flex items-center gap-3 px-6 py-2.5 sm:px-8 sm:py-3 rounded-full bg-white/90 dark:bg-[#0a0a0a]/90 border border-gray-200/50 dark:border-white/[0.08] backdrop-blur-2xl mb-8 sm:mb-12 shadow-[0_10px_30px_rgba(0,0,0,0.05)] dark:shadow-[0_10px_40px_rgba(0,0,0,0.8)] relative z-10 hover:scale-105 transition-transform">
                    <div className="relative flex items-center justify-center h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 dark:bg-cyan-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-600 dark:bg-cyan-500"></span>
                    </div>
                    <span className="text-[10px] sm:text-xs font-black tracking-[0.3em] uppercase text-gray-800 dark:text-gray-200">
                        <ScrambleText text="Welcome to ProCart" />
                    </span>
                </div>
                
                {/* Massive Liquid Headline */}
                <h1 className="text-[14vw] sm:text-7xl md:text-[6rem] lg:text-[8.5rem] font-black tracking-tighter mb-4 sm:mb-6 leading-[1.05] sm:leading-[0.9] w-full relative z-10">
                    <span className="text-gray-900 dark:text-white drop-shadow-sm">Premium Shopping.</span><br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 dark:from-cyan-300 dark:via-blue-500 dark:to-purple-500" style={{ backgroundSize: '200% auto', animation: 'gradientMove 6s ease infinite' }}>
                        Reimagined.
                    </span>
                </h1>
                
                <p className="mt-4 sm:mt-8 text-base sm:text-2xl text-gray-600 dark:text-gray-400 max-w-3xl font-medium mb-10 sm:mb-16 leading-relaxed px-4 relative z-10">
                    Discover top-tier electronics, everyday essentials, and premium gear. Fast shipping, secure payments, and absolute quality.
                </p>
                
                {/* High-End Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 w-full sm:w-auto relative z-20 px-6 sm:px-0">
                    
                    <div className="relative group w-full sm:w-auto">
                        <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-purple-600 dark:from-cyan-400 dark:to-purple-500 rounded-full blur opacity-20 group-hover:opacity-50 transition duration-500 group-hover:duration-200"></div>
                        <Link to="/products" className="relative flex items-center justify-center gap-3 px-8 py-4 sm:px-12 sm:py-5 text-base sm:text-lg font-black text-white bg-gray-900 dark:text-black dark:bg-white rounded-full overflow-hidden transition-all duration-300 active:scale-95 shadow-xl">
                            <span className="relative z-10 tracking-tight"><ScrambleText text="Start Shopping" /></span>
                            <svg className="w-5 h-5 relative z-10 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                        </Link>
                    </div>

                    <Link to="/login" className="px-8 py-4 sm:px-12 sm:py-5 text-base sm:text-lg font-bold text-gray-800 bg-white/80 border border-gray-200/50 hover:bg-white dark:text-gray-200 dark:bg-[#0a0a0a]/80 dark:border-white/10 dark:hover:bg-white/[0.05] backdrop-blur-2xl rounded-full transition-all duration-300 flex items-center justify-center shadow-sm hover:shadow-md">
                        Login / Sign Up
                    </Link>
                </div>

                {/* Animated Scroll Mouse Indicator */}
                <div className="absolute bottom-[-20px] sm:bottom-[-40px] left-1/2 -translate-x-1/2 flex flex-col items-center justify-center opacity-50 sm:opacity-80 animate-bounce cursor-default">
                    <div className="w-6 h-10 border-2 border-gray-400 dark:border-gray-500 rounded-full flex justify-center p-1">
                        <div className="w-1 h-2 bg-blue-600 dark:bg-cyan-400 rounded-full animate-[scrollWheel_1.5s_infinite]"></div>
                    </div>
                    <span className="text-[8px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 mt-2">Scroll</span>
                </div>
            </div>

            {/* ========================================== */}
            {/* 8. BRAND PARTNER MARQUEE */}
            {/* ========================================== */}
            <div ref={marqueeRef} className={`relative z-10 border-y border-gray-200/50 dark:border-white/[0.05] bg-white/50 dark:bg-black/50 backdrop-blur-2xl py-6 sm:py-8 overflow-hidden transition-opacity duration-1000 ${marqueeVisible ? 'opacity-100' : 'opacity-0'}`}>
                <div className="absolute inset-0 bg-gradient-to-r from-[#f8fafc] via-transparent to-[#f8fafc] dark:from-black dark:via-transparent dark:to-black z-10 pointer-events-none"></div>
                <div className="flex w-[400%] sm:w-[200%] animate-[slideLeft_40s_linear_infinite] items-center">
                    <span className="text-[10px] sm:text-xs font-black uppercase tracking-[0.3em] text-blue-600 dark:text-cyan-500 mr-8 ml-4 shrink-0 bg-blue-50 dark:bg-cyan-500/10 px-4 py-2 rounded-full border border-blue-100 dark:border-cyan-500/20">TRUSTED GLOBALLY</span>
                    {[...Array(2)].map((_, idx) => (
                        <div key={idx} className="flex justify-around flex-1 items-center gap-8 px-4">
                            <span className="text-xl sm:text-3xl font-black text-gray-400 dark:text-gray-800 tracking-tighter">SAMSUNG</span>
                            <span className="text-xl sm:text-3xl font-black text-gray-400 dark:text-gray-800 tracking-tighter">APPLE</span>
                            <span className="text-xl sm:text-3xl font-black text-gray-400 dark:text-gray-800 tracking-tighter">SONY</span>
                            <span className="text-xl sm:text-3xl font-black text-gray-400 dark:text-gray-800 tracking-tighter">NIKE</span>
                            <span className="text-xl sm:text-3xl font-black text-gray-400 dark:text-gray-800 tracking-tighter">DELL</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* ========================================== */}
            {/* 🧠 STAGE 3: LIVE PLATFORM ACTIVITY */}
            {/* ========================================== */}
            <div ref={coreRef} className={`max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-32 relative z-10 transition-all duration-1000 ${coreVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
                <div className="bg-white/80 dark:bg-[#030303]/80 backdrop-blur-3xl border border-gray-200/50 dark:border-white/[0.05] rounded-[2rem] sm:rounded-[3rem] p-8 sm:p-16 relative overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.05)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.8)]">
                    
                    <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 dark:bg-cyan-500/5 blur-[100px] pointer-events-none"></div>
                    
                    <div className="flex flex-col lg:flex-row justify-between gap-10 lg:gap-16 relative z-10">
                        <div className="flex-1">
                            <h2 className="text-3xl sm:text-5xl font-black tracking-tight mb-4 text-gray-900 dark:text-white leading-tight">Live Platform<br/><span className="text-blue-600 dark:text-cyan-400">Activity.</span></h2>
                            <p className="text-gray-600 dark:text-gray-400 text-base sm:text-lg leading-relaxed font-medium">Join thousands of shoppers currently exploring our marketplace. Our enterprise-grade servers ensure a fast, secure, and seamless experience.</p>
                        </div>
                        
                        <div className="flex-1 space-y-6 sm:space-y-8 w-full bg-gray-50/50 dark:bg-[#0a0a0a]/50 p-6 sm:p-8 rounded-3xl border border-gray-200/50 dark:border-white/[0.02]">
                            <div>
                                <div className="flex justify-between text-xs sm:text-sm font-bold text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-widest"><span>Server Speed</span> <span className="text-blue-600 dark:text-cyan-400 font-black">Excellent ({serverSpeed.toFixed(1)}ms)</span></div>
                                <div className="h-2 sm:h-2.5 w-full bg-gray-200 dark:bg-white/5 rounded-full overflow-hidden"><div className="h-full bg-blue-500 dark:bg-cyan-500 transition-all duration-1000 ease-out rounded-full" style={{ width: `${serverSpeed}%` }}></div></div>
                            </div>
                            <div>
                                <div className="flex justify-between text-xs sm:text-sm font-bold text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-widest"><span>Database Health</span> <span className="text-purple-600 dark:text-purple-400 font-black">Optimal</span></div>
                                <div className="h-2 sm:h-2.5 w-full bg-gray-200 dark:bg-white/5 rounded-full overflow-hidden"><div className="h-full bg-purple-500 transition-all duration-1000 ease-out rounded-full" style={{ width: `${databaseHealth}%` }}></div></div>
                            </div>
                            <div>
                                <div className="flex justify-between text-xs sm:text-sm font-bold text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-widest"><span>Active Users</span> <span className="text-emerald-600 dark:text-emerald-400 font-black">{Math.floor(activeUsers * 123)} Online</span></div>
                                <div className="h-2 sm:h-2.5 w-full bg-gray-200 dark:bg-white/5 rounded-full overflow-hidden"><div className="h-full bg-emerald-500 transition-all duration-1000 ease-out rounded-full" style={{ width: `${activeUsers}%` }}></div></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ========================================== */}
            {/* 🍱 STAGE 4: SIMPLE E-COMMERCE FEATURES + GAME */}
            {/* ========================================== */}
            <div ref={bentoRef} className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-20 relative z-10 transition-all duration-1000 ${bentoVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
                <div className="mb-12 sm:mb-20 text-center sm:text-left">
                    <h2 className="text-4xl sm:text-6xl font-black tracking-tight mb-4 text-gray-900 dark:text-white leading-[1.1]">
                        Everything you need.<br className="hidden sm:block"/> <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-cyan-400 dark:to-purple-500">Nothing you don't.</span>
                    </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 auto-rows-auto lg:auto-rows-[350px]">
                    
                    {/* Game Box */}
                    <QuantumReflexGame />

                    {/* Card 2 */}
                    <div className="rounded-[2rem] sm:rounded-[3rem] bg-white/80 dark:bg-[#050505]/80 backdrop-blur-2xl border border-gray-200/50 dark:border-white/[0.05] p-8 sm:p-12 shadow-[0_15px_40px_rgba(0,0,0,0.05)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)] hover:-translate-y-2 transition-all duration-500 flex flex-col justify-between group">
                        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-[1.5rem] bg-purple-50 dark:bg-purple-500/10 flex items-center justify-center mb-8 border border-purple-100 dark:border-purple-500/20 text-3xl sm:text-4xl group-hover:scale-110 transition-transform shadow-inner">🛡️</div>
                        <div>
                            <h3 className="text-2xl sm:text-3xl font-black mb-3 text-gray-900 dark:text-white tracking-tight">Bank-Grade Security</h3>
                            <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base font-medium">Your data is locked down with industry-leading encryption. Shop with 100% peace of mind.</p>
                        </div>
                    </div>

                    {/* Card 3 */}
                    <div className="rounded-[2rem] sm:rounded-[3rem] bg-white/80 dark:bg-[#050505]/80 backdrop-blur-2xl border border-gray-200/50 dark:border-white/[0.05] p-8 sm:p-12 shadow-[0_15px_40px_rgba(0,0,0,0.05)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)] hover:-translate-y-2 transition-all duration-500 flex flex-col justify-between group">
                        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-[1.5rem] bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center mb-8 border border-emerald-100 dark:border-emerald-500/20 text-3xl sm:text-4xl group-hover:scale-110 transition-transform shadow-inner">🚚</div>
                        <div>
                            <h3 className="text-2xl sm:text-3xl font-black mb-3 text-gray-900 dark:text-white tracking-tight">Live Order Tracking</h3>
                            <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base font-medium">Know exactly where your package is at all times with our real-time delivery map.</p>
                        </div>
                    </div>

                    {/* Card 4 */}
                    <div className="lg:col-span-2 rounded-[2rem] sm:rounded-[3rem] bg-white/80 dark:bg-[#050505]/80 backdrop-blur-2xl border border-gray-200/50 dark:border-white/[0.05] p-8 sm:p-12 shadow-[0_15px_40px_rgba(0,0,0,0.05)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)] hover:-translate-y-2 transition-all duration-500 flex flex-col justify-between group">
                        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-[1.5rem] bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center mb-8 border border-indigo-100 dark:border-indigo-500/20 text-3xl sm:text-4xl group-hover:scale-110 transition-transform shadow-inner">💳</div>
                        <div>
                            <h3 className="text-3xl sm:text-4xl font-black mb-4 text-gray-900 dark:text-white tracking-tight">Flexible Payments</h3>
                            <p className="text-gray-600 dark:text-gray-400 text-base sm:text-lg leading-relaxed max-w-lg font-medium">Pay exactly how you want. We support all major Credit Cards, UPI, Net Banking, and Cash on Delivery natively.</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* ========================================== */}
            {/* 👑 STAGE 5: BEAUTIFUL ARCHITECT FOOTER */}
            {/* ========================================== */}
            <div ref={footerRef} className={`max-w-[100rem] mx-auto px-4 mt-10 sm:mt-20 relative z-10 mb-10 transition-all duration-1000 ${footerVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
                <div className="p-[1px] rounded-[3rem] sm:rounded-[5rem] bg-gradient-to-b from-gray-300 dark:from-white/[0.15] to-transparent dark:via-white/[0.02] shadow-xl dark:shadow-[0_0_100px_rgba(6,182,212,0.05)]">
                    <div className="bg-white dark:bg-[#020202] rounded-[3rem] sm:rounded-[5rem] p-8 py-20 sm:p-32 text-center relative overflow-hidden flex flex-col items-center border border-gray-100 dark:border-white/[0.05]">
                        
                        {/* Soft Glow */}
                        <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[400px] sm:w-[800px] h-[300px] sm:h-[500px] bg-[radial-gradient(ellipse_at_top,rgba(59,130,246,0.15)_0%,transparent_70%)] dark:bg-[radial-gradient(ellipse_at_top,rgba(6,182,212,0.15)_0%,transparent_70%)] pointer-events-none mix-blend-multiply dark:mix-blend-screen animate-pulse"></div>
                        
                        <div className="relative z-10 mb-8 sm:mb-12 border border-gray-200 dark:border-white/20 px-8 py-3 rounded-full bg-gray-50 dark:bg-[#050505] shadow-sm backdrop-blur-md">
                            <p className="text-[10px] sm:text-xs font-black text-gray-500 dark:text-gray-300 tracking-[0.4em] uppercase"><ScrambleText text="CHIEF ARCHITECT" /></p>
                        </div>
                        
                        <h2 className="text-3xl sm:text-5xl md:text-7xl lg:text-[6.5rem] font-black text-transparent bg-clip-text bg-gradient-to-b from-gray-900 to-gray-500 dark:from-white dark:via-gray-300 dark:to-[#111] mb-16 sm:mb-32 tracking-tighter relative z-10 leading-[0.9] drop-shadow-sm dark:drop-shadow-2xl">
                            MANYAM SIVA <br /> SANTHOSH KUMAR REDDY
                        </h2>
                        
                        <div className="w-full max-w-5xl grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 relative z-10">
                            {[
                                { t: "Frontend", d: "React 18", i: "⚛️", c: "blue", dc: "cyan" },
                                { t: "Backend", d: "Spring Boot", i: "⚙️", c: "purple", dc: "fuchsia" },
                                { t: "Design", d: "Tailwind CSS", i: "✨", c: "green", dc: "emerald" },
                                { t: "Database", d: "MySQL", i: "🗄️", c: "indigo", dc: "indigo" }
                            ].map((spec, i) => (
                                <div key={i} className={`bg-gray-50/80 dark:bg-[#080808]/80 backdrop-blur-xl p-6 sm:p-10 rounded-[1.5rem] sm:rounded-[2.5rem] border border-gray-200 dark:border-white/[0.05] flex flex-col items-center text-center shadow-sm dark:shadow-none hover:-translate-y-2 transition-transform duration-300 hover:border-${spec.c}-300 dark:hover:border-${spec.dc}-500/50`}>
                                    <div className={`w-10 h-10 sm:w-14 sm:h-14 bg-${spec.c}-100 dark:bg-${spec.dc}-500/10 rounded-full flex items-center justify-center mb-4 sm:mb-6 text-xl sm:text-2xl`}><span className={`text-${spec.c}-600 dark:text-${spec.dc}-400`}>{spec.i}</span></div>
                                    <p className="text-[10px] sm:text-xs text-gray-500 font-black uppercase tracking-[0.3em] mb-2">{spec.t}</p>
                                    <p className="text-base sm:text-xl font-black text-gray-900 dark:text-white">{spec.d}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* 🛠️ GLOBAL ANIMATIONS */}
            <style dangerouslySetInnerHTML={{__html: `
                @keyframes gradientMove { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
                @keyframes slideLeft { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes scrollWheel { 0% { transform: translateY(0); opacity: 1; } 100% { transform: translateY(12px); opacity: 0; } }
            `}} />
        </div>
    );
}