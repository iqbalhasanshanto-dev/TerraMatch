import { useState, useContext } from "react";
import {
    LayoutDashboard,
    Search,
    Star,
    Columns3,
    Database,
    BookOpen,
    Settings,
    Menu,
    X,
} from "lucide-react";
import { Link, NavLink, useLocation } from "react-router";
import StateContext from "../States/StateContext";
import useAuth from "../Hooks/useAuth";
import Profile from "./Profile";
import Logo from "./Logo";

/**
 * ============================================================================
 * Navbar Component
 * ============================================================================
 * The primary top navigation bar for the TerraMatch application.
 *
 * Visual Style:
 * - Dark charcoal/slate background (`#13161c`) with subtle bottom border (`border-slate-800/80`).
 * - Left Branding: Stacked typography with bold white "TerraMatch" and muted subtitle.
 * - Center Navigation: Pill-style tabs with active highlighting.
 *   - Search tab is prominently highlighted with background `#242c37` and border `border-slate-700`
 *     when on `/search` or when search mode is active.
 *   - Dashboard is highlighted only when on `/` with search mode inactive.
 * - Right Action: User profile avatar or "Sign up" button with "TM" initials circle.
 */
const Navbar = () => {
    // ------------------------------------------------------------------------
    // 1. Hooks & Global Context Subscriptions
    // ------------------------------------------------------------------------

    // Current authenticated user session (from Firebase AuthProvider)
    const { user } = useAuth();

    // Global UI state controlling whether the Search & Filter sidebar ("Tweaks") is open
    const { isSearch, setIsSearch } = useContext(StateContext);

    // Current React Router location for route-aware active link styling
    const location = useLocation();

    // Controls mobile hamburger drawer visibility on compact screens
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    // ------------------------------------------------------------------------
    // 2. Route & Search State Computations
    // ------------------------------------------------------------------------

    // Search mode is active if the global flag is set or the user is directly visiting /search
    const isSearchActive = isSearch || location.pathname === "/search";

    // ------------------------------------------------------------------------
    // 3. Navigation Click Handlers
    // ------------------------------------------------------------------------

    /**
     * Activates search filter mode and closes mobile drawer
     */
    const handleSearchClick = () => {
        setIsSearch(true);
        setMobileMenuOpen(false);
    };

    /**
     * Returns to the default overview/recent searches mode and closes mobile drawer
     */
    const handleDashboardClick = () => {
        setIsSearch(false);
        setMobileMenuOpen(false);
    };

    /**
     * Resets search mode when navigating to secondary feature pages
     */
    const handleGenericNavClick = () => {
        setIsSearch(false);
        setMobileMenuOpen(false);
    };

    // ------------------------------------------------------------------------
    // 4. Navigation Tab Definitions
    // ------------------------------------------------------------------------
    const navItems = [
        {
            label: "Dashboard",
            path: "/",
            icon: LayoutDashboard,
            exact: true,
            onClick: handleDashboardClick,
        },
        {
            label: "Search",
            path: "/search",
            icon: Search,
            onClick: handleSearchClick,
        },
        {
            label: "Saved",
            path: "/saved",
            icon: Star,
            onClick: handleGenericNavClick,
        },
        {
            label: "Compare",
            path: "/compare",
            icon: Columns3,
            onClick: handleGenericNavClick,
        },
        {
            label: "Data Sources",
            path: "/data-server",
            icon: Database,
            onClick: handleGenericNavClick,
        },
        {
            label: "About",
            path: "/about",
            icon: BookOpen,
            onClick: handleGenericNavClick,
        },
        {
            label: "Settings",
            path: "/settings",
            icon: Settings,
            onClick: handleGenericNavClick,
        },
    ];

    /**
     * Determines whether a specific navigation tab should render with active pill styling.
     * Rules:
     * - If in search mode (on /search route or isSearch is true): ONLY the Search tab is active.
     * - If on the root route ('/') and search mode is inactive: Dashboard is active.
     * - Otherwise: Tab is active if its path matches the current browser location.
     *
     * @param {Object} item - Navigation item object
     * @returns {boolean} - True if tab should be highlighted
     */
    const isTabActive = (item) => {
        if (isSearchActive) {
            return item.path === "/search";
        }
        if (item.path === "/") {
            return location.pathname === "/" && !isSearchActive;
        }
        return location.pathname === item.path;
    };

    // ------------------------------------------------------------------------
    // 5. Render
    // ------------------------------------------------------------------------
    return (
        <header className="w-full bg-[#13161c] border-b border-slate-800/80 px-4 sm:px-6 h-14 flex items-center justify-between relative z-2000 select-none">
            {/* Left Branding Block */}
            <div className="flex items-center gap-3">
                {/* Mobile Menu Hamburger Toggle */}
                <button
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/50 xl:hidden focus:outline-none transition"
                    aria-label="Toggle navigation menu"
                >
                    {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
                </button>

                {/* TerraMatch Logo and Subtitle */}
                <Link
                    to="/"
                    onClick={handleDashboardClick}
                    className="flex items-center group cursor-pointer"
                >
                    <Logo />
                </Link>
            </div>

            {/* Centered Pill Navigation Tabs (Desktop Viewports) */}
            <nav className="hidden xl:flex items-center gap-1.5">
                {navItems.map((item) => {
                    const active = isTabActive(item);
                    return (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            end={item.exact}
                            onClick={item.onClick}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition duration-150 ${
                                active
                                    ? "bg-[#242c37] text-white border border-slate-700 shadow-sm"
                                    : "text-slate-400 hover:text-white hover:bg-slate-800/40 border border-transparent"
                            }`}
                        >
                            <item.icon size={15} className="shrink-0" />
                            <span>{item.label}</span>
                        </NavLink>
                    );
                })}
            </nav>

            {/* Right Action Section: User Account & Initials Avatar */}
            <div className="flex items-center gap-3 sm:gap-4">
                {user ? (
                    // Authenticated User Avatar & Dropdown Menu
                    <Profile />
                ) : (
                    // Unauthenticated Visitor Trigger (Matches Search.png mockup)
                    <div className="flex items-center gap-3">
                        <Link
                            to="/login"
                            className="text-xs sm:text-sm font-medium text-slate-300 hover:text-white transition duration-150"
                        >
                            Sign up
                        </Link>

                        {/* Circular Slate Container with white "TM" initials */}
                        <Link
                            to="/login"
                            className="w-8 h-8 rounded-full bg-[#242c37] border border-slate-700 flex items-center justify-center text-xs font-semibold text-white tracking-wide shadow-sm hover:border-slate-500 transition duration-150"
                            title="Sign in / Sign up"
                        >
                            TM
                        </Link>
                    </div>
                )}
            </div>

            {/* Mobile / Responsive Navigation Dropdown */}
            {mobileMenuOpen && (
                <div className="absolute top-14 left-0 w-full bg-[#13161c] border-b border-slate-800 shadow-2xl xl:hidden p-3 flex flex-col gap-1 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                    {navItems.map((item) => {
                        const active = isTabActive(item);
                        return (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                end={item.exact}
                                onClick={item.onClick}
                                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition ${
                                    active
                                        ? "bg-[#242c37] text-white border border-slate-700 shadow-sm"
                                        : "text-slate-400 hover:text-white hover:bg-slate-800/40"
                                }`}
                            >
                                <item.icon size={16} />
                                <span>{item.label}</span>
                            </NavLink>
                        );
                    })}
                </div>
            )}
        </header>
    );
};

export default Navbar;
