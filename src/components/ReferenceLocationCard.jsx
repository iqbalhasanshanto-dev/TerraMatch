const BODY_EMOJI = { mars: "🔴", moon: "🌕" };

export default function ReferenceLocationCard({ target }) {
  if (!target) return null;

  return (
    <div className="bg-lightPanel dark:bg-darkPanel rounded-xl border border-lightBorder dark:border-darkBorder p-4 w-full">
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-lg bg-lightInset dark:bg-darkInset flex items-center justify-center text-2xl shrink-0">
          {BODY_EMOJI[target.parentBody] || "🪐"}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-lightText dark:text-darkText">
            {target.name}{" "}
            <span className="text-xs font-normal text-lightTextSecondary dark:text-darkTextSecondary">
              (reference location)
            </span>
          </p>
          <dl className="mt-2 space-y-1 text-xs">
            <Row label="Surface type" value={target.surfaceType} />
            <Row label="Avg. temperature" value={`${target.avgTempC}°C`} />
            <Row label="Gravity" value={`${target.gravityG} g`} />
            <Row label="Atmosphere" value={target.atmosphere} />
          </dl>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-lightTextSecondary dark:text-darkTextSecondary">{label}</dt>
      <dd className="text-lightText dark:text-darkText font-medium text-right">{value}</dd>
    </div>
  );
}
