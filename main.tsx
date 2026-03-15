// ── eCourts India API v17 Service ────────────────────────────────────────────
// Wraps the server-side proxy routes for the real eCourts API

export interface CaseDetail {
  cnr?: string;
  caseNumber?: string;
  caseType?: string;
  filingNumber?: string;
  filingDate?: string;
  registrationNumber?: string;
  registrationDate?: string;
  firstHearingDate?: string;
  nextHearingDate?: string;
  decisionDate?: string;
  caseStatus?: string;
  stage?: string;
  courtName?: string;
  judgeName?: string;
  petitioner?: string;
  respondent?: string;
  petitionerAdvocate?: string;
  respondentAdvocate?: string;
  acts?: { act?: string; section?: string }[];
  caseHistory?: { date?: string; purpose?: string; judge?: string }[];
  orders?: { date?: string; orderNumber?: string; description?: string }[];
  [key: string]: any;
}

export interface SearchResult {
  cnr?: string;
  caseNumber?: string;
  caseType?: string;
  petitioner?: string;
  respondent?: string;
  filingDate?: string;
  nextDate?: string;
  status?: string;
  courtName?: string;
  [key: string]: any;
}

export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  missingKey: boolean;
}

async function post<T>(endpoint: string, body: object): Promise<ApiResponse<T>> {
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!res.ok) {
      return { data: null, error: json.error || 'Request failed', missingKey: json.missingKey || false };
    }
    return { data: json, error: null, missingKey: false };
  } catch (err: any) {
    return { data: null, error: err.message || 'Network error', missingKey: false };
  }
}

export async function checkApiKeyConfigured(): Promise<boolean> {
  try {
    const res = await fetch('/api/ecourts/status');
    const data = await res.json();
    return data.configured === true;
  } catch { return false; }
}

// ── High Court ────────────────────────────────────────────────────────────────
export const HighCourt = {
  /** Look up case by CNR (e.g. WBHC...) */
  getByCNR: (cnr: string) =>
    post<CaseDetail>('/api/ecourts/high-court/case', { cnr }),

  /** Search by party name. benchId is optional — leave blank if unknown. */
  searchParty: (name: string, stage: 'PENDING' | 'DISPOSED' | 'BOTH', year: string, benchId?: string) =>
    post<SearchResult[]>('/api/ecourts/high-court/search/party',
      benchId ? { name, stage, year, benchId } : { name, stage, year }),

  /** Search by advocate name */
  searchAdvocate: (name: string, stage: 'PENDING' | 'DISPOSED' | 'BOTH', benchId?: string) =>
    post<SearchResult[]>('/api/ecourts/high-court/search/advocate',
      benchId ? { name, stage, benchId } : { name, stage }),

  /** Search by filing number */
  searchFiling: (filingNumber: string, filingYear: string, benchId?: string) =>
    post<SearchResult[]>('/api/ecourts/high-court/search/filing',
      benchId ? { filingNumber, filingYear, benchId } : { filingNumber, filingYear }),
};

// ── District Court ────────────────────────────────────────────────────────────
export const DistrictCourt = {
  getByCNR: (cnr: string) =>
    post<CaseDetail>('/api/ecourts/district-court/case', { cnr }),

  searchParty: (name: string, stage: 'PENDING' | 'DISPOSED' | 'BOTH', year: string, complexId?: string) =>
    post<SearchResult[]>('/api/ecourts/district-court/search/party',
      complexId ? { name, stage, year, complexId } : { name, stage, year }),

  searchAdvocate: (name: string, stage: 'PENDING' | 'DISPOSED' | 'BOTH', complexId?: string) =>
    post<SearchResult[]>('/api/ecourts/district-court/search/advocate',
      complexId ? { name, stage, complexId } : { name, stage }),

  getCauseList: (date: string, type: 'CIVIL' | 'CRIMINAL' | 'ALL', courtId: string) =>
    post('/api/ecourts/district-court/cause-list', { date, type, courtId }),
};

// ── Supreme Court ─────────────────────────────────────────────────────────────
export const SupremeCourt = {
  getByDiaryNumber: (diaryNumber: string, year: string) =>
    post<CaseDetail>('/api/ecourts/supreme-court/case', { diaryNumber, year }),

  searchParty: (name: string, stage: 'PENDING' | 'DISPOSED', type: 'PETITIONER' | 'RESPONDENT' | 'ANY', year: string) =>
    post<SearchResult[]>('/api/ecourts/supreme-court/search/party', { name, stage, type, year }),

  getOrdersOnDate: (date: string) =>
    post('/api/ecourts/supreme-court/orders', { date }),
};
