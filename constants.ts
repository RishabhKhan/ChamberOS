import { GoogleGenAI, Type } from "@google/genai";
import { getCache, setCache } from "../utils/cache";

// Read API key lazily inside each function — not at module load time
// This ensures Vite has already injected the value before it is read
function getAI() {
  const key = process.env.GEMINI_API_KEY || '';
  if (!key) throw new Error('GEMINI_API_KEY is not set. Please add it to your .env.local file.');
  return new GoogleGenAI({ apiKey: key });
}

export interface ECourtStatus {
  nextDate?: string;
  lastOrder?: string;
  status?: string;
}

export interface ListedCase {
  caseNumber: string;
  courtName: string;
  petitioner: string;
  respondent: string;
  bench?: string;
  itemNumber?: string;
}

export async function fetchCaseStatus(caseNumber: string, courtName: string): Promise<ECourtStatus> {
  const cacheKey = `case_status_${caseNumber}_${courtName}`;
  const cached = getCache<ECourtStatus>(cacheKey);
  if (cached) return cached;

  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: `Find the latest status, next hearing date, and last order summary for case number "${caseNumber}" in "${courtName}". 
      Use the following official eCourts services for Calcutta High Court as primary sources:
      1. https://hcservices.ecourts.gov.in/ecourtindiaHC/index_highcourt.php?state_cd=16&dist_cd=1&stateNm=Calcutta
      2. https://hcservices.ecourts.gov.in/ecourtindiaHC/index_highcourt.php?state_cd=16&dist_cd=1&court_code=3&stateNm=Calcutta`,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            nextDate: { type: Type.STRING, description: "Next hearing date in YYYY-MM-DD format" },
            lastOrder: { type: Type.STRING, description: "Brief summary of the last order" },
            status: { type: Type.STRING, description: "Current status of the case" }
          }
        }
      }
    });

    const result = JSON.parse(response.text || '{}');
    const status = {
      nextDate: result.nextDate,
      lastOrder: result.lastOrder,
      status: result.status
    };
    
    setCache(cacheKey, status, 1440); // Cache for 24 hours
    return status;
  } catch (error) {
    console.error("Error fetching case status:", error);
    return {};
  }
}

export async function detectTodayListedCases(advocateNames: string[], courtName: string = "Calcutta High Court"): Promise<ListedCase[]> {
  const cacheKey = `listed_cases_${advocateNames.join('_')}_${courtName}_${new Date().toISOString().split('T')[0]}`;
  const cached = getCache<ListedCase[]>(cacheKey);
  if (cached) return cached;

  try {
    const ai = getAI();
    const namesStr = advocateNames.join(", ");
    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: `Search the today's cause list of ${courtName} for cases listed under the advocate names: ${namesStr}.`,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              caseNumber: { type: Type.STRING },
              courtName: { type: Type.STRING },
              petitioner: { type: Type.STRING },
              respondent: { type: Type.STRING },
              bench: { type: Type.STRING },
              itemNumber: { type: Type.STRING }
            },
            required: ["caseNumber", "courtName", "petitioner", "respondent"]
          }
        }
      }
    });

    const cases = JSON.parse(response.text || '[]');
    
    setCache(cacheKey, cases, 60); // Cache for 1 hour
    return cases;
  } catch (error) {
    console.error("Error detecting listed cases:", error);
    return [];
  }
}
