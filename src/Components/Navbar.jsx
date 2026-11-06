import { BookOpen, Columns3, Database, LayoutDashboard, Search, Star } from "lucide-react";
import { Link, NavLink } from "react-router";
import { useContext } from "react";
import StateContext from "../States/StateContext";
import useAuth from "../Hooks/useAuth";
import Profile from "./Profile";
import Logo from "./Logo";

/**
 * Navbar Component
 * Primary application navigation bar containing branding, route navigation links,
 * theme toggle controller, and user profile / login trigger.
 */
const Navbar = () => {
    const { user } = useAuth();
    const { setIsSearch } = useContext(StateContext);

    // Switch sidebar drawer into search/filter mode
    const handleSearchClick = () => {
        setIsSearch(true);
    };

    // Switch sidebar drawer back to recent searches / overview mode
    const handleDashboardClick = () => {
        setIsSearch(false);
    };

    const links = (
        <>
            <li>
                <NavLink onClick={handleDashboardClick} to="/" end>
                    <LayoutDashboard size={18} />
                    Dashboard
                </NavLink>
            </li>

            <li>
                <NavLink onClick={handleSearchClick} to="/search">
                    <Search size={18} />
                    Search
                </NavLink>
            </li>

            <li>
                <NavLink to="/saved">
                    <Star size={18} />
                    Saved
                </NavLink>
            </li>

            <li>
                <NavLink to="/compare">
                    <Columns3 size={18} />
                    Compare
                </NavLink>
            </li>

            <li>
                <NavLink to="/data-server">
                    <Database size={18} />
                    Data Server
                </NavLink>
            </li>

            <li>
                <NavLink to="/about">
                    <BookOpen size={18} />
                    About
                </NavLink>
            </li>
        </>
    );

    return (
        <div className="navbar bg-base-100 shadow-sm relative z-2000 px-4 lg:px-12 border-b border-base-200">
            {/* Mobile Dropdown & Logo */}
            <div className="navbar-start">
                <div className="dropdown">
                    <div tabIndex={0} role="button" className="btn btn-ghost lg:hidden">
                        <svg aria-label="Menu" xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h8m-8 6h16" />
                        </svg>
                    </div>
                    <ul
                        tabIndex={-1}
                        className="menu menu-sm dropdown-content bg-base-100 rounded-box z-50 mt-3 w-52 p-2 shadow-lg border border-base-200"
                    >
                        {links}
                    </ul>
                </div>
                <Link to="/" className="flex items-center gap-2">
                    <Logo />
                </Link>
            </div>

            {/* Desktop Navigation Links */}
            <div className="navbar-center hidden lg:flex">
                <ul className="menu menu-horizontal px-1 gap-1">
                    {links}
                </ul>
            </div>

            {/* Theme Controller & Auth Profile */}
            <div className="navbar-end">
                <div className="flex items-center gap-3">
                    {/* Theme Toggle (Light / Night) */}
                    <label className="toggle text-base-content cursor-pointer" title="Toggle Theme">
                        <input type="checkbox" value="night" className="theme-controller" />
                        <svg aria-label="sun" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><g strokeLinejoin="round" strokeLinecap="round" strokeWidth="2" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v2"></path><path d="M12 20v2"></path><path d="m4.93 4.93 1.41 1.41"></path><path d="m17.66 17.66 1.41 1.41"></path><path d="M2 12h2"></path><path d="M20 12h2"></path><path d="m6.34 17.66-1.41 1.41"></path><path d="m19.07 4.93-1.41 1.41"></path></g></svg>
                        <svg aria-label="moon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><g strokeLinejoin="round" strokeLinecap="round" strokeWidth="2" fill="none" stroke="currentColor"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"></path></g></svg>
                    </label>

                    {/* Authentication Status */}
                    {user ? (
                        <Profile />
                    ) : (
                        <NavLink to="/login" className="btn btn-sm btn-primary ml-2">
                            Login
                        </NavLink>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Navbar;
