import { LogOut, Bookmark, GitCompare, ChevronDown } from "lucide-react";
import useAuth from "../Hooks/useAuth";
import { toast } from "react-toastify";
import { Link } from "react-router";

/**
 * ============================================================================
 * Profile Component
 * ============================================================================
 * Renders the authenticated user's profile trigger in the navbar:
 * - Avatar: User profile picture or fallback container with initials ("TM" or user initials).
 * - Name Display: Shows the user's name (or email prefix) on viewports >= sm.
 * - Dropdown Menu (Popover `#090B10`): Quick navigation to saved locations,
 *   comparison matrix, and session sign out with destructive accent `#D04D39`.
 */
const Profile = () => {
    // ------------------------------------------------------------------------
    // 1. Authentication Hook & Session Actions
    // ------------------------------------------------------------------------
    const { user, logOut } = useAuth();

    /**
     * Terminates authenticated session and notifies user
     */
    const handleLogout = () => {
        logOut()
            .then(() => {
                toast.success("Successfully logged out!");
            })
            .catch((error) => {
                console.error("Logout error:", error);
                toast.error("Failed to log out. Please try again.");
            });
    };

    /**
     * Extracts uppercase two-letter initials from name or email
     */
    const getInitials = (name) => {
        if (!name) return "TM";
        const parts = name.trim().split(" ");
        if (parts.length >= 2) {
            return (parts[0][0] + parts[1][0]).toUpperCase();
        }
        return name.slice(0, 2).toUpperCase();
    };

    // User's display name or username derived from email
    const userDisplayName = user?.displayName || user?.email?.split("@")[0] || "Explorer";

    // ------------------------------------------------------------------------
    // 2. Render
    // ------------------------------------------------------------------------
    return (
        <div className="dropdown dropdown-end select-none">
            {/* Profile Avatar & Name Trigger Button */}
            <div
                tabIndex={0}
                role="button"
                className="flex items-center gap-2 cursor-pointer py-1 px-1.5 rounded-full hover:bg-[#1E2129] hover:ring-1 hover:ring-[#21242C] transition"
            >
                {/* Circular Profile Avatar */}
                {user?.photoURL ? (
                    <img
                        src={user.photoURL}
                        alt={user.displayName || "User"}
                        className="w-8 h-8 rounded-full object-cover border border-[#21242C]"
                    />
                ) : (
                    <div className="w-8 h-8 rounded-full bg-[#1A1D23] border border-[#21242C] flex items-center justify-center text-xs font-semibold text-[#F1EEE9] tracking-wide">
                        {getInitials(user?.displayName || user?.email)}
                    </div>
                )}

                {/* Authenticated User Display Name (visible on screens >= sm) */}
                <span className="text-xs font-medium text-[#F1EEE9] hidden sm:inline-block max-w-36 truncate">
                    {userDisplayName}
                </span>

                {/* Dropdown Chevron Indicator */}
                <ChevronDown size={14} className="text-[#8891A0] shrink-0" />
            </div>

            {/* Dropdown Menu (Styled with Popover tokens: bg-[#090B10], border-[#21242C]) */}
            <ul
                tabIndex={0}
                className="dropdown-content z-50 mt-2 w-60 rounded-xl bg-[#090B10] p-2.5 shadow-2xl border border-[#21242C] text-[#F1EEE9]"
            >
                {/* User Information Summary Card (bg-[#181A21]) */}
                <li className="mb-2 p-2 bg-[#181A21] rounded-lg border border-[#21242C]">
                    <p className="font-semibold text-xs text-[#F1EEE9] truncate">
                        {user?.displayName || "Authenticated Explorer"}
                    </p>
                    <p className="text-[11px] text-[#8891A0] truncate mt-0.5">
                        {user?.email}
                    </p>
                </li>

                {/* Navigation Option: My Saved Sites */}
                <li>
                    <Link
                        to="/saved"
                        className="flex items-center gap-2.5 px-2.5 py-1.5 text-xs rounded-lg text-[#8891A0] hover:bg-[#1E2129] hover:text-[#F1EEE9] transition"
                    >
                        <Bookmark size={14} className="text-[#83CAD8]" />
                        <span>My Saved Sites</span>
                    </Link>
                </li>

                {/* Navigation Option: Compare Targets */}
                <li>
                    <Link
                        to="/compare"
                        className="flex items-center gap-2.5 px-2.5 py-1.5 text-xs rounded-lg text-[#8891A0] hover:bg-[#1E2129] hover:text-[#F1EEE9] transition"
                    >
                        <GitCompare size={14} className="text-[#83CAD8]" />
                        <span>Compare Targets</span>
                    </Link>
                </li>

                <div className="border-t border-[#21242C] my-1.5" />

                {/* Logout Action (Destructive accent #D04D39) */}
                <li>
                    <button
                        type="button"
                        onClick={handleLogout}
                        className="flex items-center gap-2.5 w-full text-[#D04D39] hover:bg-[#D04D39]/10 hover:text-[#D04D39] px-2.5 py-1.5 text-xs rounded-lg transition cursor-pointer"
                    >
                        <LogOut size={14} />
                        <span>Sign Out</span>
                    </button>
                </li>
            </ul>
        </div>
    );
};

export default Profile;
