import React, { useState, useEffect } from 'react';
import { 
  Scale, FileText, 
  LayoutDashboard, Wallet, Menu, X, Calendar as CalendarIcon, Bell, Users, Mail, LogOut,
  FileSearch
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Transaction, Invoice, Appointment, Client, Email, DocumentAnalysis as AnalysisType, Case } from './types';
import { getAuthStatus, getGoogleAuthUrl, logoutGoogle, sendGmailMessage, getGmailMessages } from './services/googleService';
import { INITIAL_EMAILS } from './constants';
import { 
  collection, onSnapshot, query, where, addDoc, updateDoc, deleteDoc, 
  Timestamp, doc, setDoc, getDocFromServer
} from 'firebase/firestore';
import { auth, onAuthStateChanged, FirebaseUser, signOut, db, handleFirestoreError, OperationType } from './firebase';
import { useModal } from './context/ModalContext';
import Dashboard from './components/Dashboard';
import Accounting from './components/Accounting';
import CalendarView from './components/CalendarView';
import Clients from './components/Clients';
import Invoicing from './components/Invoicing';
import EmailCenter from './components/EmailCenter';
import GlobalSearch from './components/GlobalSearch';
import Login from './components/Login';
import ErrorBoundary from './components/ErrorBoundary';
import DocumentAnalysis from './components/DocumentAnalysis';
import Documents from './components/Documents';
import DataMigration from './components/DataMigration';
import Cases from './components/Cases';
import { Search as SearchIcon, FolderOpen, Database, Gavel, Activity } from 'lucide-react';
import CaseStatus from './components/CaseStatus';

type View = 'dashboard' | 'accounting' | 'calendar' | 'clients' | 'invoicing' | 'email' | 'research' | 'documents' | 'migration' | 'cases' | 'case-status';

export default function App() {
  const { showAlert, showConfirm } = useModal();
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [view, setView] = useState<View>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isGoogleConnected, setIsGoogleConnected] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setIsAuthReady(true);
      
      if (currentUser) {
        // Sync user profile to Firestore
        try {
          const userRef = doc(db, 'users', currentUser.uid);
          const userSnap = await getDocFromServer(userRef);
          
          if (!userSnap.exists()) {
            await setDoc(userRef, {
              uid: currentUser.uid,
              email: currentUser.email,
              displayName: currentUser.displayName,
              photoURL: currentUser.photoURL,
              role: 'user', // Default role
              createdAt: new Date().toISOString()
            });
          }
        } catch (error) {
          console.error('Error syncing user profile:', error);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  // Keep server warm — ping every 10 minutes to prevent cold starts
  useEffect(() => {
    const ping = () => fetch('/ping').catch(() => {});
    ping();
    const interval = setInterval(ping, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const checkStatus = async () => {
      const connected = await getAuthStatus();
      setIsGoogleConnected(connected);
    };
    checkStatus();

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        setIsGoogleConnected(true);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleConnectGoogle = async () => {
    if (isGoogleConnected) {
      showConfirm('Disconnect Google', 'Are you sure you want to disconnect from Google?', async () => {
        await logoutGoogle();
        setIsGoogleConnected(false);
      });
      return;
    }
    
    try {
      const debugRes = await fetch('/api/auth/debug');
      const debugData = await debugRes.json();
      
      if (!debugData.hasClientId || !debugData.hasClientSecret) {
        showAlert('Configuration Missing', `Please add to your environment:\n1. GOOGLE_CLIENT_ID\n2. GOOGLE_CLIENT_SECRET\n\nRedirect URI for Google Console:\n${debugData.expectedRedirectUri}`);
        return;
      }

      const url = await getGoogleAuthUrl();
      if (!url) throw new Error('Could not get authentication URL');
      
      const popup = window.open(url, 'google_oauth', 'width=600,height=700,scrollbars=yes');
      
      if (!popup || popup.closed || typeof popup.closed === 'undefined') {
        showAlert('Popup Blocked', 'Please allow popups for this site and try again.');
        return;
      }

      // Poll auth status every second as a fallback for when postMessage is blocked
      const pollInterval = setInterval(async () => {
        try {
          // Check if popup closed
          if (popup.closed) {
            clearInterval(pollInterval);
            // Check if auth succeeded
            const connected = await getAuthStatus();
            if (connected) {
              setIsGoogleConnected(true);
            }
            return;
          }
          // Also check status while popup is open
          const connected = await getAuthStatus();
          if (connected) {
            clearInterval(pollInterval);
            setIsGoogleConnected(true);
            try { popup.close(); } catch {}
          }
        } catch {}
      }, 1000);

      // Stop polling after 3 minutes regardless
      setTimeout(() => clearInterval(pollInterval), 3 * 60 * 1000);

    } catch (error) {
      console.error('Google connection error:', error);
      showAlert('Connection Error', 'Failed to connect to Google: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };
  
  // Accounting State
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [cases, setCases] = useState<Case[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [emails, setEmails] = useState<Email[]>(INITIAL_EMAILS);
  const [googleEmails, setGoogleEmails] = useState<Email[]>([]);
  const [analyses, setAnalyses] = useState<AnalysisType[]>([]);
  const [notifications, setNotifications] = useState<string[]>([]);

  const fetchGmail = async () => {
    if (!isGoogleConnected) return;
    try {
      const { messages, unauthorized } = await getGmailMessages();
      if (unauthorized) {
        setIsGoogleConnected(false);
        return;
      }
      const formatted: Email[] = messages.map(msg => {
        const headers = msg.payload.headers;
        const subject = headers.find(h => h.name === 'Subject')?.value || '(No Subject)';
        const from = headers.find(h => h.name === 'From')?.value || 'Unknown';
        const date = headers.find(h => h.name === 'Date')?.value || '';
        return {
          id: msg.id,
          subject,
          sender: from,
          recipient: 'me',
          content: msg.snippet,
          timestamp: new Date(date).getTime(),
          isRead: true,
          type: 'inbox'
        };
      });
      setGoogleEmails(formatted);
    } catch (error) {
      console.error('Failed to fetch Gmail in App:', error);
    }
  };

  useEffect(() => {
    if (isGoogleConnected) {
      fetchGmail();
    } else {
      setGoogleEmails([]);
    }
  }, [isGoogleConnected]);

  // Firestore Sync
  useEffect(() => {
    if (!user) return;

    const collections = [
      { name: 'transactions', setter: setTransactions },
      { name: 'invoices', setter: setInvoices },
      { name: 'appointments', setter: setAppointments },
      { name: 'cases', setter: setCases },
      { name: 'clients', setter: setClients },
      { name: 'analyses', setter: setAnalyses },
    ];

    const unsubscribes = collections.map(({ name, setter }) => {
      const q = query(collection(db, name), where('ownerUid', '==', user.uid));
      return onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as any[];
        setter(data);
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, name);
      });
    });

    return () => unsubscribes.forEach(unsub => unsub());
  }, [user]);

  const sendNotification = (title: string, message: string) => {
    const newNotif = `${title}: ${message}`;
    setNotifications(prev => [newNotif, ...prev].slice(0, 5));
    
    // Mock Email Logic
    // Notification sent (logging removed for privacy)
  };

  const addTransaction = async (t: Omit<Transaction, 'id'>) => {
    try {
      await addDoc(collection(db, 'transactions'), {
        ...t,
        ownerUid: user?.uid
      });
      if (t.type === 'income') {
        sendNotification('Payment Received', `₹${(t.amount || 0).toLocaleString('en-IN')} for ${t.description}`);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'transactions');
    }
  };

  const addAppointment = async (a: Omit<Appointment, 'id'>) => {
    try {
      await addDoc(collection(db, 'appointments'), {
        ...a,
        ownerUid: user?.uid
      });
      sendNotification('New Appointment', `${a.title} scheduled for ${a.date} at ${a.time}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'appointments');
    }
  };

  const addClient = async (c: Omit<Client, 'id'>) => {
    try {
      await addDoc(collection(db, 'clients'), {
        ...c,
        ownerUid: user?.uid
      });
      sendNotification('Client Registered', `${c.name} added to directory with File Code: ${c.fileCode}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'clients');
    }
  };

  const deleteClient = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'clients', id));
      sendNotification('Client Removed', 'Client record has been deleted.');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `clients/${id}`);
    }
  };

  const addInvoice = async (i: Omit<Invoice, 'id'>) => {
    try {
      await addDoc(collection(db, 'invoices'), {
        ...i,
        ownerUid: user?.uid
      });
      sendNotification('Invoice Generated', `Invoice for ${i.clientName} - ₹${(i.amount || 0)}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'invoices');
    }
  };

  const updateInvoiceStatus = async (id: string, status: Invoice['status']) => {
    try {
      await updateDoc(doc(db, 'invoices', id), { status });
      if (status === 'paid') {
        sendNotification('Payment Confirmed', `Invoice ${id} has been marked as paid.`);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `invoices/${id}`);
    }
  };

  const deleteInvoice = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'invoices', id));
      sendNotification('Invoice Deleted', `Invoice ${id} has been removed.`);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `invoices/${id}`);
    }
  };

  const sendEmail = async (to: string, subject: string, content: string) => {
    try {
      if (isGoogleConnected) {
        const { ok, unauthorized } = await sendGmailMessage(to, subject, content);
        if (unauthorized) {
          setIsGoogleConnected(false);
          sendNotification('Google Disconnected', 'Session expired. Please reconnect Google.');
          return;
        }
        if (!ok) throw new Error('Failed to send via Gmail');
      }
      const newEmail: Email = {
        id: Date.now().toString(),
        subject,
        sender: user?.email || '',
        recipient: to,
        content,
        timestamp: Date.now(),
        isRead: true,
        type: 'sent'
      };
      setEmails(prev => [newEmail, ...prev]);
      sendNotification('Email Sent', `To: ${to} - ${subject}${isGoogleConnected ? ' (via Gmail)' : ''}`);
    } catch (error) {
      console.error('Failed to send email:', error);
      sendNotification('Email Error', 'Failed to send email via Google');
    }
  };

  const deleteAppointment = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'appointments', id));
      sendNotification('Appointment Cancelled', 'The appointment has been removed from your calendar.');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `appointments/${id}`);
    }
  };

  const deleteAnalysis = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'analyses', id));
      sendNotification('Analysis Deleted', 'The document analysis has been removed from your history.');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `analyses/${id}`);
    }
  };

  const addAnalysis = async (a: AnalysisType) => {
    try {
      const { id, ...rest } = a;
      await addDoc(collection(db, 'analyses'), {
        ...rest,
        ownerUid: user?.uid
      });
      sendNotification('Document Analyzed', `AI review completed for ${a.fileName}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'analyses');
    }
  };

  const importClients = async (importedClients: Omit<Client, 'id'>[]) => {
    try {
      const batch = importedClients.map(c => addDoc(collection(db, 'clients'), { ...c, ownerUid: user?.uid }));
      await Promise.all(batch);
      sendNotification('Migration Complete', `Imported ${importedClients.length} clients.`);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'clients');
    }
  };

  const importTransactions = async (importedTransactions: Omit<Transaction, 'id'>[]) => {
    try {
      const batch = importedTransactions.map(t => addDoc(collection(db, 'transactions'), { ...t, ownerUid: user?.uid }));
      await Promise.all(batch);
      sendNotification('Migration Complete', `Imported ${importedTransactions.length} transactions.`);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'transactions');
    }
  };

  const importInvoices = async (importedInvoices: Omit<Invoice, 'id'>[]) => {
    try {
      const batch = importedInvoices.map(i => addDoc(collection(db, 'invoices'), { ...i, ownerUid: user?.uid }));
      await Promise.all(batch);
      sendNotification('Migration Complete', `Imported ${importedInvoices.length} invoices.`);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'invoices');
    }
  };

  const importAppointments = async (importedAppointments: Omit<Appointment, 'id'>[]) => {
    try {
      const batch = importedAppointments.map(a => addDoc(collection(db, 'appointments'), { ...a, ownerUid: user?.uid }));
      await Promise.all(batch);
      sendNotification('Migration Complete', `Imported ${importedAppointments.length} appointments.`);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'appointments');
    }
  };

  const importCases = async (importedCases: Omit<Case, 'id'>[]) => {
    try {
      const batch = importedCases.map(c => addDoc(collection(db, 'cases'), { ...c, ownerUid: user?.uid }));
      await Promise.all(batch);
      sendNotification('Migration Complete', `Imported ${importedCases.length} cases.`);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'cases');
    }
  };

  const sendInvoiceEmail = (invoice: Invoice) => {
    const client = clients.find(c => c.name === invoice.clientName);
    const to = client?.email || 'client@example.com';
    const subject = `Invoice ${invoice.id} from Achilles Chambers`;
    const content = `Dear ${invoice.clientName},\n\nPlease find attached your invoice ${invoice.id} for the amount of ₹${(invoice.amount || 0).toLocaleString('en-IN')}.\n\nDue Date: ${invoice.dueDate}\n\nRegards,\n${user?.displayName || 'Your Advocate'}`;
    sendEmail(to, subject, content);
  };

  const deleteEmail = (id: string) => {
    setEmails(prev => prev.filter(e => e.id !== id));
  };

  const markEmailAsRead = (id: string) => {
    setEmails(prev => prev.map(e => e.id === id ? { ...e, isRead: true } : e));
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  if (!isAuthReady) {
    return (
      <div className="min-h-screen bg-legal-navy flex flex-col items-center justify-center gap-6">
        <div className="flex items-center gap-3">
          <div className="bg-white/10 p-3 rounded-2xl">
            <Scale className="text-white w-7 h-7" />
          </div>
          <div>
            <h1 className="font-serif text-2xl font-bold text-white leading-none">Achilles</h1>
            <p className="text-[10px] text-white/40 font-medium uppercase tracking-widest mt-1">Chamber OS</p>
          </div>
        </div>
        <div className="flex gap-1.5">
          <div className="w-2 h-2 bg-legal-gold rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 bg-legal-gold/70 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-2 h-2 bg-legal-gold/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <ErrorBoundary>
      <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Sidebar Navigation */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 text-white transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 flex-shrink-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `} style={{ background: 'linear-gradient(160deg, #0f172a 0%, #1a2744 100%)' }}>
        <div className="flex flex-col h-full">

          {/* Logo */}
          <div className="p-5 flex items-center gap-3 border-b border-white/8">
            <div className="relative">
              <div className="bg-gradient-to-br from-legal-gold/30 to-legal-gold/10 p-2.5 rounded-xl border border-legal-gold/20">
                <Scale className="text-legal-gold w-5 h-5" />
              </div>
            </div>
            <div>
              <h1 className="font-serif text-xl font-bold leading-none tracking-tight">Achilles</h1>
              <p className="text-[9px] text-white/40 font-semibold uppercase tracking-[0.15em] mt-0.5">Chamber OS</p>
            </div>
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="ml-auto lg:hidden p-1.5 text-white/40 hover:text-white transition-colors rounded-lg hover:bg-white/5"
            >
              <X size={16} />
            </button>
          </div>

          {/* Nav */}
          <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
            <p className="text-[9px] font-bold text-white/25 uppercase tracking-[0.15em] px-3 pt-3 pb-2">Main</p>
            <NavItem icon={<LayoutDashboard size={17} />} label="Dashboard"   active={view === 'dashboard'}   onClick={() => { setView('dashboard');   setIsSidebarOpen(false); }} />
            <NavItem icon={<Users size={17} />}           label="Clients"     active={view === 'clients'}     onClick={() => { setView('clients');     setIsSidebarOpen(false); }} />
            <NavItem icon={<Gavel size={17} />}           label="Cases"       active={view === 'cases'}       onClick={() => { setView('cases');       setIsSidebarOpen(false); }} />
            <NavItem icon={<Activity size={17} />}        label="Case Status" active={view === 'case-status'} onClick={() => { setView('case-status'); setIsSidebarOpen(false); }} />

            <p className="text-[9px] font-bold text-white/25 uppercase tracking-[0.15em] px-3 pt-4 pb-2">Finance</p>
            <NavItem icon={<Wallet size={17} />}          label="Accounting"  active={view === 'accounting'}  onClick={() => { setView('accounting');  setIsSidebarOpen(false); }} />
            <NavItem icon={<FileText size={17} />}        label="Invoicing"   active={view === 'invoicing'}   onClick={() => { setView('invoicing');   setIsSidebarOpen(false); }} />

            <p className="text-[9px] font-bold text-white/25 uppercase tracking-[0.15em] px-3 pt-4 pb-2">Tools</p>
            <NavItem icon={<FileSearch size={17} />}      label="Research"    active={view === 'research'}    onClick={() => { setView('research');    setIsSidebarOpen(false); }} />
            <NavItem icon={<FolderOpen size={17} />}      label="Documents"   active={view === 'documents'}   onClick={() => { setView('documents');   setIsSidebarOpen(false); }} />
            <NavItem icon={<Mail size={17} />}            label="Email"       active={view === 'email'}       onClick={() => { setView('email');       setIsSidebarOpen(false); }} />
            <NavItem icon={<CalendarIcon size={17} />}    label="Calendar"    active={view === 'calendar'}    onClick={() => { setView('calendar');    setIsSidebarOpen(false); }} />
            <NavItem icon={<Database size={17} />}        label="Migration"   active={view === 'migration'}   onClick={() => { setView('migration');   setIsSidebarOpen(false); }} />
          </nav>

          {/* Bottom: Google + User */}
          <div className="p-3 border-t border-white/8 space-y-2">
            <button
              onClick={handleConnectGoogle}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                isGoogleConnected
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/15'
                  : 'bg-white/5 text-white/60 border border-white/8 hover:bg-white/10 hover:text-white'
              }`}
            >
              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isGoogleConnected ? 'bg-emerald-400 animate-pulse' : 'bg-white/20'}`} />
              <span>{isGoogleConnected ? 'Google Connected' : 'Connect Google'}</span>
              {isGoogleConnected && <CheckCircleIcon />}
            </button>

            <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/5 border border-white/8">
              <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 ring-2 ring-legal-gold/30">
                {user.photoURL ? (
                  <img src={user.photoURL} alt={user.displayName || ''} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-full h-full bg-legal-gold flex items-center justify-center text-xs font-bold text-white">
                    {user.displayName?.split(' ').map((n: string) => n[0]).join('') || 'U'}
                  </div>
                )}
              </div>
              <div className="overflow-hidden flex-1 min-w-0">
                <p className="text-xs font-semibold truncate text-white/90">{user.displayName || 'User'}</p>
                <p className="text-[10px] text-white/40 truncate">{user.email}</p>
              </div>
              <button
                onClick={handleLogout}
                className="p-1.5 text-white/30 hover:text-rose-400 transition-colors rounded-lg hover:bg-white/5 flex-shrink-0"
                title="Sign Out"
              >
                <LogOut size={14} />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Mobile Header */}
        <header className="lg:hidden glass border-b border-slate-200/60 px-4 py-3 flex items-center justify-between z-30 sticky top-0">
          <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-slate-500 hover:text-legal-navy hover:bg-slate-100 rounded-xl transition-all">
            <Menu size={22} />
          </button>
          <div className="flex items-center gap-2">
            <div className="bg-legal-navy/5 p-1.5 rounded-lg">
              <Scale className="text-legal-navy w-4 h-4" />
            </div>
            <span className="font-serif font-bold text-legal-navy text-lg">Achilles</span>
          </div>
          <button onClick={() => setIsSearchOpen(true)} className="p-2 text-slate-500 hover:text-legal-navy hover:bg-slate-100 rounded-xl transition-all">
            <SearchIcon size={20} />
          </button>
        </header>

        {/* Desktop Header */}
        <header className="hidden lg:flex glass border-b border-slate-200/60 px-8 py-3.5 items-center justify-between z-30 sticky top-0">
          <div className="flex items-center gap-3">
            <h2 className="font-serif text-xl font-bold text-legal-navy capitalize">
              {view === 'case-status' ? 'Case Status' : view}
            </h2>
            <div className="h-4 w-px bg-slate-200" />
            <p className="text-xs text-slate-400 font-medium">
              {new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Search */}
            <button
              onClick={() => setIsSearchOpen(true)}
              className="flex items-center gap-2 px-3 py-2 bg-slate-100 text-slate-400 rounded-xl text-xs font-medium hover:bg-slate-200 hover:text-slate-600 transition-all border border-slate-200/50 group"
            >
              <SearchIcon size={13} />
              <span className="text-slate-400 group-hover:text-slate-600 transition-colors">Search anything...</span>
              <span className="ml-2 px-1.5 py-0.5 bg-white border border-slate-200 rounded-md text-[10px] font-bold text-slate-400">⌘K</span>
            </button>

            <div className="h-5 w-px bg-slate-200" />

            {/* Notifications */}
            <div className="relative group">
              <button className="p-2 text-slate-400 hover:text-legal-navy hover:bg-slate-100 rounded-xl transition-all relative">
                <Bell size={18} />
                {notifications.length > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-white animate-pulse" />
                )}
              </button>
              <div className="absolute right-0 top-full mt-2 w-72 bg-white border border-slate-200 rounded-2xl shadow-2xl shadow-slate-200/80 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-700">Notifications</h4>
                  {notifications.length > 0 && (
                    <span className="text-[10px] font-bold bg-rose-100 text-rose-600 px-2 py-0.5 rounded-full">{notifications.length}</span>
                  )}
                </div>
                <div className="p-3 space-y-1 max-h-72 overflow-y-auto">
                  {notifications.length > 0 ? notifications.map((n, i) => (
                    <div key={i} className="text-xs text-slate-600 border-l-2 border-legal-gold pl-3 py-2 bg-slate-50 rounded-r-lg">
                      {n}
                    </div>
                  )) : (
                    <div className="py-6 text-center">
                      <p className="text-xs text-slate-400">No new notifications</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="h-5 w-px bg-slate-200" />

            {/* Avatar */}
            <div className="w-8 h-8 rounded-full overflow-hidden ring-2 ring-legal-gold/30 ring-offset-1">
              {user.photoURL ? (
                <img src={user.photoURL} alt={user.displayName || ''} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-full h-full bg-legal-navy flex items-center justify-center text-xs font-bold text-white">
                  {user.displayName?.split(' ').map((n: string) => n[0]).join('') || 'U'}
                </div>
              )}
            </div>
          </div>
        </header>

        {/* View Content */}
        <main className="flex-1 overflow-hidden flex flex-col relative bg-slate-50/80">
          {/* Top progress bar on navigation */}
          <div key={view} className="absolute top-0 left-0 right-0 h-0.5 z-50 pointer-events-none overflow-hidden">
            <div className="h-full bg-gradient-to-r from-legal-gold via-legal-gold-lt to-legal-gold"
              style={{animation: 'progressBar 0.4s cubic-bezier(0.16,1,0.3,1) forwards'}} />
          </div>
          <AnimatePresence mode="wait">
            {view === 'dashboard' && (
              <motion.div key="dashboard" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.2, ease: [0.25, 1, 0.5, 1] }} className="flex-1 overflow-y-auto">
                <Dashboard transactions={transactions} invoices={invoices} appointments={appointments} cases={cases} analyses={analyses} onNavigate={setView} />
              </motion.div>
            )}
            {view === 'accounting' && (
              <motion.div key="accounting" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.2, ease: [0.25, 1, 0.5, 1] }} className="flex-1 overflow-y-auto">
                <Accounting transactions={transactions} onAddTransaction={addTransaction} />
              </motion.div>
            )}
            {view === 'calendar' && (
              <motion.div key="calendar" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.2, ease: [0.25, 1, 0.5, 1] }} className="flex-1 overflow-y-auto">
                <CalendarView appointments={appointments} onAddAppointment={addAppointment} onDeleteAppointment={deleteAppointment} isGoogleConnected={isGoogleConnected} />
              </motion.div>
            )}
            {view === 'clients' && (
              <motion.div key="clients" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.2, ease: [0.25, 1, 0.5, 1] }} className="flex-1 overflow-y-auto">
                <Clients clients={clients} onAddClient={addClient} onDeleteClient={deleteClient} />
              </motion.div>
            )}
            {view === 'invoicing' && (
              <motion.div key="invoicing" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.2, ease: [0.25, 1, 0.5, 1] }} className="flex-1 overflow-y-auto">
                <Invoicing invoices={invoices} clients={clients} onAddInvoice={addInvoice} onUpdateStatus={updateInvoiceStatus} onDeleteInvoice={deleteInvoice} onSendEmail={sendInvoiceEmail} />
              </motion.div>
            )}
            {view === 'email' && (
              <motion.div key="email" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.2, ease: [0.25, 1, 0.5, 1] }} className="flex-1 overflow-hidden">
                <EmailCenter emails={emails} googleEmails={googleEmails} onSendEmail={sendEmail} onDeleteEmail={deleteEmail} onMarkAsRead={markEmailAsRead} isGoogleConnected={isGoogleConnected} onRefreshGmail={fetchGmail} />
              </motion.div>
            )}
            {view === 'research' && (
              <motion.div key="research" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.2, ease: [0.25, 1, 0.5, 1] }} className="flex-1 overflow-hidden">
                <DocumentAnalysis analyses={analyses} onAddAnalysis={addAnalysis} onDeleteAnalysis={deleteAnalysis} />
              </motion.div>
            )}
            {view === 'documents' && (
              <motion.div key="documents" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.2, ease: [0.25, 1, 0.5, 1] }} className="flex-1 overflow-hidden">
                <Documents isGoogleConnected={isGoogleConnected} onAddAnalysis={addAnalysis} />
              </motion.div>
            )}
            {view === 'cases' && (
              <motion.div key="cases" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.2, ease: [0.25, 1, 0.5, 1] }} className="flex-1 overflow-y-auto">
                <Cases userId={user?.uid || ''} cases={cases} userName={user.displayName || user.email || ''} />
              </motion.div>
            )}
            {view === 'migration' && (
              <motion.div key="migration" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.2, ease: [0.25, 1, 0.5, 1] }} className="flex-1 overflow-y-auto">
                <DataMigration onImportClients={importClients} onImportTransactions={importTransactions} onImportInvoices={importInvoices} onImportAppointments={importAppointments} onImportCases={importCases} />
              </motion.div>
            )}
            {view === 'case-status' && (
              <motion.div key="case-status" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.2, ease: [0.25, 1, 0.5, 1] }} className="flex-1 overflow-y-auto">
                <CaseStatus userName={user?.displayName || ''} trackedCases={cases} />
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>

      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <GlobalSearch 
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        clients={clients}
        invoices={invoices}
        emails={[...emails, ...googleEmails]}
        analyses={analyses}
        cases={cases}
        onNavigate={setView}
      />
    </div>
    </ErrorBoundary>
  );
}

// Small inline check icon for Google connected state
function CheckCircleIcon() {
  return (
    <svg className="w-3.5 h-3.5 text-emerald-400 ml-auto flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function NavItem({ icon, label, active, onClick }: any) {
  return (
    <button
      onClick={onClick}
      className={`nav-item relative w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium group ${
        active
          ? 'active bg-white/12 text-white shadow-sm'
          : 'text-white/50 hover:text-white/90 hover:bg-white/7'
      }`}
    >
      {active && <span className="nav-active-indicator" />}
      <span className={`transition-all duration-200 ${
        active ? 'text-legal-gold scale-110' : 'text-white/40 group-hover:text-white/75 group-hover:scale-105'
      }`}>
        {icon}
      </span>
      <span className="leading-none tracking-tight">{label}</span>
      {active && (
        <span className="ml-auto w-1.5 h-1.5 rounded-full bg-legal-gold flex-shrink-0 animate-pulse" />
      )}
    </button>
  );
}
