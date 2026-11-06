import { LogOut, Bookmark, GitCompare, ChevronDown } from "lucide-react";
import useAuth from "../Hooks/useAuth";
import { toast } from "react-toastify";
import { Link } from "react-router";

/**
 * Profile Component
 * User profile avatar and dropdown menu with session logout and quick navigation.
 */
const Profile = () => {
    const { user, logOut } = useAuth();

    // Log out authenticated user
    const handleLogout = () => {
        logOut()
            .then(() => {
                toast.success("Successfully logged out!");
            })
            .catch(error => {
                console.error("Logout error:", error);
                toast.error("Failed to log out. Please try again.");
            });
    };

    // Extract initials or default to "TM"
    const getInitials = (name) => {
        if (!name) return "TM";
        const parts = name.trim().split(" ");
        if (parts.length >= 2) {
            return (parts[0][0] + parts[1][0]).toUpperCase();
        }
        return name.slice(0, 2).toUpperCase();
    };

    return (
        <div className="dropdown dropdown-end">
            {/* Profile Avatar Button */}
            <div
                tabIndex={0}
                role="button"
                className="flex items-center gap-2 cursor-pointer p-0.5 rounded-full hover:ring-1 hover:ring-slate-700 transition"
            >
                {user?.photoURL ? (
                    <img
                        src={user.photoURL}
                        alt={user.displayName || "User"}
                        className="w-8 h-8 rounded-full object-cover border border-slate-700"
                    />
                ) : (
                    <div className="w-8 h-8 rounded-full bg-[#242c37] border border-slate-700 flex items-center justify-center text-xs font-semibold text-white">
                        {getInitials(user?.displayName || user?.email)}
                    </div>
                )}
                <ChevronDown size={14} className="text-slate-400" />
            </div>

            {/* Dropdown Menu */}
            <ul
                tabIndex={0}
                className="dropdown-content z-50 mt-2 w-60 rounded-xl bg-[#151a22] p-2.5 shadow-2xl border border-slate-800 text-slate-300"
            >
                {/* User Information Summary */}
                <li className="mb-2 p-2 bg-[#1e2530] rounded-lg border border-slate-700/60">
                    <p className="font-semibold text-xs text-white truncate">
                        {user?.displayName || "Authenticated Explorer"}
                    </p>
                    <p className="text-[11px] text-slate-400 truncate mt-0.5">
                        {user?.email}
                    </p>
                </li>

                {/* Navigation Options */}
                <li>
                    <Link
                        to="/saved"
                        className="flex items-center gap-2.5 px-2.5 py-1.5 text-xs rounded-lg hover:bg-[#242c37] hover:text-white transition"
                    >
                        <Bookmark size={14} className="text-slate-400" />
                        My Saved Sites
                    </Link>
                </li>

                <li>
                    <Link
                        to="/compare"
                        className="flex items-center gap-2.5 px-2.5 py-1.5 text-xs rounded-lg hover:bg-[#242c37] hover:text-white transition"
                    >
                        <GitCompare size={14} className="text-slate-400" />
                        Compare Targets
                    </Link>
                </li>

                <div className="border-t border-slate-800 my-1.5" />

                {/* Logout Action */}
                <li>
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-2.5 w-full text-red-400 hover:bg-red-500/10 hover:text-red-300 px-2.5 py-1.5 text-xs rounded-lg transition"
                    >
                        <LogOut size={14} />
                        Sign Out
                    </button>
                </li>
            </ul>
        </div>
    );
};

export default Profile;
