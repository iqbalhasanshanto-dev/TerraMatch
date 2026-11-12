import { Link } from "react-router";
import {
    formatSurfaceTemp,
    getAnalogCategory,
    getAnalogRecognitionStatus,
    getMineralogy,
    getRoversTested,
    getScientificFidelityAnalysis,
    getTargetBodyInfo,
} from "../utils/analogSpec";
import {
    AlertTriangle,
    Layers,
    CheckCircle2,
    Compass,
    Thermometer,
    Droplets,
} from "lucide-react";

/**
 * ============================================================================
 * Modal Component (Candidate Analog Site Telemetry & Scientific Breakdown)
 * ============================================================================
 * Interactive popover modal triggered from Leaflet map marker popups, presenting
 * comprehensive scientific telemetry for the 2026 NASA Space Apps Challenge:
 * - Analog Recognition Status: Emerging Analog (#CEB882) vs. Established Analog
 * - 4-Dimension Scientific Fidelity Breakdown (Geology, Terrain, Climate, ISRU)
 * - "Why It Is a Strong Analog (What Matches)"
 * - "Where the Analogy Breaks Down (Earth's Limits)" evaluating Gravity, Atmosphere,
 *   Radiation, and Site-Specific Environmental Boundaries
 */
const Modal = ({ loc }) => {
    // ------------------------------------------------------------------------
    // 1. Scientific Analog Telemetry & Fidelity Derivations
    // ------------------------------------------------------------------------
    const { longSpecLabel, pillClassName, pillLabel } = getTargetBodyInfo(loc);
    const surfaceTemp = formatSurfaceTemp(loc);
    const analogCategory = getAnalogCategory(loc);
    const roversTested = getRoversTested(loc);
    const mineralogy = getMineralogy(loc);
    const recognition = getAnalogRecognitionStatus(loc);
    const fidelity = getScientificFidelityAnalysis(loc);

    // Dimension icon mapping
    const dimensionIcons = {
        geology: Layers,
        topography: Compass,
        thermal: Thermometer,
        water_isru: Droplets,
    };

    // ------------------------------------------------------------------------
    // 2. Component Render Block
    // ------------------------------------------------------------------------
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
                View Scientific Telemetry
            </button>

            {/* Native HTML Dialog Modal with Deep-Space Tokens */}
            <dialog id={`modal-${loc._id}`} className="modal backdrop-blur-xs">
                <div className="modal-box bg-[#090B10] border border-[#21242C] text-[#F1EEE9] shadow-2xl p-6 rounded-2xl max-w-2xl max-h-[90vh] overflow-y-auto select-none custom-scrollbar">
                    {/* Header Row: Title, Country, Recognition Badge & Target Body Pill */}
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-[#21242C] pb-4">
                        <div>
                            <div className="flex flex-wrap items-center gap-2">
                                <h3 className="font-bold text-xl sm:text-2xl text-[#F1EEE9] tracking-tight">
                                    {loc.name}
                                </h3>
                                {/* Recognition Status Badge (Emerging vs Established) */}
                                <span
                                    className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider ${recognition.badgeClass}`}
                                >
                                    {recognition.label}
                                </span>
                            </div>
                            <p className="text-xs text-[#8891A0] mt-1">
                                {loc.country} • {loc.environment?.elevationMeters?.toLocaleString()} m elevation
                            </p>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                            <span
                                className={`px-2.5 py-0.5 rounded text-[10px] font-bold tracking-wider ${pillClassName}`}
                            >
                                {pillLabel}
                            </span>
                            <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-[#181A21] border border-[#21242C] text-[#83CAD8]">
                                {surfaceTemp}
                            </span>
                        </div>
                    </div>

                    {/* Scientific Overview Narrative */}
                    <p className="text-xs leading-relaxed text-[#8891A0] my-4">
                        {loc.description}
                    </p>

                    {/* ====================================================== */}
                    {/* 3. 4-Dimension Scientific Fidelity Breakdown           */}
                    {/* ====================================================== */}
                    <div className="my-4 p-4 bg-[#0B0E13] border border-[#21242C] rounded-xl space-y-3">
                        <div className="flex items-center justify-between border-b border-[#21242C] pb-2">
                            <div>
                                <h4 className="text-xs font-semibold text-[#F1EEE9] tracking-tight">
                                    Multi-Dimensional Planetary Fidelity Analysis
                                </h4>
                                <p className="text-[10px] text-[#8891A0] mt-0.5">
                                    Scientific correlation across 4 key planetary environmental criteria.
                                </p>
                            </div>
                            <span className="text-xs font-mono font-bold text-[#83CAD8] bg-[#181A21] border border-[#21242C] px-2 py-0.5 rounded">
                                {fidelity.overallFidelityScore}% Overall Match
                            </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
                            {fidelity.dimensions.map((dim) => {
                                const IconComponent =
                                    dimensionIcons[dim.id] || Layers;
                                return (
                                    <div
                                        key={dim.id}
                                        className="bg-[#181A21] border border-[#21242C] rounded-lg p-3 space-y-1.5"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-1.5 text-[#F1EEE9] font-medium text-[11px]">
                                                <IconComponent
                                                    size={13}
                                                    className="text-[#83CAD8]"
                                                />
                                                <span>{dim.title}</span>
                                            </div>
                                            <span className="text-[10px] font-semibold text-[#83CAD8]">
                                                {dim.score}
                                            </span>
                                        </div>
                                        <div className="w-full h-1 bg-[#21242C] rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-[#83CAD8] rounded-full"
                                                style={{
                                                    width: `${dim.percent}%`,
                                                }}
                                            />
                                        </div>
                                        <p className="text-[10px] text-[#8891A0] leading-normal">
                                            {dim.reason}
                                        </p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* ====================================================== */}
                    {/* 4. Why It Is a Strong Analog (What Matches)            */}
                    {/* ====================================================== */}
                    <div className="my-4 p-4 bg-[#181A21] border border-[#21242C] rounded-xl space-y-2">
                        <div className="flex items-center gap-2 text-xs font-semibold text-[#F1EEE9] border-b border-[#21242C] pb-2">
                            <CheckCircle2 size={14} className="text-[#83CAD8]" />
                            <span>Why It Is a Strong Analog (What Matches)</span>
                        </div>
                        <ul className="space-y-1.5 text-xs text-[#F1EEE9]/90 pt-1">
                            {fidelity.whatMatches.map((bullet, idx) => (
                                <li key={idx} className="flex items-start gap-2">
                                    <span className="text-[#83CAD8] font-bold mt-0.5">•</span>
                                    <span className="text-[11px] leading-relaxed text-[#8891A0]">
                                        {bullet}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* ====================================================== */}
                    {/* 5. Where the Analogy Breaks Down (Earth's Limits)      */}
                    {/* ====================================================== */}
                    <div className="my-4 p-4 bg-[#110E0C] border border-[#D67051]/30 rounded-xl space-y-3">
                        <div className="flex items-center gap-2 text-xs font-semibold text-[#D67051] border-b border-[#D67051]/20 pb-2">
                            <AlertTriangle size={14} className="text-[#D67051]" />
                            <span>Where the Analogy Breaks Down (Earth&apos;s Limits)</span>
                        </div>
                        <p className="text-[10px] text-[#8891A0] leading-normal italic">
                            NASA Challenge Criterion: An analog does not have to match everything. Remember Earth&apos;s physical limits (gravity, vacuum, atmosphere, radiation).
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs pt-1">
                            {fidelity.whereAnalogyBreaksDown.map((limit) => (
                                <div
                                    key={limit.id}
                                    className="bg-[#0B0E13] border border-[#21242C] rounded-lg p-2.5 space-y-1"
                                >
                                    <div className="flex items-center justify-between text-[10px] font-semibold">
                                        <span className="text-[#F1EEE9]">
                                            {limit.factor}
                                        </span>
                                        <span className="text-[#D67051] font-mono">
                                            {limit.targetValue}
                                        </span>
                                    </div>
                                    <p className="text-[10px] text-[#8891A0] leading-relaxed">
                                        {limit.explanation}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Planetary Specification Details Grid */}
                    <div className="my-4 p-4 bg-[#181A21] border border-[#21242C] rounded-xl space-y-2.5 text-xs">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            <div>
                                <span className="text-[10px] text-[#8891A0] block uppercase font-semibold">
                                    Target Specification
                                </span>
                                <span className="font-medium text-[#F1EEE9]">
                                    {longSpecLabel}
                                </span>
                            </div>
                            <div>
                                <span className="text-[10px] text-[#8891A0] block uppercase font-semibold">
                                    Scientific Focus
                                </span>
                                <span className="font-medium text-[#F1EEE9]">
                                    {analogCategory}
                                </span>
                            </div>
                            <div className="sm:col-span-2">
                                <span className="text-[10px] text-[#8891A0] block uppercase font-semibold">
                                    Mineralogy &amp; Regolith
                                </span>
                                <span className="text-[#F1EEE9]/90 text-[11px]">
                                    {mineralogy}
                                </span>
                            </div>
                            <div className="sm:col-span-2">
                                <span className="text-[10px] text-[#8891A0] block uppercase font-semibold">
                                    Historical Rovers &amp; Campaigns
                                </span>
                                <span className="text-[#F1EEE9]/90 text-[11px]">
                                    {roversTested}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Terrain Characteristics Tags */}
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
