import { Link } from "react-router";

/**
 * ============================================================================
 * Modal Component (Candidate Analog Site Details Quick-View)
 * ============================================================================
 * Renders an interactive dialog modal triggered from Leaflet map marker popups,
 * styled to match the deep-space palette:
 * - Dialog Popover: `#090B10` with border `#21242C` and text `#F1EEE9`
 * - Telemetry Accents: Cyan `#83CAD8` and secondary `#1A1D23`
 */
const Modal = ({ loc }) => {
    return (
        <div>
            {/* Quick-Info Trigger Button (Embedded inside Leaflet marker popup) */}
            <button
                type="button"
                className="w-full mt-2 py-1.5 px-3 rounded-lg bg-[#83CAD8] hover:opacity-90 text-[#090D15] text-xs font-semibold shadow-xs transition cursor-pointer"
                onClick={() =>
                    document.getElementById(`modal-${loc._id}`).showModal()
                }
            >
                View Telemetry
            </button>

            {/* Native HTML Dialog Modal with Deep-Space Tokens */}
            <dialog id={`modal-${loc._id}`} className="modal backdrop-blur-xs">
                <div className="modal-box bg-[#090B10] border border-[#21242C] text-[#F1EEE9] shadow-2xl p-6 rounded-2xl max-w-lg select-none">
                    {/* Location Name & Country */}
                    <h3 className="font-bold text-xl sm:text-2xl text-[#F1EEE9] tracking-tight">
                        {loc.name}
                    </h3>
                    <p className="text-xs text-[#8891A0] mt-1">
                        {loc.country}
                    </p>

                    {/* Analog Target Body Badges */}
                    <div className="flex flex-wrap gap-2 my-4">
                        {loc.analogType?.map((type) => (
                            <span
                                key={type}
                                className="px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-[#181A21] border border-[#21242C] text-[#83CAD8] uppercase"
                            >
                                {type} Analog
                            </span>
                        ))}
                    </div>

                    {/* Similarity Score Radial Gauge Indicator */}
                    <div className="flex items-center gap-3.5 my-4 p-3 bg-[#181A21] border border-[#21242C] rounded-xl">
                        <div
                            className="radial-progress text-[#83CAD8] font-mono font-bold text-xs"
                            style={{
                                "--value": loc.similarityScore,
                                "--size": "3.5rem",
                                "--thickness": "4px",
                            }}
                            role="progressbar"
                            aria-valuenow={loc.similarityScore}
                        >
                            {loc.similarityScore}%
                        </div>

                        <div>
                            <p className="font-semibold text-xs text-[#F1EEE9]">
                                Similarity Score
                            </p>
                            <p className="text-[11px] text-[#8891A0]">
                                Quantitative environmental analog match
                            </p>
                        </div>
                    </div>

                    {/* Scientific Overview Narrative */}
                    <p className="text-xs leading-relaxed text-[#8891A0]">
                        {loc.description}
                    </p>

                    {/* Key Environmental Facts Grid */}
                    <div className="grid grid-cols-2 gap-3 mt-4">
                        <div className="bg-[#181A21] border border-[#21242C] rounded-lg p-3">
                            <p className="text-[10px] text-[#8891A0] uppercase font-semibold">
                                Climate
                            </p>
                            <p className="font-medium text-xs text-[#F1EEE9] capitalize mt-0.5">
                                {loc.environment?.climate}
                            </p>
                        </div>

                        <div className="bg-[#181A21] border border-[#21242C] rounded-lg p-3">
                            <p className="text-[10px] text-[#8891A0] uppercase font-semibold">
                                Elevation
                            </p>
                            <p className="font-medium text-xs text-[#F1EEE9] mt-0.5">
                                {loc.environment?.elevationMeters?.toLocaleString()} m
                            </p>
                        </div>
                    </div>

                    {/* Terrain Characteristics */}
                    <div className="mt-4">
                        <p className="font-semibold text-xs text-[#F1EEE9] mb-2">
                            Terrain Features
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                            {loc.terrain?.map((item) => (
                                <span
                                    key={item}
                                    className="px-2 py-0.5 rounded text-[11px] bg-[#1A1D23] border border-[#21242C] text-[#8891A0]"
                                >
                                    {item}
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* Modal Actions Footer */}
                    <div className="modal-action border-t border-[#21242C] pt-4 mt-5 flex items-center justify-end gap-2.5">
                        <form method="dialog">
                            <button
                                type="submit"
                                className="px-3.5 py-1.5 rounded-lg border border-[#21242C] text-[#8891A0] hover:text-[#F1EEE9] text-xs transition cursor-pointer"
                            >
                                Close
                            </button>
                        </form>

                        <Link
                            to={`/details/${loc._id}`}
                            className="px-3.5 py-1.5 rounded-lg bg-[#83CAD8] hover:opacity-90 text-[#090D15] text-xs font-semibold transition cursor-pointer"
                        >
                            View Full Details
                        </Link>
                    </div>
                </div>

                {/* Backdrop Click Dismiss */}
                <form method="dialog" className="modal-backdrop">
                    <button type="submit">close</button>
                </form>
            </dialog>
        </div>
    );
};

export default Modal;
