@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=Playfair+Display:ital,wght@0,400..900;1,400..900&family=JetBrains+Mono:wght@400;500&display=swap');
@import "tailwindcss";

@theme {
  --font-sans: "Inter", ui-sans-serif, system-ui, sans-serif;
  --font-serif: "Playfair Display", serif;
  --font-mono: "JetBrains Mono", ui-monospace, SFMono-Regular, monospace;

  --color-legal-navy:     #0f172a;
  --color-legal-navy-mid: #1e293b;
  --color-legal-gold:     #b45309;
  --color-legal-gold-lt:  #d97706;
}

/* ── Global base ──────────────────────────────────────────────────────────── */
@layer base {
  *, *::before, *::after { box-sizing: border-box; }

  html {
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    text-rendering: optimizeLegibility;
  }

  body {
    @apply bg-slate-50 text-slate-900 font-sans;
    background-image:
      radial-gradient(ellipse 80% 50% at 10% -10%, rgba(15,23,42,0.04) 0%, transparent 60%),
      radial-gradient(ellipse 60% 40% at 90% 100%, rgba(180,83,9,0.03) 0%, transparent 60%);
  }

  /* Scrollbar */
  ::-webkit-scrollbar { width: 4px; height: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 99px; }
  ::-webkit-scrollbar-thumb:hover { background: #94a3b8; }

  /* Focus ring */
  :focus-visible {
    outline: 2px solid #b45309;
    outline-offset: 2px;
    border-radius: 6px;
  }

  /* Smooth transitions on interactive elements */
  button, a, input, select, textarea {
    transition-property: color, background-color, border-color, box-shadow, opacity, transform;
    transition-duration: 150ms;
    transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  }

  button:active { transform: scale(0.97); }
  a:active { transform: scale(0.98); }
}

/* ── Utility classes ─────────────────────────────────────────────────────── */
@layer utilities {

  /* Glass morphism */
  .glass {
    background: rgba(255,255,255,0.82);
    backdrop-filter: blur(16px) saturate(180%);
    -webkit-backdrop-filter: blur(16px) saturate(180%);
    border: 1px solid rgba(255,255,255,0.9);
  }

  .glass-dark {
    background: rgba(15,23,42,0.80);
    backdrop-filter: blur(20px) saturate(160%);
    -webkit-backdrop-filter: blur(20px) saturate(160%);
    border: 1px solid rgba(255,255,255,0.07);
  }

  /* Cards */
  .card {
    @apply bg-white rounded-2xl border border-slate-200/70 shadow-sm;
    transition: box-shadow 0.25s ease, border-color 0.25s ease, transform 0.2s ease;
  }
  .card:hover {
    box-shadow: 0 6px 32px rgba(15,23,42,0.09);
    border-color: rgba(203,213,225,0.9);
  }

  /* Elevated card */
  .card-elevated {
    @apply bg-white rounded-3xl border border-slate-200/80;
    box-shadow: 0 2px 8px rgba(15,23,42,0.04), 0 8px 32px rgba(15,23,42,0.06);
  }

  /* Buttons */
  .btn-primary {
    @apply inline-flex items-center gap-2 px-4 py-2.5 bg-legal-navy text-white rounded-xl text-sm font-semibold;
    box-shadow: 0 2px 8px rgba(15,23,42,0.25), 0 1px 2px rgba(15,23,42,0.15);
  }
  .btn-primary:hover {
    background: #1e293b;
    box-shadow: 0 4px 16px rgba(15,23,42,0.3), 0 2px 4px rgba(15,23,42,0.2);
    transform: translateY(-1px);
  }
  .btn-primary:active { transform: translateY(0) scale(0.97); }

  .btn-secondary {
    @apply inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-semibold;
    box-shadow: 0 1px 3px rgba(15,23,42,0.06);
  }
  .btn-secondary:hover {
    @apply bg-slate-50 border-slate-300;
    box-shadow: 0 2px 8px rgba(15,23,42,0.08);
    transform: translateY(-1px);
  }

  /* Badge */
  .badge {
    @apply inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider;
  }

  /* Input */
  .input {
    @apply w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm;
    @apply focus:outline-none focus:ring-2 focus:ring-legal-navy/10 focus:border-legal-navy/30;
    transition: border-color 0.2s, box-shadow 0.2s, background-color 0.2s;
  }
  .input:focus { background: white; }

  /* Stat number */
  .stat-value {
    @apply text-3xl font-black text-slate-900 tabular-nums;
    font-feature-settings: "tnum";
  }

  /* Animations */
  .animate-fade-in  { animation: fadeIn  0.25s ease forwards; }
  .animate-slide-up { animation: slideUp 0.35s cubic-bezier(0.16,1,0.3,1) forwards; }
  .animate-scale-in { animation: scaleIn 0.25s cubic-bezier(0.16,1,0.3,1) forwards; }

  /* Hover lift */
  .hover-lift {
    transition: transform 0.2s ease, box-shadow 0.2s ease;
  }
  .hover-lift:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(15,23,42,0.1);
  }

  /* Shimmer skeleton */
  .skeleton {
    background: linear-gradient(90deg, #f1f5f9 25%, #e8edf3 50%, #f1f5f9 75%);
    background-size: 200% 100%;
    animation: shimmer 1.6s ease-in-out infinite;
    border-radius: 8px;
  }
}

/* ── Keyframes ───────────────────────────────────────────────────────────── */
@keyframes fadeIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}

@keyframes slideUp {
  from { opacity: 0; transform: translateY(14px); }
  to   { opacity: 1; transform: translateY(0); }
}

@keyframes scaleIn {
  from { opacity: 0; transform: scale(0.95); }
  to   { opacity: 1; transform: scale(1); }
}

@keyframes shimmer {
  0%   { background-position: -200% 0; }
  100% { background-position:  200% 0; }
}

@keyframes float {
  0%, 100% { transform: translateY(0px); }
  50%       { transform: translateY(-4px); }
}

@keyframes glow-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(180,83,9,0.3); }
  50%       { box-shadow: 0 0 0 6px rgba(180,83,9,0); }
}

/* ── Sidebar nav ─────────────────────────────────────────────────────────── */
.nav-item {
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 12px;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 500;
  color: rgba(255,255,255,0.55);
  cursor: pointer;
  transition: all 0.18s ease;
  border: 1px solid transparent;
}
.nav-item:hover {
  color: rgba(255,255,255,0.9);
  background: rgba(255,255,255,0.07);
}
.nav-item.active {
  color: white;
  background: rgba(255,255,255,0.1);
  border-color: rgba(255,255,255,0.08);
  box-shadow: 0 2px 12px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.08);
}
.nav-item.active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 20%;
  height: 60%;
  width: 3px;
  background: linear-gradient(to bottom, #d97706, #b45309);
  border-radius: 0 3px 3px 0;
}

/* ── Table styles ────────────────────────────────────────────────────────── */
.table-row {
  transition: background-color 0.15s ease;
}
.table-row:hover { background: rgba(248,250,252,0.8); }

/* ── Markdown body ───────────────────────────────────────────────────────── */
.markdown-body { @apply text-sm leading-relaxed space-y-3; }
.markdown-body h1, .markdown-body h2, .markdown-body h3 {
  @apply font-serif font-bold text-legal-navy mt-5 mb-2;
}
.markdown-body p  { @apply mb-3 text-slate-700; }
.markdown-body ul { @apply list-disc pl-5 mb-3; }
.markdown-body li { @apply mb-1 text-slate-600; }
.markdown-body strong { @apply font-semibold text-slate-900; }
.markdown-body code {
  @apply font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded text-slate-700;
}

/* ── React Calendar ─────────────────────────────────────────────────────── */
.react-calendar { @apply w-full border-none bg-white font-sans rounded-2xl p-4; }
.react-calendar__navigation { @apply flex h-11 mb-4; }
.react-calendar__navigation button {
  @apply min-w-[44px] bg-none font-bold text-legal-navy hover:bg-slate-50 rounded-xl transition-colors;
}
.react-calendar__month-view__weekdays {
  @apply text-center font-bold text-[10px] uppercase tracking-widest text-slate-400 mb-2;
}
.react-calendar__tile {
  @apply max-w-full p-3 bg-none text-center leading-none rounded-xl text-sm font-medium text-slate-600;
  transition: background-color 0.15s, color 0.15s, transform 0.15s;
}
.react-calendar__tile:hover { @apply bg-slate-50; transform: scale(1.05); }
.react-calendar__tile--now   { @apply bg-amber-50 text-legal-gold font-bold; }
.react-calendar__tile--active { @apply !bg-legal-navy !text-white font-bold; border-radius: 12px; }
.react-calendar__month-view__days__day--neighboringMonth { @apply text-slate-300; }

/* ── Status badges ───────────────────────────────────────────────────────── */
.badge-paid     { @apply bg-emerald-50 text-emerald-700 border border-emerald-100; }
.badge-pending  { @apply bg-amber-50   text-amber-700   border border-amber-100;  }
.badge-overdue  { @apply bg-rose-50    text-rose-700    border border-rose-100;   }
.badge-active   { @apply bg-blue-50    text-blue-700    border border-blue-100;   }

/* ── Floating action button ──────────────────────────────────────────────── */
.fab {
  @apply flex items-center gap-2 px-5 py-3 bg-legal-navy text-white rounded-2xl text-sm font-bold;
  box-shadow: 0 4px 20px rgba(15,23,42,0.3), 0 2px 6px rgba(15,23,42,0.2);
  transition: all 0.2s cubic-bezier(0.34,1.56,0.64,1);
}
.fab:hover {
  transform: translateY(-2px) scale(1.02);
  box-shadow: 0 8px 28px rgba(15,23,42,0.35), 0 4px 10px rgba(15,23,42,0.2);
}
.fab:active { transform: translateY(0) scale(0.97); }

/* ── Page transition ─────────────────────────────────────────────────────── */
.page-enter { animation: slideUp 0.28s cubic-bezier(0.16,1,0.3,1) forwards; }

/* ── Divider ─────────────────────────────────────────────────────────────── */
.divider {
  height: 1px;
  background: linear-gradient(to right, transparent, rgba(203,213,225,0.8), transparent);
}

/* ── Top navigation progress bar ─────────────────────────────────────────── */
@keyframes progressBar {
  from { transform: translateX(-100%); opacity: 1; }
  to   { transform: translateX(0%);    opacity: 0; }
}

/* ── Smooth number transitions ───────────────────────────────────────────── */
.tabular-nums { font-variant-numeric: tabular-nums; }

/* ── Hover lift utility ──────────────────────────────────────────────────── */
.hover-lift {
  transition: transform 0.2s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.2s ease;
}
.hover-lift:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 32px rgba(15,23,42,0.1);
}
.hover-lift:active { transform: translateY(0); }
