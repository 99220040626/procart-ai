import React, {
  useState, useEffect, useRef, useCallback, useMemo,
} from 'react';
import { useNavigate, Link } from 'react-router-dom';
import API from '../services/api';
import toast from 'react-hot-toast';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

// ─────────────────────────────────────────────
// 📌 CONSTANTS — single source of truth
// ─────────────────────────────────────────────
const WS_URL =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_WS_URL) ||
  'https://procart-ai.onrender.com/ws';

const FILTER_TABS = ['ALL', 'PENDING', 'SUCCESS', 'SHIPPED', 'DELIVERED'];

const STATUS_CONFIG = {
  PENDING: {
    label: 'Awaiting Payment',
    icon: '⏳',
    dot: 'bg-amber-400',
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-500/10',
    border: 'border-amber-200 dark:border-amber-500/25',
    pulse: true,
  },
  SUCCESS: {
    label: 'Payment Confirmed',
    icon: '✅',
    dot: 'bg-emerald-500',
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-500/10',
    border: 'border-emerald-200 dark:border-emerald-500/25',
    pulse: false,
  },
  SHIPPED: {
    label: 'In Transit',
    icon: '🚚',
    dot: 'bg-blue-500',
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-50 dark:bg-blue-500/10',
    border: 'border-blue-200 dark:border-blue-500/25',
    pulse: false,
  },
  DELIVERED: {
    label: 'Delivered',
    icon: '📦',
    dot: 'bg-violet-500',
    color: 'text-violet-600 dark:text-violet-400',
    bg: 'bg-violet-50 dark:bg-violet-500/10',
    border: 'border-violet-200 dark:border-violet-500/25',
    pulse: false,
  },
};

const TRACKING_STEPS = [
  { id: 'PENDING',   label: 'Placed'    },
  { id: 'SUCCESS',   label: 'Verified'  },
  { id: 'SHIPPED',   label: 'Shipped'   },
  { id: 'DELIVERED', label: 'Delivered' },
];

const VERTICAL_STEPS = [
  { id: 'PENDING',   label: 'Order Placed',     desc: 'Awaiting payment verification'  },
  { id: 'SUCCESS',   label: 'Payment Verified', desc: 'Admin confirmed your payment'   },
  { id: 'SHIPPED',   label: 'Dispatched',       desc: 'Order handed to courier'        },
  { id: 'DELIVERED', label: 'Delivered',        desc: 'Package arrived at destination' },
];

// ─────────────────────────────────────────────
// 🪝 REUSABLE HOOKS
// ─────────────────────────────────────────────

// Stable options — defined outside component to prevent recreating the object
const IO_OPTIONS = { threshold: 0.1, rootMargin: '0px 0px -50px 0px' };

const useIntersectionObserver = () => {
  const [visible, setVisible] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, IO_OPTIONS);
    obs.observe(el);
    return () => obs.unobserve(el);
  }, []);
  return [ref, visible];
};

// Uses a ref so the listener is never re-registered on callback identity change
const useEscapeKey = (handler) => {
  const ref = useRef(handler);
  useEffect(() => { ref.current = handler; }, [handler]);
  useEffect(() => {
    const fn = (e) => { if (e.key === 'Escape') ref.current?.(); };
    document.addEventListener('keydown', fn);
    return () => document.removeEventListener('keydown', fn);
  }, []);
};

// ─────────────────────────────────────────────
// ✨ SCRAMBLE TEXT EFFECT
// ─────────────────────────────────────────────
const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

const ScrambleText = ({ text }) => {
  const [display, setDisplay] = useState(text);
  const [hovered, setHovered] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    clearInterval(timerRef.current);
    if (!hovered) { setDisplay(text); return; }
    let i = 0;
    timerRef.current = setInterval(() => {
      setDisplay(text.split('').map((c, idx) =>
        idx < i ? text[idx] : CHARS[Math.floor(Math.random() * CHARS.length)]
      ).join(''));
      if (i >= text.length) clearInterval(timerRef.current);
      i += 1 / 3;
    }, 30);
    return () => clearInterval(timerRef.current);
  }, [hovered, text]);

  return (
    <span
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="inline-block cursor-default select-none"
    >
      {display}
    </span>
  );
};

// ─────────────────────────────────────────────
// 🏷️ STATUS BADGE
// ─────────────────────────────────────────────
const StatusBadge = ({ status }) => {
  const ui = STATUS_CONFIG[status];
  if (!ui) return null;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wider
        ${ui.bg} ${ui.border} ${ui.color} ${ui.pulse ? 'animate-pulse' : ''}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${ui.dot}`} aria-hidden />
      {ui.label}
    </span>
  );
};

// ─────────────────────────────────────────────
// 📊 HORIZONTAL TRACKING BAR
// ─────────────────────────────────────────────
const TrackingBar = ({ status }) => {
  const idx = TRACKING_STEPS.findIndex(s => s.id === status);
  const safeIdx = idx === -1 ? 0 : idx;
  const progress = TRACKING_STEPS.length > 1
    ? (safeIdx / (TRACKING_STEPS.length - 1)) * 100
    : 0;

  return (
    <div
      role="progressbar"
      aria-valuenow={safeIdx + 1}
      aria-valuemin={1}
      aria-valuemax={TRACKING_STEPS.length}
      aria-label={`Order status: ${STATUS_CONFIG[status]?.label ?? status}`}
    >
      {/* Track */}
      <div className="relative pt-3">
        <div className="absolute top-[calc(0.75rem+2px)] left-0 right-0 h-px bg-gray-200 dark:bg-white/10 rounded-full" />
        <div
          className="absolute top-[calc(0.75rem+2px)] left-0 h-px bg-gradient-to-r from-emerald-400 to-emerald-600 dark:from-emerald-500 dark:to-emerald-400 rounded-full transition-all duration-700 ease-out"
          style={{ width: `${progress}%` }}
        />
        {/* Nodes */}
        <div className="relative flex justify-between">
          {TRACKING_STEPS.map((step, i) => {
            const done = i <= safeIdx;
            const current = i === safeIdx;
            return (
              <div key={step.id} className="flex flex-col items-center gap-2">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center border-2 text-[10px] font-black
                    transition-all duration-500 ease-out
                    ${done
                      ? 'bg-emerald-500 border-emerald-500 text-white shadow-[0_0_12px_rgba(16,185,129,0.5)]'
                      : 'bg-white dark:bg-[#0c0c0c] border-gray-300 dark:border-gray-700 text-gray-400'
                    }
                    ${current && status !== 'DELIVERED' ? 'scale-[1.15] animate-pulse' : ''}
                  `}
                >
                  {done ? '✓' : <span className="opacity-30 text-[9px]">{i + 1}</span>}
                </div>
                <span
                  className={`text-[9px] sm:text-[10px] font-bold uppercase tracking-wider hidden sm:block
                    ${done ? 'text-gray-700 dark:text-gray-200' : 'text-gray-400 dark:text-gray-600'}`}
                >
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// 🃏 ORDER CARD
// ─────────────────────────────────────────────
const OrderCard = React.memo(({ order, product, index, onSelect, onSupport, onDownload, getImageUrl }) => {
  const handleSupport = useCallback((e) => {
    e.stopPropagation();
    onSupport(product);
  }, [onSupport, product]);

  const handleDownload = useCallback((e) => {
    e.stopPropagation();
    onDownload(order.id);
  }, [onDownload, order.id]);

  const handleProductLink = useCallback((e) => e.stopPropagation(), []);

  const totalPrice = (order.price * order.quantity).toLocaleString('en-IN');

  return (
    <article
      onClick={() => onSelect({ order, product })}
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onSelect({ order, product })}
      aria-label={`Order #${order.id}: ${product?.name ?? 'Item'}, ₹${totalPrice}`}
      className="group bg-white dark:bg-[#0c0c0c] rounded-2xl sm:rounded-3xl p-5 sm:p-6 lg:p-7
        border border-gray-100 dark:border-white/[0.06]
        shadow-[0_1px_3px_rgba(0,0,0,0.05)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.1)]
        dark:shadow-none dark:hover:shadow-[0_12px_40px_rgba(0,0,0,0.4)]
        transition-all duration-300 ease-out hover:-translate-y-0.5 cursor-pointer
        focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:focus:ring-cyan-500/50
        animate-[slideUp_0.4s_ease-out_backwards]"
      style={{ animationDelay: `${Math.min(index * 0.07, 0.5)}s` }}
    >
      <div className="flex flex-col sm:flex-row gap-5 sm:gap-6">
        {/* Product Image */}
        <div
          className="w-24 h-24 sm:w-[6.5rem] sm:h-[6.5rem] lg:w-28 lg:h-28 rounded-2xl overflow-hidden
            flex-shrink-0 bg-gray-50 dark:bg-white/[0.03] border border-gray-100 dark:border-white/[0.06]
            flex items-center justify-center mx-auto sm:mx-0 shadow-inner"
          aria-hidden
        >
          {product?.imageUrl ? (
            <img
              src={getImageUrl(product.imageUrl)}
              alt={product.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
              loading="lazy"
            />
          ) : (
            <span className="text-3xl opacity-30">📦</span>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 flex flex-col gap-4">
          {/* Top row */}
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div className="text-center sm:text-left min-w-0">
              <p className="text-[10px] font-black text-blue-600 dark:text-cyan-500 uppercase tracking-[0.15em] mb-1">
                Order #{order.id}
              </p>
              <Link
                to={`/product/${order.productId}`}
                onClick={handleProductLink}
                className="block"
              >
                <h3 className="text-base sm:text-lg lg:text-xl font-black text-gray-900 dark:text-white
                  hover:text-blue-600 dark:hover:text-cyan-400 transition-colors truncate leading-tight">
                  {product?.name ?? 'Premium Item'}
                </h3>
              </Link>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-1.5 flex items-center justify-center sm:justify-start gap-2">
                <span>Qty: {order.quantity}</span>
                <span className="opacity-30">·</span>
                <span className="font-bold text-gray-700 dark:text-gray-300">₹{totalPrice}</span>
              </p>
              <div className="mt-2.5 flex justify-center sm:justify-start">
                <StatusBadge status={order.status} />
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex sm:flex-col gap-2 justify-center sm:items-end flex-shrink-0">
              <button
                onClick={handleSupport}
                aria-label={`Contact support for order ${order.id}`}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl
                  bg-gray-100 dark:bg-white/[0.05] hover:bg-gray-200 dark:hover:bg-white/[0.09]
                  text-gray-700 dark:text-gray-300 text-[11px] font-bold
                  transition-all duration-150 active:scale-95 whitespace-nowrap"
              >
                💬 Support
              </button>
              <button
                onClick={handleDownload}
                aria-label={`Download invoice for order ${order.id}`}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl
                  bg-blue-50 dark:bg-cyan-500/10 hover:bg-blue-100 dark:hover:bg-cyan-500/[0.18]
                  text-blue-700 dark:text-cyan-400 text-[11px] font-bold
                  transition-all duration-150 active:scale-95 whitespace-nowrap"
              >
                📄 Invoice
              </button>
            </div>
          </div>

          {/* Tracking section */}
          <div className="bg-gray-50/80 dark:bg-black/20 rounded-xl p-4 border border-gray-100 dark:border-white/[0.05]">
            <TrackingBar status={order.status} />
            {order.shippingAddress && (
              <p className="mt-4 pt-3 border-t border-gray-200 dark:border-white/[0.05]
                text-xs text-gray-500 dark:text-gray-500 flex items-center gap-1.5 truncate">
                <span aria-hidden>📍</span>
                <span className="truncate">{order.shippingAddress}</span>
              </p>
            )}
          </div>
        </div>
      </div>
    </article>
  );
});
OrderCard.displayName = 'OrderCard';

// ─────────────────────────────────────────────
// 🔬 ORDER DETAIL MODAL
// ─────────────────────────────────────────────
const OrderDetailModal = ({ order, product, onClose, getImageUrl }) => {
  useEscapeKey(onClose);

  const currentIdx = useMemo(
    () => VERTICAL_STEPS.findIndex(s => s.id === order.status),
    [order.status]
  );
  const safeIdx = currentIdx === -1 ? 0 : currentIdx;
  const progressPct = VERTICAL_STEPS.length > 1
    ? (safeIdx / (VERTICAL_STEPS.length - 1)) * 100
    : 0;

  const orderDate = useMemo(
    () => new Date(order.orderDate).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric',
    }),
    [order.orderDate]
  );

  const totalPrice = (order.price * order.quantity).toLocaleString('en-IN');

  return (
    <div
      className="fixed inset-0 z-[150] bg-black/70 backdrop-blur-md
        flex items-end sm:items-center justify-center p-0 sm:p-4
        animate-[fadeIn_0.2s_ease-out]"
      role="dialog"
      aria-modal="true"
      aria-label={`Order details for order #${order.id}`}
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-[#0f1117] w-full max-w-4xl
          rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl
          border border-gray-200/60 dark:border-white/[0.07]
          flex flex-col max-h-[92vh] sm:max-h-[88vh]
          animate-[slideUp_0.3s_cubic-bezier(0.34,1.56,0.64,1)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag indicator — mobile only */}
        <div className="w-10 h-1 bg-gray-300 dark:bg-gray-700 rounded-full mx-auto mt-3 sm:hidden flex-shrink-0" />

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 sm:px-7 sm:py-5
          border-b border-gray-100 dark:border-white/[0.06] flex-shrink-0">
          <div>
            <h2 className="text-base font-black text-gray-900 dark:text-white tracking-tight">Order Details</h2>
            <p className="text-[11px] text-gray-500 dark:text-gray-500 mt-0.5 font-mono tracking-wider">
              #{order.id} · {orderDate}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close order details"
            className="w-9 h-9 rounded-full bg-gray-100 dark:bg-white/[0.06] hover:bg-gray-200 dark:hover:bg-white/[0.1]
              flex items-center justify-center text-gray-500 dark:text-gray-400
              font-bold text-base transition-colors duration-150"
          >
            ✕
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-7 custom-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">

            {/* LEFT — Live Tracking + Support */}
            <div className="space-y-4">
              <div className="bg-gray-50 dark:bg-white/[0.03] rounded-2xl border border-gray-100 dark:border-white/[0.06] p-5">
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-5 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" aria-hidden />
                  Live Tracking
                </h4>

                {/* Vertical timeline */}
                <div className="relative pl-8 space-y-0">
                  {/* Static full-height line */}
                  <div className="absolute left-[11px] top-3 bottom-3 w-px bg-gray-200 dark:bg-white/[0.07]" />
                  {/* Animated progress line */}
                  <div
                    className="absolute left-[11px] top-3 w-px bg-gradient-to-b from-emerald-500 to-emerald-400 transition-all duration-700 ease-out"
                    style={{ height: `calc(${progressPct}% - 0.5rem)` }}
                  />

                  {VERTICAL_STEPS.map((step, i) => {
                    const done = i <= safeIdx;
                    const current = i === safeIdx;
                    return (
                      <div key={step.id} className="relative pb-6 last:pb-0">
                        <div
                          className={`absolute -left-8 top-0.5 w-6 h-6 rounded-full
                            flex items-center justify-center text-[10px] font-black border-2
                            transition-all duration-500 ease-out
                            ${done
                              ? 'bg-emerald-500 border-emerald-500 text-white shadow-[0_0_14px_rgba(16,185,129,0.45)]'
                              : 'bg-white dark:bg-[#0f1117] border-gray-300 dark:border-gray-700 text-gray-400'
                            }
                            ${current && order.status !== 'DELIVERED' ? 'scale-[1.15]' : ''}
                          `}
                          aria-hidden
                        >
                          {done ? '✓' : i + 1}
                        </div>
                        <p className={`text-sm font-bold leading-6
                          ${done ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-600'}`}>
                          {step.label}
                        </p>
                        <p className={`text-xs leading-5
                          ${done ? 'text-gray-500 dark:text-gray-400' : 'text-gray-400 dark:text-gray-700'}`}>
                          {step.desc}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Support CTA */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50
                dark:from-cyan-500/[0.06] dark:to-blue-600/[0.04]
                rounded-2xl border border-blue-100 dark:border-cyan-500/15 p-5 text-center">
                <p className="text-sm font-black text-blue-900 dark:text-cyan-300 mb-1.5">Need Assistance?</p>
                <p className="text-xs text-blue-600/80 dark:text-cyan-400/60 mb-4 leading-relaxed">
                  Our support team is available 24/7 to help with tracking and queries.
                </p>
                <a
                  href="tel:+916281134837"
                  className="inline-flex items-center gap-2 bg-blue-600 dark:bg-cyan-500
                    text-white dark:text-black px-6 py-2.5 rounded-full text-xs font-black
                    uppercase tracking-widest hover:scale-105 active:scale-95 transition-transform
                    shadow-lg shadow-blue-500/20 dark:shadow-cyan-500/20"
                >
                  📞 +91 62811 34837
                </a>
              </div>
            </div>

            {/* RIGHT — Asset details, payment proof, shipping */}
            <div className="space-y-4">
              {/* Asset Details */}
              <div className="bg-gray-50 dark:bg-white/[0.03] rounded-2xl border border-gray-100 dark:border-white/[0.06] p-5">
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Asset Details</h4>
                <div className="flex gap-4 items-center">
                  <div className="w-16 h-16 rounded-xl overflow-hidden border border-gray-100 dark:border-white/[0.07]
                    bg-white dark:bg-black/30 flex-shrink-0 flex items-center justify-center">
                    {product?.imageUrl
                      ? <img src={getImageUrl(product.imageUrl)} alt={product.name} className="w-full h-full object-cover" />
                      : <span className="text-2xl opacity-20" aria-hidden>📦</span>
                    }
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-gray-900 dark:text-white text-sm truncate">{product?.name ?? 'Item'}</p>
                    <p className="text-xs text-gray-500 mt-0.5">Quantity: {order.quantity}</p>
                    <p className="text-sm font-black text-blue-600 dark:text-cyan-400 mt-1">₹{totalPrice}</p>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-white/[0.05] grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mb-1">Unit Price</p>
                    <p className="text-sm font-black text-gray-800 dark:text-gray-200">
                      ₹{(order.price ?? 0).toLocaleString('en-IN')}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mb-1">Order Date</p>
                    <p className="text-sm font-black text-gray-800 dark:text-gray-200">{orderDate}</p>
                  </div>
                </div>
              </div>

              {/* Payment Proof */}
              {order.paymentScreenshot && (
                <div className="bg-gray-50 dark:bg-white/[0.03] rounded-2xl border border-gray-100 dark:border-white/[0.06] p-5">
                  <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Payment Proof</h4>
                  <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-white/[0.07]
                    bg-white dark:bg-black/20 flex items-center justify-center p-2">
                    <img
                      src={order.paymentScreenshot}
                      alt="Payment screenshot"
                      className="max-h-52 w-auto object-contain rounded-lg"
                    />
                  </div>
                </div>
              )}

              {/* Shipping */}
              <div className="bg-gray-50 dark:bg-white/[0.03] rounded-2xl border border-gray-100 dark:border-white/[0.06] p-5">
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Shipping Info</h4>
                {order.shippingAddress
                  ? <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{order.shippingAddress}</p>
                  : <p className="text-sm text-gray-400 italic">No address recorded.</p>
                }
                {order.phoneNumber && (
                  <a
                    href={`tel:${order.phoneNumber}`}
                    className="inline-flex items-center gap-2 mt-3 text-xs font-bold text-blue-600 dark:text-cyan-400 hover:underline"
                  >
                    📱 {order.phoneNumber}
                  </a>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// 💬 SUPPORT CHAT MODAL
// ─────────────────────────────────────────────
const SupportModal = ({ product, qaList, onClose, onSubmit, question, onQuestionChange, getImageUrl }) => {
  useEscapeKey(onClose);
  const bottomRef = useRef(null);

  // Auto-scroll to latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [qaList]);

  return (
    <div
      className="fixed inset-0 z-[200] bg-black/60 dark:bg-black/80 backdrop-blur-sm
        flex items-end sm:items-center justify-center
        animate-[fadeIn_0.2s_ease-out]"
      role="dialog"
      aria-modal="true"
      aria-label={`Support for ${product.name}`}
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-[#0c0c0c] border border-gray-200 dark:border-white/[0.07]
          w-full max-w-2xl rounded-t-[2rem] sm:rounded-[2rem] overflow-hidden
          flex flex-col max-h-[88vh] sm:max-h-[80vh]
          animate-[slideUp_0.3s_cubic-bezier(0.34,1.56,0.64,1)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="w-10 h-1 bg-gray-300 dark:bg-gray-700 rounded-full mx-auto mt-3 mb-1 sm:hidden flex-shrink-0" />

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 sm:px-7 sm:py-5
          border-b border-gray-100 dark:border-white/[0.05] flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            {product.imageUrl && (
              <div className="w-10 h-10 rounded-xl overflow-hidden border border-gray-100 dark:border-white/10 flex-shrink-0">
                <img src={getImageUrl(product.imageUrl)} alt="" className="w-full h-full object-cover" />
              </div>
            )}
            <div className="min-w-0">
              <p className="text-[10px] font-black text-blue-600 dark:text-cyan-500 uppercase tracking-widest">Support</p>
              <h3 className="text-sm sm:text-base font-black text-gray-900 dark:text-white truncate">{product.name}</h3>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close support"
            className="w-9 h-9 rounded-full bg-gray-100 dark:bg-white/[0.05] hover:bg-gray-200 dark:hover:bg-white/[0.1]
              flex items-center justify-center text-gray-500 dark:text-gray-400
              font-bold transition-colors duration-150 flex-shrink-0"
          >
            ✕
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-7 sm:py-6 space-y-4 bg-gray-50/40 dark:bg-transparent custom-scrollbar">
          {qaList.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center py-12 text-center opacity-60">
              <div className="text-4xl mb-3">💬</div>
              <p className="text-xs font-black uppercase tracking-widest text-gray-400">Start a conversation</p>
              <p className="text-xs text-gray-400 mt-1.5">We typically reply within a few hours.</p>
            </div>
          ) : (
            qaList.map((qa) => (
              <div key={qa.id} className="space-y-2.5">
                {/* User message (right) */}
                <div className="flex justify-end">
                  <div className="max-w-[80%] bg-blue-600 dark:bg-cyan-500 text-white dark:text-black
                    px-4 py-3 rounded-2xl rounded-tr-sm text-sm font-medium shadow-md shadow-blue-500/15 leading-relaxed">
                    {qa.question}
                  </div>
                </div>
                {/* Agent reply (left) */}
                {qa.answer ? (
                  <div className="flex gap-2.5 items-end">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600
                      flex items-center justify-center text-white text-xs font-black flex-shrink-0 mb-0.5"
                      aria-hidden
                    >
                      P
                    </div>
                    <div className="max-w-[80%] bg-white dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.08]
                      px-4 py-3 rounded-2xl rounded-tl-sm text-sm text-gray-700 dark:text-gray-300 font-medium shadow-sm leading-relaxed">
                      {qa.answer}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 pl-10">
                    <div className="flex gap-1" aria-label="Typing indicator">
                      {[0, 1, 2].map((d) => (
                        <span
                          key={d}
                          className="w-1.5 h-1.5 rounded-full bg-gray-400 dark:bg-gray-600 animate-bounce"
                          style={{ animationDelay: `${d * 0.15}s` }}
                        />
                      ))}
                    </div>
                    <span className="text-xs text-gray-400">Reviewing your message...</span>
                  </div>
                )}
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <form
          onSubmit={onSubmit}
          className="flex gap-3 px-5 py-4 sm:px-7 sm:py-5 border-t border-gray-100 dark:border-white/[0.05]
            bg-white dark:bg-[#0a0a0a]"
          style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
        >
          <input
            type="text"
            required
            value={question}
            onChange={(e) => onQuestionChange(e.target.value)}
            placeholder="Type your message..."
            aria-label="Support message"
            className="flex-1 px-4 py-3 rounded-xl border border-gray-200 dark:border-white/[0.09]
              bg-gray-50 dark:bg-white/[0.04] text-gray-900 dark:text-white
              placeholder-gray-400 dark:placeholder-gray-600 text-sm font-medium
              outline-none focus:border-blue-500 dark:focus:border-cyan-500
              focus:ring-2 focus:ring-blue-500/10 dark:focus:ring-cyan-500/10 transition-all"
          />
          <button
            type="submit"
            aria-label="Send message"
            className="bg-blue-600 dark:bg-cyan-500 text-white dark:text-black
              font-black px-5 py-3 rounded-xl text-sm
              hover:scale-[1.03] active:scale-95 transition-transform
              shadow-md shadow-blue-500/20 dark:shadow-cyan-500/20 flex-shrink-0"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// 🔀 FILTER TABS
// ─────────────────────────────────────────────
const FilterTabs = React.memo(({ active, onChange, orders }) => {
  const counts = useMemo(() => {
    const map = { ALL: orders.length };
    orders.forEach((o) => { map[o.status] = (map[o.status] || 0) + 1; });
    return map;
  }, [orders]);

  return (
    <nav aria-label="Filter orders by status" className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
      {FILTER_TABS.map((tab) => {
        const isActive = active === tab;
        const isAll = tab === 'ALL';
        const ui = isAll ? null : STATUS_CONFIG[tab];
        const count = counts[tab] ?? 0;

        return (
          <button
            key={tab}
            onClick={() => onChange(tab)}
            aria-pressed={isActive}
            className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-full text-[11px] font-bold
              border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40
              ${isActive
                ? 'bg-gray-900 dark:bg-white text-white dark:text-black border-transparent shadow-md'
                : 'bg-white dark:bg-white/[0.04] text-gray-600 dark:text-gray-400 border-gray-200 dark:border-white/[0.07] hover:bg-gray-50 dark:hover:bg-white/[0.07]'
              }`}
          >
            {!isAll && <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${ui?.dot}`} aria-hidden />}
            <span className="uppercase tracking-wider">{isAll ? 'All' : ui?.label}</span>
            {count > 0 && (
              <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full
                ${isActive ? 'bg-white/20 dark:bg-black/20' : 'bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-400'}`}>
                {count}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
});
FilterTabs.displayName = 'FilterTabs';

// ─────────────────────────────────────────────
// ⏳ LOADING SCREEN
// ─────────────────────────────────────────────
const LoadingScreen = () => (
  <div className="min-h-screen bg-[#f8fafc] dark:bg-black flex flex-col items-center justify-center gap-5" aria-busy aria-label="Loading orders">
    <div className="relative w-14 h-14" aria-hidden>
      <div className="absolute inset-0 border-[3px] border-t-blue-600 dark:border-t-cyan-500 border-transparent rounded-full animate-spin" />
      <div className="absolute inset-[5px] border-[3px] border-r-indigo-500 dark:border-r-purple-500 border-transparent rounded-full animate-[spin_1.2s_linear_infinite_reverse]" />
    </div>
    <p className="text-[10px] font-black text-gray-400 dark:text-gray-600 tracking-[0.3em] uppercase animate-pulse">
      Loading Orders
    </p>
  </div>
);

// ─────────────────────────────────────────────
// ❌ ERROR SCREEN
// ─────────────────────────────────────────────
const ErrorScreen = ({ onRetry }) => (
  <div className="min-h-screen bg-[#f8fafc] dark:bg-black flex flex-col items-center justify-center gap-4 p-6" role="alert">
    <span className="text-4xl" aria-hidden>⚠️</span>
    <h2 className="text-xl font-black text-gray-900 dark:text-white">Failed to Load Orders</h2>
    <p className="text-sm text-gray-500 text-center max-w-xs leading-relaxed">
      Something went wrong while fetching your orders. Check your connection and try again.
    </p>
    <button
      onClick={onRetry}
      className="mt-2 bg-blue-600 dark:bg-cyan-500 text-white dark:text-black
        px-7 py-3 rounded-full font-black text-sm
        hover:scale-105 active:scale-95 transition-transform shadow-lg shadow-blue-500/25"
    >
      Try Again
    </button>
  </div>
);

// ─────────────────────────────────────────────
// 🪣 EMPTY STATE
// ─────────────────────────────────────────────
const EmptyState = () => (
  <div className="py-24 text-center animate-[fadeIn_0.5s_ease-out]">
    <div className="w-20 h-20 mx-auto mb-6 bg-gray-100 dark:bg-white/[0.04] rounded-2xl
      flex items-center justify-center text-4xl
      border border-gray-200 dark:border-white/[0.06] shadow-inner"
      aria-hidden
    >
      📦
    </div>
    <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-2 tracking-tight">No Orders Yet</h2>
    <p className="text-gray-500 dark:text-gray-400 mb-8 text-sm max-w-xs mx-auto leading-relaxed">
      You haven't placed any orders yet. Discover our premium collection today.
    </p>
    <Link
      to="/products"
      className="inline-flex items-center gap-2 bg-blue-600 dark:bg-cyan-500 text-white dark:text-black
        px-8 py-3.5 rounded-full font-black text-sm
        hover:scale-105 active:scale-95 transition-transform
        shadow-lg shadow-blue-500/25 dark:shadow-cyan-500/20"
    >
      🛍️ Browse Products
    </Link>
  </div>
);

// ─────────────────────────────────────────────
// 🚀 MAIN COMPONENT
// ─────────────────────────────────────────────
export default function Orders() {
  const [orders, setOrders]             = useState([]);
  const [products, setProducts]         = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState(false);
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [qaModalProduct, setQaModalProduct] = useState(null);
  const [qaList, setQaList]             = useState([]);
  const [newQuestion, setNewQuestion]   = useState('');

  const navigate = useNavigate();
  const userId   = localStorage.getItem('userId');
  const [headerRef, headerVisible] = useIntersectionObserver();

  // ── Derived / memoized ────────────────────────────────────────
  const productMap = useMemo(
    () => products.reduce((acc, p) => { acc[p.id] = p; return acc; }, {}),
    [products]
  );

  const getProductDetails = useCallback((id) => productMap[id] ?? null, [productMap]);

  const getImageUrl = useCallback((name) => {
    if (!name) return null;
    return name.startsWith('http') ? name : `/uploads/${name}`;
  }, []);

  const filteredOrders = useMemo(() => {
    if (activeFilter === 'ALL') return orders;
    return orders.filter((o) => o.status === activeFilter);
  }, [orders, activeFilter]);

  // ── Data fetching ─────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    if (!userId) { navigate('/login'); return; }
    setLoading(true);
    setError(false);
    try {
      const [ordersRes, productsRes] = await Promise.all([
        API.get(`/orders/user/${userId}`),
        API.get('/products'),
      ]);
      // spread to avoid mutating API response
      setOrders([...ordersRes.data].sort((a, b) => b.id - a.id));
      setProducts(productsRes.data);
    } catch (err) {
      console.error('[Orders] fetch failed:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [userId, navigate]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── WebSocket live updates ────────────────────────────────────
  useEffect(() => {
    if (!userId) return;

    const socketUrl =
      window.location.protocol === 'https:'
        ? `https://${window.location.host}/ws`
        : WS_URL;

    const client = new Client({
      webSocketFactory: () => new SockJS(socketUrl),
      reconnectDelay: 5000,
      onConnect: () => {
        client.subscribe(`/topic/orders/${userId}`, (msg) => {
          const updated = JSON.parse(msg.body);
          setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
          const ui = STATUS_CONFIG[updated.status];
          toast.success(
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Order Update</p>
              <p className="text-sm font-medium mt-0.5">
                Order #{updated.id} →{' '}
                <b className="text-white">{ui?.label ?? updated.status}</b>
              </p>
            </div>,
            {
              style: {
                borderRadius: '16px',
                background: 'rgba(10,10,10,0.96)',
                backdropFilter: 'blur(12px)',
                color: '#fff',
                border: '1px solid rgba(16,185,129,0.2)',
              },
            }
          );
        });
      },
      onStompError: (frame) => console.warn('[WS] STOMP error:', frame),
    });

    client.activate();
    return () => { client.deactivate(); };
  }, [userId]);

  // ── Support modal ─────────────────────────────────────────────
  const openSupportModal = useCallback(async (product) => {
    if (!product) return;
    setQaModalProduct(product);
    setQaList([]);            // reset before fetching
    setNewQuestion('');
    try {
      const res = await API.get(`/qa/product/${product.id}`);
      setQaList(res.data);
    } catch {
      toast.error('Could not load support history. Please try again.');
    }
  }, []);

  const submitQuestion = useCallback(async (e) => {
    e.preventDefault();
    const trimmed = newQuestion.trim();
    if (!trimmed || !qaModalProduct) return;
    try {
      await API.post('/qa/ask', {
        productId: qaModalProduct.id,
        userId: parseInt(userId, 10),
        customerName: 'Customer',
        question: trimmed,
      });
      setNewQuestion('');
      toast.success("Message sent! We'll reply soon. 💬");
      const res = await API.get(`/qa/product/${qaModalProduct.id}`);
      setQaList(res.data);
    } catch {
      toast.error('Failed to send your message. Please try again.');
    }
  }, [newQuestion, qaModalProduct, userId]);

  // ── Invoice download ──────────────────────────────────────────
  const downloadInvoice = useCallback(async (orderId) => {
    const tid = toast.loading('Generating your invoice...');
    try {
      const res = await API.get(`/orders/${orderId}/invoice`, { responseType: 'blob' });
      const blobUrl = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `ProCart_Invoice_#${orderId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(blobUrl);   // ← fix: revoke to prevent memory leak
      toast.success('Invoice downloaded! 📄', { id: tid });
    } catch {
      toast.error('Failed to generate invoice.', { id: tid });
    }
  }, []);

  // ── Render ────────────────────────────────────────────────────
  if (loading) return <LoadingScreen />;
  if (error)   return <ErrorScreen onRetry={fetchData} />;

  return (
    <div className="min-h-screen bg-[#f7f8fa] dark:bg-[#060608] pb-24 pt-8 sm:pt-12
      px-4 sm:px-6 lg:px-8 transition-colors duration-500 relative overflow-x-hidden">

      {/* ── Ambient background ── */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden>
        <div className="absolute -top-1/4 -left-1/4 w-3/4 h-3/4
          bg-[radial-gradient(circle,rgba(59,130,246,0.06)_0%,transparent_70%)]
          dark:bg-[radial-gradient(circle,rgba(6,182,212,0.04)_0%,transparent_70%)]
          rounded-full blur-[100px]" />
        <div className="absolute -bottom-1/4 -right-1/4 w-3/4 h-3/4
          bg-[radial-gradient(circle,rgba(99,102,241,0.05)_0%,transparent_70%)]
          dark:bg-[radial-gradient(circle,rgba(139,92,246,0.04)_0%,transparent_70%)]
          rounded-full blur-[100px]" />
        <div className="absolute inset-0
          bg-[radial-gradient(#cbd5e1_1px,transparent_1px)]
          dark:bg-[radial-gradient(#1e293b_1px,transparent_1px)]
          [background-size:28px_28px] opacity-40 dark:opacity-25
          [mask-image:radial-gradient(ellipse_80%_80%_at_50%_0%,#000_20%,transparent_100%)]" />
      </div>

      <div className="max-w-4xl mx-auto relative z-10">

        {/* ── Page header ── */}
        <header
          ref={headerRef}
          className={`text-center mb-8 sm:mb-12 transition-all duration-700 ease-out
            ${headerVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full
            bg-white/80 dark:bg-white/[0.04]
            border border-gray-200/60 dark:border-white/[0.07]
            backdrop-blur-xl mb-5 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]" aria-hidden />
            <span className="text-[10px] font-black tracking-[0.2em] uppercase text-gray-600 dark:text-gray-300">
              Live Tracking Active
            </span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight mb-3 leading-[1.05]
            text-transparent bg-clip-text
            bg-gradient-to-b from-gray-900 via-gray-700 to-gray-400
            dark:from-white dark:via-gray-200 dark:to-gray-600">
            <ScrambleText text="My Orders" />
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium max-w-sm mx-auto leading-relaxed">
            Track, manage and get support for all your purchases.
          </p>
        </header>

        {/* ── Content ── */}
        {orders.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            {/* Filter tabs */}
            <div className="mb-5 sm:mb-6">
              <FilterTabs active={activeFilter} onChange={setActiveFilter} orders={orders} />
            </div>

            {/* Result count */}
            <p className="text-[11px] font-bold text-gray-400 dark:text-gray-600 uppercase tracking-widest mb-4">
              {filteredOrders.length} {filteredOrders.length === 1 ? 'Order' : 'Orders'}
              {activeFilter !== 'ALL' && ` · ${STATUS_CONFIG[activeFilter]?.label}`}
            </p>

            {filteredOrders.length === 0 ? (
              <div className="py-20 text-center animate-[fadeIn_0.3s_ease-out]">
                <p className="text-3xl mb-3" aria-hidden>🔍</p>
                <p className="text-sm font-black text-gray-400 uppercase tracking-widest">
                  No {STATUS_CONFIG[activeFilter]?.label} orders
                </p>
                <button
                  onClick={() => setActiveFilter('ALL')}
                  className="mt-5 text-xs font-bold text-blue-600 dark:text-cyan-400 hover:underline"
                >
                  View all orders →
                </button>
              </div>
            ) : (
              <div className="space-y-4 sm:space-y-5">
                {filteredOrders.map((order, idx) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    product={getProductDetails(order.productId)}
                    index={idx}
                    onSelect={setSelectedOrder}
                    onSupport={openSupportModal}
                    onDownload={downloadInvoice}
                    getImageUrl={getImageUrl}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Order detail modal ── */}
      {selectedOrder && (
        <OrderDetailModal
          order={selectedOrder.order}
          product={selectedOrder.product}
          onClose={() => setSelectedOrder(null)}
          getImageUrl={getImageUrl}
        />
      )}

      {/* ── Support chat modal ── */}
      {qaModalProduct && (
        <SupportModal
          product={qaModalProduct}
          qaList={qaList}
          onClose={() => { setQaModalProduct(null); setNewQuestion(''); setQaList([]); }}
          onSubmit={submitQuestion}
          question={newQuestion}
          onQuestionChange={setNewQuestion}
          getImageUrl={getImageUrl}
        />
      )}

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(150,150,150,0.2); border-radius: 2px; }
      `}</style>
    </div>
  );
}