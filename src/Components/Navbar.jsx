// ----------------------------------------------------------------------------
// External Dependencies & UI Icons
// ----------------------------------------------------------------------------
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

// ----------------------------------------------------------------------------
// Internal State, Hooks & Child Components
// ----------------------------------------------------------------------------
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
 * - Desktop Active Tab: Bright cyan (`#83CAD8`) semibold label, subtly elevated
 *   and scaled icon, and a glowing bottom underline indicator bar flush with
 *   the bottom border of the navbar.
 * - Desktop Inactive Tabs: Muted slate (`#8891A0`) text and icon transitioning
 *   to warm off-white (`#F1EEE9`) with a subtle upward icon lift on hover.
 * - Mobile Drawer (< xl): Preserves the collapsible dropdown menu with boxed
 *   active highlights for touch-friendly vertical tapping.
 * - Authentication Area:
 *   - Logged in (`user` truthy): Renders the authenticated `<Profile />` menu.
 *   - Logged out (`!user`): Renders only a crisp cyan `"Sign in"` CTA button
 *     linking to `/login`.
 */
const Navbar = () => {
    // ------------------------------------------------------------------------
    // 1. Hooks, Context Subscriptions & Local UI State
    // ------------------------------------------------------------------------
    // Current Firebase authenticated user object (null when signed out)
    const { user } = useAuth();

    // Global search mode toggle shared between the navbar and RightDashboard
    const { isSearch, setIsSearch } = useContext(StateContext);

    // Current router location used to synchronize active navigation styling and redirect state
    const location = useLocation();

    // Controls open/closed visibility of the collapsible mobile navigation drawer (< xl viewports)
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    // ------------------------------------------------------------------------
    // 2. Derived Navigation State & Pre-Login Return Path
    // ------------------------------------------------------------------------
    // Search mode is active either via StateContext flag or when visiting `/search` directly
    const isSearchActive = isSearch || location.pathname === "/search";

    // Full path + query string to return the user to after completing sign-in
    const postLoginReturnPath =
        location.pathname !== "/login"
            ? `${location.pathname}${location.search}`
            : "/";

    // ------------------------------------------------------------------------
    // 3. Navigation Click Handler Functions
    // ------------------------------------------------------------------------
    /**
     * Persists the user's current route in `sessionStorage` right before
     * navigating to `/login` so both popup and full-page redirect OAuth flows
     * return them to the exact page they started from.
     */
    const handleSignInClick = () => {
        if (location.pathname !== "/login" && typeof window !== "undefined") {
            window.sessionStorage.setItem(
                "terramatch_post_login_redirect",
                `${location.pathname}${location.search}`
            );
        }
        setMobileMenuOpen(false);
    };

    /**
     * Activates search/filter sidebar mode and closes the mobile navigation drawer.
     */
    const handleSearchClick = () => {
        setIsSearch(true);
        setMobileMenuOpen(false);
    };

    /**
     * Restores default dashboard mode (Recent Searches) and closes the mobile menu.
     */
    const handleDashboardClick = () => {
        setIsSearch(false);
        setMobileMenuOpen(false);
    };

    /**
     * Resets search mode flag for non-map routes and closes the mobile menu.
     */
    const handleGenericNavClick = () => {
        setIsSearch(false);
        setMobileMenuOpen(false);
    };

    // ------------------------------------------------------------------------
    // 4. Primary Navigation Tab Configuration
    // ------------------------------------------------------------------------
    // Centralized route definitions shared between desktop underline tabs and mobile drawer
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
     *
     * @param {Object} item - Navigation configuration entry from `navItems`
     * @returns {boolean} True when the tab should display active styling
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
            {/* ==============================================================
                Left Branding & Mobile Hamburger Trigger Block
               ============================================================== */}
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

            {/* ==============================================================
                Center Navigation Tabs (Desktop Viewports >= xl)
                Spans full header height (`h-full` inside `h-14`) so each
                active underline indicator sits flush on the bottom border.
               ============================================================== */}
            <nav aria-label="Primary" className="hidden xl:flex items-center gap-7 h-full">
                {navItems.map((item) => {
                    // Determine whether this tab represents the current view or search mode
                    const active = isTabActive(item);
                    // Resolve the Lucide icon component assigned to this route
                    const IconComponent = item.icon;

                    return (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            end={item.exact}
                            onClick={item.onClick}
                            aria-current={active ? "page" : undefined}
                            className={`group relative h-full flex items-center gap-2 px-1 text-sm font-medium transition-all duration-200 ${
                                active
                                    ? "text-[#83CAD8] font-semibold"
                                    : "text-[#8891A0] hover:text-[#F1EEE9]"
                            }`}
                        >
                            {/* Tab Icon: Pops upward & scales when active; lifts subtly on hover */}
                            <IconComponent
                                size={15}
                                aria-hidden="true"
                                className={`shrink-0 ${
                                    active
                                        ? "text-[#83CAD8] -translate-y-0.5 scale-110 transition-transform duration-200"
                                        : "text-[#8891A0]/70 group-hover:text-[#F1EEE9] group-hover:-translate-y-0.5 transition-all duration-200"
                                }`}
                            />

                            {/* Tab Label */}
                            <span>{item.label}</span>

                            {/* Active Bottom Indicator Bar: Crisp glowing cyan bar flush at navbar bottom */}
                            {active && (
                                <span
                                    aria-hidden="true"
                                    className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#83CAD8] rounded-t-full shadow-[0_-2px_8px_rgba(131,202,216,0.5)]"
                                />
                            )}
                        </NavLink>
                    );
                })}
            </nav>

            {/* ==============================================================
                Right Action Section: Authenticated Profile or Sign-In CTA
               ============================================================== */}
            <div className="flex items-center gap-3 sm:gap-4">
                {user ? (
                    /* Authenticated user dropdown and account controls */
                    <Profile />
                ) : (
                    /* Guest state: Clean Sign in button preserving the current route for post-login return */
                    <Link
                        to="/login"
                        state={{ from: postLoginReturnPath }}
                        onClick={handleSignInClick}
                        className="px-3.5 py-1.5 rounded-lg bg-[#83CAD8] text-[#090D15] font-semibold text-xs hover:opacity-90 transition"
                    >
                        Sign in
                    </Link>
                )}
            </div>

            {/* ==============================================================
                Mobile Collapsible Navigation Dropdown Panel (Viewports < xl)
               ============================================================== */}
            {mobileMenuOpen && (
                <nav
                    id="mobile-navigation-menu"
                    aria-label="Mobile navigation"
                    className="absolute top-14 left-0 w-full bg-[#0B0E13] border-b border-[#21242C] shadow-2xl xl:hidden p-3 flex flex-col gap-1 z-50 animate-in fade-in slide-in-from-top-2 duration-150"
                >
                    {navItems.map((item) => {
                        // Compute active state per mobile drawer item
                        const active = isTabActive(item);
                        // Resolve the Lucide icon component for the drawer link
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
                                {/* Mobile Drawer Tab Icon */}
                                <IconComponent
                                    size={16}
                                    aria-hidden="true"
                                    className={
                                        active ? "text-[#83CAD8]" : "text-[#8891A0]"
                                    }
                                />
                                {/* Mobile Drawer Tab Label */}
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
