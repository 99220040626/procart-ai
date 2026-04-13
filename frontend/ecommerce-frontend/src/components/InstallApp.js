import React, { useState, useEffect } from 'react';

export default function InstallApp() {
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [isInstallable, setIsInstallable] = useState(false);
    const [isDismissed, setIsDismissed] = useState(false);

    useEffect(() => {
        // The browser fires this event when it determines the app meets PWA criteria
        const handleBeforeInstallPrompt = (e) => {
            e.preventDefault(); // Prevent the default mini-infobar from appearing
            setDeferredPrompt(e); // Save the event so it can be triggered later
            setIsInstallable(true); // Show our custom premium button
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    }, []);

    const handleInstallClick = async () => {
        if (!deferredPrompt) return;
        
        // Show the browser's official install prompt
        deferredPrompt.prompt();
        
        // Wait for the user to respond to the prompt
        const { outcome } = await deferredPrompt.userChoice;
        
        if (outcome === 'accepted') {
            console.log('User accepted the install prompt');
        } else {
            console.log('User dismissed the install prompt');
        }
        
        // We can only use the prompt once, so clear it
        setDeferredPrompt(null);
        setIsInstallable(false);
    };

    // Hide if not installable or if the user explicitly dismissed our custom UI
    if (!isInstallable || isDismissed) return null;

    return (
        <div className="fixed top-20 sm:top-24 left-1/2 -translate-x-1/2 z-[100] animate-[slideDown_0.5s_ease-out]">
            
            {/* 💎 Glassmorphism Dynamic Pill */}
            <div className="bg-white/95 dark:bg-[#050505]/95 backdrop-blur-3xl border border-gray-200/50 dark:border-white/[0.08] p-1.5 pl-5 pr-1.5 rounded-full shadow-2xl dark:shadow-[0_20px_50px_rgba(0,0,0,0.8)] flex items-center gap-4">
                
                {/* Text Info */}
                <div className="flex flex-col py-1">
                    <span className="text-[11px] sm:text-xs font-black text-gray-900 dark:text-white uppercase tracking-wider leading-none mb-0.5">
                        ProCart Native
                    </span>
                    <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest leading-none">
                        Install for best experience
                    </span>
                </div>

                {/* Install Action */}
                <button 
                    onClick={handleInstallClick}
                    className="bg-blue-600 dark:bg-cyan-500 text-white dark:text-black px-5 py-2.5 rounded-full font-black text-[10px] uppercase tracking-widest shadow-md hover:scale-105 active:scale-95 transition-transform flex items-center gap-2"
                >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                    GET
                </button>

                {/* Dismiss Button */}
                <button 
                    onClick={() => setIsDismissed(true)} 
                    className="w-8 h-8 rounded-full bg-gray-100 dark:bg-white/10 flex items-center justify-center text-gray-500 hover:text-gray-900 dark:hover:text-white font-bold transition-colors ml-1"
                >
                    ✕
                </button>
            </div>

            {/* Custom Animation */}
            <style dangerouslySetInnerHTML={{__html: `
                @keyframes slideDown { 
                    from { transform: translate(-50%, -20px); opacity: 0; } 
                    to { transform: translate(-50%, 0); opacity: 1; } 
                }
            `}} />
        </div>
    );
}