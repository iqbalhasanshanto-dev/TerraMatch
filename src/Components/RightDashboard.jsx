import { useContext, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLocation } from "react-router";
import Map from "./Map";
import StateContext from "../States/StateContext";
import Tweaks from "./Tweaks";
import ShowRecentSearches from "./ShowRecentSearches";

/**
 * ============================================================================
 * RightDashboard Component
 * ============================================================================
 * Core dashboard layout orchestrating the Leaflet satellite map and the
 * collapsible dark drawer sidebar.
 *
 * Key Capabilities & Architecture:
 * 1. Satellite Map Sync:
 *    Passes `isSidebarOpen` into `<Map />` so Leaflet invalidates tile sizes
 *    and seamlessly fills 100% of the screen when the sidebar is collapsed.
 * 2. Unified Collapse / Expand Controls:
 *    Standardizes both the collapse (`>`) and reopen (`<`) toggle buttons to
 *    exact pixel coordinates (`top-3.5 right-4`, `w-7 h-7 rounded-lg bg-[#1e2530] border border-slate-700/80`),
 *    preventing any visual jumping or misalignment.
 * 3. Zero-Border Collapsed State:
 *    Ensures `border-none p-0 m-0 overflow-hidden` when closed so no dark
 *    1px artifact remains on the right side of the screen.
 * 4. Route-Aware Content Switching:
 *    Renders `Tweaks` (multi-variable search & filter panel) when in search mode
 *    or on `/search`; otherwise renders `ShowRecentSearches` (matching Dashboard.png).
 */
const RightDashboard = () => {
    // ------------------------------------------------------------------------
    // 1. Context Subscriptions & Route State
    // ------------------------------------------------------------------------
    // Global flag indicating whether search & filter mode is engaged
    const { isSearch } = useContext(StateContext);

    // Current React Router pathname to keep search filters active on /search
    const location = useLocation();

    // Controls whether the right drawer sidebar is expanded or collapsed
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    // Determine if search filters should be active based on route or context
    const isSearchActive = isSearch || location.pathname === "/search";

    // ------------------------------------------------------------------------
    // 2. Render
    // ------------------------------------------------------------------------
    return (
        <div className="relative w-full h-full flex overflow-hidden bg-[#080d15] select-none">
            {/* ============================================================== */}
            {/* Main Satellite Map Viewport (Fluid Flex Item)                  */}
            {/* ============================================================== */}
            <div className="flex-1 h-full relative min-w-0">
                {/* Interactive Leaflet Map with Satellite Imagery */}
                <Map isSidebarOpen={isSidebarOpen} />

                {/* Floating Reopen / Expand Sidebar Button (Standardized top-3.5 right-4) */}
                {!isSidebarOpen && (
                    <button
                        type="button"
                        onClick={() => setIsSidebarOpen(true)}
                        className="absolute top-3.5 right-4 z-20 w-7 h-7 rounded-lg bg-[#1e2530] border border-slate-700/80 text-slate-400 hover:text-white hover:border-slate-500 flex items-center justify-center shadow-2xl transition cursor-pointer"
                        title="Expand sidebar"
                        aria-label="Expand sidebar"
                    >
                        <ChevronLeft size={15} />
                    </button>
                )}
            </div>

            {/* ============================================================== */}
            {/* Collapsible Dark Drawer Sidebar (Matches Dashboard.png)        */}
            {/* ============================================================== */}
            <aside
                className={`fixed lg:relative right-0 top-0 h-full z-30 transition-all duration-300 ease-in-out bg-[#151a22] ${
                    isSidebarOpen
                        ? "w-80 sm:w-88 md:w-92 xl:w-96 translate-x-0 opacity-100 p-4 border-l border-slate-800"
                        : "w-0 translate-x-full lg:translate-x-0 lg:w-0 p-0 m-0 border-none overflow-hidden opacity-0 pointer-events-none"
                }`}
            >
                {/* Standardized Collapse Button at top-3.5 right-4 */}
                {isSidebarOpen && (
                    <button
                        type="button"
                        onClick={() => setIsSidebarOpen(false)}
                        className="absolute top-3.5 right-4 z-40 w-7 h-7 rounded-lg bg-[#1e2530] border border-slate-700/80 flex items-center justify-center text-slate-400 hover:text-white hover:border-slate-500 transition cursor-pointer"
                        title="Collapse sidebar"
                        aria-label="Collapse sidebar"
                    >
                        <ChevronRight size={15} />
                    </button>
                )}

                {/* Sidebar Interior Content Container */}
                <div className="w-full h-full flex flex-col pt-1">
                    {isSearchActive ? (
                        <Tweaks />
                    ) : (
                        <ShowRecentSearches />
                    )}
                </div>
            </aside>
        </div>
    );
};

export default RightDashboard;
