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
 * Renders the primary top navigation header for the TerraMatch platform,
 * preserving the custom deep-space color palette:
 * - Surface & Border: `#0B0E13` background with `#21242C` bottom border.
 * - Active Navigation Pill: `#1A1D23` fill, `#21242C` border, `#F1EEE9` text, `#83CAD8` icon.
 * - Inactive Tabs: `#8891A0` text with `#1E2129` hover state.
 * - Authentication Area:
 *   - Logged in (`user` truthy): Renders the authenticated `<Profile />` menu.
 *   - Logged out (`!user`): Renders only a crisp cyan `"Sign in"` CTA button linking to `/login`
 *     (the legacy guest `"TM"` circle has been removed).
 */
const Navbar = () => {
    // ------------------------------------------------------------------------
    // 1. Hooks, Context Subscriptions & Local UI State
    // ------------------------------------------------------------------------
    // Current Firebase authenticated user object (null when signed out)
    const { user } = useAuth();

    // Global search mode toggle shared between the navbar and RightDashboard
    const { isSearch, setIsSearch } = useContext(StateContext);

    // Current router location used to synchronize active navigation styling
    const location = useLocation();

    // Controls visibility of the collapsible navigation menu on viewports < xl
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    // ------------------------------------------------------------------------
    // 2. Derived Navigation State
    // ------------------------------------------------------------------------
    // Search mode is active either via StateContext flag or when visiting `/search`
    const isSearchActive = isSearch || location.pathname === "/search";

    // ------------------------------------------------------------------------
    // 3. Navigation Click Handler Functions
    // ------------------------------------------------------------------------
    /**
     * Activates search/filter sidebar mode and closes the mobile navigation drawer.
     */
    const handleSearchClick = () => {
        setIsSearch(true);
        setMobileMenuOpen(false);
    };

    /**
     * Restores default dashboard mode (Recent Searches) and closes mobile menu.
     */
    const handleDashboardClick = () => {
        setIsSearch(false);
        setMobileMenuOpen(false);
    };

    /**
     * Resets search mode flag for non-map routes and closes mobile menu.
     */
    const handleGenericNavClick = () => {
        setIsSearch(false);
        setMobileMenuOpen(false);
    };

    // ------------------------------------------------------------------------
    // 4. Primary Navigation Tab Configuration
    // ------------------------------------------------------------------------
    // Centralized route definitions shared between desktop pill tabs and mobile drawer
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

    // ------------------------------------------------------------------------
    // 5. Helper Function: Active Tab Matcher
    // ------------------------------------------------------------------------
    /**
     * Determines whether a navigation item matches the active route or search state.
     * Ensures `/search` and `/` highlight independently even when sharing `RightDashboard`.
     */
    const isTabActive = (item) => {
        if (isSearchActive) {
            return item.path === "/search";
        }
        if (item.path === "/") {
            return location.pathname === "/" && !isSearchActive;
        }
        if (item.path === "/data-sources" || item.path === "/data-server") {
            return (
                location.pathname === "/data-sources" ||
                location.pathname === "/data-server"
            );
        }
        return location.pathname === item.path;
    };

    // ------------------------------------------------------------------------
    // 6. Component Render Block
    // ------------------------------------------------------------------------
    return (
        <header className="w-full bg-[#0B0E13] border-b border-[#21242C] px-4 sm:px-6 h-14 flex items-center justify-between relative z-2000 select-none">
            {/* Left Branding & Mobile Hamburger Trigger Block */}
            <div className="flex items-center gap-3">
                {/* Mobile Navigation Menu Toggle Button (Visible below xl breakpoint) */}
                <button
                    type="button"
                    onClick={() => setMobileMenuOpen((prev) => !prev)}
                    className="p-1.5 rounded-lg text-[#8891A0] hover:text-[#F1EEE9] hover:bg-[#1E2129] xl:hidden focus-visible:outline-2 focus-visible:outline-[#83CAD8] transition cursor-pointer"
                    aria-label="Toggle navigation menu"
                    aria-expanded={mobileMenuOpen}
                    aria-controls="mobile-navigation-menu"
                >
                    {mobileMenuOpen ? (
                        <X size={20} aria-hidden="true" />
                    ) : (
                        <Menu size={20} aria-hidden="true" />
                    )}
                </button>

                {/* Top-Left Brand Home Link with Custom TerraMatch Logo */}
                <Link
                    to="/"
                    onClick={handleDashboardClick}
                    className="flex items-center group cursor-pointer"
                >
                    <Logo />
                </Link>
            </div>

            {/* Center Navigation Pills (Desktop Viewports >= xl) */}
            <nav aria-label="Primary" className="hidden xl:flex items-center gap-1.5">
                {navItems.map((item) => {
                    const active = isTabActive(item);
                    const IconComponent = item.icon;
                    return (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            end={item.exact}
                            onClick={item.onClick}
                            aria-current={active ? "page" : undefined}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition duration-150 ${
                                active
                                    ? "bg-[#1A1D23] text-[#F1EEE9] border border-[#21242C] shadow-sm"
                                    : "text-[#8891A0] hover:text-[#F1EEE9] hover:bg-[#1E2129] border border-transparent"
                            }`}
                        >
                            <IconComponent
                                size={15}
                                aria-hidden="true"
                                className={`shrink-0 ${
                                    active ? "text-[#83CAD8]" : "text-[#8891A0]"
                                }`}
                            />
                            <span>{item.label}</span>
                        </NavLink>
                    );
                })}
            </nav>

            {/* Right Action Section: Authenticated Profile Dropdown or Clean Sign-In CTA */}
            <div className="flex items-center gap-3 sm:gap-4">
                {user ? (
                    <Profile />
                ) : (
                    /* Guest state: Clean Sign in button without any circular "TM" avatar badge */
                    <Link
                        to="/login"
                        className="px-3.5 py-1.5 rounded-lg bg-[#83CAD8] text-[#090D15] font-semibold text-xs hover:opacity-90 transition"
                    >
                        Sign in
                    </Link>
                )}
            </div>

            {/* Mobile Collapsible Navigation Dropdown Panel (Viewports < xl) */}
            {mobileMenuOpen && (
                <nav
                    id="mobile-navigation-menu"
                    aria-label="Mobile navigation"
                    className="absolute top-14 left-0 w-full bg-[#0B0E13] border-b border-[#21242C] shadow-2xl xl:hidden p-3 flex flex-col gap-1 z-50 animate-in fade-in slide-in-from-top-2 duration-150"
                >
                    {navItems.map((item) => {
                        const active = isTabActive(item);
                        const IconComponent = item.icon;
                        return (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                end={item.exact}
                                aria-current={active ? "page" : undefined}
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
                                <IconComponent
                                    size={16}
                                    aria-hidden="true"
                                    className={
                                        active ? "text-[#83CAD8]" : "text-[#8891A0]"
                                    }
                                />
                                <span>{item.label}</span>
                            </NavLink>
                        );
                    })}
                </nav>
            )}
        </header>
    );
};

export default Navbar;
