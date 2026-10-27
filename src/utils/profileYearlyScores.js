import { formatThaiRound } from "./thaiProfileDates.js";

// Each cycle is a separate point, even when its year or period matches another cycle.
export function getProfileRoundScores(history) {
  const seen = new Set();
  const rounds = history.flatMap((row) => {
    const id = String(row.EVC_Code || row.EVC_ID || "");
    const count = Number(row.scoredCount);
    const score = Number(row.score);
    if (!id || seen.has(id) || !Number.isFinite(count) || count <= 0 ||
        row.score == null || !Number.isFinite(score)) return [];
    seen.add(id);
    let year = Number(row.year);
    if (year >= 1900 && year < 2400) year += 543;
    return [{
      id, year: Number.isFinite(year) ? year : 0,
      label: formatThaiRound(row.round),
      typeId: String(row.assessmentTypeId || row.assessmentTypes),
      name: row.assessmentTypes,
      score, count,
      cycleId: Number(row.EVC_ID) || 0,
    }];
  }).sort((a, b) => a.year - b.year ||
    a.label.localeCompare(b.label, "th", { numeric: true }) ||
    a.cycleId - b.cycleId || a.id.localeCompare(b.id));
  const groups = new Map();
  rounds.forEach((round, index) => {
    round.index = index;
    if (!groups.has(round.typeId)) groups.set(round.typeId, { name: round.name, points: [] });
    groups.get(round.typeId).points.push(round);
  });
  return { rounds, series: [...groups.values()] };
}
