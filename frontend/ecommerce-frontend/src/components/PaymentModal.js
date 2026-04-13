import React, { useState } from 'react';

export default function PaymentModal({ isOpen, onClose, onConfirm, totalAmount }) {
    const [isProcessing, setIsProcessing] = useState(false);

    if (!isOpen) return null;

    // Your exact secure UPI Details
    const upiId = "6281134837@ybl";
    const payeeName = "MANYAM SIVA SANTHOSH KUMAR REDDY";
    
    // Generates the deep link and QR code
    const upiLink = encodeURI(`upi://pay?pa=${upiId}&pn=${payeeName}&am=${totalAmount}&cu=INR`);
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${upiLink}`;

    const handlePaidClick = () => {
        setIsProcessing(true);
        // Simulate a 2-second "verifying payment" delay to make it feel authentic
        setTimeout(() => {
            onConfirm(); 
            setIsProcessing(false);
        }, 2000);
    };

    return (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-xl flex items-center justify-center p-4 animate-[fadeIn_0.3s_ease-out]">
            <div className="bg-white/95 dark:bg-[#0a0a0a]/95 backdrop-blur-3xl w-full max-w-sm p-8 rounded-[2.5rem] shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-gray-200/50 dark:border-white/[0.08] flex flex-col items-center text-center relative animate-[slideUp_0.4s_ease-out]">
                
                {/* Close Button */}
                <button onClick={onClose} disabled={isProcessing} className="absolute top-6 right-6 w-8 h-8 rounded-full bg-gray-100 dark:bg-white/10 flex items-center justify-center text-gray-500 hover:text-gray-900 dark:hover:text-white font-bold transition-colors">
                    ✕
                </button>

                {/* Secure Icon */}
                <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500 rounded-2xl flex items-center justify-center text-3xl mb-4 border border-emerald-100 dark:border-emerald-500/20 shadow-inner">
                    💳
                </div>
                
                <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight mb-1">Secure Checkout</h2>
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                    Amount Due: <span className="text-blue-600 dark:text-cyan-400 text-sm tracking-normal">₹{totalAmount.toLocaleString()}</span>
                </p>
                
                {/* Vault-Style QR Box with Laser Scan Effect */}
                <div className="bg-white p-4 rounded-3xl shadow-inner border border-gray-200 mb-6 relative overflow-hidden group w-56 h-56 flex items-center justify-center">
                    {/* The animated scanning laser */}
                    <div className="absolute inset-0 bg-gradient-to-b from-blue-500/30 to-transparent h-12 w-full -translate-y-full animate-[scan_2.5s_ease-in-out_infinite] z-10 pointer-events-none border-b border-blue-500/50"></div>
                    <img 
                        src={qrCodeUrl} 
                        alt="UPI QR Code" 
                        className="w-full h-full object-contain mix-blend-multiply relative z-0"
                    />
                </div>
                
                {/* Verified Merchant Details */}
                <div className="mb-8 w-full bg-gray-50 dark:bg-[#111] p-4 rounded-2xl border border-gray-100 dark:border-white/5 shadow-inner">
                    <div className="flex items-center justify-center gap-1.5 mb-1">
                        <span className="text-emerald-500 text-sm">✓</span>
                        <p className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">Verified Merchant</p>
                    </div>
                    <p className="text-xs font-bold text-gray-900 dark:text-white truncate px-2">{payeeName}</p>
                    <p className="text-[10px] font-mono text-gray-400 mt-1">{upiId}</p>
                    <p className="text-[9px] text-gray-400 mt-3 uppercase tracking-wider font-bold">Accepts PhonePe, GPay, Paytm</p>
                </div>
                
                {/* Action Buttons */}
                <div className="w-full flex flex-col gap-3">
                    <button 
                        onClick={handlePaidClick}
                        disabled={isProcessing} 
                        className="w-full py-4 rounded-xl font-black text-sm transition-all duration-300 active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed bg-gray-900 dark:bg-white text-white dark:text-black shadow-lg dark:shadow-[0_0_20px_rgba(255,255,255,0.2)] uppercase tracking-widest"
                    >
                        {isProcessing ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white dark:border-black border-t-transparent rounded-full animate-spin"></div> 
                                VERIFYING...
                            </>
                        ) : 'I HAVE PAID'}
                    </button>
                    
                    <button 
                        onClick={onClose} 
                        disabled={isProcessing} 
                        className="w-full py-3 rounded-xl font-bold text-[10px] uppercase tracking-[0.2em] text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
                    >
                        Cancel Request
                    </button>
                </div>
            </div>

            {/* Custom Animations */}
            <style dangerouslySetInnerHTML={{__html: `
                @keyframes scan { 
                    0% { transform: translateY(-100%); } 
                    100% { transform: translateY(500%); } 
                }
                @keyframes slideUp { 
                    from { transform: translateY(20px) scale(0.95); opacity: 0; } 
                    to { transform: translateY(0) scale(1); opacity: 1; } 
                }
                @keyframes fadeIn { 
                    from { opacity: 0; } 
                    to { opacity: 1; } 
                }
            `}} />
        </div>
    );
}