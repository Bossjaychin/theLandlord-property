import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';
import dotenv from 'dotenv';
import path from 'path';

// Load .env variables
dotenv.config();

let aiInstance = null;

function getAi() {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    return null;
  }
  
  if (!aiInstance) {
    aiInstance = genkit({
      plugins: [
        googleAI({ apiKey })
      ]
    });
  }
  return aiInstance;
}

export function apiMiddleware(req, res, next) {
  // Only intercept POST /api/forensics
  if (req.url === '/api/forensics' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    req.on('end', async () => {
      res.setHeader('Content-Type', 'application/json');
      
      let data = {};
      try {
        data = JSON.parse(body);
      } catch (e) {
        res.statusCode = 400;
        res.end(JSON.stringify({ error: 'Invalid JSON body' }));
        return;
      }
      
      const ai = getAi();
      
      if (!ai) {
        // Fallback demo response if API key is not configured
        console.warn('[apiServer] GEMINI_API_KEY or GOOGLE_API_KEY not found in environment. Running in Demo Mode.');
        
        const fallback = {
          isDemo: true,
          titleStatus: {
            status: "Verification Pending (DEMO MODE)",
            explanation: "GEMINI_API_KEY is not configured in your environment. Live Gemini intelligence is currently offline."
          },
          trustScore: data.trust || 75,
          risks: {
            demolition: {
              level: data.demolitionFlag === 'flag' ? 'flag' : 'none',
              analysis: data.demolitionFlag === 'flag' 
                ? "This plot lies close to the road corridor buffer. AGIS masterplan flags a potential setback encroachment." 
                : "No active demolition flags found for this layout."
            },
            flood: {
              level: data.floodFlag === 'flag' ? 'flag' : 'none',
              analysis: data.floodFlag === 'flag' 
                ? "Seasonal floodwatch area: Low-lying topography suggests seasonal run-off exposure." 
                : "No high-risk watershed or low-lying drainage exposure flagged."
            },
            ownership: {
              level: data.titleGrade === 'C' ? 'watch' : 'none',
              analysis: data.titleGrade === 'C' 
                ? "Area Council title is currently in regularization. Chain of deeds contains pending approvals." 
                : "Ownership history shows clear lineage from the original allocation."
            }
          },
          mitigationPlan: [
            "⚠️ CONFIGURE API KEY: Add GEMINI_API_KEY to your .env file to activate live Gemini analysis.",
            "Verify all GPS pins against the AGIS layout masterplan before signing.",
            "Obtain a certified true copy (CTC) of the C of O from AGIS.",
            "Execute a robust Deed of Indemnity covering set-back clearances."
          ],
          pidginSummary: `Oga, this one na DEMO report o! Because you neva set your GEMINI_API_KEY. But if na real life, make sure you double-check the papers before you pay!`
        };
        
        // Add artificial latency to simulate real API call
        setTimeout(() => {
          res.end(JSON.stringify(fallback));
        }, 1500);
        return;
      }
      
      try {
        const prompt = `
          You are the Legal & Title Forensics Analyzer for "The Landlord Property AI" in Abuja, Nigeria.
          Analyze the following property metadata and generate a comprehensive Title Forensic & Risk Vulnerability Report:

          Property Title: "${data.title}"
          District: "${data.district}"
          Title Type/Status: "${data.titleType || 'Unknown'}"
          Title Grade: "${data.titleGrade || 'N/A'}"
          AGIS Verification Search Note: "${data.agisNotes || 'N/A'}"
          Field Inspected: ${data.inspected ? 'Yes' : 'No'}
          Demolition Flag Status: "${data.demolitionFlag || 'none'}"
          Flood Flag Status: "${data.floodFlag || 'none'}"

          Your output must be a valid JSON object matching this structure EXACTLY:
          {
            "titleStatus": {
              "status": "string (e.g. Clean, Regularizing, High Risk, Inconsistent)",
              "explanation": "string (short description of the title status)"
            },
            "trustScore": number (integer between 0 and 100 based on title grade, inspection status, and AGIS records),
            "risks": {
              "demolition": {
                "level": "string (none, watch, flag)",
                "analysis": "string (detailed analysis of the demolition risk based on district and flags)"
              },
              "flood": {
                "level": "string (none, watch, flag)",
                "analysis": "string (detailed analysis of the flood risk based on district and flags)"
              },
              "ownership": {
                "level": "string (none, watch, flag)",
                "analysis": "string (detailed analysis of potential ownership disputes or deed chain discrepancies)"
              }
            },
            "mitigationPlan": [
              "string (actionable recommendation 1)",
              "string (actionable recommendation 2)",
              "string (actionable recommendation 3)",
              "string (actionable recommendation 4)"
            ],
            "pidginSummary": "string (a punchy, street-smart summary in Nigerian Pidgin explaining the main risks and verdict to a buyer)"
          }

          Ensure the analysis is highly specific to Abuja districts (e.g., Jabi, Guzape, Lugbe, Wuse, Katampe, Kubwa) and reflects realistic Nigerian real estate scenarios (AGIS regularization stages, road-corridor buffers, seasonal floodplains along local rivers).
        `;
        
        const response = await ai.generate({
          model: 'googleai/gemini-2.5-flash',
          prompt: prompt,
          config: {
            responseMimeType: 'application/json',
          }
        });
        
        res.end(response.text);
      } catch (err) {
        console.error('[apiServer] Genkit flow execution error:', err);
        res.statusCode = 500;
        res.end(JSON.stringify({ error: 'AI flow execution failed', details: err.message }));
      }
    });
  } else {
    next();
  }
}
