import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { google } from 'googleapis';
import cookieSession from 'cookie-session';
import dotenv from 'dotenv';
import Anthropic from '@anthropic-ai/sdk';

dotenv.config();

const app = express();
const PORT = 3000;

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

app.set('trust proxy', 1); // Required for secure cookies behind a proxy

app.use(express.json());
app.use(cookieSession({
  name: 'session',
  keys: [process.env.SESSION_SECRET || 'legal-chamber-secret'],
  maxAge: 24 * 60 * 60 * 1000, // 24 hours
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
}));

const getRedirectUri = (req: express.Request) => {
  const protocol = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  
  // Use APP_URL if provided, otherwise construct from headers
  const baseUrl = (process.env.APP_URL || `${protocol}://${host}`).replace(/\/$/, '');
  return `${baseUrl}/auth/google/callback`;
};

const getOAuth2Client = (req: express.Request) => {
  const redirectUri = getRedirectUri(req);

  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    redirectUri
  );
};

const SCOPES = [
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/drive.file'
];

// Auth Routes
app.get('/api/auth/debug', (req, res) => {
  res.json({
    expectedRedirectUri: getRedirectUri(req),
    hasClientId: !!process.env.GOOGLE_CLIENT_ID,
    hasClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
    hasAppUrl: !!process.env.APP_URL,
    appUrl: process.env.APP_URL,
    headers: {
      host: req.headers.host,
      forwardedHost: req.headers['x-forwarded-host'],
      forwardedProto: req.headers['x-forwarded-proto']
    }
  });
});

app.get('/api/auth/google/url', (req, res) => {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return res.status(500).json({ 
      error: 'Google Client ID or Secret is missing in environment variables.' 
    });
  }

  const client = getOAuth2Client(req);
  const url = client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent'
  });
  res.json({ url });
});

app.get('/auth/google/callback', async (req, res) => {
  const { code, error } = req.query;

  if (error) {
    return res.status(400).send(`Authentication failed from Google: ${error}`);
  }

  try {
    const client = getOAuth2Client(req);
    const { tokens } = await client.getToken(code as string);
    req.session!.tokens = tokens;

    // Override COOP header so window.opener works across origins
    res.setHeader('Cross-Origin-Opener-Policy', 'unsafe-none');
    res.setHeader('Cross-Origin-Embedder-Policy', 'unsafe-none');

    res.send(`
      <html>
        <head><title>Connected</title></head>
        <body style="font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#f8fafc;">
          <div style="text-align:center;padding:2rem;">
            <div style="font-size:2rem;margin-bottom:1rem;">✅</div>
            <h2 style="color:#1e293b;margin:0 0 0.5rem">Google Connected!</h2>
            <p style="color:#64748b;margin:0">This window will close automatically...</p>
          </div>
          <script>
            // Try postMessage to opener
            function notifyAndClose() {
              try {
                if (window.opener && !window.opener.closed) {
                  window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS' }, '*');
                }
              } catch(e) {}
              setTimeout(() => window.close(), 1000);
            }
            // Run immediately and also after a short delay (for slow openers)
            notifyAndClose();
            setTimeout(notifyAndClose, 500);
          </script>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('Error getting tokens:', error);
    res.status(500).send('Authentication failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
  }
});

app.get('/api/auth/status', (req, res) => {
  res.json({ connected: !!req.session?.tokens });
});

app.post('/api/auth/logout', (req, res) => {
  req.session = null;
  res.json({ success: true });
});

// ── Token refresh helper ────────────────────────────────────────────────────
async function getAuthenticatedClient(req: express.Request, res: express.Response) {
  if (!req.session?.tokens) {
    res.status(401).json({ error: 'Not connected' });
    return null;
  }
  const client = getOAuth2Client(req);
  client.setCredentials(req.session.tokens);

  // Auto-refresh if token is expired or expiring in next 5 minutes
  const expiry = req.session.tokens.expiry_date;
  const needsRefresh = expiry && expiry < Date.now() + 5 * 60 * 1000;
  if (needsRefresh && req.session.tokens.refresh_token) {
    try {
      const { credentials } = await client.refreshAccessToken();
      req.session.tokens = credentials;
      client.setCredentials(credentials);
    } catch (err) {
      console.error('Token refresh failed:', err);
      req.session = null;
      res.status(401).json({ error: 'Session expired. Please reconnect Google.' });
      return null;
    }
  }
  return client;
}

// Google Calendar API
app.get('/api/google/calendar', async (req, res) => {
  const client = await getAuthenticatedClient(req, res);
  if (!client) return;
  try {
    const calendar = google.calendar({ version: 'v3', auth: client });
    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: new Date().toISOString(),
      maxResults: 10,
      singleEvents: true,
      orderBy: 'startTime',
    });
    res.json(response.data.items || []);
  } catch (error) {
    console.error('Calendar error:', error);
    res.status(500).json({ error: 'Failed to fetch calendar' });
  }
});

app.post('/api/google/calendar/event', async (req, res) => {
  const client = await getAuthenticatedClient(req, res);
  if (!client) return;
  const { summary, description, start, end, location } = req.body;
  try {
    const calendar = google.calendar({ version: 'v3', auth: client });
    const response = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: {
        summary, description, location,
        start: { dateTime: start },
        end: { dateTime: end },
      },
    });
    res.json(response.data);
  } catch (error) {
    console.error('Calendar create error:', error);
    res.status(500).json({ error: 'Failed to create calendar event' });
  }
});

// Gmail API
app.get('/api/google/gmail', async (req, res) => {
  const client = await getAuthenticatedClient(req, res);
  if (!client) return;
  try {
    const gmail = google.gmail({ version: 'v1', auth: client });
    const response = await gmail.users.messages.list({ userId: 'me', maxResults: 10 });
    const messages = await Promise.all(
      (response.data.messages || []).map(async (msg) => {
        const detail = await gmail.users.messages.get({ userId: 'me', id: msg.id! });
        return detail.data;
      })
    );
    res.json(messages);
  } catch (error) {
    console.error('Gmail error:', error);
    res.status(500).json({ error: 'Failed to fetch emails' });
  }
});

app.post('/api/google/gmail/send', async (req, res) => {
  const client = await getAuthenticatedClient(req, res);
  if (!client) return;
  const { to, subject, content } = req.body;
  try {
    const gmail = google.gmail({ version: 'v1', auth: client });
    const utf8Subject = `=?utf-8?B?${Buffer.from(subject).toString('base64')}?=`;
    const messageParts = [
      `To: ${to}`,
      'Content-Type: text/plain; charset=utf-8',
      'MIME-Version: 1.0',
      `Subject: ${utf8Subject}`,
      '',
      content,
    ];
    const encodedMessage = Buffer.from(messageParts.join('\n'))
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    await gmail.users.messages.send({ userId: 'me', requestBody: { raw: encodedMessage } });
    res.json({ success: true });
  } catch (error) {
    console.error('Gmail send error:', error);
    res.status(500).json({ error: 'Failed to send email' });
  }
});

// Google Drive API
app.get('/api/google/drive', async (req, res) => {
  const client = await getAuthenticatedClient(req, res);
  if (!client) return;
  try {
    const drive = google.drive({ version: 'v3', auth: client });
    const response = await drive.files.list({
      pageSize: 20,
      fields: 'files(id, name, mimeType, webViewLink)',
      q: "mimeType != 'application/vnd.google-apps.folder' and trashed = false",
    });
    res.json(response.data.files || []);
  } catch (error) {
    console.error('Drive error:', error);
    res.status(500).json({ error: 'Failed to fetch drive files' });
  }
});

app.post('/api/google/drive/upload', async (req, res) => {
  const client = await getAuthenticatedClient(req, res);
  if (!client) return;
  const { fileName, content } = req.body;
  try {
    const drive = google.drive({ version: 'v3', auth: client });
    const response = await drive.files.create({
      requestBody: { name: fileName, mimeType: 'text/plain' },
      media: { mimeType: 'text/plain', body: content },
      fields: 'id, name, mimeType, webViewLink',
    });
    res.json(response.data);
  } catch (error) {
    console.error('Drive upload error:', error);
    res.status(500).json({ error: 'Failed to upload to drive' });
  }
});

app.get('/api/google/drive/content/:fileId', async (req, res) => {
  const client = await getAuthenticatedClient(req, res);
  if (!client) return;
  const { fileId } = req.params;
  try {
    const drive = google.drive({ version: 'v3', auth: client });
    const response = await drive.files.get({ fileId, alt: 'media' }, { responseType: 'text' });
    res.send(response.data);
  } catch (error) {
    console.error('Drive content error:', error);
    res.status(500).json({ error: 'Failed to fetch file content' });
  }
});

app.delete('/api/google/drive/:fileId', async (req, res) => {
  const client = await getAuthenticatedClient(req, res);
  if (!client) return;
  const { fileId } = req.params;
  try {
    const drive = google.drive({ version: 'v3', auth: client });
    await drive.files.delete({ fileId });
    res.json({ success: true });
  } catch (error) {
    console.error('Drive delete error:', error);
    res.status(500).json({ error: 'Failed to delete file from drive' });
  }
});

// Anthropic (Claude) API
app.post('/api/anthropic/chat', async (req, res) => {
  const { messages, systemInstruction } = req.body;

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'Anthropic API key is missing.' });
  }

  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4096,
      system: systemInstruction,
      messages: messages.map((m: any) => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content,
      })),
    });

    const content = response.content[0];
    if (content.type === 'text') {
      res.json({ text: content.text });
    } else {
      res.json({ text: 'I apologize, but I received an unexpected response format.' });
    }
  } catch (error) {
    console.error('Anthropic error:', error);
    res.status(500).json({ error: 'Failed to communicate with Claude.' });
  }
});


// ─── Calcutta HC Cause List Scraper ──────────────────────────────────────────
app.get('/api/causelist', async (req, res) => {
  const today = new Date();
  const dd = String(today.getDate()).padStart(2, '0');
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const yyyy = today.getFullYear();

  const URLS_TO_TRY = [
    "https://calcuttahighcourt.gov.in/Causelist/today",
    "https://calcuttahighcourt.gov.in/Causelist",
    "https://calcuttahighcourt.gov.in/",
  ];

  const headers: Record<string, string> = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-IN,en;q=0.9",
    "Referer": "https://calcuttahighcourt.gov.in/",
  };

  interface CauseListEntry {
    title: string;
    link: string | null;
    type: string;
  }

  function parseHtml(html: string): CauseListEntry[] {
    const results: CauseListEntry[] = [];
    const seen = new Set<string>();

    const patterns = [
      /<a[^>]+href=["']([^"']*(?:causelist|cause_list|cause-list|CauseList|daily|bench|division|single|original|appellate)[^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi,
      /<a[^>]+href=["']([^"']*\.pdf[^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi,
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(html)) !== null) {
        let href = match[1].trim();
        const rawText = match[2].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
        if (!rawText || rawText.length < 3 || seen.has(rawText.toLowerCase())) continue;

        const lower = rawText.toLowerCase();
        const hrefLower = href.toLowerCase();

        const isRelevant =
          hrefLower.includes("cause") || lower.includes("cause") ||
          lower.includes("bench") || lower.includes("appellate") ||
          lower.includes("original") || lower.includes("today") ||
          rawText.match(/\d{2}[.\-\/]\d{2}[.\-\/]\d{4}/) != null;

        if (pattern.source.includes("pdf") && !isRelevant) continue;

        seen.add(rawText.toLowerCase());
        if (href.startsWith("/")) href = "https://calcuttahighcourt.gov.in" + href;
        else if (!href.startsWith("http")) href = "https://calcuttahighcourt.gov.in/" + href;

        const type = lower.includes("original") ? "Original Side"
          : lower.includes("division") ? "Division Bench"
          : lower.includes("single") ? "Single Bench"
          : lower.includes("appellate") ? "Appellate Side"
          : lower.includes("special") ? "Special Bench"
          : "Cause List";

        results.push({ title: rawText, link: href, type });
      }
    }
    return results;
  }

  for (const url of URLS_TO_TRY) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const response = await fetch(url, { headers, signal: controller.signal });
      clearTimeout(timeout);

      if (!response.ok) continue;
      const html = await response.text();
      if (!html || html.length < 500) continue;

      const entries = parseHtml(html);
      const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
      const pageTitle = titleMatch ? titleMatch[1].replace(/\s+/g, " ").trim() : "";

      return res.json({
        success: true,
        date: `${dd}-${mm}-${yyyy}`,
        sourceUrl: url,
        pageTitle,
        entries,
        totalFound: entries.length,
      });
    } catch (err) {
      console.error(`Cause list fetch failed for ${url}:`, err);
      continue;
    }
  }

  return res.json({
    success: false,
    date: `${dd}-${mm}-${yyyy}`,
    sourceUrl: URLS_TO_TRY[0],
    entries: [],
    totalFound: 0,
    error: "Could not reach Calcutta High Court website. It may be down or blocking automated access.",
  });
});

// ─── eCourts India API v17.0 Proxy ───────────────────────────────────────────
// ── eCourts India API v17 Proxy ───────────────────────────────────────────────
const ECOURTS_BASE = 'https://apis.akshit.net/eciapi/17';

async function ecourtsFetch(path: string, body: object, res: express.Response) {
  const apiKey = process.env.ECOURTS_API_KEY;
  if (!apiKey) {
    return res.status(400).json({
      error: 'ECOURTS_API_KEY is not configured. Please add it to your environment variables.',
      missingKey: true
    });
  }
  try {
    const response = await fetch(`${ECOURTS_BASE}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'x-api-key': apiKey,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10000),
    });
    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json({ error: data.message || data.error || 'eCourts API error', details: data });
    }
    return res.json(data);
  } catch (err: any) {
    console.error(`eCourts API error [${path}]:`, err);
    return res.status(500).json({ error: err.message || 'Failed to reach eCourts API' });
  }
}

// High Court endpoints
app.post('/api/ecourts/high-court/case', (req, res) => ecourtsFetch('/high-court/case', req.body, res));
app.post('/api/ecourts/high-court/search/party', (req, res) => ecourtsFetch('/high-court/search/party', req.body, res));
app.post('/api/ecourts/high-court/search/advocate', (req, res) => ecourtsFetch('/high-court/search/advocate-name', req.body, res));
app.post('/api/ecourts/high-court/search/filing', (req, res) => ecourtsFetch('/high-court/search/filing-number', req.body, res));

// District Court endpoints
app.post('/api/ecourts/district-court/case', (req, res) => ecourtsFetch('/district-court/case', req.body, res));
app.post('/api/ecourts/district-court/search/party', (req, res) => ecourtsFetch('/district-court/search/party', req.body, res));
app.post('/api/ecourts/district-court/search/advocate', (req, res) => ecourtsFetch('/district-court/search/advocate-name', req.body, res));
app.post('/api/ecourts/district-court/cause-list', (req, res) => ecourtsFetch('/district-court/cause-list', req.body, res));

// Supreme Court endpoints
app.post('/api/ecourts/supreme-court/case', (req, res) => ecourtsFetch('/supreme-court/case', req.body, res));
app.post('/api/ecourts/supreme-court/search/party', (req, res) => ecourtsFetch('/supreme-court/search-party', req.body, res));
app.post('/api/ecourts/supreme-court/orders', (req, res) => ecourtsFetch('/supreme-court/orders-on-date', req.body, res));

// API key status check
app.get('/api/ecourts/status', (req, res) => {
  res.json({ configured: !!process.env.ECOURTS_API_KEY });
});

// Keep-alive ping — prevents Railway cold starts
app.get('/ping', (req, res) => res.json({ status: 'ok', time: Date.now() }));

// Vite middleware for development
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
