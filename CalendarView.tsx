import React, { useState } from 'react';
import { Email } from './types';
import { 
  Inbox, Send, Trash2, Search, Star, Archive, 
  MoreVertical, Reply, Forward, Paperclip, RefreshCw, AlertCircle, Plus, Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getGmailMessages, GmailMessage } from './types';

interface EmailCenterProps {
  emails: Email[];
  googleEmails: Email[];
  onSendEmail: (to: string, subject: string, content: string) => void;
  onDeleteEmail: (id: string) => void;
  onMarkAsRead: (id: string) => void;
  isGoogleConnected: boolean;
  onRefreshGmail: () => void;
}

export default function EmailCenter({ 
  emails, 
  googleEmails, 
  onSendEmail, 
  onDeleteEmail, 
  onMarkAsRead, 
  isGoogleConnected,
  onRefreshGmail
}: EmailCenterProps) {
  const [activeFolder, setActiveFolder] = useState<'inbox' | 'sent' | 'google'>('inbox');
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isComposing, setIsComposing] = useState(false);
  const [isLoadingGoogle, setIsLoadingGoogle] = useState(false);

  const handleRefresh = async () => {
    setIsLoadingGoogle(true);
    await onRefreshGmail();
    setIsLoadingGoogle(false);
  };

  const displayEmails = activeFolder === 'google' ? googleEmails : emails.filter(e => e.type === activeFolder);

  const filteredEmails = displayEmails
    .filter(e => 
      e.subject.toLowerCase().includes(searchTerm.toLowerCase()) || 
      e.sender.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.recipient.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => b.timestamp - a.timestamp);

  const selectedEmail = (activeFolder === 'google' ? googleEmails : emails).find(e => e.id === selectedEmailId);

  const handleEmailClick = (id: string) => {
    setSelectedEmailId(id);
    onMarkAsRead(id);
  };

  return (
    <div className="flex h-full bg-white overflow-hidden">
      {/* Email Sidebar */}
      <div className="w-64 border-r border-slate-200 flex flex-col bg-slate-50">
        <div className="p-6">
          <button 
            onClick={() => setIsComposing(true)}
            className="w-full py-3 bg-legal-navy text-white rounded-2xl text-sm font-bold shadow-lg shadow-legal-navy/20 hover:bg-slate-800 transition-all"
          >
            Compose
          </button>
        </div>
        <nav className="flex-1 px-4 space-y-1">
          <FolderItem 
            icon={<Inbox size={18} />} 
            label="Inbox" 
            active={activeFolder === 'inbox'} 
            count={emails.filter(e => e.type === 'inbox' && !e.isRead).length}
            onClick={() => { setActiveFolder('inbox'); setSelectedEmailId(null); }} 
          />
          <FolderItem 
            icon={<Send size={18} />} 
            label="Sent" 
            active={activeFolder === 'sent'} 
            onClick={() => { setActiveFolder('sent'); setSelectedEmailId(null); }} 
          />
          {isGoogleConnected && (
            <FolderItem 
              icon={<div className="w-4 h-4 bg-red-500 rounded flex items-center justify-center text-[8px] text-white font-bold">G</div>} 
              label="Gmail" 
              active={activeFolder === 'google'} 
              onClick={() => { setActiveFolder('google'); setSelectedEmailId(null); }} 
            />
          )}
          <FolderItem icon={<Star size={18} />} label="Starred" active={false} onClick={() => {}} />
          <FolderItem icon={<Archive size={18} />} label="Archive" active={false} onClick={() => {}} />
          <FolderItem icon={<Trash2 size={18} />} label="Trash" active={false} onClick={() => {}} />
        </nav>
        <div className="p-6">
          <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100">
            <div className="flex items-center gap-2 text-amber-800 mb-2">
              <AlertCircle size={14} />
              <span className="text-[10px] font-bold uppercase tracking-widest">Storage</span>
            </div>
            <div className="w-full bg-amber-200 h-1 rounded-full overflow-hidden">
              <div className="bg-amber-600 h-full w-[15%]" />
            </div>
            <p className="text-[10px] text-amber-700 mt-2 font-medium">2.3 GB of 15 GB used</p>
          </div>
        </div>
      </div>

      {/* Email List */}
      <div className={`flex-1 flex flex-col border-r border-slate-200 ${selectedEmailId ? 'hidden lg:flex' : 'flex'}`}>
        <div className="p-4 border-b border-slate-100 flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Search mail..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-100 border-none rounded-xl text-sm focus:ring-2 focus:ring-legal-navy/10 transition-all"
            />
          </div>
          <button 
            onClick={activeFolder === 'google' ? handleRefresh : undefined}
            disabled={isLoadingGoogle}
            className="p-2 text-slate-400 hover:text-legal-navy transition-colors"
          >
            <RefreshCw size={18} className={isLoadingGoogle ? 'animate-spin' : ''} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filteredEmails.length > 0 ? filteredEmails.map((email) => (
            <div 
              key={email.id}
              onClick={() => handleEmailClick(email.id)}
              className={`px-6 py-4 border-b border-slate-50 cursor-pointer transition-all hover:bg-slate-50 relative ${
                selectedEmailId === email.id ? 'bg-slate-100' : ''
              } ${!email.isRead ? 'font-bold' : ''}`}
            >
              {!email.isRead && (
                <div className="absolute left-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-legal-navy rounded-full" />
              )}
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-slate-800 truncate pr-4">
                  {activeFolder === 'inbox' ? email.sender : `To: ${email.recipient}`}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {new Date(email.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <p className="text-xs text-slate-900 truncate mb-1">{email.subject}</p>
              <p className="text-xs text-slate-500 truncate font-normal">{email.content}</p>
            </div>
          )) : (
            <div className="h-full flex flex-col items-center justify-center p-12 text-center">
              <div className="bg-slate-100 p-4 rounded-full mb-4">
                <Inbox size={32} className="text-slate-300" />
              </div>
              <h3 className="text-slate-800 font-bold">No emails found</h3>
              <p className="text-slate-500 text-sm">Your {activeFolder} is empty.</p>
            </div>
          )}
        </div>
      </div>

      {/* Email Content */}
      <div className={`flex-[1.5] flex flex-col bg-white ${!selectedEmailId ? 'hidden lg:flex' : 'flex'}`}>
        {selectedEmail ? (
          <div className="flex flex-col h-full">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button onClick={() => setSelectedEmailId(null)} className="lg:hidden p-2 text-slate-400">
                  <Inbox size={20} />
                </button>
                <button className="p-2 text-slate-400 hover:text-legal-navy transition-colors"><Archive size={18} /></button>
                <button className="p-2 text-slate-400 hover:text-rose-600 transition-colors" onClick={() => onDeleteEmail(selectedEmail.id)}><Trash2 size={18} /></button>
                <div className="h-4 w-px bg-slate-200 mx-2" />
                <button className="p-2 text-slate-400 hover:text-legal-navy transition-colors"><Star size={18} /></button>
              </div>
              <div className="flex items-center gap-2">
                <button className="p-2 text-slate-400 hover:text-legal-navy transition-colors"><Reply size={18} /></button>
                <button className="p-2 text-slate-400 hover:text-legal-navy transition-colors"><MoreVertical size={18} /></button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-8">
              <h2 className="text-2xl font-serif font-bold text-legal-navy mb-8">{selectedEmail.subject}</h2>
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-legal-navy font-bold text-lg">
                    {selectedEmail.sender.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">{selectedEmail.sender}</p>
                    <p className="text-xs text-slate-500">to {selectedEmail.recipient}</p>
                  </div>
                </div>
                <p className="text-xs text-slate-400 font-mono">
                  {new Date(selectedEmail.timestamp).toLocaleString()}
                </p>
              </div>
              <div className="prose prose-slate max-w-none">
                <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">
                  {selectedEmail.content}
                </p>
              </div>
              <div className="mt-12 pt-8 border-t border-slate-100">
                <div className="flex gap-3">
                  <button className="flex items-center gap-2 px-6 py-2 bg-slate-100 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-200 transition-all">
                    <Reply size={16} /> Reply
                  </button>
                  <button className="flex items-center gap-2 px-6 py-2 bg-slate-100 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-200 transition-all">
                    <Forward size={16} /> Forward
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center p-12 text-center bg-slate-50/50">
            <div className="bg-white p-6 rounded-3xl shadow-sm mb-4">
              <Mail size={48} className="text-slate-200" />
            </div>
            <h3 className="text-slate-800 font-serif text-xl font-bold">Select an email to read</h3>
            <p className="text-slate-500 text-sm max-w-xs mx-auto mt-2">
              Choose a conversation from the list to view the full message and attachments.
            </p>
          </div>
        )}
      </div>

      {/* Compose Modal */}
      {isComposing && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden"
          >
            <div className="bg-legal-navy p-4 flex items-center justify-between text-white">
              <h3 className="text-sm font-bold uppercase tracking-widest">New Message</h3>
              <button onClick={() => setIsComposing(false)}><Plus size={24} className="rotate-45" /></button>
            </div>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              onSendEmail(
                formData.get('to') as string,
                formData.get('subject') as string,
                formData.get('content') as string
              );
              setIsComposing(false);
            }} className="p-6 space-y-4">
              <div className="flex items-center gap-4 border-b border-slate-100 pb-2">
                <span className="text-xs font-bold text-slate-400 uppercase w-12">To</span>
                <input name="to" required type="email" className="flex-1 bg-transparent border-none text-sm focus:ring-0" placeholder="recipient@example.com" />
              </div>
              <div className="flex items-center gap-4 border-b border-slate-100 pb-2">
                <span className="text-xs font-bold text-slate-400 uppercase w-12">Subject</span>
                <input name="subject" required type="text" className="flex-1 bg-transparent border-none text-sm focus:ring-0" placeholder="Enter subject..." />
              </div>
              <textarea 
                name="content" 
                required 
                className="w-full h-64 bg-transparent border-none text-sm focus:ring-0 resize-none" 
                placeholder="Write your message here..."
              />
              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <div className="flex items-center gap-2">
                  <button type="button" className="p-2 text-slate-400 hover:text-legal-navy transition-colors"><Paperclip size={20} /></button>
                </div>
                <button 
                  type="submit"
                  className="px-8 py-3 bg-legal-navy text-white rounded-2xl text-sm font-bold hover:bg-slate-800 transition-all flex items-center gap-2"
                >
                  <Send size={18} /> Send Message
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}

function FolderItem({ icon, label, active, count, onClick }: any) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
        active ? 'bg-legal-navy text-white shadow-md' : 'text-slate-600 hover:bg-slate-200/50'
      }`}
    >
      <div className="flex items-center gap-3">
        {icon}
        {label}
      </div>
      {count !== undefined && count > 0 && (
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${active ? 'bg-white text-legal-navy' : 'bg-legal-navy text-white'}`}>
          {count}
        </span>
      )}
    </button>
  );
}

function Mail(props: any) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width={props.size || 24} 
      height={props.size || 24} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={props.className}
    >
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}
