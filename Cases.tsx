import React, { useState, useRef } from 'react';
import { 
  Database, Upload, FileSpreadsheet, CheckCircle, AlertCircle, 
  Loader2, Info, ArrowRight, Download, Trash2, Users, Wallet, 
  FileText, Calendar, Gavel
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Papa from 'papaparse';
import { Client, Transaction, Invoice, Appointment, Case } from './types';

interface DataMigrationProps {
  onImportClients: (clients: Omit<Client, 'id'>[]) => void;
  onImportTransactions: (transactions: Omit<Transaction, 'id'>[]) => void;
  onImportInvoices: (invoices: Omit<Invoice, 'id'>[]) => void;
  onImportAppointments: (appointments: Omit<Appointment, 'id'>[]) => void;
  onImportCases: (cases: Omit<Case, 'id'>[]) => void;
}

type MigrationType = 'clients' | 'transactions' | 'invoices' | 'appointments' | 'cases';

export default function DataMigration({ 
  onImportClients, 
  onImportTransactions, 
  onImportInvoices, 
  onImportAppointments,
  onImportCases
}: DataMigrationProps) {
  const [activeType, setActiveType] = useState<MigrationType>('clients');
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<{ success: number; failed: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const templates = {
    clients: 'name,email,phone,fileCode,status,address\nJohn Doe,john@example.com,9876543210,CASE-001,active,"123 Legal St, New Delhi"',
    transactions: 'date,description,amount,type,category,client\n2025-03-15,Consultation Fee,5000,income,Consultation,John Doe',
    invoices: 'clientName,amount,status,dueDate,issueDate\nJohn Doe,15000,pending,2025-04-01,2025-03-15',
    appointments: 'title,date,time,client,type,location\nCase Hearing,2025-03-20,10:30,John Doe,hearing,High Court Room 4',
    cases: 'caseNumber,courtName,clientName,petitioner,respondent,status\nWP/123/2023,Calcutta High Court,John Doe,John Doe,State of West Bengal,Pending'
  };

  const downloadTemplate = () => {
    const blob = new Blob([templates[activeType]], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeType}_template.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setError(null);
    setResults(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const data = results.data as any[];
          let successCount = 0;
          let failedCount = 0;

          if (activeType === 'clients') {
            const clients = data.map(row => ({
              name: row.name || 'Unknown',
              email: row.email || '',
              phone: row.phone || '',
              fileCode: row.fileCode || 'N/A',
              status: (row.status?.toLowerCase() === 'active' ? 'active' : 'inactive') as 'active' | 'inactive',
              address: row.address || ''
            }));
            onImportClients(clients);
            successCount = clients.length;
          } else if (activeType === 'transactions') {
            const transactions = data.map(row => ({
              date: row.date || new Date().toISOString().split('T')[0],
              description: row.description || 'Imported Transaction',
              amount: parseFloat(row.amount) || 0,
              type: (row.type?.toLowerCase() === 'income' ? 'income' : 'expense') as 'income' | 'expense',
              category: row.category || 'General',
              client: row.client || ''
            }));
            onImportTransactions(transactions);
            successCount = transactions.length;
          } else if (activeType === 'invoices') {
            const invoices = data.map(row => ({
              clientName: row.clientName || 'Unknown',
              amount: parseFloat(row.amount) || 0,
              status: (['paid', 'pending', 'overdue'].includes(row.status?.toLowerCase()) ? row.status.toLowerCase() : 'pending') as any,
              dueDate: row.dueDate || new Date().toISOString().split('T')[0],
              issueDate: row.issueDate || new Date().toISOString().split('T')[0]
            }));
            onImportInvoices(invoices);
            successCount = invoices.length;
          } else if (activeType === 'appointments') {
            const appointments = data.map(row => ({
              title: row.title || 'Imported Appointment',
              date: row.date || new Date().toISOString().split('T')[0],
              time: row.time || '10:00',
              client: row.client || '',
              type: (['hearing', 'consultation', 'meeting'].includes(row.type?.toLowerCase()) ? row.type.toLowerCase() : 'meeting') as any,
              location: row.location || ''
            }));
            onImportAppointments(appointments);
            successCount = appointments.length;
          } else if (activeType === 'cases') {
            const cases = data.map(row => ({
              caseNumber: row.caseNumber || 'N/A',
              courtName: row.courtName || 'Calcutta High Court',
              clientName: row.clientName || '',
              petitioner: row.petitioner || '',
              respondent: row.respondent || '',
              status: row.status || 'Pending'
            }));
            onImportCases(cases);
            successCount = cases.length;
          }

          setResults({ success: successCount, failed: failedCount });
        } catch (err) {
          console.error('Migration failed:', err);
          setError('Failed to process CSV. Please check the template and try again.');
        } finally {
          setIsProcessing(false);
          if (fileInputRef.current) fileInputRef.current.value = '';
        }
      },
      error: (err) => {
        setError(`Error parsing CSV: ${err.message}`);
        setIsProcessing(false);
      }
    });
  };

  const migrationTypes = [
    { id: 'clients', label: 'Clients', icon: <Users size={18} />, color: 'text-blue-500' },
    { id: 'transactions', label: 'Transactions', icon: <Wallet size={18} />, color: 'text-emerald-500' },
    { id: 'invoices', label: 'Invoices', icon: <FileText size={18} />, color: 'text-amber-500' },
    { id: 'appointments', label: 'Calendar', icon: <Calendar size={18} />, color: 'text-indigo-500' },
    { id: 'cases', label: 'Cases', icon: <Gavel size={18} />, color: 'text-legal-navy' },
  ];

  return (
    <div className="p-6 space-y-8 max-w-5xl mx-auto h-full flex flex-col">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl font-bold text-legal-navy">Data Migration</h2>
          <p className="text-sm text-slate-500">Import your existing chamber data via CSV files</p>
        </div>
        <button 
          onClick={downloadTemplate}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 transition-all"
        >
          <Download size={14} />
          Download {activeType} Template
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1 space-y-2">
          {migrationTypes.map((type) => (
            <button
              key={type.id}
              onClick={() => {
                setActiveType(type.id as MigrationType);
                setResults(null);
                setError(null);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all ${
                activeType === type.id 
                  ? 'bg-legal-navy text-white shadow-lg shadow-legal-navy/20' 
                  : 'bg-white text-slate-600 border border-slate-200 hover:border-legal-navy/20'
              }`}
            >
              <div className={activeType === type.id ? 'text-white' : type.color}>
                {type.icon}
              </div>
              {type.label}
            </button>
          ))}
        </div>

        <div className="lg:col-span-3 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 text-center">
            <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <FileSpreadsheet size={32} className="text-slate-300" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">Import {activeType}</h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto mb-8">
              Upload a CSV file containing your {activeType}. Ensure the headers match our template for a successful migration.
            </p>

            <div className="flex flex-col items-center gap-4">
              <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessing}
                className="flex items-center gap-2 px-8 py-4 bg-legal-navy text-white rounded-2xl text-sm font-bold hover:bg-slate-800 transition-all shadow-xl shadow-legal-navy/20 disabled:opacity-50"
              >
                {isProcessing ? <Loader2 className="animate-spin" size={20} /> : <Upload size={20} />}
                {isProcessing ? 'Processing CSV...' : 'Select CSV File'}
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileUpload} 
                className="hidden" 
                accept=".csv"
              />
            </div>

            {results && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mt-8 p-6 bg-emerald-50 border border-emerald-100 rounded-2xl inline-flex flex-col items-center"
              >
                <div className="flex items-center gap-2 text-emerald-600 font-bold mb-1">
                  <CheckCircle size={18} />
                  Migration Successful
                </div>
                <p className="text-xs text-emerald-700">
                  Successfully imported {results.success} records into your chamber database.
                </p>
              </motion.div>
            )}

            {error && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mt-8 p-6 bg-rose-50 border border-rose-100 rounded-2xl inline-flex flex-col items-center"
              >
                <div className="flex items-center gap-2 text-rose-600 font-bold mb-1">
                  <AlertCircle size={18} />
                  Migration Error
                </div>
                <p className="text-xs text-rose-700">{error}</p>
              </motion.div>
            )}
          </div>

          <div className="bg-slate-50 rounded-3xl p-6 border border-slate-200">
            <div className="flex items-center gap-2 text-legal-navy mb-4">
              <Info size={18} />
              <h4 className="text-xs font-bold uppercase tracking-widest">Migration Tips</h4>
            </div>
            <ul className="space-y-3">
              <li className="flex gap-3 text-xs text-slate-600">
                <ArrowRight size={14} className="text-legal-gold flex-shrink-0" />
                Download the template first to see the required column headers.
              </li>
              <li className="flex gap-3 text-xs text-slate-600">
                <ArrowRight size={14} className="text-legal-gold flex-shrink-0" />
                Ensure dates are in YYYY-MM-DD format (e.g., 2025-03-15).
              </li>
              <li className="flex gap-3 text-xs text-slate-600">
                <ArrowRight size={14} className="text-legal-gold flex-shrink-0" />
                For financial data, ensure amounts are numeric without currency symbols.
              </li>
              <li className="flex gap-3 text-xs text-slate-600">
                <ArrowRight size={14} className="text-legal-gold flex-shrink-0" />
                Large migrations are processed instantly and synced across your chamber.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
