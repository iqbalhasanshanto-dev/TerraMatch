const OPTIONS = [
  { key: "all", label: "All Sites" },
  { key: "mars", label: "Mars Analogs" },
  { key: "moon", label: "Moon Analogs" }
];

export default function FilterBar({ filter, setFilter }) {
  return (
    <div className="flex gap-2 px-4 py-3 bg-white border-b border-slate-200">
      {OPTIONS.map((opt) => (
        <button
          key={opt.key}
          onClick={() => setFilter(opt.key)}
          className={
            "px-4 py-1.5 rounded-full text-sm border transition-colors " +
            (filter === opt.key
              ? "bg-base text-white border-base"
              : "bg-white text-slate-700 border-slate-300 hover:bg-slate-100")
          }
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
