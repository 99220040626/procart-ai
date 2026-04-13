import React, { useState } from 'react';
import API from '../services/api';
import toast from 'react-hot-toast';
import { useCart } from '../context/CartContext'; 
import { useNavigate } from 'react-router-dom';   

const VoiceAssistant = () => {
    const [isListening, setIsListening] = useState(false);
    
    // Bring in the full power of the Cart Context
    const { cart, addToCart, removeFromCart, clearCart } = useCart();
    const navigate = useNavigate();

    const startListening = () => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            return toast.error("Your browser does not support Voice AI.", { icon: '⚠️' });
        }

        const recognition = new SpeechRecognition();
        recognition.lang = 'en-US';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        recognition.onstart = () => {
            setIsListening(true);
            toast("Listening... Speak now! 🎙️", { 
                icon: '🤖', 
                duration: 3000,
                style: { borderRadius: '100px', background: '#050505', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' } 
            });
        };

        recognition.onresult = async (event) => {
            const transcript = event.results[0][0].transcript;
            
            try {
                // Routes cleanly through the Proxy via API instance
                const response = await API.post('/voice/ask', { text: transcript });
                const { reply, action, product, productId, route } = response.data; 
                
                toast.success(reply, { 
                    duration: 4000, 
                    icon: '🗣️',
                    style: { borderRadius: '16px', background: '#050505', color: '#fff', border: '1px solid rgba(6,182,212,0.3)' }
                });
                
                speakOutLoud(reply); 
                
                // 🚀 ADVANCED UI INTERACTION LOGIC
                if (action === "ADD_TO_CART" && product) {
                    addToCart(product);
                } 
                else if (action === "REMOVE_FROM_CART" && productId) {
                    const itemToRemove = cart.find(item => item.id === productId || item.id === parseInt(productId));
                    if (itemToRemove) {
                        removeFromCart(itemToRemove.cartItemId || itemToRemove.id);
                    } else {
                        toast.error("That item isn't in your cart!", { icon: '🛒' });
                    }
                }
                else if (action === "CLEAR_CART") {
                    clearCart();
                }
                else if (action === "NAVIGATE" && route) {
                    navigate(route);
                }
                
            } catch (error) {
                console.error(error);
                toast.error("Failed to reach the AI server.");
            }
        };

        recognition.onerror = () => {
            setIsListening(false);
        };

        recognition.onend = () => {
            setIsListening(false);
        };

        recognition.start();
    };

    const speakOutLoud = (text) => {
        if (!text) return;
        const synth = window.speechSynthesis;
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1; 
        utterance.pitch = 1; 
        synth.speak(utterance);
    };

    return (
        // 📱 MOBILE AWARE: bottom-28 on mobile clears the nav pill, bottom-8 on desktop!
        <div className="fixed bottom-28 sm:bottom-8 left-4 sm:left-8 z-[100] flex flex-col items-center">
            
            {/* Glowing Aura when active */}
            {isListening && (
                <div className="absolute inset-0 w-14 h-14 sm:w-16 sm:h-16 bg-red-500 rounded-full animate-ping opacity-40 pointer-events-none"></div>
            )}
            
            <button 
                onClick={startListening}
                className={`relative w-14 h-14 sm:w-16 sm:h-16 rounded-full transition-all duration-500 flex items-center justify-center text-white border
                    ${isListening 
                        ? 'bg-red-500 border-red-400 scale-110 shadow-[0_0_40px_rgba(239,68,68,0.8)]' 
                        : 'bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-xl border-gray-200 dark:border-white/10 shadow-[0_10px_25px_rgba(0,0,0,0.1)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.8)] hover:scale-105 active:scale-95'
                    }`}
                title="ProCart Voice AI"
            >
                <span className="text-2xl sm:text-3xl filter drop-shadow-md">
                    {isListening ? '🛑' : '🎙️'}
                </span>
            </button>
            
            <span className={`mt-2.5 text-[9px] sm:text-[10px] font-black tracking-widest uppercase transition-colors duration-300
                ${isListening 
                    ? 'text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]' 
                    : 'text-gray-500 dark:text-gray-400 bg-white/80 dark:bg-black/50 backdrop-blur-md px-2.5 py-1 rounded-full border border-gray-200 dark:border-white/10 shadow-sm'}
            `}>
                Voice AI
            </span>
        </div>
    );
};

export default VoiceAssistant;