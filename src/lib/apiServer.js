import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';
import dotenv from 'dotenv';

dotenv.config();

let aiInstance = null;

function getAi() {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) return null;
  if (!aiInstance) {
    aiInstance = genkit({ plugins: [googleAI({ apiKey })] });
  }
  return aiInstance;
}

const MODEL = 'googleai/gemini-2.5-flash';

// ─── Shared helpers ────────────────────────────────────────────────────────────

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => (body += chunk.toString()));
    req.on('end', () => {
      try { resolve(JSON.parse(body || '{}')); }
      catch { reject(new Error('Invalid JSON')); }
    });
    req.on('error', reject);
  });
}

function jsonRes(res, statusCode, data) {
  res.setHeader('Content-Type', 'application/json');
  res.statusCode = statusCode;
  res.end(JSON.stringify(data));
}

// ─── /api/forensics  (existing — title forensics) ──────────────────────────────
async function handleForensics(req, res) {
  const data = await parseBody(req);
  const ai = getAi();

  if (!ai) {
    return setTimeout(() => jsonRes(res, 200, {
      isDemo: true,
      titleStatus: { status: 'Verification Pending (DEMO MODE)', explanation: 'GEMINI_API_KEY not set. Live analysis offline.' },
      trustScore: data.trust || 75,
      risks: {
        demolition: { level: data.demolitionFlag === 'flag' ? 'flag' : 'none', analysis: data.demolitionFlag === 'flag' ? 'Road-corridor setback encroachment flagged by AGIS masterplan.' : 'No active demolition flags.' },
        flood: { level: data.floodFlag === 'flag' ? 'flag' : 'none', analysis: data.floodFlag === 'flag' ? 'Seasonal floodwatch area detected.' : 'No flood exposure flagged.' },
        ownership: { level: data.titleGrade === 'C' ? 'watch' : 'none', analysis: data.titleGrade === 'C' ? 'Area Council title in regularization.' : 'Ownership history clear.' },
      },
      mitigationPlan: [
        '⚠️ Add GEMINI_API_KEY to .env to activate live Gemini analysis.',
        'Verify GPS pins against AGIS layout masterplan before signing.',
        'Obtain certified true copy (CTC) of C of O from AGIS.',
        'Execute a Deed of Indemnity covering set-back clearances.',
      ],
      pidginSummary: 'Oga, this na DEMO report! Set your GEMINI_API_KEY to get live analysis.',
    }), 1500);
  }

  const prompt = `
You are the Legal & Title Forensics Analyzer for "The Landlord Property" in Abuja, Nigeria.
Analyze the property metadata and return a Title Forensic & Risk Vulnerability Report as valid JSON ONLY.

Property: "${data.title}" | District: "${data.district}" | Title: "${data.titleType || 'Unknown'}" | Grade: "${data.titleGrade || 'N/A'}"
AGIS Notes: "${data.agisNotes || 'N/A'}" | Inspected: ${data.inspected ? 'Yes' : 'No'} | Demo Risk: "${data.demolitionFlag || 'none'}" | Flood Risk: "${data.floodFlag || 'none'}"

Return exactly this JSON structure:
{
  "titleStatus": { "status": "string", "explanation": "string" },
  "trustScore": number,
  "risks": {
    "demolition": { "level": "none|watch|flag", "analysis": "string" },
    "flood":      { "level": "none|watch|flag", "analysis": "string" },
    "ownership":  { "level": "none|watch|flag", "analysis": "string" }
  },
  "mitigationPlan": ["string","string","string","string"],
  "pidginSummary": "string"
}
Be specific to Abuja districts (Jabi, Guzape, Lugbe, Wuse, Katampe, Kubwa) and realistic Nigerian real estate law.
`;

  const response = await ai.generate({ model: MODEL, prompt, config: { responseMimeType: 'application/json' } });
  res.setHeader('Content-Type', 'application/json');
  res.end(response.text);
}

// ─── /api/chat  (live Gemini-powered concierge) ────────────────────────────────
async function handleChat(req, res) {
  const data = await parseBody(req);
  const { message = '', history = [], context = '' } = data;
  const ai = getAi();

  if (!ai) {
    const fallbacks = {
      jabi: "I get 2 verified options for Jabi 👌 — a 3-bed at ₦95m (Trust 92, C of O, −21% vs market). You wan make I book inspection for Saturday?",
      shortlet: "For shortlet management: typical Guzape 2-bed nets ₦1.9m/month at 74% occupancy. Send your location and the AI will project your earnings.",
      escrow: "Payments sit in escrow with our licensed partner bank and only release when AGIS search is clean, documents executed, and you take possession. 🔒",
      wifi: "📶 WiFi: SSID: Guzape_Hillview_5G | Key: guestpass2026",
      generator: "⚡ If utility fails, the estate auto-generator switches on in 6 seconds.",
    };
    const q = message.toLowerCase();
    const reply = Object.entries(fallbacks).find(([k]) => q.includes(k))?.[1]
      || "You fit ask me anything — search deals, check title, book inspection, or project shortlet earnings. 🙂";
    return jsonRes(res, 200, { reply });
  }

  const systemPrompt = `You are "Landlord AI", a friendly Nigerian real estate concierge for The Landlord Property platform in Abuja.
You help buyers, sellers, and shortlet guests in English or Pidgin — whichever they write in.
You specialise in: distress deals, title forensics, AGIS searches, shortlet revenue projection, escrow process, and Abuja districts (Jabi, Guzape, Maitama, Wuse, Lugbe, Katampe, Gwarinpa).
Keep answers concise, warm, and actionable. Use ₦ for Naira. Never fabricate specific property details.
${context ? `\nCurrent context: ${context}` : ''}`;

  const geminiHistory = history.slice(-8).map(h => ({
    role: h.role === 'user' ? 'user' : 'model',
    parts: [{ text: h.text }],
  }));

  const response = await ai.generate({
    model: MODEL,
    system: systemPrompt,
    history: geminiHistory,
    prompt: message,
  });

  jsonRes(res, 200, { reply: response.text });
}

// ─── /api/describe  (AI listing description generator) ─────────────────────────
async function handleDescribe(req, res) {
  const data = await parseBody(req);
  const ai = getAi();

  if (!ai) {
    const fallback = `${data.type || 'Property'} in ${data.district || 'Abuja'} — ${data.asking ? `Asking ₦${Number(data.asking).toLocaleString()}` : ''} (${data.discount || ''}% below market). ${data.title ? `Title: ${data.title}.` : ''} ${data.urgency || 'Motivated seller.'} Verified by ${data.verifiedBy || 'The Landlord Property legal team'}.`;
    return jsonRes(res, 200, { description: fallback, isDemo: true });
  }

  const prompt = `Write a compelling, professional buyer-facing property listing description for The Landlord Property platform in Abuja, Nigeria.

Property details:
- Name/Address: ${data.name || 'Unnamed property'}
- Type: ${data.type || 'Residential'}
- District: ${data.district || 'Abuja'}
- Asking Price: ₦${Number(data.asking || 0).toLocaleString()}
- AI Market Value: ₦${Number(data.market || 0).toLocaleString()}
- Discount vs Market: ${data.discount || 0}%
- Title Type: ${data.title || 'C of O'}
- Title Grade: ${data.titleGrade || 'A'}
- AGIS Status: ${data.agis || 'Search completed — clean'}
- Field Inspected: ${data.inspected ? 'Yes' : 'No'}
- Urgency Note: ${data.urgency || 'None provided'}
- Verified By: ${data.verifiedBy || 'The Landlord Property'}
- Demolition Risk: ${data.demolition || 'none'}
- Flood Risk: ${data.flood || 'none'}
- Shortlet Potential: ${data.shortlet_nightly ? `₦${Number(data.shortlet_nightly).toLocaleString()}/night, ~${Math.round((data.shortlet_occ || 0.7) * 100)}% occupancy` : 'N/A'}

Write 3–4 punchy sentences. Lead with the opportunity angle (distress discount, investment yield, or location premium). Mention the title grade and AGIS status to build confidence. End with a call-to-action. Output plain text only — no markdown, no bullet points.`;

  const response = await ai.generate({ model: MODEL, prompt });
  jsonRes(res, 200, { description: response.text.trim() });
}

// ─── /api/pricing  (AI shortlet dynamic pricing) ───────────────────────────────
async function handlePricing(req, res) {
  const data = await parseBody(req);
  const ai = getAi();

  if (!ai) {
    const base = data.baseRate || 120000;
    return jsonRes(res, 200, {
      isDemo: true,
      recommendations: [
        { period: 'Weekdays (Mon–Thu)', rate: base, reasoning: 'Standard demand — hold base rate.' },
        { period: 'Weekends (Fri–Sun)', rate: Math.round(base * 1.28), reasoning: 'Weekend leisure surge +28%.' },
        { period: 'Public Holidays', rate: Math.round(base * 1.55), reasoning: 'Peak demand — apply holiday premium.' },
        { period: 'Low Season (Aug)', rate: Math.round(base * 0.88), reasoning: 'Typical August dip — slight discount to maintain occupancy.' },
      ],
      projectedMonthlyNet: Math.round(base * 30 * 0.74),
      insight: 'Demo mode — add GEMINI_API_KEY for live market-calibrated pricing.',
    });
  }

  const prompt = `You are a Nigerian shortlet pricing analyst for The Landlord Property in Abuja.
Given the property details, generate AI-optimised nightly rate recommendations.

Property:
- District: ${data.district || 'Jabi'}
- Base nightly rate: ₦${Number(data.baseRate || 0).toLocaleString()}
- Current occupancy: ${Math.round((data.occupancy || 0.7) * 100)}%
- Features: ${(data.features || []).join(', ') || 'AC, Generator, Smart lock'}
- Month: ${data.month || new Date().toLocaleString('en-NG', { month: 'long' })}

Return valid JSON ONLY:
{
  "recommendations": [
    { "period": "string", "rate": number, "reasoning": "string" },
    { "period": "string", "rate": number, "reasoning": "string" },
    { "period": "string", "rate": number, "reasoning": "string" },
    { "period": "string", "rate": number, "reasoning": "string" }
  ],
  "projectedMonthlyNet": number,
  "insight": "string (2 sentences on market conditions for this district this month)"
}`;

  const response = await ai.generate({ model: MODEL, prompt, config: { responseMimeType: 'application/json' } });
  res.setHeader('Content-Type', 'application/json');
  res.end(response.text);
}

// ─── /api/roi  (AI 5-year investment ROI model) ────────────────────────────────
async function handleRoi(req, res) {
  const data = await parseBody(req);
  const ai = getAi();

  if (!ai) {
    const purchase = Number(data.purchasePrice || 0);
    const reno = Number(data.renovationBudget || 0);
    const nightly = Number(data.nightlyRate || 0);
    const occ = Number(data.occupancy || 0.72);
    const annualRent = nightly * 365 * occ * 0.85;
    const total = purchase + reno;
    const years = [1, 2, 3, 4, 5];
    return jsonRes(res, 200, {
      isDemo: true,
      summary: { totalInvestment: total, annualNetIncome: Math.round(annualRent), grossYield: total ? +((annualRent / total) * 100).toFixed(1) : 0, paybackYears: annualRent ? +(total / annualRent).toFixed(1) : 0 },
      yearlyTable: years.map(y => ({ year: y, cumulativeIncome: Math.round(annualRent * y), portfolioValue: Math.round(total * (1 + 0.08 * y)), netEquity: Math.round(total * (1 + 0.08 * y) + annualRent * y - total) })),
      insight: 'Demo projection — add GEMINI_API_KEY for Abuja-calibrated real estate market modelling.',
    });
  }

  const prompt = `You are a Nigerian real estate investment analyst for The Landlord Property in Abuja.
Model a 5-year ROI for the following investment. Assume ~8% annual Abuja property appreciation.
Account for: management fees (12%), maintenance (5% of revenue/yr), annual vacancy adjustment.

Investment:
- Purchase price: ₦${Number(data.purchasePrice || 0).toLocaleString()}
- Renovation budget: ₦${Number(data.renovationBudget || 0).toLocaleString()}
- Legal + stamp duty fees: ₦${Number(data.legalFees || 0).toLocaleString()}
- Use case: ${data.useCase || 'Shortlet'}
- Projected nightly rate: ₦${Number(data.nightlyRate || 0).toLocaleString()}
- Projected occupancy: ${Math.round((data.occupancy || 0.72) * 100)}%
- District: ${data.district || 'Jabi'}

Return valid JSON ONLY:
{
  "summary": {
    "totalInvestment": number,
    "annualNetIncome": number,
    "grossYield": number,
    "paybackYears": number,
    "irr": number
  },
  "yearlyTable": [
    { "year": 1, "cumulativeIncome": number, "portfolioValue": number, "netEquity": number },
    { "year": 2, "cumulativeIncome": number, "portfolioValue": number, "netEquity": number },
    { "year": 3, "cumulativeIncome": number, "portfolioValue": number, "netEquity": number },
    { "year": 4, "cumulativeIncome": number, "portfolioValue": number, "netEquity": number },
    { "year": 5, "cumulativeIncome": number, "portfolioValue": number, "netEquity": number }
  ],
  "insight": "string (3 sentences: market context for this district, recommendation, risk note)"
}`;

  const response = await ai.generate({ model: MODEL, prompt, config: { responseMimeType: 'application/json' } });
  res.setHeader('Content-Type', 'application/json');
  res.end(response.text);
}

// ─── Router ────────────────────────────────────────────────────────────────────

const ROUTES = {
  '/api/forensics': handleForensics,
  '/api/chat':      handleChat,
  '/api/describe':  handleDescribe,
  '/api/pricing':   handlePricing,
  '/api/roi':       handleRoi,
};

export function apiMiddleware(req, res, next) {
  const handler = req.method === 'POST' && ROUTES[req.url];
  if (!handler) return next();

  handler(req, res).catch(err => {
    console.error(`[apiServer] ${req.url} error:`, err.message);
    jsonRes(res, 500, { error: 'AI flow execution failed', details: err.message });
  });
}
