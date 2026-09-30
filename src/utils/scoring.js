export function overallScore(scores) {
  const values = Object.values(scores);
  const sum = values.reduce((a, b) => a + b, 0);
  return (sum / values.length).toFixed(1);
}

export function markerColor(target) {
  return target === "mars" ? "#b5442e" : "#555555";
}

export function scoreLabel(key) {
  return key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase());
}
