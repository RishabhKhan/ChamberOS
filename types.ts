export interface GoogleEvent {
  id: string;
  summary: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  description?: string;
  location?: string;
}

export interface GmailMessage {
  id: string;
  snippet: string;
  payload: {
    headers: { name: string; value: string }[];
  };
}

export interface GoogleDriveFile {
  id: string;
  name: string;
  mimeType: string;
  webViewLink: string;
}

// ── Helper: normalise API responses ─────────────────────────────────────────
// Returns { ok, data, unauthorized } so callers can react to 401 cleanly
async function apiFetch(url: string, options?: RequestInit): Promise<{ ok: boolean; data: any; unauthorized: boolean }> {
  try {
    const res = await fetch(url, options);
    const data = res.headers.get('content-type')?.includes('application/json')
      ? await res.json()
      : await res.text();
    return { ok: res.ok, data, unauthorized: res.status === 401 };
  } catch (err) {
    return { ok: false, data: null, unauthorized: false };
  }
}

// ── Auth ─────────────────────────────────────────────────────────────────────
export async function getGoogleAuthUrl(): Promise<string> {
  const { ok, data } = await apiFetch('/api/auth/google/url');
  if (!ok || data?.error) throw new Error(data?.error || 'Could not get auth URL');
  return data.url;
}

export async function getAuthStatus(): Promise<boolean> {
  const { ok, data } = await apiFetch('/api/auth/status');
  return ok && data?.connected === true;
}

export async function logoutGoogle(): Promise<void> {
  await apiFetch('/api/auth/logout', { method: 'POST' });
}

// ── Calendar ─────────────────────────────────────────────────────────────────
export async function getGoogleCalendarEvents(): Promise<{ events: GoogleEvent[]; unauthorized: boolean }> {
  const { ok, data, unauthorized } = await apiFetch('/api/google/calendar');
  if (unauthorized) return { events: [], unauthorized: true };
  if (!ok) return { events: [], unauthorized: false };
  return { events: Array.isArray(data) ? data : [], unauthorized: false };
}

export async function createGoogleCalendarEvent(event: {
  summary: string;
  description?: string;
  start: string;
  end: string;
  location?: string;
}): Promise<{ ok: boolean; unauthorized: boolean }> {
  const { ok, unauthorized } = await apiFetch('/api/google/calendar/event', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(event),
  });
  return { ok, unauthorized };
}

// ── Gmail ────────────────────────────────────────────────────────────────────
export async function getGmailMessages(): Promise<{ messages: GmailMessage[]; unauthorized: boolean }> {
  const { ok, data, unauthorized } = await apiFetch('/api/google/gmail');
  if (unauthorized) return { messages: [], unauthorized: true };
  if (!ok) return { messages: [], unauthorized: false };
  return { messages: Array.isArray(data) ? data : [], unauthorized: false };
}

export async function sendGmailMessage(to: string, subject: string, content: string): Promise<{ ok: boolean; unauthorized: boolean }> {
  const { ok, unauthorized } = await apiFetch('/api/google/gmail/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ to, subject, content }),
  });
  return { ok, unauthorized };
}

// ── Drive ─────────────────────────────────────────────────────────────────────
export async function getGoogleDriveFiles(): Promise<{ files: GoogleDriveFile[]; unauthorized: boolean }> {
  const { ok, data, unauthorized } = await apiFetch('/api/google/drive');
  if (unauthorized) return { files: [], unauthorized: true };
  if (!ok) return { files: [], unauthorized: false };
  return { files: Array.isArray(data) ? data : [], unauthorized: false };
}

export async function uploadToGoogleDrive(fileName: string, content: string): Promise<{ file: GoogleDriveFile | null; unauthorized: boolean }> {
  const { ok, data, unauthorized } = await apiFetch('/api/google/drive/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileName, content }),
  });
  return { file: ok ? data : null, unauthorized };
}

export async function getGoogleDriveFileContent(fileId: string): Promise<{ content: string; unauthorized: boolean }> {
  const { ok, data, unauthorized } = await apiFetch(`/api/google/drive/content/${fileId}`);
  if (unauthorized) return { content: '', unauthorized: true };
  if (!ok) return { content: '', unauthorized: false };
  return { content: typeof data === 'string' ? data : JSON.stringify(data), unauthorized: false };
}

export async function deleteGoogleDriveFile(fileId: string): Promise<{ ok: boolean; unauthorized: boolean }> {
  const { ok, unauthorized } = await apiFetch(`/api/google/drive/${fileId}`, { method: 'DELETE' });
  return { ok, unauthorized };
}
export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  fileCode: string; // The "File Code" or Case Reference
  address?: string;
  status: 'active' | 'inactive';
}

export interface Email {
  id: string;
  subject: string;
  sender: string;
  recipient: string;
  content: string;
  timestamp: number;
  isRead: boolean;
  type: 'inbox' | 'sent';
}

export interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  client?: string;
}

export interface Invoice {
  id: string;
  clientName: string;
  amount: number;
  status: 'paid' | 'pending' | 'overdue';
  dueDate: string;
  issueDate: string;
}

export interface Appointment {
  id: string;
  title: string;
  date: string;
  time: string;
  client: string;
  type: 'consultation' | 'hearing' | 'meeting';
  location?: string;
}

export interface DocumentAnalysis {
  id: string;
  fileName: string;
  fileSize: string;
  uploadDate: string;
  summary: string;
  keyPoints: string[];
  risks: string[];
  recommendations: string[];
  status: 'processing' | 'completed' | 'failed';
}

export interface Case {
  id: string;
  caseNumber: string;
  courtName: string;
  caseType?: string;
  clientName: string;
  petitioner: string;
  respondent: string;
  nextDate?: string;
  lastOrder?: string;
  status?: string;
  lastUpdated?: number;
}

