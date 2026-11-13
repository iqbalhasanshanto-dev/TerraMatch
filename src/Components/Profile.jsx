import { useState } from "react";
import { LogOut, Bookmark, GitCompare, ChevronDown } from "lucide-react";
import useAuth from "../Hooks/useAuth";
import { toast } from "react-toastify";
import { Link } from "react-router";

// Authenticated user avatar, display name, and account dropdown
const Profile = () => {
    // Active Firebase user session and sign-out action
    const { user, logOut } = useAuth();

    // Tracks avatar image URLs that failed to load
    const [failedImageUrls, setFailedImageUrls] = useState(() => new Set());

    // Primary user display name derived from profile or email
    const userDisplayName =
        user?.displayName || user?.email?.split("@")[0] || "Explorer";

    // UI Avatars fallback URL styled with dark theme tokens
    const fallbackAvatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(
        user?.displayName || user?.email || "User"
    )}&background=1A1D23&color=83CAD8`;

    // Resolves avatar source based on fallback chain
    const primaryPhotoUrl = user?.photoURL || "";
    const activeAvatarSrc =
        primaryPhotoUrl && !failedImageUrls.has(primaryPhotoUrl)
            ? primaryPhotoUrl
            : !failedImageUrls.has(fallbackAvatarUrl)
            ? fallbackAvatarUrl
            : null;

    // Switches to next avatar source if primary fails
    const handleAvatarError = () => {
        if (!activeAvatarSrc) return;
        setFailedImageUrls((prev) => {
            const next = new Set(prev);
            next.add(activeAvatarSrc);
            return next;
        });
    };

    // Signs out user and displays toast feedback
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

    // Computes initials as offline fallback avatar
    const getInitials = (name) => {
        if (!name) return "TM";
        const parts = name.trim().split(/\s+/);
        if (parts.length >= 2) {
            return (parts[0][0] + parts[1][0]).toUpperCase();
        }
        return name.slice(0, 2).toUpperCase();
    };

    return (
        <div className="dropdown dropdown-end select-none">
            {/* Profile trigger pill with photo and name */}
            <div
                tabIndex={0}
                role="button"
                aria-label={`Account menu for ${userDisplayName}`}
                className="flex items-center gap-2 cursor-pointer py-1 px-1.5 rounded-full hover:bg-[#1E2129] hover:ring-1 hover:ring-[#21242C] transition"
            >
                {/* Profile avatar with fallback */}
                {activeAvatarSrc ? (
                    <img
                        src={activeAvatarSrc}
                        alt={userDisplayName}
                        width={32}
                        height={32}
                        referrerPolicy="no-referrer"
                        onError={handleAvatarError}
                        className="w-8 h-8 rounded-full object-cover border border-[#21242C] bg-[#1A1D23] shrink-0"
                    />
                ) : (
                    <div className="w-8 h-8 rounded-full bg-[#1A1D23] border border-[#21242C] flex items-center justify-center text-xs font-semibold text-[#83CAD8] tracking-wide shrink-0">
                        {getInitials(user?.displayName || user?.email)}
                    </div>
                )}

                {/* User display name */}
                <span className="text-xs font-medium text-[#F1EEE9] hidden sm:inline-block max-w-36 truncate">
                    {userDisplayName}
                </span>

                {/* Dropdown caret icon */}
                <ChevronDown
                    size={14}
                    aria-hidden="true"
                    className="text-[#8891A0] shrink-0"
                />
            </div>

            {/* Account actions dropdown menu */}
            <ul
                tabIndex={0}
                className="dropdown-content z-50 mt-2 w-60 rounded-xl bg-[#090B10] p-2.5 shadow-2xl border border-[#21242C] text-[#F1EEE9]"
            >
                {/* User identity summary card */}
                <li className="mb-2 p-2 bg-[#181A21] rounded-lg border border-[#21242C]">
                    <p className="font-semibold text-xs text-[#F1EEE9] truncate">
                        {userDisplayName}
                    </p>
                    <p className="text-[11px] text-[#8891A0] truncate mt-0.5">
                        {user?.email}
                    </p>
                </li>

                {/* My saved sites navigation link */}
                <li>
                    <Link
                        to="/saved"
                        className="flex items-center gap-2.5 px-2.5 py-1.5 text-xs rounded-lg text-[#8891A0] hover:bg-[#1E2129] hover:text-[#F1EEE9] transition"
                    >
                        <Bookmark size={14} aria-hidden="true" className="text-[#83CAD8]" />
                        <span>My Saved Sites</span>
                    </Link>
                </li>

                {/* Compare targets navigation link */}
                <li>
                    <Link
                        to="/compare"
                        className="flex items-center gap-2.5 px-2.5 py-1.5 text-xs rounded-lg text-[#8891A0] hover:bg-[#1E2129] hover:text-[#F1EEE9] transition"
                    >
                        <GitCompare size={14} aria-hidden="true" className="text-[#83CAD8]" />
                        <span>Compare Targets</span>
                    </Link>
                </li>

                {/* Section divider */}
                <div className="border-t border-[#21242C] my-1.5" />

                {/* Sign out action button */}
                <li>
                    <button
                        type="button"
                        onClick={handleLogout}
                        className="flex items-center gap-2.5 w-full text-[#D04D39] hover:bg-[#D04D39]/10 hover:text-[#D04D39] px-2.5 py-1.5 text-xs rounded-lg transition cursor-pointer"
                    >
                        <LogOut size={14} aria-hidden="true" />
                        <span>Sign Out</span>
                    </button>
                </li>
            </ul>
        </div>
    );
};

export default Profile;
