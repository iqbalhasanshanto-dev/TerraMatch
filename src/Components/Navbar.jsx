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
import { Link, NavLink } from "react-router";
import StateContext from "../States/StateContext";
import useAuth from "../Hooks/useAuth";
import Profile from "./Profile";
import Logo from "./Logo";

/**
 * Navbar Component
 * Dark charcoal/slate top navigation bar matching the TerraMatch design mockup.
 * Displays left stacked typography branding, centered pill-style tabs, and user action/avatar.
 */
const Navbar = () => {
    const { user } = useAuth();
    const { setIsSearch } = useContext(StateContext);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    // Switch sidebar drawer into search/filter mode
    const handleSearchClick = () => {
        setIsSearch(true);
        setMobileMenuOpen(false);
    };

    // Switch sidebar drawer back to recent searches / overview mode
    const handleDashboardClick = () => {
        setIsSearch(false);
        setMobileMenuOpen(false);
    };

    const navItems = [
        { label: "Dashboard", path: "/", icon: LayoutDashboard, exact: true, onClick: handleDashboardClick },
        { label: "Search", path: "/search", icon: Search, onClick: handleSearchClick },
        { label: "Saved", path: "/saved", icon: Star },
        { label: "Compare", path: "/compare", icon: Columns3 },
        { label: "Data Sources", path: "/data-server", icon: Database },
        { label: "About", path: "/about", icon: BookOpen },
        { label: "Settings", path: "/settings", icon: Settings },
    ];

    return (
        <header className="w-full bg-[#13161c] border-b border-slate-800/80 px-4 sm:px-6 h-14 flex items-center justify-between relative z-2000 select-none">
            {/* Left Branding */}
            <div className="flex items-center gap-3">
                {/* Mobile Menu Toggle Button */}
                <button
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/50 xl:hidden focus:outline-none transition"
                    aria-label="Toggle navigation menu"
                >
                    {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
                </button>

                <Link to="/" onClick={handleDashboardClick} className="flex items-center group">
                    <Logo />
                </Link>
            </div>

            {/* Centered Pill Navigation Tabs (Desktop / Large Viewports) */}
            <nav className="hidden xl:flex items-center gap-1.5">
                {navItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        end={item.exact}
                        onClick={item.onClick}
                        className={({ isActive }) =>
                            `flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition duration-150 ${
                                isActive
                                    ? "bg-[#242c37] text-white border border-slate-700 shadow-sm"
                                    : "text-slate-400 hover:text-white hover:bg-slate-800/40 border border-transparent"
                            }`
                        }
                    >
                        <item.icon size={15} className="shrink-0" />
                        <span>{item.label}</span>
                    </NavLink>
                ))}
            </nav>

            {/* Right Action Section */}
            <div className="flex items-center gap-3 sm:gap-4">
                {user ? (
                    <Profile />
                ) : (
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

            {/* Mobile / Compact Navigation Drawer */}
            {mobileMenuOpen && (
                <div className="absolute top-14 left-0 w-full bg-[#13161c] border-b border-slate-800 shadow-2xl xl:hidden p-3 flex flex-col gap-1 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            end={item.exact}
                            onClick={() => {
                                if (item.onClick) item.onClick();
                                setMobileMenuOpen(false);
                            }}
                            className={({ isActive }) =>
                                `flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition ${
                                    isActive
                                        ? "bg-[#242c37] text-white border border-slate-700 shadow-sm"
                                        : "text-slate-400 hover:text-white hover:bg-slate-800/40"
                                }`
                            }
                        >
                            <item.icon size={16} />
                            <span>{item.label}</span>
                        </NavLink>
                    ))}
                </div>
            )}
        </header>
    );
};

export default Navbar;
