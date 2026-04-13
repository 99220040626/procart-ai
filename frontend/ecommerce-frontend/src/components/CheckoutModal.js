import React, { useState } from 'react';

export default function CheckoutModal({ isOpen, onClose, onConfirm, totalAmount }) {
    const [isProcessing, setIsProcessing] = useState(false);
    const [paymentStatus, setPaymentStatus] = useState("init"); // init, pending, verified
    const [txnId, setTxnId] = useState(null);

    if (!isOpen) return null;

    // 🚀 Step 1: Request PhonePe Link from Backend
    const handlePhonePeClick = async () => {
        setIsProcessing(true);
        try {
            const currentUserId = localStorage.getItem('userId') || "GUEST_123";
            
            const response = await fetch('http://localhost:8080/api/payment/phonepe-init', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount: totalAmount, userId: currentUserId })
            });
            
            const data = await response.json();
            
            if (data.redirectUrl) {
                setTxnId(data.transactionId);
                setPaymentStatus("pending");
                // Open PhonePe in a new tab so they don't lose the cart
                window.open(data.redirectUrl, '_blank');
            } else {
                alert("Failed to initialize PhonePe Gateway.");
            }
        } catch (error) {
            console.error("Payment Error:", error);
            alert("Network error connecting to payment gateway.");
        }
        setIsProcessing(false);
    };

    // 🚀 Step 2: User confirms they paid in the new tab
    const handleVerify = () => {
        setIsProcessing(true);
        // Simulate backend verification delay
        setTimeout(() => {
            onConfirm(); // Generates the final order!
            setIsProcessing(false);
        }, 2000);
    };

    return (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-xl flex items-center justify-center p-4 animate-[fadeIn_0.3s_ease-out]">
            <div className="bg-white/95 dark:bg-[#0a0a0a]/95 backdrop-blur-3xl w-full max-w-sm p-8 rounded-[2.5rem] shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-gray-200/50 dark:border-white/[0.08] flex flex-col items-center text-center relative animate-[slideUp_0.4s_ease-out]">
                
                <button onClick={onClose} disabled={isProcessing} className="absolute top-6 right-6 w-8 h-8 rounded-full bg-gray-100 dark:bg-white/10 flex items-center justify-center text-gray-500 hover:text-gray-900 dark:hover:text-white font-bold transition-colors">
                    ✕
                </button>

                <div className="w-16 h-16 bg-purple-50 dark:bg-purple-500/10 text-purple-600 rounded-2xl flex items-center justify-center text-3xl mb-4 border border-purple-100 dark:border-purple-500/20 shadow-inner">
                    पे
                </div>
                
                <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight mb-1">PhonePe Gateway</h2>
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                    Amount Due: <span className="text-blue-600 dark:text-cyan-400 text-sm tracking-normal">₹{totalAmount.toLocaleString()}</span>
                </p>
                
                <div className="mb-8 w-full bg-gray-50 dark:bg-[#111] p-4 rounded-2xl border border-gray-100 dark:border-white/5 shadow-inner">
                    <div className="flex items-center justify-center gap-1.5 mb-1">
                        <span className="text-purple-600 text-sm">✓</span>
                        <p className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">UAT Secure Test Mode</p>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-3 uppercase tracking-wider font-bold">No real money will be deducted</p>
                    {txnId && <p className="text-[9px] font-mono text-blue-500 mt-2">TXN: {txnId}</p>}
                </div>
                
                <div className="w-full flex flex-col gap-3">
                    {paymentStatus === "init" ? (
                        <button 
                            onClick={handlePhonePeClick}
                            disabled={isProcessing} 
                            className="w-full py-4 rounded-xl font-black text-sm transition-all duration-300 active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed bg-purple-600 text-white shadow-lg shadow-purple-600/30 uppercase tracking-widest"
                        >
                            {isProcessing ? 'CONNECTING...' : 'PAY WITH PHONEPE'}
                        </button>
                    ) : (
                        <button 
                            onClick={handleVerify}
                            disabled={isProcessing} 
                            className="w-full py-4 rounded-xl font-black text-sm transition-all duration-300 active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 uppercase tracking-widest"
                        >
                            {isProcessing ? 'VERIFYING...' : 'I COMPLETED THE PAYMENT'}
                        </button>
                    )}
                    
                    <button 
                        onClick={onClose} 
                        disabled={isProcessing} 
                        className="w-full py-3 rounded-xl font-bold text-[10px] uppercase tracking-[0.2em] text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
                    >
                        Cancel Request
                    </button>
                </div>
            </div>
        </div>
    );
}