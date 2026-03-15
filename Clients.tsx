import React, { useState } from 'react';
import { Invoice, Client } from './types';
import { 
  Plus, Search, FileText, Download, Send, CheckCircle, 
  Clock, AlertTriangle, MoreVertical, Filter, Printer, Mail,
  Edit2, Trash2, History
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import InvoiceTemplate from './InvoiceTemplate';
import { useModal } from './googleService';

interface InvoicingProps {
  invoices: Invoice[];
  clients: Client[];
  onAddInvoice: (invoice: Omit<Invoice, 'id'>) => void;
  onUpdateStatus: (id: string, status: Invoice['status']) => void;
  onDeleteInvoice: (id: string) => void;
  onSendEmail: (invoice: Invoice) => void;
}

export default function Invoicing({ invoices, clients, onAddInvoice, onUpdateStatus, onDeleteInvoice, onSendEmail }: InvoicingProps) {
  const { showConfirm } = useModal();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | Invoice['status']>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [previewInvoice, setPreviewInvoice] = useState<Invoice | null>(null);

  const filteredInvoices = invoices.filter(i => {
    const matchesSearch = i.clientName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          i.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || i.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const printBatch = () => {
    const printContent = filteredInvoices.map(i =>
      `Invoice: ${i.id}\nClient: ${i.clientName}\nAmount: ₹${(i.amount || 0).toLocaleString('en-IN')}\nStatus: ${i.status}\nIssue Date: ${i.issueDate}\nDue Date: ${i.dueDate}\n`
    ).join('\n---\n\n');
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`<pre style="font-family:monospace;padding:2rem">${printContent}</pre>`);
    win.document.close();
    win.print();
  };

  const exportInvoicesCSV = () => {
    const headers = ['Invoice ID', 'Client', 'Amount', 'Status', 'Issue Date', 'Due Date'];
    const rows = filteredInvoices.map(i => [
      i.id,
      `"${(i.clientName || '').replace(/"/g, '""')}"`,
      i.amount || 0,
      i.status,
      i.issueDate,
      i.dueDate
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invoices_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getStatusColor = (status: Invoice['status']) => {
    switch (status) {
      case 'paid': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case 'pending': return 'bg-amber-50 text-amber-600 border-amber-100';
      case 'overdue': return 'bg-rose-50 text-rose-600 border-rose-100';
      default: return 'bg-slate-50 text-slate-600 border-slate-100';
    }
  };

  const getStatusIcon = (status: Invoice['status']) => {
    switch (status) {
      case 'paid': return <CheckCircle size={14} />;
      case 'pending': return <Clock size={14} />;
      case 'overdue': return <AlertTriangle size={14} />;
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl font-bold text-legal-navy">Invoicing System</h2>
          <p className="text-sm text-slate-500">Generate and track professional legal invoices</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={printBatch} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
            <Printer size={18} />
            Print Batch
          </button>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-legal-navy text-white rounded-xl text-sm font-semibold hover:bg-slate-800 transition-colors"
          >
            <Plus size={18} />
            Create Invoice
          </button>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Outstanding</p>
          <p className="text-2xl font-bold text-slate-900">
            ₹{invoices.filter(i => i.status !== 'paid').reduce((acc, i) => acc + (i.amount || 0), 0).toLocaleString('en-IN')}
          </p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Pending Invoices</p>
          <p className="text-2xl font-bold text-amber-600">{invoices.filter(i => i.status === 'pending').length}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Overdue Amount</p>
          <p className="text-2xl font-bold text-rose-600">
            ₹{invoices.filter(i => i.status === 'overdue').reduce((acc, i) => acc + (i.amount || 0), 0).toLocaleString('en-IN')}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Search by client or invoice ID..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-legal-navy/10 focus:border-legal-navy transition-all"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-slate-400 mr-2" />
          {(['all', 'paid', 'pending', 'overdue'] as const).map((status) => (
            <button 
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${
                filterStatus === status ? 'bg-legal-navy text-white' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Invoices List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Invoice ID</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Client</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Amount</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Due Date</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredInvoices.map((invoice) => (
                <tr key={invoice.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-6 py-4">
                    <span className="text-sm font-mono font-bold text-slate-400">{invoice.id}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-xs">
                        {invoice.clientName.charAt(0)}
                      </div>
                      <span className="text-sm font-semibold text-slate-800">{invoice.clientName}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-bold text-slate-900">₹{(invoice.amount || 0).toLocaleString('en-IN')}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-slate-600">{invoice.dueDate}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-bold uppercase tracking-widest ${getStatusColor(invoice.status)}`}>
                      {getStatusIcon(invoice.status)}
                      {invoice.status}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => setPreviewInvoice(invoice)}
                        className="p-2 text-slate-400 hover:text-legal-navy transition-colors" 
                        title="View/Print Invoice"
                      >
                        <Printer size={16} />
                      </button>
                      <button 
                        onClick={() => onSendEmail(invoice)}
                        className="p-2 text-slate-400 hover:text-legal-navy transition-colors" 
                        title="Email Invoice"
                      >
                        <Mail size={16} />
                      </button>
                      <button className="p-2 text-slate-400 hover:text-legal-navy transition-colors" title="Download PDF">
                        <Download size={16} />
                      </button>
                      {invoice.status !== 'paid' && (
                        <button 
                          onClick={() => onUpdateStatus(invoice.id, 'paid')}
                          className="p-2 text-slate-400 hover:text-emerald-600 transition-colors" 
                          title="Mark as Paid"
                        >
                          <CheckCircle size={16} />
                        </button>
                      )}
                      <div className="relative group/menu">
                        <button className="p-2 text-slate-400 hover:text-slate-600 transition-colors">
                          <MoreVertical size={16} />
                        </button>
                        <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-slate-200 rounded-xl shadow-xl opacity-0 invisible group-hover/menu:opacity-100 group-hover/menu:visible transition-all z-50 py-2">
                          <button
                            onClick={() => setPreviewInvoice(invoice)}
                            className="w-full text-left px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 flex items-center gap-2">
                            <Edit2 size={14} />
                            View / Print
                          </button>
                          <button
                            onClick={() => exportInvoicesCSV()}
                            className="w-full text-left px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 flex items-center gap-2">
                            <History size={14} />
                            Export CSV
                          </button>
                          <div className="h-px bg-slate-100 my-1" />
                          <button 
                            onClick={() => {
                              showConfirm(
                                'Delete Invoice',
                                'Are you sure you want to delete this invoice?',
                                () => onDeleteInvoice(invoice.id)
                              );
                            }}
                            className="w-full text-left px-4 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 flex items-center gap-2"
                          >
                            <Trash2 size={14} />
                            Delete Invoice
                          </button>
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredInvoices.length === 0 && (
          <div className="p-12 text-center">
            <p className="text-slate-400 text-sm">No invoices found matching your criteria.</p>
          </div>
        )}
      </div>

      {/* Invoice Preview */}
      {previewInvoice && (
        <InvoiceTemplate 
          invoice={previewInvoice} 
          onClose={() => setPreviewInvoice(null)} 
        />
      )}

      {/* Create Invoice Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl w-full max-w-lg p-8 shadow-2xl"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-serif text-xl font-bold text-legal-navy">Generate Invoice</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <Plus size={24} className="rotate-45" />
              </button>
            </div>
            
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              onAddInvoice({
                clientName: formData.get('clientName') as string,
                amount: Number(formData.get('amount')),
                status: 'pending',
                issueDate: new Date().toISOString().split('T')[0],
                dueDate: formData.get('dueDate') as string,
              });
              setIsModalOpen(false);
            }} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Select Client</label>
                <select name="clientName" required className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm">
                  <option value="">Choose a client...</option>
                  {clients.map(c => <option key={c.id} value={c.name}>{c.name} ({c.fileCode})</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Amount (₹)</label>
                  <input name="amount" required type="number" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm" placeholder="0.00" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Due Date</label>
                  <input name="dueDate" required type="date" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Description / Notes</label>
                <textarea className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm resize-none" rows={3} placeholder="Professional services rendered for..." />
              </div>

              <div className="flex items-center gap-3 mt-8">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-3 bg-slate-100 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 px-4 py-3 bg-legal-navy text-white rounded-xl text-sm font-semibold hover:bg-slate-800 transition-colors"
                >
                  Create & Save
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
