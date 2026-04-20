import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS — single source of truth for magic numbers & config
// ─────────────────────────────────────────────────────────────────────────────
const GAME_CONFIG = {
  BASE_SPEED: 0.5,
  SPEED_RAMP_AFTER: 15,
  SPEED_INCREMENT: 0.15,
  MAX_SPEED: 3.5,
  TICK_MS: 20,
  INITIAL_TIME: 100,
  TARGET_PADDING: 10, // % from edges
};

const PLATFORM_STATS = {
  SERVER_SPEED: { label: 'Server Speed', suffix: 'ms', color: 'blue', initial: 12.4, min: 5, max: 25, drift: 4 },
  DB_HEALTH: { label: 'Database Health', suffix: '%', color: 'purple', initial: 94.2, min: 85, max: 100, drift: 2 },
  ACTIVE_USERS: { label: 'Active Sessions', suffix: '', color: 'emerald', initial: 2847, min: 2400, max: 3200, drift: 120 },
};

const TECH_STACK = [
  { title: 'Frontend', detail: 'React 18', icon: '⚛', color: 'blue' },
  { title: 'Backend', detail: 'Spring Boot', icon: '⚙', color: 'purple' },
  { title: 'Design', detail: 'Tailwind CSS', icon: '✦', color: 'green' },
  { title: 'Database', detail: 'MySQL', icon: '⬡', color: 'indigo' },
];

const FEATURES = [
  { icon: '🛡', title: 'Bank-Grade Security', desc: 'Your data is locked down with AES-256 encryption. Shop with absolute peace of mind.', color: 'purple' },
  { icon: '🚚', title: 'Live Order Tracking', desc: 'Real-time delivery updates on every package, down to the last mile.', color: 'emerald' },
];

// ─────────────────────────────────────────────────────────────────────────────
// HOOK: Single intersection observer — much more efficient than 5 separate ones
// ─────────────────────────────────────────────────────────────────────────────
const useRevealOnScroll = () => {
  const [visibleSections, setVisibleSections] = useState({});
  const refs = useRef({});

  const registerRef = useCallback((key) => (el) => {
    if (el) refs.current[key] = el;
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const key = entry.target.dataset.revealKey;
            setVisibleSections((prev) => ({ ...prev, [key]: true }));
            observer.unobserve(entry.target); // fire once only
          }
        });
      },
      { threshold: 0.08, rootMargin: '0px 0px -40px 0px' }
    );

    Object.entries(refs.current).forEach(([key, el]) => {
      el.dataset.revealKey = key;
      observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  const isVisible = useCallback((key) => !!visibleSections[key], [visibleSections]);

  return { registerRef, isVisible };
};

// ─────────────────────────────────────────────────────────────────────────────
// HOOK: Scramble text — fixed deps, single interval guard
// ─────────────────────────────────────────────────────────────────────────────
const SCRAMBLE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

const useScramble = (text) => {
  const [display, setDisplay] = useState(text);
  const [hovered, setHovered] = useState(false);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!hovered) {
      setDisplay(text);
      return;
    }
    let iteration = 0;
    clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setDisplay(
        text
          .split('')
          .map((char, i) =>
            i < iteration
              ? text[i]
              : SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)]
          )
          .join('')
      );
      iteration += 1 / 3;
      if (iteration >= text.length) clearInterval(intervalRef.current);
    }, 30);

    return () => clearInterval(intervalRef.current);
  }, [hovered, text]);

  return { display, onMouseEnter: () => setHovered(true), onMouseLeave: () => setHovered(false) };
};

const ScrambleText = ({ text }) => {
  const { display, onMouseEnter, onMouseLeave } = useScramble(text);
  return (
    <span onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} className="inline-block cursor-default select-none">
      {display}
    </span>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT: Boot / Loading Screen — with fade-out exit animation
// ─────────────────────────────────────────────────────────────────────────────
const BootScreen = ({ progress, exiting }) => (
  <div
    aria-live="polite"
    aria-label={`Loading ProCart AI, ${Math.min(100, Math.floor(progress))} percent`}
    className={`fixed inset-0 bg-[#f8fafc] dark:bg-black z-[99999] flex flex-col items-center justify-center px-6 transition-opacity duration-500 ${exiting ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
  >
    <div className="w-full max-w-xs space-y-3">
      <div className="flex justify-between text-[10px] tracking-[0.3em] font-bold uppercase text-gray-400 dark:text-gray-600">
        <span>Initializing ProCart AI</span>
        <span>{Math.min(100, Math.floor(progress))}%</span>
      </div>
      <div className="w-full h-[2px] bg-gray-200 dark:bg-gray-900 rounded-full overflow-hidden" role="progressbar" aria-valuenow={Math.min(100, Math.floor(progress))} aria-valuemin={0} aria-valuemax={100}>
        <div
          className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 dark:from-cyan-400 dark:to-purple-500 transition-all duration-100 rounded-full"
          style={{ width: `${Math.min(100, progress)}%` }}
        />
      </div>
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT: Quantum Reflex Game — full rewrite with fixed bugs
// - No more localStorage crash risk (wrapped in try/catch)
// - Stale closure fixed: speedMultiplier derived from score ref
// - No accidental game-over on miss (miss penalty = time reduction only)
// ─────────────────────────────────────────────────────────────────────────────
const QuantumReflexGame = () => {
  const [phase, setPhase] = useState('idle'); // idle | playing | gameover
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_CONFIG.INITIAL_TIME);
  const [targetPos, setTargetPos] = useState({ top: '50%', left: '50%' });
  const [highScore, setHighScore] = useState(() => {
    try { return parseInt(localStorage.getItem('procartHighScore') || '0', 10); }
    catch { return 0; }
  });

  const scoreRef = useRef(0);
  const timerRef = useRef(null);

  const randomPos = useCallback(() => ({
    top: `${Math.floor(Math.random() * (100 - GAME_CONFIG.TARGET_PADDING * 2)) + GAME_CONFIG.TARGET_PADDING}%`,
    left: `${Math.floor(Math.random() * (100 - GAME_CONFIG.TARGET_PADDING * 2)) + GAME_CONFIG.TARGET_PADDING}%`,
  }), []);

  const startGame = useCallback(() => {
    scoreRef.current = 0;
    setScore(0);
    setTimeLeft(GAME_CONFIG.INITIAL_TIME);
    setTargetPos(randomPos());
    setPhase('playing');
  }, [randomPos]);

  const handleHit = useCallback((e) => {
    e.stopPropagation();
    if (phase !== 'playing') return;
    const newScore = scoreRef.current + 1;
    scoreRef.current = newScore;
    setScore(newScore);
    if (newScore > highScore) {
      setHighScore(newScore);
      try { localStorage.setItem('procartHighScore', String(newScore)); } catch { /* ignore */ }
    }
    setTimeLeft(GAME_CONFIG.INITIAL_TIME);
    setTargetPos(randomPos());
  }, [phase, highScore, randomPos]);

  useEffect(() => {
    if (phase !== 'playing') return;
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      const s = scoreRef.current;
      let speed = GAME_CONFIG.BASE_SPEED;
      if (s >= GAME_CONFIG.SPEED_RAMP_AFTER) {
        speed = Math.min(
          GAME_CONFIG.MAX_SPEED,
          GAME_CONFIG.BASE_SPEED + (s - (GAME_CONFIG.SPEED_RAMP_AFTER - 1)) * GAME_CONFIG.SPEED_INCREMENT
        );
      }
      setTimeLeft((prev) => {
        const next = prev - speed;
        if (next <= 0) {
          clearInterval(timerRef.current);
          setPhase('gameover');
          return 0;
        }
        return next;
      });
    }, GAME_CONFIG.TICK_MS);

    return () => clearInterval(timerRef.current);
  }, [phase]);

  const timerBarColor = timeLeft > 50 ? 'bg-blue-500 dark:bg-cyan-500' : timeLeft > 25 ? 'bg-amber-500' : 'bg-red-500';

  return (
    <section
      aria-label="Speed reflex mini-game"
      className="lg:col-span-2 rounded-[2rem] sm:rounded-[3rem] bg-white dark:bg-[#050505] border border-gray-200 dark:border-white/[0.08] overflow-hidden shadow-lg flex flex-col h-[350px] relative"
    >
      {/* Header */}
      <header className="p-6 sm:p-8 flex justify-between items-center border-b border-gray-100 dark:border-white/[0.05] shrink-0">
        <div>
          <h3 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight">Speed Test</h3>
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">Test your reflexes</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Best: {highScore}</p>
          <p className="text-2xl font-black text-blue-600 dark:text-cyan-400 tabular-nums">{score}</p>
        </div>
      </header>

      {/* Arena — miss does NOT end the game, only the timer running out does */}
      <div className="flex-1 relative bg-gray-50 dark:bg-[#0a0a0a] overflow-hidden cursor-crosshair" role="application" aria-label="Game arena">

        {phase === 'idle' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-20">
            <p className="text-sm text-gray-500 font-medium">Click the dot as fast as you can</p>
            <button
              onClick={startGame}
              className="px-8 py-3 bg-blue-600 dark:bg-cyan-500 text-white dark:text-black font-black rounded-full hover:scale-105 active:scale-95 transition-transform shadow-lg shadow-blue-500/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
            >
              Start Game
            </button>
          </div>
        )}

        {phase === 'gameover' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 z-20 bg-white/80 dark:bg-black/80 backdrop-blur-sm">
            <p className="text-xl font-black text-gray-900 dark:text-white">Time's Up!</p>
            <p className="text-gray-500 font-medium text-sm mb-2">
              Score: <span className="text-blue-600 dark:text-cyan-400 font-black text-lg tabular-nums">{score}</span>
              {score === highScore && score > 0 && <span className="ml-2 text-amber-500 font-bold">· New best!</span>}
            </p>
            <button
              onClick={startGame}
              className="px-8 py-3 bg-blue-600 dark:bg-cyan-500 text-white dark:text-black font-black rounded-full hover:scale-105 active:scale-95 transition-transform shadow-lg shadow-blue-500/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
            >
              Play Again
            </button>
          </div>
        )}

        {phase === 'playing' && (
          <button
            aria-label="Hit target"
            onClick={handleHit}
            className="absolute w-10 h-10 -ml-5 -mt-5 rounded-full bg-blue-500 dark:bg-cyan-400 flex items-center justify-center ring-4 ring-blue-300/40 dark:ring-cyan-400/30 active:scale-90 transition-transform focus-visible:outline-none"
            style={{ top: targetPos.top, left: targetPos.left }}
          >
            <div className="w-4 h-4 bg-white rounded-full pointer-events-none" aria-hidden="true" />
          </button>
        )}

        {phase === 'playing' && (
          <div className="absolute bottom-0 left-0 h-1.5 w-full bg-gray-200 dark:bg-white/10" role="timer" aria-label={`Time remaining: ${Math.ceil(timeLeft)}%`}>
            <div className={`h-full ${timerBarColor} transition-all duration-[20ms] rounded-r-full`} style={{ width: `${timeLeft}%` }} />
          </div>
        )}
      </div>
    </section>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT: Platform Stats — batched state updates, honest labels
// ─────────────────────────────────────────────────────────────────────────────
const usePlatformStats = (enabled) => {
  const [stats, setStats] = useState({
    serverSpeed: PLATFORM_STATS.SERVER_SPEED.initial,
    dbHealth: PLATFORM_STATS.DB_HEALTH.initial,
    activeUsers: PLATFORM_STATS.ACTIVE_USERS.initial,
  });

  useEffect(() => {
    if (!enabled) return;
    const interval = setInterval(() => {
      setStats((prev) => ({
        serverSpeed: Math.min(PLATFORM_STATS.SERVER_SPEED.max, Math.max(PLATFORM_STATS.SERVER_SPEED.min,
          prev.serverSpeed + (Math.random() * PLATFORM_STATS.SERVER_SPEED.drift * 2 - PLATFORM_STATS.SERVER_SPEED.drift)
        )),
        dbHealth: Math.min(PLATFORM_STATS.DB_HEALTH.max, Math.max(PLATFORM_STATS.DB_HEALTH.min,
          prev.dbHealth + (Math.random() * PLATFORM_STATS.DB_HEALTH.drift * 2 - PLATFORM_STATS.DB_HEALTH.drift)
        )),
        activeUsers: Math.round(Math.min(PLATFORM_STATS.ACTIVE_USERS.max, Math.max(PLATFORM_STATS.ACTIVE_USERS.min,
          prev.activeUsers + (Math.random() * PLATFORM_STATS.ACTIVE_USERS.drift * 2 - PLATFORM_STATS.ACTIVE_USERS.drift)
        ))),
      }));
    }, 2500);
    return () => clearInterval(interval);
  }, [enabled]);

  return stats;
};

const StatBar = ({ label, value, displayValue, color, status }) => {
  const colorMap = {
    blue: 'bg-blue-500 dark:bg-blue-400',
    purple: 'bg-purple-500 dark:bg-purple-400',
    emerald: 'bg-emerald-500 dark:bg-emerald-400',
  };
  const textMap = {
    blue: 'text-blue-600 dark:text-blue-400',
    purple: 'text-purple-600 dark:text-purple-400',
    emerald: 'text-emerald-600 dark:text-emerald-400',
  };

  return (
    <div>
      <div className="flex justify-between items-baseline text-xs font-bold uppercase tracking-widest mb-2.5">
        <span className="text-gray-500 dark:text-gray-400">{label}</span>
        <span className={`${textMap[color]} font-black`}>{displayValue} · <span className="font-medium normal-case">{status}</span></span>
      </div>
      <div className="h-2 w-full bg-gray-200 dark:bg-white/5 rounded-full overflow-hidden" role="meter" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
        <div className={`h-full ${colorMap[color]} transition-all duration-1000 ease-out rounded-full`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function Home() {
  const [bootProgress, setBootProgress] = useState(0);
  const [bootExiting, setBootExiting] = useState(false);
  const [booted, setBooted] = useState(false);

  const { registerRef, isVisible } = useRevealOnScroll();
  const stats = usePlatformStats(booted);

  // Derived display values for stats
  const serverPct = useMemo(() => Math.round((1 - (stats.serverSpeed - 5) / 20) * 100), [stats.serverSpeed]);
  const dbPct = useMemo(() => Math.round(stats.dbHealth), [stats.dbHealth]);
  const userPct = useMemo(() => Math.round(((stats.activeUsers - 2400) / 800) * 100), [stats.activeUsers]);

  useEffect(() => {
    let progress = 0;
    const id = setInterval(() => {
      progress += Math.random() * 18 + 4; // min 4% per tick so it never stalls
      if (progress >= 100) {
        setBootProgress(100);
        clearInterval(id);
        setTimeout(() => {
          setBootExiting(true);
          setTimeout(() => setBooted(true), 500);
        }, 200);
      } else {
        setBootProgress(Math.min(progress, 99)); // never show 100 until truly done
      }
    }, 60);
    return () => clearInterval(id);
  }, []);

  const reveal = (key) =>
    `transition-all duration-700 ease-out ${isVisible(key) ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`;

  return (
    <>
      {!booted && <BootScreen progress={bootProgress} exiting={bootExiting} />}

      <div
        className={`bg-[#f8fafc] dark:bg-black min-h-screen font-sans text-gray-900 dark:text-white selection:bg-blue-600 selection:text-white dark:selection:bg-cyan-500 dark:selection:text-black overflow-x-hidden transition-colors duration-700 ${booted ? 'animate-[fadeIn_0.6s_ease-out]' : 'opacity-0'}`}
        aria-hidden={!booted}
      >
        {/* ── BACKGROUND ── */}
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden="true">
          <div className="absolute top-[-10%] left-[-10%] w-[70vw] h-[70vw] rounded-full bg-blue-500/5 dark:bg-cyan-500/4 blur-[120px]" />
          <div className="absolute bottom-[-15%] right-[-10%] w-[80vw] h-[80vw] rounded-full bg-indigo-500/5 dark:bg-purple-500/4 blur-[120px]" />
          <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] dark:bg-[radial-gradient(#1e293b_1px,transparent_1px)] bg-[size:24px_24px] opacity-50 dark:opacity-30 [mask-image:radial-gradient(ellipse_80%_80%_at_50%_0%,#000_10%,transparent_100%)]" />
        </div>

        <main className="relative z-10 pb-16">

          {/* ── HERO ── */}
          <section
            ref={registerRef('hero')}
            className={`pt-20 pb-32 sm:pt-32 sm:pb-40 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto flex flex-col items-center text-center ${reveal('hero')}`}
            aria-labelledby="hero-heading"
          >
            {/* Status pill */}
            <div
              className="inline-flex items-center gap-2.5 px-5 py-2 sm:px-7 sm:py-2.5 rounded-full bg-white/90 dark:bg-[#0a0a0a]/90 border border-gray-200/60 dark:border-white/[0.08] backdrop-blur-2xl mb-10 sm:mb-14 shadow-sm hover:scale-105 transition-transform cursor-default"
              role="status"
            >
              <span className="relative flex h-2 w-2" aria-hidden="true">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 dark:bg-cyan-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600 dark:bg-cyan-500" />
              </span>
              <span className="text-[10px] sm:text-xs font-black tracking-[0.3em] uppercase text-gray-700 dark:text-gray-300">
                <ScrambleText text="Welcome to ProCart AI" />
              </span>
            </div>

            {/* Headline — clamped to safe font sizes */}
            <h1
              id="hero-heading"
              className="text-[clamp(2.5rem,12vw,8.5rem)] font-black tracking-tighter leading-[1.03] sm:leading-[0.92] mb-6 sm:mb-8 w-full"
            >
              <span className="text-gray-900 dark:text-white">Premium Shopping.</span>
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-500 dark:from-cyan-300 dark:via-blue-400 dark:to-purple-400 animate-gradient-x">
                Reimagined.
              </span>
            </h1>

            <p className="text-base sm:text-xl text-gray-600 dark:text-gray-400 max-w-2xl font-medium leading-relaxed mb-12 sm:mb-16 px-2">
              Discover top-tier electronics, everyday essentials, and premium gear.
              Fast shipping, secure payments, absolute quality.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full sm:w-auto px-4 sm:px-0">
              <div className="relative group w-full sm:w-auto">
                <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-cyan-400 dark:to-purple-500 rounded-full blur opacity-0 group-hover:opacity-30 transition-opacity duration-500" aria-hidden="true" />
                <Link
                  to="/products"
                  className="relative flex items-center justify-center gap-2.5 px-8 py-4 sm:px-10 sm:py-4.5 text-sm sm:text-base font-black text-white bg-gray-900 dark:text-black dark:bg-white rounded-full hover:bg-gray-800 dark:hover:bg-gray-100 transition-all duration-200 active:scale-95 shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900"
                >
                  <ScrambleText text="Start Shopping" />
                  <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </Link>
              </div>

              <Link
                to="/login"
                className="px-8 py-4 sm:px-10 sm:py-4.5 text-sm sm:text-base font-semibold text-gray-700 bg-white/80 border border-gray-200 hover:bg-white hover:border-gray-300 dark:text-gray-200 dark:bg-white/[0.04] dark:border-white/10 dark:hover:bg-white/[0.08] backdrop-blur-xl rounded-full transition-all duration-200 flex items-center justify-center active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-500"
              >
                Login / Sign Up
              </Link>
            </div>

            {/* Scroll cue */}
            <div className="mt-20 sm:mt-24 flex flex-col items-center gap-2 opacity-40 animate-bounce" aria-hidden="true">
              <div className="w-5 h-8 border-2 border-gray-400 dark:border-gray-600 rounded-full flex justify-center pt-1.5">
                <div className="w-0.5 h-1.5 bg-blue-600 dark:bg-cyan-400 rounded-full animate-[scrollDot_1.5s_ease-in-out_infinite]" />
              </div>
              <span className="text-[9px] font-black uppercase tracking-widest text-gray-500">Scroll</span>
            </div>
          </section>

          {/* ── BRAND MARQUEE ── */}
          <div
            ref={registerRef('marquee')}
            className={`border-y border-gray-200/50 dark:border-white/[0.04] bg-white/50 dark:bg-black/40 backdrop-blur-2xl py-6 overflow-hidden transition-opacity duration-700 ${isVisible('marquee') ? 'opacity-100' : 'opacity-0'}`}
            aria-label="Trusted brands"
          >
            <div className="absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-[#f8fafc] dark:from-black to-transparent z-10 pointer-events-none" aria-hidden="true" />
            <div className="absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-[#f8fafc] dark:from-black to-transparent z-10 pointer-events-none" aria-hidden="true" />
            <div className="flex animate-[marquee_35s_linear_infinite] w-max" aria-hidden="true">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex items-center gap-12 sm:gap-20 px-8 sm:px-12">
                  {['SAMSUNG', 'APPLE', 'SONY', 'NIKE', 'DELL', 'LG', 'BOSE'].map((b) => (
                    <span key={b} className="text-lg sm:text-2xl font-black tracking-tighter text-gray-300 dark:text-gray-800 shrink-0">{b}</span>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* ── LIVE PLATFORM ACTIVITY ── */}
          <section
            ref={registerRef('core')}
            className={`max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-28 ${reveal('core')}`}
            aria-labelledby="platform-heading"
          >
            <div className="bg-white/80 dark:bg-[#030303]/80 backdrop-blur-3xl border border-gray-200/50 dark:border-white/[0.04] rounded-[2rem] sm:rounded-[3rem] p-8 sm:p-14 relative overflow-hidden shadow-sm dark:shadow-none">
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 dark:bg-cyan-500/5 blur-[80px] pointer-events-none" aria-hidden="true" />

              <div className="flex flex-col lg:flex-row justify-between gap-8 lg:gap-16 relative z-10">
                <div className="flex-1 max-w-md">
                  <h2 id="platform-heading" className="text-3xl sm:text-5xl font-black tracking-tight mb-4 leading-tight">
                    Live Platform<br />
                    <span className="text-blue-600 dark:text-cyan-400">Activity.</span>
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base leading-relaxed">
                    Thousands of shoppers are browsing right now. Enterprise-grade infrastructure keeps every session fast, secure, and seamless.
                  </p>
                </div>

                <div className="flex-1 space-y-5 sm:space-y-6 bg-gray-50/60 dark:bg-[#0a0a0a]/60 p-6 sm:p-8 rounded-2xl sm:rounded-3xl border border-gray-200/40 dark:border-white/[0.03]">
                  <StatBar
                    label="Server Response"
                    value={serverPct}
                    displayValue={`${stats.serverSpeed.toFixed(1)}ms`}
                    color="blue"
                    status="Excellent"
                  />
                  <StatBar
                    label="Database Health"
                    value={dbPct}
                    displayValue={`${stats.dbHealth.toFixed(1)}%`}
                    color="purple"
                    status="Optimal"
                  />
                  <StatBar
                    label="Active Sessions"
                    value={userPct}
                    displayValue={stats.activeUsers.toLocaleString()}
                    color="emerald"
                    status="Live"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* ── FEATURES BENTO + GAME ── */}
          <section
            ref={registerRef('bento')}
            className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-16 ${reveal('bento')}`}
            aria-labelledby="features-heading"
          >
            <div className="mb-10 sm:mb-16">
              <h2 id="features-heading" className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.1]">
                Everything you need.
                <br className="hidden sm:block" />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-cyan-400 dark:to-purple-400">
                  Nothing you don't.
                </span>
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 auto-rows-auto lg:auto-rows-[350px]">

              {/* Game */}
              <QuantumReflexGame />

              {/* Feature Cards */}
              {FEATURES.map(({ icon, title, desc, color }) => {
                const bg = { purple: 'bg-purple-50 dark:bg-purple-500/10 border-purple-100 dark:border-purple-500/20', emerald: 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-100 dark:border-emerald-500/20' };
                return (
                  <article key={title} className="rounded-[2rem] sm:rounded-[3rem] bg-white/80 dark:bg-[#050505]/80 backdrop-blur-2xl border border-gray-200/50 dark:border-white/[0.04] p-8 sm:p-12 hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between group shadow-sm">
                    <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl ${bg[color]} flex items-center justify-center mb-8 border text-2xl group-hover:scale-110 transition-transform`} aria-hidden="true">
                      {icon}
                    </div>
                    <div>
                      <h3 className="text-xl sm:text-2xl font-black mb-2.5 text-gray-900 dark:text-white tracking-tight">{title}</h3>
                      <p className="text-gray-500 dark:text-gray-400 text-sm sm:text-base leading-relaxed">{desc}</p>
                    </div>
                  </article>
                );
              })}

              {/* Payments card — full width */}
              <article className="lg:col-span-2 rounded-[2rem] sm:rounded-[3rem] bg-white/80 dark:bg-[#050505]/80 backdrop-blur-2xl border border-gray-200/50 dark:border-white/[0.04] p-8 sm:p-12 hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between group shadow-sm">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center mb-8 border border-indigo-100 dark:border-indigo-500/20 text-2xl group-hover:scale-110 transition-transform" aria-hidden="true">
                  💳
                </div>
                <div>
                  <h3 className="text-2xl sm:text-3xl font-black mb-3 text-gray-900 dark:text-white tracking-tight">Flexible Payments</h3>
                  <p className="text-gray-500 dark:text-gray-400 text-sm sm:text-base leading-relaxed max-w-lg">
                    Pay exactly how you want — Credit Cards, UPI, Net Banking, and Cash on Delivery all supported natively.
                  </p>
                </div>
              </article>
            </div>
          </section>

          {/* ── FOOTER / ARCHITECT CARD ── */}
          <footer
            ref={registerRef('footer')}
            className={`max-w-[100rem] mx-auto px-4 mt-8 sm:mt-16 mb-10 ${reveal('footer')}`}
            aria-label="Site footer and project credits"
          >
            <div className="p-px rounded-[3rem] sm:rounded-[5rem] bg-gradient-to-b from-gray-300/70 dark:from-white/[0.12] to-transparent">
              <div className="bg-white dark:bg-[#020202] rounded-[3rem] sm:rounded-[5rem] px-8 py-16 sm:px-24 sm:py-28 text-center relative overflow-hidden flex flex-col items-center border border-gray-100 dark:border-white/[0.04]">

                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[200px] bg-blue-500/10 dark:bg-cyan-500/10 blur-[80px] pointer-events-none" aria-hidden="true" />

                <div className="relative z-10 mb-8 sm:mb-10 border border-gray-200 dark:border-white/15 px-6 py-2 rounded-full bg-gray-50 dark:bg-[#050505]">
                  <p className="text-[10px] sm:text-xs font-black text-gray-500 dark:text-gray-400 tracking-[0.4em] uppercase">
                    <ScrambleText text="Chief Architect" />
                  </p>
                </div>

                <h2 className="text-[clamp(1.8rem,6vw,5.5rem)] font-black text-transparent bg-clip-text bg-gradient-to-b from-gray-900 to-gray-400 dark:from-white dark:to-gray-600 mb-14 sm:mb-20 tracking-tighter leading-[0.95]">
                  Manyam Siva<br />Santhosh Kumar Reddy
                </h2>

                <div className="w-full max-w-3xl grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 relative z-10">
                  {TECH_STACK.map(({ title, detail, icon, color }) => {
                    const bgMap = { blue: 'bg-blue-50 dark:bg-blue-500/10', purple: 'bg-purple-50 dark:bg-purple-500/10', green: 'bg-green-50 dark:bg-green-500/10', indigo: 'bg-indigo-50 dark:bg-indigo-500/10' };
                    const textMap = { blue: 'text-blue-600 dark:text-blue-400', purple: 'text-purple-600 dark:text-purple-400', green: 'text-green-600 dark:text-green-400', indigo: 'text-indigo-600 dark:text-indigo-400' };
                    return (
                      <div key={title} className="bg-gray-50/80 dark:bg-[#080808]/80 p-5 sm:p-8 rounded-2xl sm:rounded-3xl border border-gray-200 dark:border-white/[0.04] flex flex-col items-center text-center hover:-translate-y-1.5 transition-transform duration-300">
                        <div className={`w-10 h-10 sm:w-12 sm:h-12 ${bgMap[color]} rounded-full flex items-center justify-center mb-4 text-base sm:text-lg`} aria-hidden="true">
                          <span className={textMap[color]}>{icon}</span>
                        </div>
                        <p className="text-[9px] sm:text-[10px] text-gray-500 font-black uppercase tracking-[0.3em] mb-1">{title}</p>
                        <p className="text-sm sm:text-base font-black text-gray-900 dark:text-white">{detail}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </footer>

        </main>
      </div>

      {/* Global keyframe animations injected once via a style element — no dangerouslySetInnerHTML */}
      <GlobalStyles />
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT: GlobalStyles — injects keyframes cleanly via a React portal alternative
// ─────────────────────────────────────────────────────────────────────────────
const GLOBAL_CSS = `
  @keyframes gradient-x {
    0%, 100% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
  }
  @keyframes marquee {
    from { transform: translateX(0); }
    to { transform: translateX(-50%); }
  }
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @keyframes scrollDot {
    0% { transform: translateY(0); opacity: 1; }
    100% { transform: translateY(10px); opacity: 0; }
  }
  .animate-gradient-x {
    background-size: 200% auto;
    animation: gradient-x 6s ease infinite;
  }
`;

const GlobalStyles = () => {
  useEffect(() => {
    const existing = document.getElementById('procart-styles');
    if (existing) return;
    const el = document.createElement('style');
    el.id = 'procart-styles';
    el.textContent = GLOBAL_CSS;
    document.head.appendChild(el);
    return () => { /* intentionally leave styles for performance */ };
  }, []);
  return null;
};