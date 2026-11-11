import { useState } from "react";
import { LogOut, Bookmark, GitCompare, ChevronDown } from "lucide-react";
import useAuth from "../Hooks/useAuth";
import { toast } from "react-toastify";
import { Link } from "react-router";

/**
 * ============================================================================
 * Profile Component
 * ============================================================================
 * Renders the authenticated user's profile avatar, display name, and account
 * action dropdown inside the top Navbar:
 * - Avatar Priority Chain:
 *   1. Google account profile photo (`user.photoURL`) rendered with
 *      `referrerPolicy="no-referrer"` so Google CDN images are never blocked.
 *   2. Generated `ui-avatars.com` avatar matching the deep-space palette
 *      (`background=1A1D23`, `color=83CAD8`) if `photoURL` is missing or errors.
 *   3. Two-letter uppercase initials badge if external avatar requests fail offline.
 * - Display Name: `user.displayName || user.email.split("@")[0]`.
 * - Dropdown Menu (`#090B10`): Links to `/saved`, `/compare`, and Sign Out (`#D04D39`).
 */
const Profile = () => {
    // ------------------------------------------------------------------------
    // 1. Authentication Hook & Avatar Error Tracking State
    // ------------------------------------------------------------------------
    // Active Firebase user session and sign-out action
    const { user, logOut } = useAuth();

    // Tracks image URLs that failed to load so we can gracefully fall back
    // without triggering synchronous setState inside effects
    const [failedImageUrls, setFailedImageUrls] = useState(() => new Set());

    // ------------------------------------------------------------------------
    // 2. Derived User Identity & Avatar URL Chain
    // ------------------------------------------------------------------------
    // Primary readable user name derived from Google displayName or email prefix
    const userDisplayName =
        user?.displayName || user?.email?.split("@")[0] || "Explorer";

    // Secondary UI Avatars fallback URL styled with TerraMatch dark tokens
    const fallbackAvatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(
        user?.displayName || user?.email || "User"
    )}&background=1A1D23&color=83CAD8`;

    // Determine which avatar source to render based on availability and prior load errors
    const primaryPhotoUrl = user?.photoURL || "";
    const activeAvatarSrc =
        primaryPhotoUrl && !failedImageUrls.has(primaryPhotoUrl)
            ? primaryPhotoUrl
            : !failedImageUrls.has(fallbackAvatarUrl)
            ? fallbackAvatarUrl
            : null;

    // ------------------------------------------------------------------------
    // 3. Helper Functions: Logout, Initials & Image Error Handling
    // ------------------------------------------------------------------------
    /**
     * Records a failed avatar URL so the component automatically switches to
     * the next tier in the avatar fallback chain.
     */
    const handleAvatarError = () => {
        if (!activeAvatarSrc) return;
        setFailedImageUrls((prev) => {
            const next = new Set(prev);
            next.add(activeAvatarSrc);
            return next;
        });
    };

    /**
     * Terminates the current Firebase session and displays status toast feedback.
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
     * Computes uppercase two-letter initials from the user's name or email
     * as a final offline fallback if remote avatar images cannot load.
     */
    const getInitials = (name) => {
        if (!name) return "TM";
        const parts = name.trim().split(/\s+/);
        if (parts.length >= 2) {
            return (parts[0][0] + parts[1][0]).toUpperCase();
        }
        return name.slice(0, 2).toUpperCase();
    };

    // ------------------------------------------------------------------------
    // 4. Component Render Block
    // ------------------------------------------------------------------------
    return (
        <div className="dropdown dropdown-end select-none">
            {/* Profile Trigger Pill: Circular Google Photo + Display Name + Chevron */}
            <div
                tabIndex={0}
                role="button"
                aria-label={`Account menu for ${userDisplayName}`}
                className="flex items-center gap-2 cursor-pointer py-1 px-1.5 rounded-full hover:bg-[#1E2129] hover:ring-1 hover:ring-[#21242C] transition"
            >
                {/* Circular Profile Avatar with no-referrer policy and fallback chain */}
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

                {/* User Name Label (Visible on small screens and wider) */}
                <span className="text-xs font-medium text-[#F1EEE9] hidden sm:inline-block max-w-36 truncate">
                    {userDisplayName}
                </span>

                {/* Dropdown Caret Icon */}
                <ChevronDown
                    size={14}
                    aria-hidden="true"
                    className="text-[#8891A0] shrink-0"
                />
            </div>

            {/* Account Actions Dropdown Menu (Deep-Space Popover Surface `#090B10`) */}
            <ul
                tabIndex={0}
                className="dropdown-content z-50 mt-2 w-60 rounded-xl bg-[#090B10] p-2.5 shadow-2xl border border-[#21242C] text-[#F1EEE9]"
            >
                {/* User Identity Summary Header Card */}
                <li className="mb-2 p-2 bg-[#181A21] rounded-lg border border-[#21242C]">
                    <p className="font-semibold text-xs text-[#F1EEE9] truncate">
                        {userDisplayName}
                    </p>
                    <p className="text-[11px] text-[#8891A0] truncate mt-0.5">
                        {user?.email}
                    </p>
                </li>

                {/* Navigation Link: My Saved Sites */}
                <li>
                    <Link
                        to="/saved"
                        className="flex items-center gap-2.5 px-2.5 py-1.5 text-xs rounded-lg text-[#8891A0] hover:bg-[#1E2129] hover:text-[#F1EEE9] transition"
                    >
                        <Bookmark size={14} aria-hidden="true" className="text-[#83CAD8]" />
                        <span>My Saved Sites</span>
                    </Link>
                </li>

                {/* Navigation Link: Compare Targets */}
                <li>
                    <Link
                        to="/compare"
                        className="flex items-center gap-2.5 px-2.5 py-1.5 text-xs rounded-lg text-[#8891A0] hover:bg-[#1E2129] hover:text-[#F1EEE9] transition"
                    >
                        <GitCompare size={14} aria-hidden="true" className="text-[#83CAD8]" />
                        <span>Compare Targets</span>
                    </Link>
                </li>

                {/* Visual Section Divider */}
                <div className="border-t border-[#21242C] my-1.5" />

                {/* Sign Out Action Button */}
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
