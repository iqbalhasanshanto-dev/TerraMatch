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
 * Orchestrates the full-bleed Leaflet satellite map and the responsive right-hand
 * drawer sidebar (`Tweaks` for `/search` or `ShowRecentSearches` for `/`),
 * preserving the custom deep-space color palette:
 * - Viewport Background: `#07090E`
 * - Drawer Surface: `#0B0E13` with `#21242C` border
 * - Mobile Optimization (< 1024px):
 *   - Sidebar starts collapsed by default so only the full-screen map is visible,
 *     paired with a prominent floating top-right button (`top-3.5 right-4`) to
 *     open the Search or Recent Searches drawer.
 *   - Passing `onSelectLocation` into `<Tweaks />` and `<ShowRecentSearches />`
 *     automatically closes the mobile drawer when a user picks a location card
 *     so they immediately see the map fly/zoom into the site and open its popup.
 *   - On mobile, tapping the dimmed map backdrop or pressing Escape also closes
 *     the drawer cleanly.
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
        <div className="relative w-full h-full flex overflow-hidden bg-[#07090E] select-none">
            {/* ============================================================== */}
            {/* Main Satellite Map Viewport (Full-Width Flex Container)        */}
            {/* ============================================================== */}
            <div className="flex-1 h-full relative min-w-0">
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
            {/* Collapsible Dark Drawer Sidebar (Overlay on Mobile, Split >= lg) */}
            {/* ============================================================== */}
            <aside
                id="dashboard-side-drawer"
                aria-label={
                    isSearchActive ? "Search and filter analog sites" : "Recent searches"
                }
                inert={!isSidebarOpen}
                className={`absolute lg:relative right-0 top-0 h-full z-30 transition-all duration-300 ease-in-out bg-[#0B0E13] ${
                    isSidebarOpen
                        ? "w-[min(21rem,88dvw)] sm:w-88 md:w-92 xl:w-96 translate-x-0 opacity-100 p-4 border-l border-[#21242C] shadow-2xl lg:shadow-none"
                        : "w-0 translate-x-full lg:translate-x-0 lg:w-0 p-0 m-0 border-none overflow-hidden opacity-0 pointer-events-none"
                }`}
            >
                {/* Standardized Top-Right Collapse Button inside Drawer */}
                {isSidebarOpen && (
                    <button
                        type="button"
                        onClick={() => setIsSidebarOpen(false)}
                        className="absolute top-3.5 right-4 z-40 w-8 h-8 rounded-lg bg-[#1A1D23] border border-[#21242C] flex items-center justify-center text-[#8891A0] hover:text-[#F1EEE9] hover:border-[#83CAD8]/60 hover:bg-[#1E2129] transition cursor-pointer"
                        title="Collapse sidebar"
                        aria-label="Collapse sidebar"
                        aria-expanded={true}
                        aria-controls="dashboard-side-drawer"
                    >
                        <ChevronRight size={15} aria-hidden="true" />
                    </button>
                )}

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
