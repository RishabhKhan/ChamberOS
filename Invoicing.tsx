import React, { useState, useEffect } from 'react';
import {
  Search, Globe, ExternalLink, RefreshCw, AlertCircle, Gavel,
  Calendar, Clock, List, User, Activity, FileText, ChevronDown,
  ChevronRight, Hash, BookOpen, Scale, Building2, Key
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Case } from '../types';
import {
  HighCourt, DistrictCourt, SupremeCourt,
  checkApiKeyConfigured, CaseDetail, SearchResult
} from '../services/ecourtApiService';

const ECOURTS_LINKS = [
  {
    name: 'Calcutta High Court (Appellate)',
    url: 'https://hcservices.ecourts.gov.in/ecourtindiaHC/index_highcourt.php?state_cd=16&dist_cd=1&stateNm=Calcutta',
  },
  {
    name: 'Calcutta High Court (Original)',
    url: 'https://hcservices.ecourts.gov.in/ecourtindiaHC/index_highcourt.php?state_cd=16&dist_cd=1&court_code=3&stateNm=Calcutta',
  },
  {
    name: 'eCourts National Portal',
    url: 'https://ecourts.gov.in/',
  },
];

type CourtType = 'high-court' | 'district-court' | 'supreme-court';
type SearchMode = 'cnr' | 'party' | 'advocate' | 'filing' | 'diary';
type Stage = 'PENDING' | 'DISPOSED' | 'BOTH';

interface CaseStatusProps {
  userName?: string;
  trackedCases?: Case[];
}

export default function CaseStatus({ userName = '', trackedCases = [] }: CaseStatusProps) {
  const [apiConfigured, setApiConfigured] = useState<boolean | null>(null);
  const [courtType, setCourtType] = useState<CourtType>('high-court');
  const [searchMode, setSearchMode] = useState<SearchMode>('cnr');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Search inputs
  const [cnr, setCnr] = useState('');
  const [partyName, setPartyName] = useState('');
  const [advocateName, setAdvocateName] = useState(userName);
  const [filingNumber, setFilingNumber] = useState('');
  const [filingYear, setFilingYear] = useState(new Date().getFullYear().toString());
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [stage, setStage] = useState<Stage>('BOTH');
  const [benchId, setBenchId] = useState('');
  const [diaryNumber, setDiaryNumber] = useState('');

  // Results
  const [caseDetail, setCaseDetail] = useState<CaseDetail | null>(null);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [expandedCase, setExpandedCase] = useState<string | null>(null);

  useEffect(() => {
    checkApiKeyConfigured().then(setApiConfigured);
  }, []);

  useEffect(() => {
    if (userName) setAdvocateName(userName);
  }, [userName]);

  // Reset results when court or mode changes
  useEffect(() => {
    setCaseDetail(null);
    setSearchResults([]);
    setError(null);
  }, [courtType, searchMode]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setCaseDetail(null);
    setSearchResults([]);

    try {
      let result: any;

      if (courtType === 'high-court') {
        if (searchMode === 'cnr') result = await HighCourt.getByCNR(cnr.trim());
        else if (searchMode === 'party') result = await HighCourt.searchParty(partyName, stage, year, benchId || undefined);
        else if (searchMode === 'advocate') result = await HighCourt.searchAdvocate(advocateName, stage, benchId || undefined);
        else if (searchMode === 'filing') result = await HighCourt.searchFiling(filingNumber, filingYear, benchId || undefined);
      } else if (courtType === 'district-court') {
        if (searchMode === 'cnr') result = await DistrictCourt.getByCNR(cnr.trim());
        else if (searchMode === 'party') result = await DistrictCourt.searchParty(partyName, stage, year, benchId || undefined);
        else if (searchMode === 'advocate') result = await DistrictCourt.searchAdvocate(advocateName, stage, benchId || undefined);
      } else if (courtType === 'supreme-court') {
        if (searchMode === 'diary') result = await SupremeCourt.getByDiaryNumber(diaryNumber, year);
        else if (searchMode === 'party') result = await SupremeCourt.searchParty(partyName, stage as any, 'ANY', year);
      }

      if (!result) { setError('No search performed.'); return; }
      if (result.error) { setError(result.error); return; }

      // CNR / diary lookups return a single case object
      if (searchMode === 'cnr' || searchMode === 'diary') {
        setCaseDetail(result.data);
      } else {
        // Search returns an array
        const arr = Array.isArray(result.data) ? result.data : (result.data ? [result.data] : []);
        if (arr.length === 0) setError('No cases found matching your search.');
        else setSearchResults(arr);
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const SEARCH_MODES: { id: SearchMode; label: string; courts: CourtType[] }[] = [
    { id: 'cnr', label: 'CNR Number', courts: ['high-court', 'district-court'] },
    { id: 'diary', label: 'Diary Number', courts: ['supreme-court'] },
    { id: 'advocate', label: 'Advocate Name', courts: ['high-court', 'district-court', 'supreme-court'] },
    { id: 'party', label: 'Party Name', courts: ['high-court', 'district-court', 'supreme-court'] },
    { id: 'filing', label: 'Filing Number', courts: ['high-court'] },
  ].filter(m => m.courts.includes(courtType));

  // Auto-switch search mode if not valid for selected court
  useEffect(() => {
    const valid = SEARCH_MODES.map(m => m.id);
    if (!valid.includes(searchMode)) setSearchMode(valid[0]);
  }, [courtType]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold text-legal-navy">eCourts Live Search</h1>
          <p className="text-slate-500 mt-1 text-sm">Real-time case status via eCourts India API v17</p>
        </div>
        <div className="flex items-center gap-2">
          {apiConfigured === false && (
            <span className="flex items-center gap-1.5 text-[10px] font-bold text-amber-600 bg-amber-50 px-3 py-1.5 rounded-full border border-amber-200">
              <Key size={11} /> API Key Required
            </span>
          )}
          {apiConfigured === true && (
            <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200">
              <Activity size={11} /> API Connected
            </span>
          )}
        </div>
      </div>

      {/* API Key Missing Banner */}
      {apiConfigured === false && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-start gap-4">
          <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <Key size={18} className="text-amber-600" />
          </div>
          <div>
            <p className="text-sm font-bold text-amber-800">eCourts API Key Not Configured</p>
            <p className="text-xs text-amber-600 mt-1">
              Add <code className="bg-amber-100 px-1 rounded font-mono">ECOURTS_API_KEY</code> to your <code className="bg-amber-100 px-1 rounded font-mono">.env.local</code> file to enable live case searches.
              Get your key from <a href="https://apis.akshit.net" target="_blank" rel="noopener noreferrer" className="underline font-bold">apis.akshit.net</a>
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Search Panel */}
        <div className="lg:col-span-2 space-y-4">

          {/* Court Type Selector */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Select Court</p>
            <div className="grid grid-cols-3 gap-2">
              {([
                { id: 'high-court', label: 'High Court', icon: <Scale size={16} /> },
                { id: 'district-court', label: 'District Court', icon: <Building2 size={16} /> },
                { id: 'supreme-court', label: 'Supreme Court', icon: <Gavel size={16} /> },
              ] as { id: CourtType; label: string; icon: React.ReactNode }[]).map(c => (
                <button
                  key={c.id}
                  onClick={() => setCourtType(c.id)}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-xs font-bold transition-all ${
                    courtType === c.id
                      ? 'bg-legal-navy text-white border-legal-navy shadow-lg shadow-legal-navy/20'
                      : 'bg-slate-50 text-slate-500 border-slate-200 hover:border-legal-navy/30 hover:bg-white'
                  }`}
                >
                  {c.icon}
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Search Mode + Form */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            {/* Search mode tabs */}
            <div className="flex gap-1 bg-slate-100 p-1 rounded-xl mb-6 overflow-x-auto">
              {SEARCH_MODES.map(m => (
                <button
                  key={m.id}
                  onClick={() => setSearchMode(m.id)}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    searchMode === m.id
                      ? 'bg-white text-legal-navy shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            <form onSubmit={handleSearch} className="space-y-4">
              {/* CNR search */}
              {searchMode === 'cnr' && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    CNR Number
                  </label>
                  <input
                    required
                    value={cnr}
                    onChange={e => setCnr(e.target.value)}
                    placeholder={courtType === 'high-court' ? 'e.g. WBHC010001232023' : 'e.g. DLST020314162024'}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-legal-navy/10 transition-all font-mono"
                  />
                  <p className="text-[10px] text-slate-400">CNR is the unique case identifier on your court documents.</p>
                </div>
              )}

              {/* Diary Number (Supreme Court) */}
              {searchMode === 'diary' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Diary Number</label>
                    <input required value={diaryNumber} onChange={e => setDiaryNumber(e.target.value)}
                      placeholder="e.g. 1032"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-legal-navy/10" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Year</label>
                    <input required value={year} onChange={e => setYear(e.target.value)}
                      placeholder="2024"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-legal-navy/10" />
                  </div>
                </div>
              )}

              {/* Party Name search */}
              {searchMode === 'party' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Party Name</label>
                    <input required value={partyName} onChange={e => setPartyName(e.target.value)}
                      placeholder="Enter petitioner or respondent name"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-legal-navy/10" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Stage</label>
                    <select value={stage} onChange={e => setStage(e.target.value as Stage)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none">
                      <option value="BOTH">Both</option>
                      <option value="PENDING">Pending</option>
                      <option value="DISPOSED">Disposed</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Year</label>
                    <input value={year} onChange={e => setYear(e.target.value)} placeholder="2024"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-legal-navy/10" />
                  </div>
                  {courtType !== 'supreme-court' && (
                    <div className="space-y-1.5 md:col-span-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Bench / Complex ID <span className="text-slate-300 normal-case font-normal">(optional)</span></label>
                      <input value={benchId} onChange={e => setBenchId(e.target.value)}
                        placeholder="e.g. 0ba5ccaf — leave blank to search all benches"
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-legal-navy/10 font-mono" />
                    </div>
                  )}
                </div>
              )}

              {/* Advocate Name search */}
              {searchMode === 'advocate' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Advocate Name</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input required value={advocateName} onChange={e => setAdvocateName(e.target.value)}
                        placeholder="Enter advocate's full name"
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-legal-navy/10" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Stage</label>
                    <select value={stage} onChange={e => setStage(e.target.value as Stage)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none">
                      <option value="BOTH">Both</option>
                      <option value="PENDING">Pending</option>
                      <option value="DISPOSED">Disposed</option>
                    </select>
                  </div>
                  {courtType !== 'supreme-court' && (
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Bench ID <span className="text-slate-300 normal-case font-normal">(optional)</span></label>
                      <input value={benchId} onChange={e => setBenchId(e.target.value)}
                        placeholder="e.g. 0ba5ccaf"
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-legal-navy/10 font-mono" />
                    </div>
                  )}
                </div>
              )}

              {/* Filing Number search */}
              {searchMode === 'filing' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Filing Number</label>
                    <input required value={filingNumber} onChange={e => setFilingNumber(e.target.value)}
                      placeholder="e.g. 102"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-legal-navy/10" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Filing Year</label>
                    <input required value={filingYear} onChange={e => setFilingYear(e.target.value)}
                      placeholder="2024"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-legal-navy/10" />
                  </div>
                  <div className="space-y-1.5 col-span-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Bench ID <span className="text-slate-300 normal-case font-normal">(optional)</span></label>
                    <input value={benchId} onChange={e => setBenchId(e.target.value)}
                      placeholder="e.g. 0ba5ccaf"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-legal-navy/10 font-mono" />
                  </div>
                </div>
              )}

              <button type="submit" disabled={isLoading || apiConfigured === false}
                className="w-full py-3.5 bg-legal-navy text-white rounded-xl font-bold hover:bg-legal-navy/90 transition-all shadow-lg shadow-legal-navy/20 flex items-center justify-center gap-2 disabled:opacity-50">
                {isLoading ? <RefreshCw size={18} className="animate-spin" /> : <Search size={18} />}
                {isLoading ? 'Searching...' : 'Search eCourts'}
              </button>
            </form>

            {/* Error */}
            {error && (
              <div className="mt-4 p-4 bg-rose-50 border border-rose-100 rounded-xl flex items-start gap-3 text-rose-600 text-sm">
                <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                <p>{error}</p>
              </div>
            )}
          </div>

          {/* ── Case Detail Result ── */}
          <AnimatePresence>
            {caseDetail && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">

                <div className="px-6 py-4 bg-legal-navy/5 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-legal-navy rounded-xl flex items-center justify-center">
                      <Gavel size={16} className="text-white" />
                    </div>
                    <div>
                      <p className="font-bold text-legal-navy text-sm">{caseDetail.cnr || caseDetail.caseNumber || 'Case Details'}</p>
                      <p className="text-[10px] text-slate-500">{caseDetail.caseType || caseDetail.courtName || ''}</p>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${
                    caseDetail.caseStatus?.toLowerCase().includes('disposed')
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-amber-100 text-amber-700'
                  }`}>
                    {caseDetail.caseStatus || caseDetail.stage || 'Active'}
                  </span>
                </div>

                <div className="p-6 space-y-5">
                  {/* Parties */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <InfoCard icon={<User size={14} />} label="Petitioner" value={caseDetail.petitioner} />
                    <InfoCard icon={<User size={14} />} label="Respondent" value={caseDetail.respondent} />
                    {caseDetail.petitionerAdvocate && (
                      <InfoCard icon={<Scale size={14} />} label="Petitioner's Advocate" value={caseDetail.petitionerAdvocate} />
                    )}
                    {caseDetail.respondentAdvocate && (
                      <InfoCard icon={<Scale size={14} />} label="Respondent's Advocate" value={caseDetail.respondentAdvocate} />
                    )}
                  </div>

                  {/* Dates */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <DateCard label="Filing Date" value={caseDetail.filingDate} />
                    <DateCard label="Registration" value={caseDetail.registrationDate} />
                    <DateCard label="First Hearing" value={caseDetail.firstHearingDate} />
                    <DateCard label="Next Hearing" value={caseDetail.nextHearingDate} highlight />
                  </div>

                  {/* Judge */}
                  {caseDetail.judgeName && (
                    <InfoCard icon={<Gavel size={14} />} label="Presiding Judge" value={caseDetail.judgeName} />
                  )}

                  {/* Acts */}
                  {caseDetail.acts && caseDetail.acts.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Acts & Sections</p>
                      <div className="flex flex-wrap gap-2">
                        {caseDetail.acts.map((a, i) => (
                          <span key={i} className="text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-100 px-2.5 py-1 rounded-lg">
                            {a.act}{a.section ? ` § ${a.section}` : ''}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Case History */}
                  {caseDetail.caseHistory && caseDetail.caseHistory.length > 0 && (
                    <div>
                      <button
                        onClick={() => setExpandedCase(expandedCase === 'history' ? null : 'history')}
                        className="w-full flex items-center justify-between px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-100 hover:bg-slate-100 transition-all"
                      >
                        <span className="text-xs font-bold text-slate-700 flex items-center gap-2">
                          <List size={14} /> Case History ({caseDetail.caseHistory.length} entries)
                        </span>
                        {expandedCase === 'history' ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronRight size={14} className="text-slate-400" />}
                      </button>
                      {expandedCase === 'history' && (
                        <div className="mt-2 space-y-2">
                          {caseDetail.caseHistory.map((h, i) => (
                            <div key={i} className="flex items-start gap-3 px-4 py-2.5 bg-slate-50 rounded-xl text-xs">
                              <span className="font-bold text-legal-navy flex-shrink-0 w-24">{h.date}</span>
                              <span className="text-slate-600">{h.purpose}</span>
                              {h.judge && <span className="text-slate-400 ml-auto flex-shrink-0">{h.judge}</span>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Orders */}
                  {caseDetail.orders && caseDetail.orders.length > 0 && (
                    <div>
                      <button
                        onClick={() => setExpandedCase(expandedCase === 'orders' ? null : 'orders')}
                        className="w-full flex items-center justify-between px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-100 hover:bg-slate-100 transition-all"
                      >
                        <span className="text-xs font-bold text-slate-700 flex items-center gap-2">
                          <FileText size={14} /> Orders ({caseDetail.orders.length})
                        </span>
                        {expandedCase === 'orders' ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronRight size={14} className="text-slate-400" />}
                      </button>
                      {expandedCase === 'orders' && (
                        <div className="mt-2 space-y-2">
                          {caseDetail.orders.map((o, i) => (
                            <div key={i} className="px-4 py-2.5 bg-slate-50 rounded-xl text-xs">
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-bold text-legal-navy">{o.date}</span>
                                {o.orderNumber && <span className="text-slate-400 font-mono">#{o.orderNumber}</span>}
                              </div>
                              {o.description && <p className="text-slate-600">{o.description}</p>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Raw JSON fallback for unmapped fields */}
                  <details className="text-[10px] text-slate-400">
                    <summary className="cursor-pointer hover:text-slate-600 font-bold uppercase tracking-widest">Raw API Response</summary>
                    <pre className="mt-2 p-3 bg-slate-50 rounded-xl overflow-x-auto text-[10px] leading-relaxed whitespace-pre-wrap">
                      {JSON.stringify(caseDetail, null, 2)}
                    </pre>
                  </details>
                </div>
              </motion.div>
            )}

            {/* ── Search Results List ── */}
            {searchResults.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <p className="text-sm font-bold text-slate-700">{searchResults.length} cases found</p>
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">{courtType.replace('-', ' ')}</span>
                </div>
                {searchResults.map((r, i) => {
                  const isTracked = trackedCases.some(tc => tc.caseNumber === r.caseNumber || tc.caseNumber === r.cnr);
                  return (
                    <div key={i} className={`bg-white rounded-2xl border shadow-sm p-5 hover:shadow-md transition-all relative ${isTracked ? 'border-emerald-200' : 'border-slate-200'}`}>
                      {isTracked && (
                        <span className="absolute top-3 right-3 text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100 flex items-center gap-1">
                          <Activity size={9} /> Tracked
                        </span>
                      )}
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 bg-legal-navy/5 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Gavel size={14} className="text-legal-navy" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-slate-900 text-sm">{r.caseNumber || r.cnr}</p>
                          {r.caseType && <p className="text-[10px] text-slate-400 font-medium">{r.caseType}</p>}
                          <div className="mt-2 space-y-1">
                            {r.petitioner && <p className="text-xs text-slate-600"><span className="font-bold">P:</span> {r.petitioner}</p>}
                            {r.respondent && <p className="text-xs text-slate-600"><span className="font-bold">R:</span> {r.respondent}</p>}
                          </div>
                          <div className="flex items-center gap-3 mt-2">
                            {r.nextDate && (
                              <span className="flex items-center gap-1 text-[10px] font-bold text-legal-navy">
                                <Calendar size={10} /> Next: {r.nextDate}
                              </span>
                            )}
                            {r.status && (
                              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                                r.status?.toLowerCase().includes('disposed')
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : 'bg-amber-50 text-amber-700'
                              }`}>{r.status}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right Panel */}
        <div className="space-y-4">
          {/* Tracked Cases Quick Status */}
          {trackedCases.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2">
                <Activity size={15} className="text-legal-navy" />
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-widest">Tracked Cases</h3>
                <span className="ml-auto text-[10px] font-bold bg-legal-navy text-white px-2 py-0.5 rounded-full">{trackedCases.length}</span>
              </div>
              <div className="divide-y divide-slate-100">
                {trackedCases.slice(0, 6).map(c => (
                  <button
                    key={c.id}
                    onClick={() => { setCourtType('high-court'); setSearchMode('cnr'); setCnr(c.caseNumber); }}
                    className="w-full px-5 py-3 text-left hover:bg-slate-50 transition-colors group"
                  >
                    <p className="text-xs font-bold text-slate-800 group-hover:text-legal-navy transition-colors truncate">{c.caseNumber}</p>
                    <p className="text-[10px] text-slate-400 truncate">{c.petitioner} vs {c.respondent}</p>
                    {c.nextDate && (
                      <p className="text-[9px] text-legal-gold font-bold mt-0.5 flex items-center gap-1">
                        <Calendar size={9} /> {c.nextDate ? new Date(c.nextDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—'}
                      </p>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Official Portals */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-widest mb-3 flex items-center gap-2">
              <Globe size={14} className="text-legal-gold" /> Official Portals
            </h3>
            <div className="space-y-2">
              {ECOURTS_LINKS.map((l, i) => (
                <a key={i} href={l.url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-100 hover:border-slate-200 transition-all group">
                  <span className="text-xs font-semibold text-slate-700 group-hover:text-legal-navy transition-colors">{l.name}</span>
                  <ExternalLink size={12} className="text-slate-400 flex-shrink-0" />
                </a>
              ))}
            </div>
          </div>

          {/* API Info */}
          <div className="bg-legal-navy rounded-2xl p-5 text-white">
            <h3 className="text-xs font-bold mb-3 flex items-center gap-2"><BookOpen size={14} className="text-white/60" /> API Reference</h3>
            <div className="space-y-2 text-[10px] text-white/60">
              <p>Powered by <span className="text-white font-bold">eCourts India API v17</span></p>
              <div className="space-y-1 mt-2">
                {[
                  'High Court case lookup by CNR',
                  'Search by party / advocate name',
                  'Filing number search',
                  'District Court & Supreme Court',
                  'Supreme Court diary number search',
                ].map((f, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="w-1 h-1 rounded-full bg-legal-gold flex-shrink-0" />
                    <span>{f}</span>
                  </div>
                ))}
              </div>
              <a href="https://apis.akshit.net" target="_blank" rel="noopener noreferrer"
                className="mt-3 flex items-center gap-1 text-legal-gold hover:underline font-bold">
                Get API Key <ExternalLink size={10} />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoCard({ icon, label, value }: { icon: React.ReactNode; label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
      <div className="flex items-center gap-1.5 text-slate-400 mb-1">{icon}<span className="text-[10px] font-bold uppercase tracking-widest">{label}</span></div>
      <p className="text-sm font-semibold text-slate-800">{value}</p>
    </div>
  );
}

function DateCard({ label, value, highlight }: { label: string; value?: string; highlight?: boolean }) {
  return (
    <div className={`p-3 rounded-xl border ${highlight && value ? 'bg-legal-navy/5 border-legal-navy/20' : 'bg-slate-50 border-slate-100'}`}>
      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">{label}</p>
      <p className={`text-xs font-bold ${highlight && value ? 'text-legal-navy' : 'text-slate-700'}`}>
        {value || '—'}
      </p>
    </div>
  );
}
