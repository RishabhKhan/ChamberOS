import React, { useState } from 'react';
import { Client } from './types';
import { Plus, Search, User, Mail, Phone, Hash, MapPin, MoreVertical, Edit2, Trash2, ExternalLink, MessageCircle, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { openWhatsApp } from './whatsappService';
import { useModal } from './googleService';

interface ClientsProps {
  clients: Client[];
  onAddClient: (c: Omit<Client, 'id'>) => void;
  onDeleteClient: (id: string) => void;
}

export default function Clients({ clients, onAddClient, onDeleteClient }: ClientsProps) {
  const { showConfirm } = useModal();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.fileCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.email || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl font-bold text-legal-navy">Client Directory</h2>
          <p className="text-sm text-slate-500">Manage client records and case file codes</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-legal-navy text-white rounded-xl text-sm font-semibold hover:bg-slate-800 transition-colors"
        >
          <Plus size={18} />
          Add New Client
        </button>
      </div>

      {/* Search & Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              type="text" 
              placeholder="Search by name, file code, or email..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-legal-navy/10 focus:border-legal-navy transition-all shadow-sm"
            />
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Clients</p>
            <p className="text-2xl font-bold text-legal-navy">{clients.length}</p>
          </div>
          <div className="bg-legal-navy/5 p-3 rounded-xl">
            <Users size={24} className="text-legal-navy" />
          </div>
        </div>
      </div>

      {/* Clients Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        <AnimatePresence mode="popLayout">
          {filteredClients.map((client) => (
            <motion.div
              key={client.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all group overflow-hidden"
            >
              <div className="p-6 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-legal-navy font-bold text-lg">
                      {client.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 group-hover:text-legal-navy transition-colors">{client.name}</h3>
                      <div className="flex items-center gap-1.5 text-xs text-legal-gold font-bold">
                        <Hash size={12} />
                        {client.fileCode}
                      </div>
                    </div>
                  </div>
                  <button className="p-2 text-slate-400 hover:text-slate-600 transition-colors">
                    <MoreVertical size={18} />
                  </button>
                </div>

                <div className="space-y-2 pt-2">
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <Mail size={14} className="text-slate-400" />
                    {client.email}
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <div className="flex items-center gap-3">
                      <Phone size={14} className="text-slate-400" />
                      {client.phone}
                    </div>
                    <button 
                      onClick={() => openWhatsApp(client.phone, `Hello ${client.name}, this is regarding your case with Achilles Chamber.`)}
                      className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-colors flex items-center gap-1 text-[10px] font-bold"
                    >
                      <MessageCircle size={12} />
                      WhatsApp
                    </button>
                  </div>
                  {client.address && (
                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      <MapPin size={14} className="text-slate-400" />
                      <span className="truncate">{client.address}</span>
                    </div>
                  )}
                </div>

                <div className="pt-4 flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    client.status === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'
                  }`}>
                    {client.status}
                  </span>
                </div>
              </div>
              
              <div className="bg-slate-50 px-6 py-3 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button className="text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:text-legal-navy transition-colors flex items-center gap-1">
                    <Edit2 size={12} />
                    Edit
                  </button>
                  <button 
                    onClick={() => {
                      showConfirm(
                        'Delete Client',
                        'Are you sure you want to delete this client? This will remove all their records.',
                        () => onDeleteClient(client.id)
                      );
                    }}
                    className="text-[10px] font-bold text-rose-400 uppercase tracking-widest hover:text-rose-600 transition-colors flex items-center gap-1"
                  >
                    <Trash2 size={12} />
                    Delete
                  </button>
                </div>
                <button className="text-[10px] font-bold text-legal-navy uppercase tracking-widest hover:underline flex items-center gap-1">
                  View Case Files
                  <ExternalLink size={12} />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {filteredClients.length === 0 && (
        <div className="py-20 text-center">
          <div className="bg-slate-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <Search size={24} className="text-slate-400" />
          </div>
          <h3 className="text-slate-800 font-bold">No clients found</h3>
          <p className="text-slate-500 text-sm">Try adjusting your search or add a new client.</p>
        </div>
      )}

      {/* Add Client Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl w-full max-w-lg p-8 shadow-2xl"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-serif text-xl font-bold text-legal-navy">New Client Entry</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <Plus size={24} className="rotate-45" />
              </button>
            </div>
            
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              onAddClient({
                name: formData.get('name') as string,
                email: formData.get('email') as string,
                phone: formData.get('phone') as string,
                fileCode: formData.get('fileCode') as string,
                address: formData.get('address') as string,
                status: 'active'
              });
              setIsModalOpen(false);
            }} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Full Name</label>
                  <input name="name" required type="text" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm" placeholder="e.g. John Doe" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">File Code / Case Ref</label>
                  <input name="fileCode" required type="text" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm" placeholder="e.g. CR-2026-001" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Phone Number</label>
                  <input name="phone" required type="tel" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm" placeholder="+91 98765 43210" />
                </div>
                <div className="col-span-2">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Email Address</label>
                  <input name="email" required type="email" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm" placeholder="client@example.com" />
                </div>
                <div className="col-span-2">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Status</label>
                  <select name="status" required className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm">
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Address (Optional)</label>
                  <textarea name="address" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm resize-none" rows={2} placeholder="Physical address..." />
                </div>
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
                  Add Client
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}

