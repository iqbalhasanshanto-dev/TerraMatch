export default function About() {
  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-xl font-semibold text-lightText dark:text-darkText mb-3">
        About TeraMatch
      </h1>
      <p className="text-sm text-lightTextSecondary dark:text-darkTextSecondary mb-4">
        TeraMatch identifies Earth locations that serve as strong environmental
        analogs for future Moon and Mars base sites. Mission planners already use
        places like Devon Island and Mauna Kea to train astronauts and test
        hardware under Earth-based conditions that resemble another world — this
        tool visualizes and scores those candidate sites.
      </p>
      <p className="text-sm text-lightTextSecondary dark:text-darkTextSecondary mb-4">
        Each site is scored across five criteria — aridity, temperature extremes,
        terrain similarity, isolation, and geological relevance — and ranked by
        overall match percentage against a chosen target (Mars, the Moon, or a
        named feature like Jezero Crater).
      </p>
      <p className="text-sm text-lightTextSecondary dark:text-darkTextSecondary">
        Built for NASA Space Apps Challenge 2026 — Rajshahi, Bangladesh.
      </p>
    </div>
  );
}
