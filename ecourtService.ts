export interface ListedCase {
  caseNumber: string;
  cnrNumber?: string;
  caseType?: string;
  petitionerName?: string;
  respondentName?: string;
  nextDate?: string;
  stage?: string;
  court?: string;
  bench?: string;
}

export async function fetchCaseStatus(
  caseNumber: string,
  courtName: string
): Promise<{ nextDate?: string; lastOrder?: string; status?: string }> {
  try {
    const res = await fetch('/api/ecourts/high-court/case', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cnr: caseNumber, court: courtName }),
    });
    if (!res.ok) return {};
    const data = await res.json();
    return {
      nextDate: data.nextHearingDate,
      lastOrder: data.lastOrderDate,
      status: data.caseStatus,
    };
  } catch {
    return {};
  }
}

export async function detectTodayListedCases(
  advocateNames: string[],
  courtCode: string
): Promise<ListedCase[]> {
  if (!advocateNames.length) return [];
  try {
    const res = await fetch('/api/ecourts/district-court/cause-list', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ advocateNames, courtCode }),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : (data.cases || []);
  } catch {
    return [];
  }
}
