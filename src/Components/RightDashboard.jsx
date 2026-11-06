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
 * collapsible dark drawer sidebar, styled with deep-space tokens:
 * - Viewport Background: `#07090E`
 * - Sidebar Drawer: `#0B0E13` (Sidebar surface) with border-l `#21242C`
 * - Standardized Toggle Buttons: `#1A1D23` / `#0B0E13` with `#21242C` border,
 *   `#8891A0` icon, and hover `#83CAD8` ring
 */
const RightDashboard = () => {
    // ------------------------------------------------------------------------
    // 1. Context Subscriptions & Route State
    // ------------------------------------------------------------------------
    const { isSearch } = useContext(StateContext);
    const location = useLocation();

    // Controls whether the right drawer sidebar is expanded or collapsed
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    // Determine if search filters should be active based on route or context
    const isSearchActive = isSearch || location.pathname === "/search";

    // ------------------------------------------------------------------------
    // 2. Render
    // ------------------------------------------------------------------------
    return (
        <div className="relative w-full h-full flex overflow-hidden bg-[#07090E] select-none">
            {/* ============================================================== */}
            {/* Main Satellite Map Viewport (Fluid Flex Item)                  */}
            {/* ============================================================== */}
            <div className="flex-1 h-full relative min-w-0">
                <Map isSidebarOpen={isSidebarOpen} />

                {/* Floating Reopen / Expand Sidebar Button (bg-[#0B0E13], border-[#21242C]) */}
                {!isSidebarOpen && (
                    <button
                        type="button"
                        onClick={() => setIsSidebarOpen(true)}
                        className="absolute top-3.5 right-4 z-20 w-7 h-7 rounded-lg bg-[#0B0E13] border border-[#21242C] text-[#8891A0] hover:text-[#F1EEE9] hover:border-[#83CAD8]/60 hover:bg-[#1E2129] flex items-center justify-center shadow-2xl transition cursor-pointer"
                        title="Expand sidebar"
                        aria-label="Expand sidebar"
                    >
                        <ChevronLeft size={15} />
                    </button>
                )}
            </div>

            {/* ============================================================== */}
            {/* Collapsible Dark Drawer Sidebar (bg-[#0B0E13], border-[#21242C]) */}
            {/* ============================================================== */}
            <aside
                className={`fixed lg:relative right-0 top-0 h-full z-30 transition-all duration-300 ease-in-out bg-[#0B0E13] ${
                    isSidebarOpen
                        ? "w-80 sm:w-88 md:w-92 xl:w-96 translate-x-0 opacity-100 p-4 border-l border-[#21242C]"
                        : "w-0 translate-x-full lg:translate-x-0 lg:w-0 p-0 m-0 border-none overflow-hidden opacity-0 pointer-events-none"
                }`}
            >
                {/* Standardized Collapse Button at top-3.5 right-4 */}
                {isSidebarOpen && (
                    <button
                        type="button"
                        onClick={() => setIsSidebarOpen(false)}
                        className="absolute top-3.5 right-4 z-40 w-7 h-7 rounded-lg bg-[#1A1D23] border border-[#21242C] flex items-center justify-center text-[#8891A0] hover:text-[#F1EEE9] hover:border-[#83CAD8]/60 hover:bg-[#1E2129] transition cursor-pointer"
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
