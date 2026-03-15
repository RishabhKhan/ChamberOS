import React from 'react';
import { Transaction, Invoice, Appointment, Case, DocumentAnalysis } from '../types';
import {
  Calendar, FileText, AlertCircle, Gavel, Users, Plus,
  ChevronRight, Sparkles, CheckCircle2, Activity, Wallet,
  ExternalLink, Clock, User, MapPin, FileSearch, AlertTriangle
} from 'lucide-react';
import { format, isSameDay } from 'date-fns';
import CauseListWidget from './CauseListWidget';

interface DashboardProps {
  transactions: Transaction[];
  invoices: Invoice[];
  appointments: Appointment[];
  cases: Case[];
  analyses: DocumentAnalysis[];
  onNavigate: (view: any) => void;
}

const CALCUTTA_HC_URL = 'https://hcservices.ecourts.gov.in/ecourtindiaHC/index_highcourt.php?state_cd=16&dist_cd=1&stateNm=Calcutta';

export default function Dashboard({ transactions, invoices, appointments, cases, analyses, onNavigate }: DashboardProps) {
  const today = new Date();

  // ── Today's hearings from Cases (nextDate = today) ────────────────────────
  const todayCases = cases.filter(c => {
    if (!c.nextDate) return false;
    try { return isSameDay(new Date(c.nextDate), today); } catch { return false; }
  });

  // ── Today's appointments from Calendar ───────────────────────────────────
  const todayAppointments = appointments.filter(a => {
    try { return isSameDay(new Date(a.date), today); } catch { return false; }
  }).sort((a, b) => a.time.localeCompare(b.time));

  // ── Pending drafts: analyses still processing + failed ──────────────────
  const pendingAnalyses = analyses.filter(a => a.status === 'processing' || a.status === 'failed');

  // ── Pending invoices ─────────────────────────────────────────────────────
  const pendingInvoices = invoices.filter(i => i.status === 'pending');
  const overdueInvoices = invoices.filter(i => i.status === 'overdue');
  const pendingAmount = pendingInvoices.reduce((s, i) => s + (i.amount || 0), 0);
  const overdueAmount = overdueInvoices.reduce((s, i) => s + (i.amount || 0), 0);

  // ── Financials ────────────────────────────────────────────────────────────
  const totalIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + (t.amount || 0), 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + (t.amount || 0), 0);

  // ── Upcoming cases (future dates) ────────────────────────────────────────
  const upcomingCases = cases
    .filter(c => { try { return c.nextDate && new Date(c.nextDate) > today; } catch { return false; } })
    .sort((a, b) => new Date(a.nextDate!).getTime() - new Date(b.nextDate!).getTime())
    .slice(0, 5);

  const recentInvoices = invoices.slice(0, 5);

  const formatTime = (time: string) => {
    try {
      const [h, m] = time.split(':');
      const hour = parseInt(h);
      return `${hour % 12 || 12}:${m} ${hour >= 12 ? 'PM' : 'AM'}`;
    } catch { return time; }
  };

  const totalTodayItems = todayCases.length + todayAppointments.length;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
        <div>
          <h1 className="font-serif text-3xl font-bold text-legal-navy">Chamber Dashboard</h1>
          <p className="text-slate-500 text-sm mt-0.5">{format(today, "EEEE, MMMM d, yyyy")}</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => onNavigate('cases')} className="flex items-center gap-2 px-4 py-2 bg-legal-navy text-white rounded-xl text-sm font-bold hover:bg-legal-navy/90 transition-all shadow-lg shadow-legal-navy/20">
            <Plus size={16} /> New Case
          </button>
          <a href={CALCUTTA_HC_URL} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-50 transition-all">
            <ExternalLink size={16} /> eCourts
          </a>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Cases" value={cases.length} icon={<Gavel size={20} />} color="bg-legal-navy/5 text-legal-navy" onClick={() => onNavigate('cases')} />
        <StatCard label="Today's Items" value={totalTodayItems} icon={<Calendar size={20} />} color="bg-blue-50 text-blue-600" onClick={() => onNavigate('cases')} highlight={totalTodayItems > 0} />
        <StatCard label="Pending Invoices" value={pendingInvoices.length} sub={`₹${pendingAmount.toLocaleString('en-IN')}`} icon={<FileText size={20} />} color="bg-amber-50 text-amber-600" onClick={() => onNavigate('invoicing')} />
        <StatCard label="Overdue" value={overdueInvoices.length} sub={`₹${overdueAmount.toLocaleString('en-IN')}`} icon={<AlertCircle size={20} />} color="bg-rose-50 text-rose-600" onClick={() => onNavigate('invoicing')} highlight={overdueInvoices.length > 0} />
      </div>

      {/* ── TODAY AT A GLANCE ─────────────────────────────────────────────── */}
      <div className="bg-white rounded-3xl border border-slate-200/70 overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300">

        {/* Panel header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/40">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest">Today at a Glance</h3>
            <span className="text-[10px] text-slate-400 font-medium">{format(today, 'dd MMM yyyy')}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${totalTodayItems > 0 ? 'bg-legal-navy text-white' : 'bg-slate-100 text-slate-500'}`}>
              {totalTodayItems} item{totalTodayItems !== 1 ? 's' : ''}
            </span>
            <a href={CALCUTTA_HC_URL} target="_blank" rel="noopener noreferrer"
              className="text-[10px] font-bold text-blue-600 hover:underline flex items-center gap-1">
              Calcutta HC <ExternalLink size={10} />
            </a>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-slate-100">

          {/* ── Column 1: Today's Hearings (from Cases) ── */}
          <div className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-legal-navy/5 flex items-center justify-center">
                  <Gavel size={14} className="text-legal-navy" />
                </div>
                <span className="text-xs font-bold text-slate-700 uppercase tracking-widest">Court Hearings</span>
              </div>
              <button onClick={() => onNavigate('cases')} className="text-[10px] font-bold text-legal-navy hover:underline flex items-center gap-0.5">
                Cases <ChevronRight size={11} />
              </button>
            </div>

            {todayCases.length > 0 ? (
              <div className="space-y-3">
                {todayCases.map(c => (
                  <div key={c.id} className="relative pl-3 py-2 rounded-xl hover:bg-slate-50 transition-colors group">
                    <div className={`absolute left-0 top-2 bottom-2 w-0.5 rounded-full ${
                      c.status === 'Disposed' ? 'bg-emerald-400' :
                      c.status === 'Listed Today' ? 'bg-blue-400' : 'bg-legal-gold'
                    }`} />
                    <div className="flex items-start justify-between gap-1">
                      <div className="min-w-0">
                        <p className="text-xs font-black text-legal-navy truncate">{c.caseNumber}</p>
                        <p className="text-[10px] text-slate-600 font-medium truncate">{c.petitioner}</p>
                        <p className="text-[10px] text-slate-400 truncate">vs {c.respondent}</p>
                      </div>
                      <a href={CALCUTTA_HC_URL} target="_blank" rel="noopener noreferrer"
                        className="flex-shrink-0 p-1 rounded hover:bg-blue-50 text-blue-400 hover:text-blue-600 transition-colors">
                        <ExternalLink size={10} />
                      </a>
                    </div>
                    {c.courtName && <p className="text-[9px] text-slate-300 mt-0.5">{c.courtName}</p>}
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={<Gavel size={18} className="text-slate-300" />}
                text="No hearings today"
                sub='Set "Next Date" to today on any case'
                action={{ label: 'Go to Cases', onClick: () => onNavigate('cases') }}
              />
            )}
          </div>

          {/* ── Column 2: Today's Appointments (from Calendar) ── */}
          <div className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
                  <Calendar size={14} className="text-blue-600" />
                </div>
                <span className="text-xs font-bold text-slate-700 uppercase tracking-widest">Appointments</span>
              </div>
              <button onClick={() => onNavigate('calendar')} className="text-[10px] font-bold text-legal-navy hover:underline flex items-center gap-0.5">
                Calendar <ChevronRight size={11} />
              </button>
            </div>

            {todayAppointments.length > 0 ? (
              <div className="space-y-3">
                {todayAppointments.map(a => (
                  <div key={a.id} className="relative pl-3 py-2 rounded-xl hover:bg-slate-50 transition-colors">
                    <div className={`absolute left-0 top-2 bottom-2 w-0.5 rounded-full ${
                      a.type === 'hearing' ? 'bg-rose-400' :
                      a.type === 'consultation' ? 'bg-emerald-400' : 'bg-blue-400'
                    }`} />
                    <div className="flex items-start justify-between gap-1">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <Clock size={9} className="text-legal-gold flex-shrink-0" />
                          <span className="text-[10px] font-bold text-legal-gold">{formatTime(a.time)}</span>
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                            a.type === 'hearing' ? 'bg-rose-50 text-rose-600' :
                            a.type === 'consultation' ? 'bg-emerald-50 text-emerald-600' :
                            'bg-blue-50 text-blue-600'
                          }`}>{a.type}</span>
                        </div>
                        <p className="text-xs font-bold text-slate-800 truncate">{a.title}</p>
                        {a.client && (
                          <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5 truncate">
                            <User size={9} />{a.client}
                          </p>
                        )}
                        {a.location && (
                          <p className="text-[10px] text-slate-400 flex items-center gap-1 truncate">
                            <MapPin size={9} />{a.location}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={<Calendar size={18} className="text-slate-300" />}
                text="No appointments today"
                sub="Add appointments in the Calendar"
                action={{ label: 'Go to Calendar', onClick: () => onNavigate('calendar') }}
              />
            )}
          </div>

          {/* ── Column 3: Pending Drafts ── */}
          <div className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center">
                  <FileSearch size={14} className="text-amber-600" />
                </div>
                <span className="text-xs font-bold text-slate-700 uppercase tracking-widest">Pending Drafts</span>
              </div>
              <button onClick={() => onNavigate('research')} className="text-[10px] font-bold text-legal-navy hover:underline flex items-center gap-0.5">
                Research <ChevronRight size={11} />
              </button>
            </div>

            {pendingAnalyses.length > 0 || pendingInvoices.length > 0 || overdueInvoices.length > 0 ? (
              <div className="space-y-2">
                {/* Pending analyses */}
                {pendingAnalyses.map(a => (
                  <div key={a.id} className="flex items-center gap-2 p-2 rounded-xl bg-amber-50 border border-amber-100">
                    <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${a.status === 'failed' ? 'bg-rose-500' : 'bg-amber-400 animate-pulse'}`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-bold text-amber-800 truncate">{a.fileName}</p>
                      <p className="text-[9px] text-amber-600 font-medium uppercase tracking-wide">{a.status}</p>
                    </div>
                    <button onClick={() => onNavigate('research')} className="flex-shrink-0 p-1 rounded hover:bg-amber-200 transition-colors">
                      <ChevronRight size={10} className="text-amber-600" />
                    </button>
                  </div>
                ))}

                {/* Pending invoices */}
                {pendingInvoices.slice(0, 3).map(inv => (
                  <div key={inv.id} className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 border border-slate-100">
                    <FileText size={11} className="text-amber-500 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-bold text-slate-700 truncate">{inv.clientName}</p>
                      <p className="text-[9px] text-slate-500">₹{(inv.amount || 0).toLocaleString('en-IN')} · Due {inv.dueDate}</p>
                    </div>
                    <button onClick={() => onNavigate('invoicing')} className="flex-shrink-0 p-1 rounded hover:bg-slate-200 transition-colors">
                      <ChevronRight size={10} className="text-slate-400" />
                    </button>
                  </div>
                ))}

                {/* Overdue invoices */}
                {overdueInvoices.slice(0, 2).map(inv => (
                  <div key={inv.id} className="flex items-center gap-2 p-2 rounded-xl bg-rose-50 border border-rose-100">
                    <AlertTriangle size={11} className="text-rose-500 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-bold text-rose-800 truncate">{inv.clientName}</p>
                      <p className="text-[9px] text-rose-500">₹{(inv.amount || 0).toLocaleString('en-IN')} · OVERDUE</p>
                    </div>
                    <button onClick={() => onNavigate('invoicing')} className="flex-shrink-0 p-1 rounded hover:bg-rose-200 transition-colors">
                      <ChevronRight size={10} className="text-rose-400" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={<CheckCircle2 size={18} className="text-emerald-400" />}
                text="All clear!"
                sub="No pending drafts or overdue items"
              />
            )}
          </div>

        </div>
      </div>

      {/* Cause List Widget */}
      <CauseListWidget />

      {/* Middle Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Upcoming Cases */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200/70 overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity size={16} className="text-legal-navy" />
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest">Upcoming Cases</h3>
            </div>
            <button onClick={() => onNavigate('cases')} className="text-[10px] font-bold text-legal-navy hover:underline flex items-center gap-1">
              All Cases <ChevronRight size={12} />
            </button>
          </div>
          <div className="divide-y divide-slate-100">
            {upcomingCases.length > 0 ? upcomingCases.map(c => (
              <div key={c.id} className="px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-legal-navy/5 rounded-xl flex items-center justify-center text-legal-navy flex-shrink-0">
                    <Gavel size={16} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">{c.caseNumber}</p>
                    <p className="text-[10px] text-slate-400">{c.petitioner} vs {c.respondent}</p>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="flex items-center gap-1 text-xs font-bold text-legal-navy">
                    <Calendar size={11} />
                    {new Date(c.nextDate!).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </div>
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full mt-1 inline-block ${
                    c.status === 'Disposed' ? 'bg-emerald-50 text-emerald-600' :
                    c.status === 'Listed Today' ? 'bg-blue-50 text-blue-600' :
                    'bg-amber-50 text-amber-600'
                  }`}>{c.status || 'Pending'}</span>
                </div>
              </div>
            )) : (
              <div className="px-6 py-10 text-center">
                <p className="text-sm text-slate-400">No upcoming cases with future dates.</p>
                <button onClick={() => onNavigate('cases')} className="mt-3 text-xs font-bold text-legal-navy hover:underline">Add Cases →</button>
              </div>
            )}
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Financials */}
          <div className="bg-legal-navy rounded-3xl p-6 text-white shadow-xl shadow-legal-navy/20">
            <div className="flex items-center gap-2 mb-5">
              <Wallet size={16} className="text-white/60" />
              <h3 className="text-xs font-bold text-white/60 uppercase tracking-widest">Financials</h3>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-400" /><span className="text-xs text-white/70">Total Income</span></div>
                <span className="text-sm font-bold text-emerald-400">₹{totalIncome.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-rose-400" /><span className="text-xs text-white/70">Total Expenses</span></div>
                <span className="text-sm font-bold text-rose-400">₹{totalExpense.toLocaleString('en-IN')}</span>
              </div>
              <div className="h-px bg-white/10" />
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/70 font-bold">Net Balance</span>
                <span className={`text-sm font-black ${totalIncome - totalExpense >= 0 ? 'text-white' : 'text-rose-400'}`}>
                  ₹{(totalIncome - totalExpense).toLocaleString('en-IN')}
                </span>
              </div>
            </div>
            <button onClick={() => onNavigate('accounting')} className="mt-5 w-full py-2 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-bold text-white transition-all">
              View Accounting →
            </button>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Quick Actions</h3>
            <div className="space-y-1">
              {[
                { label: 'Add New Case', icon: <Gavel size={15} />, view: 'cases', color: 'text-legal-navy' },
                { label: 'New Client', icon: <Users size={15} />, view: 'clients', color: 'text-blue-600' },
                { label: 'Create Invoice', icon: <FileText size={15} />, view: 'invoicing', color: 'text-amber-600' },
                { label: 'AI Research', icon: <Sparkles size={15} />, view: 'research', color: 'text-purple-600' },
              ].map(({ label, icon, view, color }) => (
                <button key={view} onClick={() => onNavigate(view)} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 transition-all text-left border border-transparent hover:border-slate-200">
                  <span className={color}>{icon}</span>
                  <span className="text-sm font-semibold text-slate-700">{label}</span>
                  <ChevronRight size={14} className="text-slate-300 ml-auto" />
                </button>
              ))}
              <a href={CALCUTTA_HC_URL} target="_blank" rel="noopener noreferrer"
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-blue-50 transition-all text-left border border-transparent hover:border-blue-100">
                <ExternalLink size={15} className="text-blue-600" />
                <span className="text-sm font-semibold text-slate-700">Calcutta HC Portal</span>
                <ExternalLink size={12} className="text-slate-300 ml-auto" />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Invoices */}
      <div className="bg-white rounded-3xl border border-slate-200/70 overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText size={16} className="text-legal-navy" />
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest">Recent Invoices</h3>
          </div>
          <button onClick={() => onNavigate('invoicing')} className="text-[10px] font-bold text-legal-navy hover:underline flex items-center gap-1">
            All Invoices <ChevronRight size={12} />
          </button>
        </div>
        {recentInvoices.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {recentInvoices.map(invoice => (
              <div key={invoice.id} className="px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-xl ${invoice.status === 'paid' ? 'bg-emerald-50 text-emerald-600' : invoice.status === 'overdue' ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'}`}>
                    {invoice.status === 'paid' ? <CheckCircle2 size={16} /> : invoice.status === 'overdue' ? <AlertCircle size={16} /> : <Clock size={16} />}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">{invoice.clientName}</p>
                    <p className="text-[10px] text-slate-400">Due: {invoice.dueDate}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-slate-900">₹{(invoice.amount || 0).toLocaleString('en-IN')}</p>
                  <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${invoice.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : invoice.status === 'overdue' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>
                    {invoice.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-6 py-10 text-center">
            <p className="text-sm text-slate-400">No invoices yet.</p>
            <button onClick={() => onNavigate('invoicing')} className="mt-3 text-xs font-bold text-legal-navy hover:underline">Create Invoice →</button>
          </div>
        )}
      </div>

    </div>
  );
}

// ── Reusable empty state ────────────────────────────────────────────────────
function EmptyState({ icon, text, sub, action }: { icon: React.ReactNode; text: string; sub?: string; action?: { label: string; onClick: () => void } }) {
  return (
    <div className="flex flex-col items-center text-center py-4 gap-2">
      <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center border border-slate-100">
        {icon}
      </div>
      <p className="text-xs font-semibold text-slate-400">{text}</p>
      {sub && <p className="text-[10px] text-slate-300">{sub}</p>}
      {action && (
        <button onClick={action.onClick} className="mt-1 text-[10px] font-bold text-legal-navy hover:underline">
          {action.label} →
        </button>
      )}
    </div>
  );
}

// ── Stat card ───────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, icon, color, onClick, highlight }: any) {
  return (
    <button
      onClick={onClick}
      className={`stat-card gold-hover bg-white p-5 rounded-2xl border text-left w-full group ${
        highlight
          ? 'border-legal-gold/25 shadow-md shadow-legal-gold/5'
          : 'border-slate-200 shadow-sm'
      }`}
    >
      <div className="flex items-center justify-between mb-4">
        <div className={`p-2.5 rounded-xl ${color} transition-transform duration-200 group-hover:scale-110`}>
          {icon}
        </div>
        {highlight && (
          <div className="w-2 h-2 rounded-full bg-legal-gold animate-pulse" />
        )}
      </div>
      <p className="text-2xl font-black text-slate-900 tabular-nums">{value}</p>
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{label}</p>
      {sub && <p className="text-xs font-semibold text-slate-500 mt-1">{sub}</p>}
    </button>
  );
}
