const { genkit, z } = require("genkit");
const { googleAI } = require("@genkit-ai/google-genai");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const { calculateTrustRing } = require("./lib/trustRing");

const googleApiKey = defineSecret("GOOGLE_API_KEY");

const ai = genkit({ plugins: [googleAI()] });

const DealInputSchema = z.object({
  propertyId: z.string(),
  location: z.string(), // e.g. "Maitama", "Wuse II", "Jabi"
  askingPrice: z.number(),
  marketComparableAvg: z.number(),
  distressReason: z.string(), // seller-stated reason, e.g. "estate settlement", "relocation"
  agisStatus: z.enum(["verified", "pending", "unverified", "disputed"]),
  documentsProvided: z.number(),
  documentsRequired: z.number(),
  groundRentStatus: z.enum(["current", "arrears", "unknown"]),
  inDemolitionSetback: z.boolean(),
  floodRiskLevel: z.enum(["low", "moderate", "high"]),
});

const NarrativeSchema = z.object({
  summary: z.string().describe("Two to three sentence plain-language summary of this deal's condition for a buyer."),
  negotiationGuidance: z.string().describe("Specific, actionable negotiation advice grounded in the red flags and price deviation provided. No invented facts."),
  suggestedOfferRange: z.object({
    low: z.number(),
    high: z.number(),
  }).describe("A reasonable NGN offer range given the score, red flags, and comparable price."),
});

/**
 * Genkit flow: takes the deterministic Trust Ring output and asking price,
 * and produces buyer-facing narrative. The model is explicitly told not to
 * override or reinterpret the score or red flags — only explain them.
 */
const distressDealFlow = ai.defineFlow(
  {
    name: "distressDealFlow",
    inputSchema: z.object({
      deal: DealInputSchema,
      trustRing: z.object({
        score: z.number(),
        band: z.string(),
        redFlags: z.array(z.string()),
      }),
    }),
    outputSchema: NarrativeSchema,
  },
  async ({ deal, trustRing }) => {
    const { output } = await ai.generate({
      model: googleAI.model("gemini-flash-latest"),
      prompt: `You are writing buyer-facing guidance for a distress property listing on The Landlord Property AI, an Abuja, Nigeria real estate platform.

Property location: ${deal.location}
Asking price: NGN ${deal.askingPrice.toLocaleString()}
Comparable market average: NGN ${deal.marketComparableAvg.toLocaleString()}
Seller-stated distress reason: ${deal.distressReason}
Trust Ring score: ${trustRing.score}/100 (${trustRing.band})
Red flags identified: ${trustRing.redFlags.length ? trustRing.redFlags.join("; ") : "none"}

Write a summary and negotiation guidance based only on the facts above. Do not invent title status, risk levels, or documents beyond what is stated. If red flags exist, the negotiation guidance should reference them directly. Keep the tone factual, not promotional.`,
      output: { schema: NarrativeSchema },
    });
    if (!output) throw new Error("Model returned no output for distressDealFlow.");
    return output;
  }
);

/**
 * Callable Cloud Function. Call from the client with:
 *   const fn = httpsCallable(functions, "getDistressDealIntelligence");
 *   const { data } = await fn({ propertyId, location, askingPrice, ... });
 */
const getDistressDealIntelligence = onCall(
  { secrets: [googleApiKey], region: "europe-west1" },
  async (request) => {
    const parsed = DealInputSchema.safeParse(request.data);
    if (!parsed.success) {
      throw new HttpsError("invalid-argument", "Invalid deal input.", parsed.error.flatten());
    }
    const deal = parsed.data;

    const trustRing = calculateTrustRing(deal);
    const narrative = await distressDealFlow({ deal, trustRing });

    return {
      propertyId: deal.propertyId,
      trustRing,
      ...narrative,
    };
  }
);

module.exports = { getDistressDealIntelligence, distressDealFlow };
