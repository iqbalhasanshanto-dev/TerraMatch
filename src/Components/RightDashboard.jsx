import { useContext, useState } from "react";
import Map from "./Map";
import StateContext from "../States/StateContext";
import Tweaks from "./Tweaks";
import ShowRecentSearches from "./ShowRecentSearches";
import { ChevronLeft } from "lucide-react";
import { useLocation } from "react-router";

/**
 * RightDashboard Component
 * Core dashboard layout consisting of an interactive satellite map and a fixed dark drawer sidebar.
 * Displays "Tweaks" (search & filter panel) when in search mode or on /search route;
 * otherwise displays "ShowRecentSearches" matching Dashboard.png.
 */
const RightDashboard = () => {
    const { isSearch } = useContext(StateContext);
    const location = useLocation();
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    // Determine if search filters should be active based on route or context state
    const isSearchActive = isSearch || location.pathname === '/search';

    return (
        <div className="relative w-full h-full flex overflow-hidden bg-[#080d15]">
            {/* Main Satellite Map Viewport */}
            <div className="flex-1 h-full relative min-w-0">
                <Map />

                {/* Floating Reopen Button (visible when sidebar is collapsed) */}
                {!isSidebarOpen && (
                    <button
                        onClick={() => setIsSidebarOpen(true)}
                        className="absolute top-4 right-4 z-20 w-8 h-8 rounded-lg bg-[#151a22] border border-slate-700/80 text-slate-300 hover:text-white hover:border-slate-500 flex items-center justify-center shadow-2xl transition cursor-pointer"
                        title="Open Sidebar"
                        aria-label="Open Sidebar"
                    >
                        <ChevronLeft size={16} />
                    </button>
                )}
            </div>

            {/* Fixed Dark Drawer Sidebar (matches Dashboard.png) */}
            <aside
                className={`fixed lg:relative right-0 top-0 h-full z-30 transition-all duration-300 ease-in-out bg-[#151a22] border-l border-slate-800 ${
                    isSidebarOpen
                        ? "w-80 sm:w-88 md:w-92 xl:w-96 translate-x-0 opacity-100 p-4"
                        : "w-0 translate-x-full lg:translate-x-0 lg:w-0 p-0 overflow-hidden opacity-0 pointer-events-none"
                }`}
            >
                <div className="w-full h-full flex flex-col">
                    {isSearchActive ? (
                        <Tweaks onClose={() => setIsSidebarOpen(false)} />
                    ) : (
                        <ShowRecentSearches onClose={() => setIsSidebarOpen(false)} />
                    )}
                </div>
            </aside>
        </div>
    );
};

export default RightDashboard;
