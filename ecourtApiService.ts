import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from './firebase-applet-config.json';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const googleProvider = new GoogleAuthProvider();

// Operation Types for Error Handling
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

// Error Handling Interface
export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

// Global Error Handler for Firestore Permissions
export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Connection Test
async function testConnection() {
  try {
    const snap = await getDocFromServer(doc(db, 'test', 'connection'));
    console.log("Firestore connection test successful. Document exists:", snap.exists());
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('the client is offline')) {
        console.error("Firestore Error: The client is offline. Please check your network or Firebase configuration.");
      } else if (error.message.includes('permission-denied')) {
        console.error("Firestore Error: Permission denied for connection test. Check your security rules.");
      } else {
        console.error("Firestore connection test failed:", error.message);
      }
    }
  }
}

testConnection();

export { signInWithPopup, signOut, onAuthStateChanged };
export type { FirebaseUser };

// eCourts API Types
export interface CaseDetail {
  cnrNumber?: string;
  caseType?: string;
  filingNumber?: string;
  filingDate?: string;
  registrationNumber?: string;
  registrationDate?: string;
  firstHearingDate?: string;
  nextHearingDate?: string;
  caseStatus?: string;
  stage?: string;
  petitionerName?: string;
  respondentName?: string;
  petitionerAdvocate?: string;
  respondentAdvocate?: string;
  court?: string;
  bench?: string;
  judge?: string;
  acts?: string;
  history?: { date: string; purpose: string; judge?: string }[];
  orders?: { date: string; orderNumber?: string }[];
  [key: string]: unknown;
}

export interface SearchResult {
  cnrNumber?: string;
  caseType?: string;
  filingNumber?: string;
  registrationNumber?: string;
  petitionerName?: string;
  respondentName?: string;
  nextHearingDate?: string;
  stage?: string;
  court?: string;
  [key: string]: unknown;
}

async function ecourtPost(endpoint: string, body: object): Promise<{ data?: any; error?: string }> {
  try {
    const res = await fetch(`/api/ecourts/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!res.ok) return { error: json.error || 'Request failed' };
    return { data: json };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Network error' };
  }
}

export const HighCourt = {
  getByCNR: (cnr: string) => ecourtPost('high-court/case', { cnr }),
  searchParty: (partyName: string, stage: string, year: string, benchId?: string) =>
    ecourtPost('high-court/search/party', { partyName, stage, year, benchId }),
  searchAdvocate: (advocateName: string, stage: string, benchId?: string) =>
    ecourtPost('high-court/search/advocate', { advocateName, stage, benchId }),
  searchFiling: (filingNumber: string, filingYear: string, benchId?: string) =>
    ecourtPost('high-court/search/filing', { filingNumber, filingYear, benchId }),
};

export const DistrictCourt = {
  getByCNR: (cnr: string) => ecourtPost('district-court/case', { cnr }),
  searchParty: (partyName: string, stage: string, year: string, benchId?: string) =>
    ecourtPost('district-court/search/party', { partyName, stage, year, benchId }),
  searchAdvocate: (advocateName: string, stage: string, benchId?: string) =>
    ecourtPost('district-court/search/advocate', { advocateName, stage, benchId }),
};

export const SupremeCourt = {
  getByDiaryNumber: (diaryNumber: string, year: string) =>
    ecourtPost('supreme-court/case', { diaryNumber, year }),
  searchParty: (partyName: string, stage: string, bench: string, year: string) =>
    ecourtPost('supreme-court/search/party', { partyName, stage, bench, year }),
};

export async function checkApiKeyConfigured(): Promise<boolean> {
  try {
    const res = await fetch('/api/ecourts/status');
    const json = await res.json();
    return !!json.configured;
  } catch {
    return false;
  }
}
