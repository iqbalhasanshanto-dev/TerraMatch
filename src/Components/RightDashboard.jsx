import { useContext, useState, useCallback, useEffect } from "react";
import { ChevronLeft, ChevronRight, Search, Clock3 } from "lucide-react";
import { useLocation } from "react-router";
import Map from "./Map";
import StateContext from "../States/StateContext";
import Tweaks from "./Tweaks";
import ShowRecentSearches from "./ShowRecentSearches";

// Layout coordinating satellite map with sliding right overlay drawer
const RightDashboard = () => {
    // Context, route, and drawer state
    const { isSearch } = useContext(StateContext);
    const location = useLocation();

    // Collapsed by default on mobile (< 1024px), expanded on desktop
    const [isSidebarOpen, setIsSidebarOpen] = useState(() =>
        typeof window !== "undefined" ? window.innerWidth >= 1024 : true
    );

    // Active search route or state flag
    const isSearchActive = isSearch || location.pathname === "/search";

    // Auto-closes drawer on mobile when a location is selected
    const handleSelectLocation = useCallback(() => {
        if (typeof window !== "undefined" && window.innerWidth < 1024) {
            setIsSidebarOpen(false);
        }
    }, []);

    // Closes drawer on Escape key in mobile view
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

    return (
        <div className="relative w-full h-full overflow-hidden bg-[#07090E] select-none">
            {/* Full-bleed satellite map viewport */}
            <div className="absolute inset-0 w-full h-full">
                <Map isSidebarOpen={isSidebarOpen} />

                {/* Floating drawer trigger when collapsed */}
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

            {/* Mobile dimmed backdrop */}
            {isSidebarOpen && (
                <div
                    aria-hidden="true"
                    onClick={() => setIsSidebarOpen(false)}
                    className="absolute inset-0 z-25 bg-black/45 backdrop-blur-[1px] lg:hidden transition-opacity"
                />
            )}

            {/* Sliding overlay drawer */}
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
                {/* Collapse button */}
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

                {/* Sidebar content container */}
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
