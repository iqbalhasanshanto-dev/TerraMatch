import { useState, useContext } from "react";
import {
    LayoutDashboard,
    Search,
    Star,
    Columns3,
    Database,
    BookOpen,
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
 * The primary top navigation bar for the TerraMatch platform, styled with the
 * custom deep-space design tokens:
 * - Surface: `#0B0E13` (Card/Sidebar surface) with border `#21242C`.
 * - Active tab pill: `#1A1D23` (Secondary surface) with `#21242C` border and `#F1EEE9` text.
 * - Inactive tabs: `#8891A0` (Muted foreground) with hover `#1E2129` (Accent) and `#F1EEE9`.
 * - User Actions: Authenticated profile dropdown or guest avatar circle with `#83CAD8` ring.
 */
const Navbar = () => {
    // ------------------------------------------------------------------------
    // 1. Hooks & Global Context Subscriptions
    // ------------------------------------------------------------------------

    // Authenticated user session
    const { user } = useAuth();

    // Controls whether Search & Filter mode is active
    const { isSearch, setIsSearch } = useContext(StateContext);

    // Current React Router path for route-aware tab states
    const location = useLocation();

    // Mobile menu drawer toggle state
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    // ------------------------------------------------------------------------
    // 2. Search State Computation
    // ------------------------------------------------------------------------
    const isSearchActive = isSearch || location.pathname === "/search";

    // ------------------------------------------------------------------------
    // 3. Navigation Click Handlers
    // ------------------------------------------------------------------------
    const handleSearchClick = () => {
        setIsSearch(true);
        setMobileMenuOpen(false);
    };

    const handleDashboardClick = () => {
        setIsSearch(false);
        setMobileMenuOpen(false);
    };

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
            path: "/data-sources",
            icon: Database,
            onClick: handleGenericNavClick,
        },
        {
            label: "About",
            path: "/about",
            icon: BookOpen,
            onClick: handleGenericNavClick,
        },
    ];

    /**
     * Determines whether a navigation tab is active.
     */
    const isTabActive = (item) => {
        if (isSearchActive) {
            return item.path === "/search";
        }
        if (item.path === "/") {
            return location.pathname === "/" && !isSearchActive;
        }
        if (item.path === "/data-sources" || item.path === "/data-server") {
            return location.pathname === "/data-sources" || location.pathname === "/data-server";
        }
        return location.pathname === item.path;
    };

    // ------------------------------------------------------------------------
    // 5. Render
    // ------------------------------------------------------------------------
    return (
        <header className="w-full bg-[#0B0E13] border-b border-[#21242C] px-4 sm:px-6 h-14 flex items-center justify-between relative z-2000 select-none">
            {/* Left Branding Block */}
            <div className="flex items-center gap-3">
                {/* Mobile Menu Toggle */}
                <button
                    type="button"
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    className="p-1.5 rounded-lg text-[#8891A0] hover:text-[#F1EEE9] hover:bg-[#1E2129] xl:hidden focus:outline-none transition cursor-pointer"
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
                                    ? "bg-[#1A1D23] text-[#F1EEE9] border border-[#21242C] shadow-sm"
                                    : "text-[#8891A0] hover:text-[#F1EEE9] hover:bg-[#1E2129] border border-transparent"
                            }`}
                        >
                            <item.icon size={15} className={`shrink-0 ${active ? "text-[#83CAD8]" : "text-[#8891A0]"}`} />
                            <span>{item.label}</span>
                        </NavLink>
                    );
                })}
            </nav>

            {/* Right Action Section: User Account & Initials Avatar */}
            <div className="flex items-center gap-3 sm:gap-4">
                {user ? (
                    <Profile />
                ) : (
                    <div className="flex items-center gap-3">
                        <Link
                            to="/login"
                            className="text-xs sm:text-sm font-medium text-[#8891A0] hover:text-[#F1EEE9] transition duration-150"
                        >
                            Sign up
                        </Link>

                        {/* Circular Container with "TM" initials */}
                        <Link
                            to="/login"
                            className="w-8 h-8 rounded-full bg-[#1A1D23] border border-[#21242C] flex items-center justify-center text-xs font-semibold text-[#F1EEE9] tracking-wide shadow-sm hover:border-[#83CAD8] transition duration-150"
                            title="Sign in / Sign up"
                        >
                            TM
                        </Link>
                    </div>
                )}
            </div>

            {/* Mobile Navigation Dropdown */}
            {mobileMenuOpen && (
                <div className="absolute top-14 left-0 w-full bg-[#0B0E13] border-b border-[#21242C] shadow-2xl xl:hidden p-3 flex flex-col gap-1 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                    {navItems.map((item) => {
                        const active = isTabActive(item);
                        return (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                end={item.exact}
                                onClick={() => {
                                    if (item.onClick) item.onClick();
                                    setMobileMenuOpen(false);
                                }}
                                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition ${
                                    active
                                        ? "bg-[#1A1D23] text-[#F1EEE9] border border-[#21242C] shadow-sm"
                                        : "text-[#8891A0] hover:text-[#F1EEE9] hover:bg-[#1E2129]"
                                }`}
                            >
                                <item.icon size={16} className={active ? "text-[#83CAD8]" : "text-[#8891A0]"} />
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
