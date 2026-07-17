/**
 * Abuja demand calendar.
 *
 * This is a starting seed list, not a complete calendar. Replace or extend
 * with a real data source (a Firestore collection, or a scraped/maintained
 * events feed) before relying on this for live pricing. Dates below are
 * placeholders for recurring annual events — update each cycle.
 */

const EVENTS_2026 = [
  { name: "Abuja International Trade Fair", start: "2026-11-05", end: "2026-11-15", demandMultiplier: 1.6 },
  { name: "National Assembly budget session peak", start: "2026-10-01", end: "2026-10-31", demandMultiplier: 1.2 },
  { name: "December wedding/detty season", start: "2026-12-10", end: "2026-12-31", demandMultiplier: 1.8 },
  { name: "Eid travel period", start: "2026-03-19", end: "2026-03-23", demandMultiplier: 1.3 },
  { name: "Sallah travel period", start: "2026-05-26", end: "2026-05-30", demandMultiplier: 1.3 },
];

/**
 * Returns the highest demand multiplier from any event overlapping the date,
 * plus the matching event names, so the pricing narrative can reference them.
 * @param {string} isoDate - "YYYY-MM-DD"
 */
function getEventDemand(isoDate) {
  const date = new Date(isoDate);
  const matches = EVENTS_2026.filter((e) => date >= new Date(e.start) && date <= new Date(e.end));
  if (matches.length === 0) {
    return { multiplier: 1, events: [] };
  }
  const multiplier = Math.max(...matches.map((e) => e.demandMultiplier));
  return { multiplier, events: matches.map((e) => e.name) };
}

/** Friday/Saturday get a weekend bump; everything else is flat. */
function getWeekendMultiplier(isoDate) {
  const day = new Date(isoDate).getDay(); // 0 = Sun, 5 = Fri, 6 = Sat
  return day === 5 || day === 6 ? 1.15 : 1;
}

module.exports = { getEventDemand, getWeekendMultiplier, EVENTS_2026 };
