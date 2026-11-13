import { useState, useContext, useRef, useEffect, useCallback, useMemo } from "react";
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

// Top navigation bar with sliding underline indicator and mobile drawer
const Navbar = () => {
    // Context, auth, and routing hooks
    const { user } = useAuth();
    const { isSearch, setIsSearch, setFilteredLoc } = useContext(StateContext);
    const location = useLocation();

    // Mobile menu toggle and tab boundary measurement refs
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const navRef = useRef(null);
    const tabRefs = useRef(new Map());

    // Dynamic position and width of the sliding cyan underline bar
    const [indicatorStyle, setIndicatorStyle] = useState({
        left: 0,
        width: 0,
        opacity: 0,
    });

    // Derived active search state and return path after login
    const isSearchActive = isSearch || location.pathname === "/search";
    const postLoginReturnPath =
        location.pathname !== "/login"
            ? `${location.pathname}${location.search}`
            : "/";

    // Saves current route to sessionStorage before navigating to login
    const handleSignInClick = () => {
        if (location.pathname !== "/login" && typeof window !== "undefined") {
            window.sessionStorage.setItem(
                "terramatch_post_login_redirect",
                `${location.pathname}${location.search}`
            );
        }
        setMobileMenuOpen(false);
    };

    // Switches to search mode and closes mobile drawer
    const handleSearchClick = () => {
        setIsSearch(true);
        setMobileMenuOpen(false);
    };

    // Restores default dashboard mode and clears search filters
    const handleDashboardClick = () => {
        setIsSearch(false);
        setFilteredLoc?.(null);
        setMobileMenuOpen(false);
    };

    // Resets search mode for standard routes
    const handleGenericNavClick = () => {
        setIsSearch(false);
        setMobileMenuOpen(false);
    };

    // Navigation tab definitions
    const navItems = useMemo(
        () => [
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
        ],
        // eslint-disable-next-line react-hooks/exhaustive-deps
        []
    );

    // Checks whether a given tab matches the active route or search state
    const isTabActive = useCallback((item) => {
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
    }, [isSearchActive, location.pathname]);

    // Measures active tab offset and width to animate underline indicator
    const updateIndicator = useCallback(() => {
        const activeItem = navItems.find((item) => isTabActive(item));
        if (activeItem && tabRefs.current.has(activeItem.path)) {
            const el = tabRefs.current.get(activeItem.path);
            if (el) {
                setIndicatorStyle({
                    left: el.offsetLeft,
                    width: el.offsetWidth,
                    opacity: 1,
                });
                return;
            }
        }
        setIndicatorStyle((prev) => ({ ...prev, opacity: 0 }));
    }, [isTabActive, navItems]);

    // Recalculates indicator position on route change or window resize
    useEffect(() => {
        updateIndicator();
        window.addEventListener("resize", updateIndicator);
        return () => window.removeEventListener("resize", updateIndicator);
    }, [updateIndicator]);

    return (
        <header className="w-full bg-[#0B0E13] border-b border-[#21242C] px-4 sm:px-6 h-14 flex items-center justify-between relative z-2000 select-none">
            {/* Left branding and mobile toggle */}
            <div className="flex items-center gap-3">
                {/* Mobile menu toggle button */}
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

                {/* Brand home link */}
                <Link
                    to="/"
                    onClick={handleDashboardClick}
                    className="flex items-center group cursor-pointer"
                >
                    <Logo />
                </Link>
            </div>

            {/* Desktop navigation tabs with sliding underline indicator */}
            <nav
                ref={navRef}
                aria-label="Primary"
                className="hidden xl:flex items-center gap-7 h-full relative"
            >
                {navItems.map((item) => {
                    const active = isTabActive(item);
                    const IconComponent = item.icon;

                    return (
                        <NavLink
                            key={item.path}
                            ref={(el) => {
                                if (el) {
                                    tabRefs.current.set(item.path, el);
                                } else {
                                    tabRefs.current.delete(item.path);
                                }
                            }}
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
                            <IconComponent
                                size={15}
                                aria-hidden="true"
                                className={`shrink-0 ${
                                    active
                                        ? "text-[#83CAD8] -translate-y-0.5 scale-110 transition-transform duration-200"
                                        : "text-[#8891A0]/70 group-hover:text-[#F1EEE9] group-hover:-translate-y-0.5 transition-all duration-200"
                                }`}
                            />
                            <span>{item.label}</span>
                        </NavLink>
                    );
                })}

                {/* Sliding cyan underline indicator */}
                {indicatorStyle.opacity > 0 && (
                    <span
                        className="absolute bottom-0 h-[3px] bg-[#83CAD8] rounded-t-full shadow-[0_-2px_8px_rgba(131,202,216,0.55)] transition-all duration-300 ease-out pointer-events-none"
                        style={{
                            left: indicatorStyle.left,
                            width: indicatorStyle.width,
                        }}
                        aria-hidden="true"
                    />
                )}
            </nav>

            {/* User profile menu or sign-in CTA */}
            <div className="flex items-center gap-3 sm:gap-4">
                {user ? (
                    <Profile />
                ) : (
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

            {/* Mobile navigation drawer */}
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
