import React, { useState, useEffect } from 'react';
import { 
  File, Folder, Search, Upload, Download, ExternalLink, 
  MoreVertical, Trash2, FileText, Image as ImageIcon, 
  FileCode, Loader2, AlertCircle, HardDrive
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getGoogleDriveFiles, GoogleDriveFile, uploadToGoogleDrive, getGoogleDriveFileContent, deleteGoogleDriveFile } from '../services/googleService';
import { GoogleGenAI, Type } from "@google/genai";
import { DocumentAnalysis as AnalysisType } from '../types';
import { useModal } from '../context/ModalContext';

interface DocumentsProps {
  isGoogleConnected: boolean;
  onAddAnalysis: (a: AnalysisType) => void;
}

export default function Documents({ isGoogleConnected, onAddAnalysis }: DocumentsProps) {
  const { showConfirm } = useModal();
  const [files, setFiles] = useState<GoogleDriveFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchFiles = async () => {
    if (!isGoogleConnected) return;
    setIsLoading(true);
    setError(null);
    try {
      const { files: driveFiles, unauthorized } = await getGoogleDriveFiles();
      if (unauthorized) {
        setError('Google session expired. Please reconnect your Google account.');
      } else {
        setFiles(driveFiles);
      }
    } catch (err) {
      setError('Failed to connect to Google Drive. Please try reconnecting.');
    } finally {
      setIsLoading(false);
    }
  };

  const analyzeFile = async (file: GoogleDriveFile) => {
    if (!isGoogleConnected) return;
    setIsAnalyzing(file.id);
    setError(null);
    try {
      const { content: fileContent, unauthorized } = await getGoogleDriveFileContent(file.id);
      if (unauthorized) { setError('Google session expired. Please reconnect.'); return; }
      if (!fileContent) { setError('Could not read file content.'); return; }
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-1.5-flash',
        contents: `Analyze this legal document and provide a summary, key points, risks, and recommendations. Document Content: ${fileContent}`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              summary: { type: Type.STRING },
              keyPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
              risks: { type: Type.ARRAY, items: { type: Type.STRING } },
              recommendations: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ['summary', 'keyPoints', 'risks', 'recommendations']
          }
        }
      });
      const analysisData = JSON.parse(response.text || '{}');
      const analysis: AnalysisType = {
        fileName: file.name, fileSize: 'N/A',
        ...analysisData, status: 'completed', timestamp: Date.now()
      };
      await onAddAnalysis(analysis);
    } catch (err) {
      console.error('Analysis failed:', err);
      setError('Failed to analyze document with AI.');
    } finally {
      setIsAnalyzing(null);
    }
  };

  const handleDeleteFile = async (fileId: string) => {
    showConfirm('Delete File', 'Are you sure you want to delete this file from Google Drive?',
      async () => {
        setIsLoading(true);
        try {
          const { ok, unauthorized } = await deleteGoogleDriveFile(fileId);
          if (unauthorized) { setError('Google session expired. Please reconnect.'); return; }
          if (!ok) { setError('Failed to delete file.'); return; }
          await fetchFiles();
        } catch { setError('Failed to delete file from Google Drive.'); }
        finally { setIsLoading(false); }
      }
    );
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !isGoogleConnected) return;
    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        const { unauthorized } = await uploadToGoogleDrive(file.name, content);
        if (unauthorized) { setError('Google session expired. Please reconnect.'); }
        else { await fetchFiles(); }
      } catch {
        setError('Failed to upload file to Google Drive.');
      } finally {
        setIsUploading(false);
      }
    };
    reader.onerror = () => {
      setError('Failed to read file.');
      setIsUploading(false);
    };
    reader.readAsText(file);
  };

  useEffect(() => {
    if (isGoogleConnected) {
      fetchFiles();
    }
  }, [isGoogleConnected]);

  const filteredFiles = files.filter(f => 
    f.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getFileIcon = (mimeType: string) => {
    if (mimeType.includes('pdf')) return <FileText className="text-rose-500" />;
    if (mimeType.includes('image')) return <ImageIcon className="text-emerald-500" />;
    if (mimeType.includes('text')) return <File className="text-blue-500" />;
    if (mimeType.includes('google-apps.document')) return <FileText className="text-blue-600" />;
    return <File className="text-slate-400" />;
  };

  if (!isGoogleConnected) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-12 text-center bg-slate-50">
        <div className="bg-white p-8 rounded-3xl shadow-sm mb-6">
          <HardDrive size={64} className="text-slate-200" />
        </div>
        <h2 className="text-2xl font-serif font-bold text-legal-navy mb-4">Google Drive Not Connected</h2>
        <p className="text-slate-500 max-w-md mx-auto mb-8">
          Connect your Google account to access your legal documents, case files, and evidence directly from Achilles Chamber OS.
        </p>
        <div className="flex items-center gap-2 text-sm text-slate-400 italic">
          <AlertCircle size={16} />
          Use the sidebar to connect your Google account
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto h-full flex flex-col">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-serif text-2xl font-bold text-legal-navy">Document Vault</h2>
          <p className="text-sm text-slate-500">Securely managed via Google Drive</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 px-6 py-2.5 bg-legal-navy text-white rounded-2xl text-sm font-bold shadow-lg shadow-legal-navy/20 hover:bg-slate-800 transition-all cursor-pointer">
            {isUploading ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
            {isUploading ? 'Uploading...' : 'Upload Document'}
            <input type="file" className="hidden" onChange={handleFileUpload} disabled={isUploading} />
          </label>
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-100 p-4 rounded-2xl flex items-center gap-3 text-rose-700 text-sm">
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      <div className="flex items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Search documents..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-legal-navy/10 transition-all"
          />
        </div>
        <button 
          onClick={fetchFiles}
          disabled={isLoading}
          className="p-2 text-slate-400 hover:text-legal-navy transition-colors"
        >
          <Loader2 size={20} className={isLoading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {isLoading && files.length === 0 ? (
            Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-white p-6 rounded-2xl border border-slate-100 animate-pulse">
                <div className="w-12 h-12 bg-slate-100 rounded-xl mb-4" />
                <div className="h-4 bg-slate-100 rounded w-3/4 mb-2" />
                <div className="h-3 bg-slate-50 rounded w-1/2" />
              </div>
            ))
          ) : filteredFiles.length > 0 ? (
            filteredFiles.map((file) => (
              <motion.div 
                key={file.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-legal-navy/20 transition-all group relative"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 bg-slate-50 rounded-xl group-hover:bg-legal-navy/5 transition-colors">
                    {getFileIcon(file.mimeType)}
                  </div>
                  <div className="relative group/menu">
                    <button className="p-1.5 text-slate-400 hover:text-legal-navy transition-colors">
                      <MoreVertical size={18} />
                    </button>
                    <div className="absolute right-0 top-full mt-1 w-32 bg-white border border-slate-200 rounded-xl shadow-xl opacity-0 invisible group-hover/menu:opacity-100 group-hover/menu:visible transition-all z-50 py-1">
                      <button 
                        onClick={() => handleDeleteFile(file.id)}
                        className="w-full text-left px-3 py-1.5 text-[10px] font-bold text-rose-600 hover:bg-rose-50 flex items-center gap-2"
                      >
                        <Trash2 size={12} />
                        Delete File
                      </button>
                    </div>
                  </div>
                </div>
                <h3 className="text-sm font-bold text-slate-800 truncate mb-1" title={file.name}>
                  {file.name}
                </h3>
                <p className="text-[10px] text-slate-400 uppercase tracking-widest font-mono">
                  {file.mimeType.split('/').pop()?.replace('vnd.google-apps.', '')}
                </p>
                
                <div className="mt-6 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <a 
                    href={file.webViewLink} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-2 py-2 bg-slate-50 text-slate-600 rounded-xl text-[10px] font-bold hover:bg-legal-navy hover:text-white transition-all"
                  >
                    <ExternalLink size={12} /> Open
                  </a>
                  <button
                    onClick={() => analyzeFile(file)}
                    disabled={isAnalyzing === file.id}
                    className="flex-1 flex items-center justify-center gap-2 py-2 bg-legal-navy/5 text-legal-navy rounded-xl text-[10px] font-bold hover:bg-legal-navy hover:text-white transition-all disabled:opacity-50"
                  >
                    {isAnalyzing === file.id ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <FileCode size={12} />
                    )}
                    Analyze
                  </button>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="col-span-full py-20 text-center">
              <div className="bg-slate-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search size={32} className="text-slate-300" />
              </div>
              <h3 className="text-slate-800 font-bold">No documents found</h3>
              <p className="text-slate-500 text-sm">Try a different search term or upload a new file.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
