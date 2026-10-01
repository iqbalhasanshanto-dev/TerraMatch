export function overallScore(scores) {
  const values = Object.values(scores);
  const sum = values.reduce((a, b) => a + b, 0);
  return (sum / values.length).toFixed(1);
}

// 0-100 version, for the UI's "88% match" style display.
export function overallScorePercent(scores) {
  return Math.round(Number(overallScore(scores)) * 10);
}

// Design system thresholds: High 70-100, Medium 40-69, Low 0-39.
export function matchLevel(percent) {
  if (percent >= 70) return "high";
  if (percent >= 40) return "medium";
  return "low";
}

export function matchColor(percent) {
  const level = matchLevel(percent);
  if (level === "high") return "#34A853";
  if (level === "medium") return "#F9AB00";
  return "#EA4335";
}

// Tailwind-friendly variant for text colors (dark mode uses the same hues).
export function matchColorClass(percent) {
  const level = matchLevel(percent);
  if (level === "high") return "text-matchHigh";
  if (level === "medium") return "text-matchMedium";
  return "text-matchLow";
}

export function markerColor(target) {
  return target === "mars" ? "#b5442e" : "#555555";
}

export function scoreLabel(key) {
  return key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase());
}

// Given a parent body ("mars" | "moon"), return the SITES entries that
// target it, sorted best-match-first.
export function bestMatchesFor(sites, parentBody) {
  return [...sites]
    .filter((s) => s.target === parentBody)
    .sort((a, b) => overallScorePercent(b.scores) - overallScorePercent(a.scores));
}
