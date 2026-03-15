import React, { useState, useEffect } from 'react';
import { RefreshCw, ExternalLink, AlertCircle, CheckCircle2, FileText, Loader2 } from 'lucide-react';

interface CauseListEntry {
  title: string;
  link: string | null;
  type: string;
}

interface CauseListData {
  success: boolean;
  date: string;
  sourceUrl: string;
  pageTitle?: string;
  entries: CauseListEntry[];
  totalFound: number;
  error?: string;
}

const TYPE_COLORS: Record<string, string> = {
  'Original Side':   'bg-purple-50 text-purple-700 border-purple-100',
  'Division Bench':  'bg-blue-50 text-blue-700 border-blue-100',
  'Single Bench':    'bg-teal-50 text-teal-700 border-teal-100',
  'Appellate Side':  'bg-amber-50 text-amber-700 border-amber-100',
  'Special Bench':   'bg-rose-50 text-rose-700 border-rose-100',
  'Cause List':      'bg-slate-50 text-slate-600 border-slate-100',
};

export default function CauseListWidget() {
  const [data, setData] = useState<CauseListData | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);

  const CACHE_KEY = 'causelist_cache';
  const CACHE_TTL_MINUTES = 60; // Re-fetch only once per hour

  const loadFromCache = (): CauseListData | null => {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      const { data, timestamp } = JSON.parse(raw);
      const ageMinutes = (Date.now() - timestamp) / 60000;
      if (ageMinutes > CACHE_TTL_MINUTES) return null;
      return data;
    } catch { return null; }
  };

  const saveToCache = (d: CauseListData) => {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ data: d, timestamp: Date.now() }));
    } catch {}
  };

  const fetchCauseList = async (force = false) => {
    if (!force) {
      const cached = loadFromCache();
      if (cached) {
        setData(cached);
        setLastFetched(new Date());
        return;
      }
    }
    setLoading(true);
    try {
      const res = await fetch('/api/causelist');
      const json: CauseListData = await res.json();
      setData(json);
      setLastFetched(new Date());
      if (json.success) saveToCache(json);
    } catch (err) {
      setData({
        success: false,
        date: '',
        sourceUrl: 'https://calcuttahighcourt.gov.in/Causelist/today',
        entries: [],
        totalFound: 0,
        error: 'Failed to connect to the server.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCauseList();
  }, []);

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/40">
        <div className="flex items-center gap-2">
          <FileText size={16} className="text-legal-navy" />
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest">
            Daily Cause List
          </h3>
          {data?.date && (
            <span className="text-[10px] text-slate-400 font-medium">{data.date}</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {data?.totalFound !== undefined && data.totalFound > 0 && (
            <span className="text-[10px] font-bold bg-legal-navy text-white px-2.5 py-1 rounded-full">
              {data.totalFound} lists found
            </span>
          )}
          <button
            onClick={() => fetchCauseList(true)}
            disabled={loading}
            className="p-1.5 text-slate-400 hover:text-legal-navy transition-colors rounded-lg hover:bg-slate-100"
            title="Refresh"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          <a
            href="https://calcuttahighcourt.gov.in/Causelist/today"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] font-bold text-blue-600 hover:underline flex items-center gap-1"
          >
            Open HC Site <ExternalLink size={10} />
          </a>
        </div>
      </div>

      {/* Body */}
      <div className="p-6">
        {loading && !data && (
          <div className="flex flex-col items-center justify-center py-10 gap-3">
            <Loader2 size={24} className="animate-spin text-legal-navy/30" />
            <p className="text-xs text-slate-400">Fetching today's cause list from Calcutta High Court...</p>
          </div>
        )}

        {!loading && data && !data.success && (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center">
              <AlertCircle size={22} className="text-amber-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-600">{data.error}</p>
              <p className="text-xs text-slate-400 mt-1">The court website may be temporarily unavailable.</p>
            </div>
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => fetchCauseList(true)}
                className="px-4 py-2 bg-legal-navy text-white text-xs font-bold rounded-xl hover:bg-legal-navy/90 transition-all"
              >
                Try Again
              </button>
              <a
                href="https://calcuttahighcourt.gov.in/Causelist/today"
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-white border border-slate-200 text-blue-600 text-xs font-bold rounded-xl hover:bg-blue-50 transition-all flex items-center gap-1.5"
              >
                <ExternalLink size={12} /> Open HC Website Directly
              </a>
            </div>
          </div>
        )}

        {!loading && data && data.success && data.entries.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center border border-slate-100">
              <FileText size={22} className="text-slate-300" />
            </div>
            <p className="text-sm text-slate-400">No cause list entries found for today.</p>
            <p className="text-xs text-slate-300">The cause list may not have been published yet.</p>
            <a
              href="https://calcuttahighcourt.gov.in/Causelist/today"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 px-4 py-2 bg-white border border-slate-200 text-blue-600 text-xs font-bold rounded-xl hover:bg-blue-50 transition-all flex items-center gap-1.5"
            >
              <ExternalLink size={12} /> Check HC Website Manually
            </a>
          </div>
        )}

        {!loading && data && data.success && data.entries.length > 0 && (
          <div className="space-y-3">
            {/* Summary row */}
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <CheckCircle2 size={14} className="text-emerald-500" />
              <p className="text-xs text-slate-500">
                <span className="font-bold text-slate-700">{data.entries.length} cause list{data.entries.length !== 1 ? 's' : ''}</span> found on the official HC website
              </p>
              {lastFetched && (
                <span className="ml-auto text-[10px] text-slate-300">
                  Updated {lastFetched.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>

            {/* Entries */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {data.entries.map((entry, i) => (
                <div
                  key={i}
                  className={`flex items-center justify-between p-3 rounded-xl border ${TYPE_COLORS[entry.type] || TYPE_COLORS['Cause List']} gap-3 hover-lift cursor-default`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText size={13} className="flex-shrink-0 opacity-60" />
                    <div className="min-w-0">
                      <p className="text-xs font-bold truncate">{entry.title}</p>
                      <p className="text-[10px] opacity-60 font-medium">{entry.type}</p>
                    </div>
                  </div>
                  {entry.link && (
                    <a
                      href={entry.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-shrink-0 p-1.5 rounded-lg hover:bg-black/5 transition-colors"
                      title="Open cause list"
                    >
                      <ExternalLink size={12} />
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
