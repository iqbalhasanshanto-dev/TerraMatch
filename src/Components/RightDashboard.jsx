import { useContext, useState, useCallback, useEffect } from "react";
import { ChevronLeft, ChevronRight, Search, Clock3 } from "lucide-react";
import { useLocation } from "react-router";
import Map from "./Map";
import StateContext from "../States/StateContext";
import Tweaks from "./Tweaks";
import ShowRecentSearches from "./ShowRecentSearches";

/**
 * ============================================================================
 * RightDashboard Component
 * ============================================================================
 * Orchestrates the full-bleed Leaflet satellite map and the GPU-accelerated
 * right-hand overlay drawer sidebar (`Tweaks` for `/search` or
 * `ShowRecentSearches` for `/`), preserving our deep-space color palette:
 * - Viewport Background: `#07090E`
 * - Drawer Surface: `#0B0E13` with `#21242C` border
 * - Zero Map Resize Lag / Black Gap Elimination:
 *   - The map container stays locked at `absolute inset-0 w-full h-full` at
 *     all times so toggling the sidebar never resizes the Leaflet canvas or
 *     creates an unrendered black gap along the left edge.
 *   - The `<aside>` drawer overlays the right edge and slides smoothly via
 *     GPU `transform` (`translate-x-0` when open, `translate-x-full` when closed).
 * - Mobile Optimization (< 1024px):
 *   - Sidebar starts collapsed by default so the full-screen map is visible,
 *     with a floating top-right trigger (`top-3.5 right-4`) to open it.
 *   - Selecting a site via `onSelectLocation` auto-collapses the mobile drawer,
 *     and tapping the dimmed backdrop or pressing Escape dismisses it cleanly.
 */
const RightDashboard = () => {
    // ------------------------------------------------------------------------
    // 1. Context Subscriptions, Route State & Responsive Drawer State
    // ------------------------------------------------------------------------
    const { isSearch } = useContext(StateContext);
    const location = useLocation();

    // Collapsed by default on mobile/tablet (< 1024px); expanded by default on desktop (>= 1024px)
    const [isSidebarOpen, setIsSidebarOpen] = useState(() =>
        typeof window !== "undefined" ? window.innerWidth >= 1024 : true
    );

    // Search mode is active either via StateContext toggle or `/search` route
    const isSearchActive = isSearch || location.pathname === "/search";

    // ------------------------------------------------------------------------
    // 2. Helper Callback: Auto-Close Drawer on Mobile Location Selection
    // ------------------------------------------------------------------------
    /**
     * Passed to `<Tweaks />` and `<ShowRecentSearches />`. When a user taps any
     * location card or "View on map" on mobile (< 1024px), automatically collapses
     * the drawer so the animated map flyTo zoom and popup are immediately visible.
     */
    const handleSelectLocation = useCallback(() => {
        if (typeof window !== "undefined" && window.innerWidth < 1024) {
            setIsSidebarOpen(false);
        }
    }, []);

    // ------------------------------------------------------------------------
    // 3. Keyboard Dismissal Effect (Escape Key on Mobile Overlay Drawer)
    // ------------------------------------------------------------------------
    useEffect(() => {
        if (!isSidebarOpen) return;

        const handleKeyDown = (event) => {
            if (
                event.key === "Escape" &&
                typeof window !== "undefined" &&
                window.innerWidth < 1024
            ) {
                setIsSidebarOpen(false);
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isSidebarOpen]);

    // ------------------------------------------------------------------------
    // 4. Component Render Block
    // ------------------------------------------------------------------------
    return (
        <div className="relative w-full h-full overflow-hidden bg-[#07090E] select-none">
            {/* ============================================================== */}
            {/* Full-Bleed Satellite Map Viewport (Locked 100% Underneath)     */}
            {/* ============================================================== */}
            <div className="absolute inset-0 w-full h-full">
                <Map isSidebarOpen={isSidebarOpen} />

                {/* Prominent Floating Top-Right Trigger when Drawer is Collapsed */}
                {!isSidebarOpen && (
                    <button
                        type="button"
                        onClick={() => setIsSidebarOpen(true)}
                        className="absolute top-3.5 right-4 z-20 flex items-center gap-1.5 min-h-9 px-3 py-1.5 rounded-xl bg-[#0B0E13]/95 backdrop-blur-md border border-[#83CAD8]/50 text-[#F1EEE9] hover:border-[#83CAD8] hover:bg-[#1E2129] shadow-2xl transition cursor-pointer"
                        title={
                            isSearchActive
                                ? "Open Search & Filters"
                                : "Open Recent Searches"
                        }
                        aria-label={
                            isSearchActive
                                ? "Open Search and Filters drawer"
                                : "Open Recent Searches drawer"
                        }
                        aria-expanded={false}
                        aria-controls="dashboard-side-drawer"
                    >
                        <ChevronLeft
                            size={15}
                            aria-hidden="true"
                            className="text-[#83CAD8] shrink-0"
                        />
                        {isSearchActive ? (
                            <>
                                <Search
                                    size={14}
                                    aria-hidden="true"
                                    className="text-[#83CAD8] shrink-0"
                                />
                                <span className="text-xs font-semibold tracking-tight">
                                    Search
                                </span>
                            </>
                        ) : (
                            <>
                                <Clock3
                                    size={14}
                                    aria-hidden="true"
                                    className="text-[#83CAD8] shrink-0"
                                />
                                <span className="text-xs font-semibold tracking-tight">
                                    Recent
                                </span>
                            </>
                        )}
                    </button>
                )}
            </div>

            {/* ============================================================== */}
            {/* Mobile Tap-Outside Dimmed Backdrop (Visible < 1024px when open) */}
            {/* ============================================================== */}
            {isSidebarOpen && (
                <div
                    aria-hidden="true"
                    onClick={() => setIsSidebarOpen(false)}
                    className="absolute inset-0 z-25 bg-black/45 backdrop-blur-[1px] lg:hidden transition-opacity"
                />
            )}

            {/* ============================================================== */}
            {/* GPU-Animated Right Overlay Drawer Sidebar (`translate-x`)      */}
            {/* ============================================================== */}
            <aside
                id="dashboard-side-drawer"
                aria-label={
                    isSearchActive ? "Search and filter analog sites" : "Recent searches"
                }
                inert={!isSidebarOpen}
                className={`absolute right-0 top-0 h-full w-80 sm:w-92 xl:w-96 z-30 transition-transform duration-300 ease-out bg-[#0B0E13] border-l border-[#21242C] p-4 shadow-2xl ${
                    isSidebarOpen
                        ? "translate-x-0 pointer-events-auto"
                        : "translate-x-full pointer-events-none"
                }`}
            >
                {/* Standardized Top-Right Collapse Button inside Drawer */}
                <button
                    type="button"
                    onClick={() => setIsSidebarOpen(false)}
                    className="absolute top-3.5 right-4 z-40 w-8 h-8 rounded-lg bg-[#1A1D23] border border-[#21242C] flex items-center justify-center text-[#8891A0] hover:text-[#F1EEE9] hover:border-[#83CAD8]/60 hover:bg-[#1E2129] transition cursor-pointer"
                    title="Collapse sidebar"
                    aria-label="Collapse sidebar"
                    aria-expanded={isSidebarOpen}
                    aria-controls="dashboard-side-drawer"
                >
                    <ChevronRight size={15} aria-hidden="true" />
                </button>

                {/* Sidebar Content Container: Search Filters ("Tweaks") or Recent History */}
                <div className="w-full h-full flex flex-col pt-1">
                    {isSearchActive ? (
                        <Tweaks onSelectLocation={handleSelectLocation} />
                    ) : (
                        <ShowRecentSearches onSelectLocation={handleSelectLocation} />
                    )}
                </div>
            </aside>
        </div>
    );
};

export default RightDashboard;
