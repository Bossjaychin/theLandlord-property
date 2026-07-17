/**
 * Trust Ring scoring for distress property deals.
 *
 * This stays deterministic and rule-based on purpose. Title status, ground
 * rent status, and risk flags are facts that should come from AGIS records
 * or document checks, not from an LLM. The AI layer (distressDealFlow) only
 * writes the human-readable summary and negotiation guidance on top of this
 * score — it never decides the score itself.
 */

const WEIGHTS = {
  titleVerification: 30,
  documentCompleteness: 20,
  groundRentStanding: 15,
  demolitionRisk: 15,
  floodRisk: 10,
  priceRealism: 10,
};

/**
 * @param {object} input
 * @param {"verified"|"pending"|"unverified"|"disputed"} input.agisStatus
 * @param {number} input.documentsProvided - count of required docs on file
 * @param {number} input.documentsRequired - total required docs for this deal type
 * @param {"current"|"arrears"|"unknown"} input.groundRentStatus
 * @param {boolean} input.inDemolitionSetback - property sits in a marked contravention/setback zone
 * @param {"low"|"moderate"|"high"} input.floodRiskLevel
 * @param {number} input.askingPrice
 * @param {number} input.marketComparableAvg - average price of comparable verified listings nearby
 * @returns {{score: number, band: string, breakdown: object, redFlags: string[]}}
 */
function calculateTrustRing(input) {
  const redFlags = [];
  const breakdown = {};

  // Title verification
  const titleScores = { verified: 1, pending: 0.5, unverified: 0.15, disputed: 0 };
  const titleFactor = titleScores[input.agisStatus] ?? 0;
  breakdown.titleVerification = round(titleFactor * WEIGHTS.titleVerification);
  if (input.agisStatus === "disputed") redFlags.push("AGIS record shows a disputed or contested title.");
  if (input.agisStatus === "unverified") redFlags.push("Title has not been verified against AGIS records.");

  // Document completeness
  const docFactor = input.documentsRequired > 0
    ? clamp(input.documentsProvided / input.documentsRequired, 0, 1)
    : 0;
  breakdown.documentCompleteness = round(docFactor * WEIGHTS.documentCompleteness);
  if (docFactor < 0.6) redFlags.push("Fewer than 60% of required documents are on file.");

  // Ground rent standing
  const rentScores = { current: 1, unknown: 0.4, arrears: 0 };
  const rentFactor = rentScores[input.groundRentStatus] ?? 0.4;
  breakdown.groundRentStanding = round(rentFactor * WEIGHTS.groundRentStanding);
  if (input.groundRentStatus === "arrears") redFlags.push("Ground rent is in arrears.");

  // Demolition risk
  const demolitionFactor = input.inDemolitionSetback ? 0 : 1;
  breakdown.demolitionRisk = round(demolitionFactor * WEIGHTS.demolitionRisk);
  if (input.inDemolitionSetback) redFlags.push("Property sits within a marked demolition/setback zone.");

  // Flood risk
  const floodScores = { low: 1, moderate: 0.5, high: 0 };
  const floodFactor = floodScores[input.floodRiskLevel] ?? 0.5;
  breakdown.floodRisk = round(floodFactor * WEIGHTS.floodRisk);
  if (input.floodRiskLevel === "high") redFlags.push("Property is in a high flood-risk area.");

  // Price realism — how far the asking price sits from verified comparables
  let priceFactor = 1;
  if (input.marketComparableAvg > 0) {
    const deviation = (input.askingPrice - input.marketComparableAvg) / input.marketComparableAvg;
    if (deviation > 0.15) {
      priceFactor = 0.3;
      redFlags.push("Asking price is more than 15% above comparable verified listings.");
    } else if (deviation < -0.4) {
      priceFactor = 0.5;
      redFlags.push("Asking price is more than 40% below comparables — confirm the distress reason before proceeding.");
    }
  }
  breakdown.priceRealism = round(priceFactor * WEIGHTS.priceRealism);

  const score = Object.values(breakdown).reduce((a, b) => a + b, 0);

  let band = "low";
  if (score >= 80) band = "high";
  else if (score >= 55) band = "moderate";

  return { score: round(score), band, breakdown, redFlags };
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function round(n) {
  return Math.round(n * 10) / 10;
}

module.exports = { calculateTrustRing, WEIGHTS };
