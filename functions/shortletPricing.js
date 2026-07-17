const { genkit, z } = require("genkit");
const { googleAI } = require("@genkit-ai/google-genai");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const { calculatePrice } = require("./lib/pricingEngine");

const googleApiKey = defineSecret("GOOGLE_API_KEY");

const ai = genkit({ plugins: [googleAI()] });

const PricingInputSchema = z.object({
  propertyId: z.string(),
  location: z.string(),
  baseNightlyRate: z.number(),
  date: z.string(), // "YYYY-MM-DD"
  occupancyLast30Days: z.number().min(0).max(1).optional(),
});

const ExplanationSchema = z.object({
  explanation: z.string().describe("One to two sentence host-facing explanation of why the price moved, referencing only the factors provided."),
});

const pricingNarrativeFlow = ai.defineFlow(
  {
    name: "pricingNarrativeFlow",
    inputSchema: z.object({
      location: z.string(),
      date: z.string(),
      baseNightlyRate: z.number(),
      recommendedRate: z.number(),
      factors: z.object({
        eventMultiplier: z.number(),
        matchedEvents: z.array(z.string()),
        weekendMultiplier: z.number(),
        occupancyMultiplier: z.number(),
      }),
    }),
    outputSchema: ExplanationSchema,
  },
  async (input) => {
    const { output } = await ai.generate({
      model: googleAI.model("gemini-flash-latest"),
      prompt: `You write short host-facing pricing explanations for a shortlet management platform in Abuja, Nigeria.

Property location: ${input.location}
Date being priced: ${input.date}
Base nightly rate: NGN ${input.baseNightlyRate.toLocaleString()}
Recommended rate: NGN ${input.recommendedRate.toLocaleString()}
Matched demand events: ${input.factors.matchedEvents.length ? input.factors.matchedEvents.join(", ") : "none"}
Weekend multiplier applied: ${input.factors.weekendMultiplier}
Occupancy-based adjustment: ${input.factors.occupancyMultiplier}

Explain the price change in one or two plain sentences, referencing only the factors above. Do not invent other reasons.`,
      output: { schema: ExplanationSchema },
    });
    if (!output) throw new Error("Model returned no output for pricingNarrativeFlow.");
    return output;
  }
);

/**
 * Callable Cloud Function. Call from the client with:
 *   const fn = httpsCallable(functions, "getShortletPricing");
 *   const { data } = await fn({ propertyId, location, baseNightlyRate, date });
 */
const getShortletPricing = onCall(
  { secrets: [googleApiKey], region: "europe-west1" },
  async (request) => {
    const parsed = PricingInputSchema.safeParse(request.data);
    if (!parsed.success) {
      throw new HttpsError("invalid-argument", "Invalid pricing input.", parsed.error.flatten());
    }
    const input = parsed.data;

    const priced = calculatePrice(input);
    const { explanation } = await pricingNarrativeFlow({
      location: input.location,
      date: input.date,
      baseNightlyRate: input.baseNightlyRate,
      recommendedRate: priced.recommendedRate,
      factors: priced.factors,
    });

    return {
      propertyId: input.propertyId,
      date: input.date,
      baseNightlyRate: input.baseNightlyRate,
      ...priced,
      explanation,
    };
  }
);

module.exports = { getShortletPricing, pricingNarrativeFlow };
