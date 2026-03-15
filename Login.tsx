import React, { useState, useRef, useEffect } from 'react';
import { 
  FileSearch, Upload, FileText, CheckCircle, AlertCircle, 
  Loader2, ChevronRight, Shield, Zap, ListChecks, Info, Trash2,
  Globe, Send, MessageSquare, Sparkles, BookOpen,
  History, Plus, Paperclip, Search, User
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from '@google/genai';
import { DocumentAnalysis as AnalysisType } from './types';
import { getCache, setCache, clearCache } from './cache';
import { useModal } from './googleService';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  citations?: string[];
}

interface DocumentAnalysisProps {
  analyses: AnalysisType[];
  onAddAnalysis: (analysis: AnalysisType) => void;
  onDeleteAnalysis: (id: string) => void;
}

export default function Research({ analyses, onAddAnalysis, onDeleteAnalysis }: DocumentAnalysisProps) {
  const { showAlert, showConfirm } = useModal();
  const [messages, setMessages] = useState<Message[]>(() => {
    return getCache<Message[]>('research_messages') || [
      {
        id: '1',
        role: 'assistant',
        content: 'Hello. I am your legal research assistant. How can I help you today? You can ask me to analyze documents, research case law, or draft legal summaries.',
        timestamp: Date.now()
      }
    ];
  });
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedAnalysis, setSelectedAnalysis] = useState<AnalysisType | null>(null);
  const [activeTab, setActiveTab] = useState<'chat' | 'library'>('chat');
  const [selectedModel, setSelectedModel] = useState<'gemini' | 'claude'>('gemini');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCache('research_messages', messages);
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isTyping) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    try {
      let assistantResponse = '';

      if (selectedModel === 'gemini') {
        const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY || '' });
        const model = 'gemini-1.5-flash';
        
        const context = analyses.length > 0 
          ? `Context from uploaded documents: ${analyses.map(a => `${a.fileName}: ${a.summary}`).join('\n')}`
          : '';

        const response = await ai.models.generateContent({
          model,
          contents: [
            { 
              role: 'user', 
              parts: [{ text: `${context}\n\nUser Query: ${input}\n\nProvide a professional legal response.` }] 
            }
          ],
          config: {
            systemInstruction: "You are a world-class legal research assistant. Your goal is to provide precise, cited, and professional legal information. Maintain a formal yet helpful tone. Structure your responses with clear headings if appropriate. Always prioritize accuracy and state if a query requires specific legal expertise beyond general research.",
            tools: [{ googleSearch: {} }]
          }
        });
        assistantResponse = response.text || '';
      } else {
        // Claude via backend
        const context = analyses.length > 0 
          ? `Context from uploaded documents: ${analyses.map(a => `${a.fileName}: ${a.summary}`).join('\n')}`
          : '';

        const response = await fetch('/api/anthropic/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [...messages, userMessage],
            systemInstruction: `You are a world-class legal research assistant. Your goal is to provide precise, cited, and professional legal information. Maintain a formal yet helpful tone. Context: ${context}`
          })
        });

        if (!response.ok) throw new Error('Claude request failed');
        const data = await response.json();
        assistantResponse = data.text;
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: assistantResponse || 'I apologize, but I encountered an error processing your request.',
        timestamp: Date.now()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Research query failed:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'I encountered an error while researching. Please check your connection and try again.',
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadProgress(10);

    try {
      const reader = new FileReader();
      const fileDataPromise = new Promise<string>((resolve) => {
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
      
      const base64Data = await fileDataPromise;
      setUploadProgress(30);

      const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY || '' });
      const model = 'gemini-1.5-flash';
      
      setUploadProgress(50);

      const prompt = `Analyze this legal document. Provide a structured summary including:
      1. A concise summary of the document's purpose.
      2. Key points or clauses.
      3. Potential legal risks or red flags.
      4. Recommendations for the advocate.
      Return the response in a clear, professional format.`;

      const result = await ai.models.generateContent({
        model,
        contents: [{
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: file.type,
                data: base64Data.split(',')[1]
              }
            }
          ]
        }]
      });

      const responseText = result.text || 'Analysis failed to generate.';
      setUploadProgress(90);

      const sections = responseText.split('\n\n');
      const summary = sections[0] || 'No summary available.';
      
      const newAnalysis: AnalysisType = {
        id: Math.random().toString(36).substr(2, 9),
        fileName: file.name,
        fileSize: (file.size / 1024 / 1024).toFixed(2) + ' MB',
        uploadDate: new Date().toISOString().split('T')[0],
        summary: summary,
        keyPoints: sections.find(s => s.toLowerCase().includes('key points'))?.split('\n').filter(l => l.trim().startsWith('-')).map(l => l.replace('-', '').trim()) || [],
        risks: sections.find(s => s.toLowerCase().includes('risk'))?.split('\n').filter(l => l.trim().startsWith('-')).map(l => l.replace('-', '').trim()) || [],
        recommendations: sections.find(s => s.toLowerCase().includes('recommendation'))?.split('\n').filter(l => l.trim().startsWith('-')).map(l => l.replace('-', '').trim()) || [],
        status: 'completed'
      };

      onAddAnalysis(newAnalysis);
      setUploadProgress(100);
      
      // Add a message about the new document
      const systemMsg: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `I have successfully analyzed "${file.name}". You can now ask me questions about this document or view its full analysis in the Library tab.`,
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, systemMsg]);
      
    } catch (error) {
      console.error('Analysis failed:', error);
      showAlert('Analysis Failed', 'Failed to analyze document. Please ensure it is a valid PDF or image.');
    } finally {
      setTimeout(() => {
        setIsUploading(false);
        setUploadProgress(0);
      }, 500);
    }
  };

  const clearChat = () => {
    showConfirm(
      'Clear Chat',
      'Are you sure you want to clear the chat history?',
      () => {
        const initialMsg: Message = {
          id: '1',
          role: 'assistant',
          content: 'Hello. I am your legal research assistant. How can I help you today?',
          timestamp: Date.now()
        };
        setMessages([initialMsg]);
        clearCache('research_messages');
      }
    );
  };

  return (
    <div className="flex h-full bg-slate-50 overflow-hidden">
      {/* Sidebar - Library & History */}
      <div className="w-80 border-r border-slate-200 bg-white hidden lg:flex flex-col">
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center gap-2 text-legal-navy mb-6">
            <Sparkles size={20} className="text-legal-gold" />
            <h2 className="font-serif text-xl font-bold">Research</h2>
          </div>
          
          <div className="flex p-1 bg-slate-100 rounded-xl">
            <button 
              onClick={() => setActiveTab('chat')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'chat' ? 'bg-white text-legal-navy shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <MessageSquare size={14} />
              Assistant
            </button>
            <button 
              onClick={() => setActiveTab('library')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'library' ? 'bg-white text-legal-navy shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <BookOpen size={14} />
              Library
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'chat' ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between px-2 border-t border-slate-100 pt-4">
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Recent Queries</h3>
                <button onClick={clearChat} className="text-[10px] font-bold text-rose-500 hover:underline">Clear</button>
              </div>
              <div className="space-y-1">
                {messages.filter(m => m.role === 'user').slice(-5).reverse().map((msg) => (
                  <button 
                    key={msg.id}
                    onClick={() => setInput(msg.content)}
                    className="w-full text-left p-3 rounded-xl hover:bg-slate-50 text-xs text-slate-600 truncate transition-colors flex items-center gap-3"
                  >
                    <History size={14} className="text-slate-300 flex-shrink-0" />
                    {msg.content}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between px-2">
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Knowledge Base</h3>
                <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{analyses.length}</span>
              </div>
              <div className="space-y-1">
                {analyses.map((analysis) => (
                  <button
                    key={analysis.id}
                    onClick={() => setSelectedAnalysis(analysis)}
                    className={`w-full text-left p-3 rounded-xl transition-all flex items-center gap-3 group ${
                      selectedAnalysis?.id === analysis.id 
                        ? 'bg-legal-navy text-white shadow-md' 
                        : 'hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    <FileText size={16} className={selectedAnalysis?.id === analysis.id ? 'text-white/60' : 'text-slate-400'} />
                    <span className="text-xs font-bold truncate flex-1">{analysis.fileName}</span>
                    <ChevronRight size={14} className={selectedAnalysis?.id === analysis.id ? 'text-white/40' : 'text-slate-200'} />
                  </button>
                ))}
                {analyses.length === 0 && (
                  <div className="py-8 text-center">
                    <p className="text-[10px] text-slate-400">No documents analyzed yet.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-100">
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="w-full flex items-center justify-center gap-2 py-3 bg-slate-900 text-white rounded-2xl text-xs font-bold hover:bg-black transition-all shadow-lg shadow-black/10 disabled:opacity-50"
          >
            {isUploading ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />}
            {isUploading ? 'Analyzing...' : 'Add Context'}
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            className="hidden" 
            accept=".pdf,.png,.jpg,.jpeg"
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col bg-white relative">
        {selectedAnalysis ? (
          <div className="absolute inset-0 z-20 bg-white flex flex-col">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <button onClick={() => setSelectedAnalysis(null)} className="p-2 hover:bg-slate-200 rounded-xl transition-colors">
                  <ChevronRight className="rotate-180" size={20} />
                </button>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">{selectedAnalysis.fileName}</h3>
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Document Analysis</p>
                </div>
              </div>
              <button 
                onClick={() => {
                  showConfirm(
                    'Delete Analysis',
                    'Are you sure you want to delete this analysis?',
                    () => {
                      onDeleteAnalysis(selectedAnalysis.id);
                      setSelectedAnalysis(null);
                    }
                  );
                }}
                className="p-2 text-slate-400 hover:text-rose-500 transition-colors"
              >
                <Trash2 size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-8 max-w-4xl mx-auto w-full space-y-10">
              <section className="space-y-4">
                <div className="flex items-center gap-2 text-legal-navy">
                  <Info size={18} />
                  <h4 className="text-xs font-bold uppercase tracking-widest">Executive Summary</h4>
                </div>
                <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 text-sm text-slate-600 leading-relaxed italic">
                  "{selectedAnalysis.summary}"
                </div>
              </section>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <section className="space-y-4">
                  <div className="flex items-center gap-2 text-indigo-600">
                    <Zap size={18} />
                    <h4 className="text-xs font-bold uppercase tracking-widest">Key Findings</h4>
                  </div>
                  <div className="space-y-3">
                    {selectedAnalysis.keyPoints.map((point, i) => (
                      <div key={i} className="flex gap-3 text-sm text-slate-600">
                        <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0" />
                        {point}
                      </div>
                    ))}
                  </div>
                </section>

                <section className="space-y-4">
                  <div className="flex items-center gap-2 text-rose-600">
                    <Shield size={18} />
                    <h4 className="text-xs font-bold uppercase tracking-widest">Risk Assessment</h4>
                  </div>
                  <div className="space-y-3">
                    {selectedAnalysis.risks.map((risk, i) => (
                      <div key={i} className="flex gap-3 text-sm text-slate-600 bg-rose-50/50 p-3 rounded-2xl border border-rose-100/50">
                        <AlertCircle size={16} className="text-rose-500 flex-shrink-0 mt-0.5" />
                        {risk}
                      </div>
                    ))}
                  </div>
                </section>
              </div>

              <section className="space-y-4">
                <div className="flex items-center gap-2 text-emerald-600">
                  <ListChecks size={18} />
                  <h4 className="text-xs font-bold uppercase tracking-widest">Strategic Advice</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedAnalysis.recommendations.map((rec, i) => (
                    <div key={i} className="flex items-center gap-3 p-4 bg-emerald-50/30 rounded-2xl border border-emerald-100/50 text-sm text-slate-700 font-medium">
                      <div className="w-6 h-6 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center text-[10px] font-bold">
                        {i + 1}
                      </div>
                      {rec}
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-white/80 backdrop-blur-md sticky top-0 z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-legal-navy rounded-xl flex items-center justify-center text-white shadow-lg shadow-legal-navy/10">
                  <Sparkles size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Legal Assistant</h3>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                    <select 
                      value={selectedModel}
                      onChange={(e) => setSelectedModel(e.target.value as 'gemini' | 'claude')}
                      className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-transparent border-none focus:ring-0 p-0 cursor-pointer hover:text-legal-navy transition-colors"
                    >
                      <option value="gemini">Powered by Gemini AI</option>
                      <option value="claude">Powered by Claude 3.5</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button className="p-2 text-slate-400 hover:text-legal-navy transition-colors">
                  <Search size={18} />
                </button>
              </div>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              <div className="max-w-3xl mx-auto space-y-8">
                {messages.map((msg) => (
                  <div 
                    key={msg.id} 
                    className={`flex gap-4 ${msg.role === 'assistant' ? '' : 'flex-row-reverse'}`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center ${
                      msg.role === 'assistant' ? 'bg-legal-navy text-white' : 'bg-legal-gold text-white'
                    }`}>
                      {msg.role === 'assistant' ? <Sparkles size={16} /> : <User size={16} />}
                    </div>
                    <div className={`flex-1 space-y-2 ${msg.role === 'assistant' ? '' : 'text-right'}`}>
                      <div className={`inline-block max-w-full p-4 rounded-2xl text-sm leading-relaxed ${
                        msg.role === 'assistant' 
                          ? 'bg-slate-50 text-slate-700 border border-slate-100' 
                          : 'bg-legal-navy text-white shadow-md'
                      }`}>
                        {msg.content}
                      </div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))}
                {isTyping && (
                  <div className="flex gap-4">
                    <div className="w-8 h-8 rounded-lg bg-legal-navy text-white flex items-center justify-center">
                      <Loader2 size={16} className="animate-spin" />
                    </div>
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      <div className="flex gap-1">
                        <span className="w-1 h-1 bg-slate-400 rounded-full animate-bounce" />
                        <span className="w-1 h-1 bg-slate-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                        <span className="w-1 h-1 bg-slate-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
            </div>

            {/* Chat Input */}
            <div className="p-6 bg-white border-t border-slate-100">
              <form 
                onSubmit={handleSendMessage}
                className="max-w-3xl mx-auto relative"
              >
                <div className="relative flex items-end gap-2 bg-slate-50 border border-slate-200 rounded-[24px] p-2 focus-within:border-legal-navy focus-within:ring-4 focus-within:ring-legal-navy/5 transition-all">
                  <button 
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="p-3 text-slate-400 hover:text-legal-navy transition-colors"
                  >
                    <Paperclip size={20} />
                  </button>
                  <textarea 
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    placeholder="Ask a legal question or upload a document..."
                    className="w-full bg-transparent border-none focus:ring-0 text-sm py-3 px-2 resize-none max-h-32 min-h-[44px]"
                    rows={1}
                  />
                  <button 
                    type="submit"
                    disabled={!input.trim() || isTyping}
                    className="p-3 bg-legal-navy text-white rounded-2xl hover:bg-black transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-legal-navy/20"
                  >
                    <Send size={20} />
                  </button>
                </div>
                <p className="text-[10px] text-center text-slate-400 mt-3 font-medium">
                  Achilles Assistant can make mistakes. Verify important legal information.
                </p>
              </form>
            </div>
          </>
        )}
      </div>

      {/* Upload Progress Overlay */}
      <AnimatePresence>
        {isUploading && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4"
          >
            <div className="max-w-md w-full bg-white rounded-[40px] p-10 text-center shadow-2xl">
              <div className="relative w-24 h-24 mx-auto mb-8">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="48" cy="48" r="44" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-slate-100" />
                  <circle
                    cx="48" cy="48" r="44" stroke="currentColor" strokeWidth="8" fill="transparent"
                    strokeDasharray={276}
                    strokeDashoffset={276 - (276 * uploadProgress) / 100}
                    className="text-legal-navy transition-all duration-500 ease-out"
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xl font-bold text-legal-navy">{uploadProgress}%</span>
                </div>
              </div>
              <h3 className="text-2xl font-bold text-slate-800 mb-2">Expanding Knowledge</h3>
              <p className="text-sm text-slate-500 mb-8">Our AI is indexing the document to provide context-aware answers.</p>
              <div className="flex items-center justify-center gap-2 text-legal-gold">
                <Loader2 className="animate-spin" size={16} />
                <span className="text-xs font-bold uppercase tracking-widest">Processing Intelligence</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
