export default function MapLegend() {
  const rows = [
    { label: "High (70–100%)", color: "#34A853" },
    { label: "Medium (40–69%)", color: "#F9AB00" },
    { label: "Low (0–39%)", color: "#EA4335" }
  ];

  return (
    <div className="bg-lightPanel dark:bg-darkPanel rounded-xl border border-lightBorder dark:border-darkBorder p-3 w-48 shadow-sm">
      <p className="text-xs font-medium text-lightText dark:text-darkText mb-2">Match level</p>
      <ul className="space-y-1">
        {rows.map((r) => (
          <li key={r.label} className="flex items-center gap-2 text-xs text-lightTextSecondary dark:text-darkTextSecondary">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: r.color }} />
            {r.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
