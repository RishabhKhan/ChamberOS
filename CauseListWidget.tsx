import React, { useState, useEffect, useRef } from 'react';
import { Search, X, User, FileText, Mail, ChevronRight, Command, FileSearch, Gavel } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Client, Invoice, Email, DocumentAnalysis, Case } from '../types';

interface GlobalSearchProps {
  isOpen: boolean;
  onClose: () => void;
  clients: Client[];
  invoices: Invoice[];
  emails: Email[];
  analyses: DocumentAnalysis[];
  cases: Case[];
  onNavigate: (view: any) => void;
}

type SearchResult = {
  id: string;
  type: 'client' | 'invoice' | 'email' | 'analysis' | 'case';
  title: string;
  subtitle: string;
  data: any;
};

export default function GlobalSearch({ isOpen, onClose, clients, invoices, emails, analyses, cases, onNavigate }: GlobalSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      setQuery('');
      setResults([]);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const q = query.toLowerCase();
    const filteredResults: SearchResult[] = [];

    // Search Clients
    clients.forEach(c => {
      if (c.name.toLowerCase().includes(q) || (c.email || '').toLowerCase().includes(q) || c.fileCode.toLowerCase().includes(q)) {
        filteredResults.push({
          id: `client-${c.id}`,
          type: 'client',
          title: c.name,
          subtitle: `Client • ${c.fileCode}`,
          data: c
        });
      }
    });

    // Search Invoices
    invoices.forEach(i => {
      if (i.id.toLowerCase().includes(q) || i.clientName.toLowerCase().includes(q)) {
        filteredResults.push({
          id: `invoice-${i.id}`,
          type: 'invoice',
          title: i.id,
          subtitle: `Invoice • ${i.clientName} • ₹${(i.amount || 0).toLocaleString('en-IN')}`,
          data: i
        });
      }
    });

    // Search Emails
    emails.forEach(e => {
      if (e.subject.toLowerCase().includes(q) || e.sender.toLowerCase().includes(q) || e.recipient.toLowerCase().includes(q)) {
        filteredResults.push({
          id: `email-${e.id}`,
          type: 'email',
          title: e.subject,
          subtitle: `Email • ${e.sender}`,
          data: e
        });
      }
    });

    // Search Analyses
    analyses.forEach(a => {
      if (a.fileName.toLowerCase().includes(q) || a.summary.toLowerCase().includes(q)) {
        filteredResults.push({
          id: `analysis-${a.id}`,
          type: 'analysis',
          title: a.fileName,
          subtitle: `Analysis • ${a.status}`,
          data: a
        });
      }
    });

    // Search Cases
    cases.forEach(c => {
      if (c.caseNumber.toLowerCase().includes(q) || c.petitioner.toLowerCase().includes(q) || c.respondent.toLowerCase().includes(q)) {
        filteredResults.push({
          id: `case-${c.id}`,
          type: 'case',
          title: c.caseNumber,
          subtitle: `Case • ${c.petitioner} vs ${c.respondent}`,
          data: c
        });
      }
    });

    setResults(filteredResults.slice(0, 10));
  }, [query, clients, invoices, emails, analyses, cases]);

  const handleSelect = (result: SearchResult) => {
    if (result.type === 'client') onNavigate('clients');
    if (result.type === 'invoice') onNavigate('invoicing');
    if (result.type === 'email') onNavigate('email');
    if (result.type === 'analysis') onNavigate('research');
    if (result.type === 'case') onNavigate('cases');
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={onClose}
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200"
          >
            <div className="p-4 border-b border-slate-100 flex items-center gap-4">
              <Search className="text-slate-400" size={20} />
              <input
                ref={inputRef}
                type="text"
                placeholder="Search clients, invoices, emails, documents..."
                className="flex-1 bg-transparent border-none text-lg focus:ring-0 placeholder:text-slate-400"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <div className="flex items-center gap-1 px-2 py-1 bg-slate-100 rounded-lg text-[10px] font-bold text-slate-400 uppercase">
                <Command size={10} /> K
              </div>
              <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto">
              {query.trim() === '' ? (
                <div className="p-12 text-center">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Search className="text-slate-200" size={32} />
                  </div>
                  <p className="text-sm font-medium text-slate-400">Start typing to search across your chamber...</p>
                </div>
              ) : results.length > 0 ? (
                <div className="p-2">
                  {results.map((result) => (
                    <button
                      key={result.id}
                      onClick={() => handleSelect(result)}
                      className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-slate-50 transition-all text-left group"
                    >
                      <div className={`p-2 rounded-xl ${
                        result.type === 'client' ? 'bg-indigo-50 text-indigo-600' :
                        result.type === 'invoice' ? 'bg-amber-50 text-amber-600' : 
                        result.type === 'email' ? 'bg-rose-50 text-rose-600' : 
                        result.type === 'case' ? 'bg-legal-navy/5 text-legal-navy' : 'bg-emerald-50 text-emerald-600'
                      }`}>
                        {result.type === 'client' && <User size={20} />}
                        {result.type === 'invoice' && <FileText size={20} />}
                        {result.type === 'email' && <Mail size={20} />}
                        {result.type === 'analysis' && <FileSearch size={20} />}
                        {result.type === 'case' && <Gavel size={20} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-800 truncate">{result.title}</p>
                        <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">{result.subtitle}</p>
                      </div>
                      <ChevronRight className="text-slate-300 opacity-0 group-hover:opacity-100 transition-all" size={18} />
                    </button>
                  ))}
                </div>
              ) : (
                <div className="p-12 text-center">
                  <p className="text-sm font-medium text-slate-400">No results found for "{query}"</p>
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              <div className="flex gap-4">
                <span className="flex items-center gap-1"><span className="px-1 bg-white border border-slate-200 rounded">↵</span> Select</span>
                <span className="flex items-center gap-1"><span className="px-1 bg-white border border-slate-200 rounded">↑↓</span> Navigate</span>
              </div>
              <span>Achilles Chamber Search</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
