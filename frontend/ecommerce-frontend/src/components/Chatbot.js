import React, { useState, useEffect, useRef } from 'react';
import API from '../services/api';

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
// 🚀 MAIN CHATBOT COMPONENT
// ==========================================
function Chatbot() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        { text: "Hi there! 👋 I'm your ProCart Quantum AI. I can write code, answer trivia, track your order, or check live inventory prices. What's on your mind?", sender: 'bot' }
    ]);
    const [input, setInput] = useState('');
    const [context, setContext] = useState('none');
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isTyping, isOpen]);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!input.trim()) return;

        const userText = input.trim();
        setMessages(prev => [...prev, { text: userText, sender: 'user' }]);
        setInput('');
        setIsTyping(true);

        // 🚀 Grab User ID for financial/spending queries
        const currentUserId = localStorage.getItem('userId');

        try {
            const res = await API.post('/chat', { 
                message: userText, 
                context: context,
                userId: currentUserId || "guest"
            });
            
            setMessages(prev => [...prev, { text: res.data.reply, sender: 'bot' }]);
            setContext(res.data.context);
            setIsTyping(false);

        } catch (error) {
            setIsTyping(false);
            setMessages(prev => [...prev, { text: "Network interference. Please check your connection and try again. 🔌", sender: 'bot' }]);
        }
    };

    return (
        <div className="fixed bottom-6 right-6 z-[100] flex flex-col items-end">
            
            {/* 💬 Premium Glassmorphism Chat Window */}
            {isOpen && (
                <div className="bg-white/90 dark:bg-[#050505]/90 backdrop-blur-3xl w-[calc(100vw-3rem)] sm:w-[380px] h-[500px] max-h-[80vh] mb-6 rounded-[2rem] shadow-2xl dark:shadow-[0_10px_50px_rgba(6,182,212,0.15)] border border-gray-200/50 dark:border-white/[0.08] flex flex-col overflow-hidden animate-[slideUp_0.3s_ease-out]">
                    
                    {/* Header */}
                    <div className="bg-white dark:bg-[#0a0a0a] p-4 flex justify-between items-center border-b border-gray-100 dark:border-white/5">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-cyan-500/10 flex items-center justify-center text-xl border border-blue-100 dark:border-cyan-500/20 shadow-inner">
                                🤖
                            </div>
                            <div>
                                <h3 className="font-black text-gray-900 dark:text-white text-sm tracking-tight">
                                    <ScrambleText text="ProCart AI" />
                                </h3>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shadow-[0_0_5px_#10b981]"></span>
                                    <p className="text-[9px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-widest">Quantum Engine Online</p>
                                </div>
                            </div>
                        </div>
                        <button onClick={() => setIsOpen(false)} className="w-8 h-8 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors active:scale-95">
                            ✕
                        </button>
                    </div>

                    {/* Messages Area */}
                    <div className="flex-1 p-4 overflow-y-auto bg-slate-50/50 dark:bg-transparent space-y-4 custom-scrollbar">
                        {messages.map((msg, idx) => (
                            <div key={idx} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div 
                                    className={`max-w-[85%] p-3.5 rounded-2xl text-sm font-medium leading-relaxed shadow-sm ${msg.sender === 'user' ? 'bg-blue-600 dark:bg-cyan-500 text-white dark:text-black rounded-tr-sm' : 'bg-white dark:bg-[#111] text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-white/5 rounded-tl-sm'}`}
                                    dangerouslySetInnerHTML={msg.sender === 'bot' ? { __html: msg.text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br/>') } : undefined}
                                >
                                    {msg.sender === 'user' ? msg.text : null}
                                </div>
                            </div>
                        ))}
                        
                        {/* Typing Indicator */}
                        {isTyping && (
                            <div className="flex justify-start">
                                <div className="bg-white dark:bg-[#111] border border-gray-200 dark:border-white/5 p-4 rounded-2xl rounded-tl-sm shadow-sm flex gap-1.5 items-center">
                                    <div className="w-2 h-2 bg-blue-500 dark:bg-cyan-400 rounded-full animate-bounce"></div>
                                    <div className="w-2 h-2 bg-blue-500 dark:bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }}></div>
                                    <div className="w-2 h-2 bg-blue-500 dark:bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }}></div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <form onSubmit={handleSend} className="p-3 sm:p-4 bg-white dark:bg-[#0a0a0a] border-t border-gray-100 dark:border-white/5 flex gap-2">
                        <input 
                            type="text" 
                            value={input} 
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Ask me anything..." 
                            className="flex-1 bg-gray-50 dark:bg-[#050505] text-gray-900 dark:text-white px-4 py-3 rounded-xl text-sm font-medium outline-none border border-gray-200 dark:border-white/10 focus:border-blue-500 dark:focus:border-cyan-500 transition-colors shadow-inner"
                        />
                        <button type="submit" disabled={!input.trim() || isTyping} className="bg-gray-900 dark:bg-white text-white dark:text-black w-12 h-12 flex items-center justify-center rounded-xl active:scale-95 transition-transform disabled:opacity-50 shadow-md">
                            <svg className="w-5 h-5 transform rotate-45 -mt-0.5 -mr-0.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
                        </button>
                    </form>
                </div>
            )}

            {/* 🤖 Floating Bubble Button */}
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className={`w-14 h-14 sm:w-16 sm:h-16 bg-white dark:bg-[#111] border border-gray-200 dark:border-white/10 rounded-full shadow-2xl flex items-center justify-center text-2xl sm:text-3xl transition-all duration-500 z-50 ${isOpen ? 'rotate-90 scale-90 opacity-0 pointer-events-none' : 'opacity-100 hover:scale-110 hover:shadow-[0_10px_30px_rgba(59,130,246,0.3)] dark:hover:shadow-[0_10px_30px_rgba(6,182,212,0.3)] animate-[bounce_3s_infinite]'}`}
            >
                🤖
            </button>

            <style dangerouslySetInnerHTML={{__html: `
                @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
            `}} />
        </div>
    );
}

export default Chatbot;