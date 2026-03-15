import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Gavel, Plus, Search, RefreshCw, ExternalLink, 
  Calendar, User, AlertCircle, CheckCircle2, Clock,
  Filter, Download, Trash2, X, Activity
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Case } from './types';
import { db, handleFirestoreError, OperationType } from './ecourtApiService';
import { 
  collection, onSnapshot, query, where, addDoc, 
  updateDoc, deleteDoc, doc 
} from 'firebase/firestore';
import { fetchCaseStatus, detectTodayListedCases, ListedCase } from './ecourtService';
import { useModal } from './googleService';

interface CasesProps {
  userId: string;
  cases: Case[];
  userName: string;
}

const COURTS = [
  'All Courts',
  'Calcutta High Court',
  'Supreme Court of India',
  'Delhi High Court',
  'Bombay High Court',
  'Madras High Court',
  'Karnataka High Court'
];

const CASE_TYPES = [
  'All Types',
  'Civil',
  'Criminal',
  'Constitutional',
  'Family',
  'Corporate',
  'Tax',
  'Labor'
];

const STATUS_OPTIONS = [
  'All Statuses',
  'Pending',
  'Listed Today',
  'Disposed',
  'Stayed',
  'Dismissed'
];

export default function Cases({ userId, cases, userName }: CasesProps) {
  const { showConfirm } = useModal();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [listedCases, setListedCases] = useState<ListedCase[]>([]);
  const [isDetecting, setIsDetecting] = useState(false);
  const [selectedCourt, setSelectedCourt] = useState(COURTS[1]); // Default to Calcutta
  const [filterCourt, setFilterCourt] = useState('All Courts');
  const [filterType, setFilterType] = useState('All Types');
  const [filterStatus, setFilterStatus] = useState('All Statuses');
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const [newCase, setNewCase] = useState({
    caseNumber: '',
    courtName: COURTS[1],
    caseType: CASE_TYPES[1],
    clientName: '',
    petitioner: '',
    respondent: '',
    status: 'Pending'
  });

  // Local sync removed as it's now passed via props

  const handleAddCase = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'cases'), {
        ...newCase,
        ownerUid: userId,
        createdAt: Date.now()
      });
      setIsModalOpen(false);
      setNewCase({
        caseNumber: '',
        courtName: selectedCourt === 'All Courts' ? COURTS[1] : selectedCourt,
        caseType: CASE_TYPES[1],
        clientName: '',
        petitioner: '',
        respondent: '',
        status: 'Pending'
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'cases');
    }
  };

  const handleRefreshStatus = async (caseId: string, caseNumber: string, courtName: string) => {
    setIsRefreshing(true);
    try {
      const status = await fetchCaseStatus(caseNumber, courtName);
      if (status.nextDate || status.lastOrder || status.status) {
        await updateDoc(doc(db, 'cases', caseId), {
          ...status,
          lastUpdated: Date.now()
        });
      }
    } catch (error) {
      console.error("Error refreshing status:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const autoDetectRan = useRef(false);

  const handleDetectListed = useCallback(async () => {
    if (!userName) return;
    setIsDetecting(true);
    try {
      // Use the user's name for detection
      const detected = await detectTodayListedCases(
        userName
          ? [userName, userName.replace(' ', ' Ahmad '), userName.replace(' ', ' Ahmed ')]
          : [],
        selectedCourt
      );
      setListedCases(detected);
    } catch (error) {
      console.error("Error detecting listed cases:", error);
    } finally {
      setIsDetecting(false);
    }
  }, [userName, selectedCourt]);

  useEffect(() => {
    if (!autoDetectRan.current && userName && selectedCourt) {
      autoDetectRan.current = true;
      handleDetectListed();
    }
  }, [userName, selectedCourt]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDeleteCase = async (id: string) => {
    showConfirm(
      'Delete Case',
      'Are you sure you want to delete this case?',
      async () => {
        try {
          await deleteDoc(doc(db, 'cases', id));
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, 'cases');
        }
      }
    );
  };

  const handleAddDetectedCase = async (lc: ListedCase) => {
    try {
      await addDoc(collection(db, 'cases'), {
        caseNumber: lc.caseNumber,
        courtName: lc.courtName,
        petitioner: lc.petitioner,
        respondent: lc.respondent,
        status: 'Listed Today',
        ownerUid: userId,
        createdAt: Date.now()
      });
      // Remove from listed cases after adding
      setListedCases(prev => prev.filter(c => c.caseNumber !== lc.caseNumber));
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'cases');
    }
  };

  const filteredCases = cases.filter(c => {
    const matchesSearch = 
      c.caseNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.petitioner.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.respondent.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCourt = filterCourt === 'All Courts' || c.courtName === filterCourt;
    const matchesType = filterType === 'All Types' || c.caseType === filterType;
    const matchesStatus = filterStatus === 'All Statuses' || c.status === filterStatus;

    return matchesSearch && matchesCourt && matchesType && matchesStatus;
  });

  const exportCasesCSV = () => {
    const headers = ['Case Number', 'Court', 'Type', 'Client', 'Petitioner', 'Respondent', 'Status', 'Next Date', 'Last Order'];
    const rows = filteredCases.map(c => [
      `"${(c.caseNumber || '').replace(/"/g, '""')}"`,
      `"${(c.courtName || '').replace(/"/g, '""')}"`,
      c.caseType || '',
      `"${(c.clientName || '').replace(/"/g, '""')}"`,
      `"${(c.petitioner || '').replace(/"/g, '""')}"`,
      `"${(c.respondent || '').replace(/"/g, '""')}"`,
      c.status || '',
      c.nextDate || '',
      `"${(c.lastOrder || '').replace(/"/g, '""')}"`
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cases_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Court Selection Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {COURTS.filter(c => c !== 'All Courts').map(court => (
          <button
            key={court}
            onClick={() => setSelectedCourt(court)}
            className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all border ${
              selectedCourt === court 
                ? 'bg-legal-navy text-white border-legal-navy shadow-md' 
                : 'bg-white text-slate-600 border-slate-200 hover:border-legal-navy/30'
            }`}
          >
            {court}
          </button>
        ))}
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold text-legal-navy">Case Management</h1>
          <p className="text-slate-500 mt-1 text-sm">Track your active cases and daily cause lists for <span className="text-legal-navy font-bold">{selectedCourt}</span>.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleDetectListed}
            disabled={isDetecting}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-xl text-sm font-bold hover:bg-emerald-100 transition-all border border-emerald-200"
          >
            {isDetecting ? <RefreshCw size={16} className="animate-spin" /> : <Search size={16} />}
            {isDetecting ? 'Searching...' : `Detect Today's List`}
          </button>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-legal-navy text-white rounded-xl text-sm font-bold hover:bg-legal-navy/90 transition-all shadow-lg shadow-legal-navy/20"
          >
            <Plus size={16} />
            Add New Case
          </button>
        </div>
      </div>

      {/* Today's Listed Cases Alert */}
      <AnimatePresence>
        {listedCases.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-amber-50 border border-amber-200 rounded-2xl p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-amber-800">
                <AlertCircle size={20} />
                <h3 className="font-bold">Today's Listed Cases Found</h3>
              </div>
              <button onClick={() => setListedCases([])} className="text-amber-500 hover:text-amber-700">
                <X size={20} />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {listedCases.map((lc, idx) => (
                <div key={idx} className="bg-white p-4 rounded-xl border border-amber-100 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded">Item #{lc.itemNumber}</span>
                      <span className="text-[10px] text-slate-400 font-mono">{lc.bench}</span>
                    </div>
                    <h4 className="font-bold text-slate-800 text-sm">{lc.caseNumber}</h4>
                    <p className="text-xs text-slate-500 mt-1">{lc.petitioner} vs {lc.respondent}</p>
                  </div>
                  <button 
                    onClick={() => handleAddDetectedCase(lc)}
                    className="mt-3 flex items-center justify-center gap-1 w-full py-1.5 bg-amber-100 text-amber-700 rounded-lg text-[10px] font-bold hover:bg-amber-200 transition-all"
                  >
                    <Plus size={12} />
                    Add to My Cases
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col gap-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text"
                placeholder="Search by case number, client or party name..."
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-legal-navy/5 transition-all"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className={`p-2 rounded-lg transition-all flex items-center gap-2 border ${
                  isFilterOpen || filterCourt !== 'All Courts' || filterType !== 'All Types' || filterStatus !== 'All Statuses'
                    ? 'bg-legal-navy/5 border-legal-navy/20 text-legal-navy'
                    : 'text-slate-400 hover:text-legal-navy hover:bg-slate-50 border-transparent'
                }`}
              >
                <Filter size={20} />
                <span className="text-xs font-bold">Filters</span>
              </button>
              <button onClick={exportCasesCSV} className="p-2 text-slate-400 hover:text-legal-navy hover:bg-slate-50 rounded-lg transition-all">
                <Download size={20} />
              </button>
            </div>
          </div>

          <AnimatePresence>
            {isFilterOpen && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-slate-100">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Court</label>
                    <select 
                      value={filterCourt}
                      onChange={(e) => setFilterCourt(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none transition-all"
                    >
                      {COURTS.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Case Type</label>
                    <select 
                      value={filterType}
                      onChange={(e) => setFilterType(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none transition-all"
                    >
                      {CASE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</label>
                    <select 
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none transition-all"
                    >
                      {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
                <div className="flex justify-end mt-4">
                  <button 
                    onClick={() => {
                      setFilterCourt('All Courts');
                      setFilterType('All Types');
                      setFilterStatus('All Statuses');
                    }}
                    className="text-[10px] font-bold text-rose-500 uppercase tracking-widest hover:text-rose-600"
                  >
                    Clear All Filters
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Case Details</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Parties</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Next Date</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">eCourts Status</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Last Order</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isDetecting && cases.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <RefreshCw className="w-8 h-8 text-legal-navy/20 animate-spin mx-auto" />
                    <p className="text-slate-400 text-sm mt-2">Loading cases...</p>
                  </td>
                </tr>
              ) : filteredCases.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <p className="text-slate-400 text-sm">No cases found.</p>
                  </td>
                </tr>
              ) : filteredCases.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-legal-navy/5 rounded-xl flex items-center justify-center text-legal-navy">
                        <Gavel size={20} />
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">{c.caseNumber}</p>
                        <div className="flex items-center gap-2">
                          <p className="text-xs text-slate-500">{c.courtName}</p>
                          {c.caseType && (
                            <>
                              <span className="w-1 h-1 rounded-full bg-slate-300" />
                              <p className="text-xs text-legal-gold font-medium">{c.caseType}</p>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm">
                      <p className="font-medium text-slate-700">{c.petitioner}</p>
                      <p className="text-xs text-slate-400 mt-0.5">vs</p>
                      <p className="font-medium text-slate-700">{c.respondent}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {c.nextDate ? (
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Calendar size={14} className="text-legal-navy" />
                        {new Date(c.nextDate).toLocaleDateString()}
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400 italic">Not scheduled</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      {listedCases.find(lc => lc.caseNumber === c.caseNumber) ? (
                        <div className="flex flex-col gap-1">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold w-fit bg-emerald-100 text-emerald-700 flex items-center gap-1">
                            <Activity size={10} />
                            Listed Today (Item #{listedCases.find(lc => lc.caseNumber === c.caseNumber)?.itemNumber})
                          </span>
                          <span className="text-[9px] text-slate-400">
                            Bench: {listedCases.find(lc => lc.caseNumber === c.caseNumber)?.bench}
                          </span>
                        </div>
                      ) : (
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold w-fit ${
                          c.status === 'Listed Today' ? 'bg-emerald-100 text-emerald-700' :
                          c.status?.toLowerCase().includes('disposed') ? 'bg-slate-100 text-slate-600' :
                          'bg-blue-50 text-blue-600'
                        }`}>
                          {c.status || 'Not Fetched'}
                        </span>
                      )}
                      {c.lastUpdated && (
                        <span className="text-[9px] text-slate-400">
                          Refreshed: {c.lastUpdated ? new Date(c.lastUpdated).toLocaleDateString() : ""}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="max-w-[200px]">
                      <p className="text-xs text-slate-600 line-clamp-2" title={c.lastOrder}>
                        {c.lastOrder || <span className="text-slate-400 italic">No order data</span>}
                      </p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      c.status === 'Disposed' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                    }`}>
                      {c.status || 'Pending'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => handleRefreshStatus(c.id, c.caseNumber, c.courtName)}
                        disabled={isRefreshing}
                        className="p-2 text-slate-400 hover:text-legal-navy hover:bg-white rounded-lg border border-transparent hover:border-slate-200 transition-all"
                        title="Refresh Status"
                      >
                        <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
                      </button>
                      <button 
                        onClick={() => handleDeleteCase(c.id)}
                        className="p-2 text-slate-400 hover:text-rose-500 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 transition-all"
                        title="Delete Case"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Case Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl w-full max-w-lg p-8 shadow-2xl"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-serif text-xl font-bold text-legal-navy">Add New Case</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <Plus size={24} className="rotate-45" />
              </button>
            </div>

            <form onSubmit={handleAddCase} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase ml-1">Case Number</label>
                  <input 
                    required
                    type="text"
                    placeholder="e.g. WP/123/2023"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-legal-navy/5"
                    value={newCase.caseNumber}
                    onChange={(e) => setNewCase({...newCase, caseNumber: e.target.value})}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase ml-1">Case Type</label>
                  <select 
                    required
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-legal-navy/5"
                    value={newCase.caseType}
                    onChange={(e) => setNewCase({...newCase, caseType: e.target.value})}
                  >
                    {CASE_TYPES.filter(t => t !== 'All Types').map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase ml-1">Court</label>
                <select 
                  required
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-legal-navy/5"
                  value={newCase.courtName}
                  onChange={(e) => setNewCase({...newCase, courtName: e.target.value})}
                >
                  {COURTS.filter(c => c !== 'All Courts').map(court => (
                    <option key={court} value={court}>{court}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase ml-1">Client Name</label>
                <input 
                  type="text"
                  placeholder="Associated Client"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-legal-navy/5"
                  value={newCase.clientName}
                  onChange={(e) => setNewCase({...newCase, clientName: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase ml-1">Petitioner</label>
                  <input 
                    type="text"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-legal-navy/5"
                    value={newCase.petitioner}
                    onChange={(e) => setNewCase({...newCase, petitioner: e.target.value})}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase ml-1">Respondent</label>
                  <input 
                    type="text"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-legal-navy/5"
                    value={newCase.respondent}
                    onChange={(e) => setNewCase({...newCase, respondent: e.target.value})}
                  />
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-legal-navy text-white rounded-xl text-sm font-bold hover:bg-legal-navy/90 transition-all shadow-lg shadow-legal-navy/20"
                >
                  Save Case
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
