import { LogOut, User, Settings, ChevronDown, Bookmark } from "lucide-react";
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

    return (
        <div className="dropdown dropdown-end">
            {/* Profile Avatar Button */}
            <div
                tabIndex={0}
                role="button"
                className="flex items-center gap-2 cursor-pointer rounded-full p-1 hover:bg-base-200 transition"
            >
                <div className="avatar">
                    <div className="w-9 rounded-full ring-2 ring-base-300">
                        <img
                            src={user?.photoURL || "https://ui-avatars.com/api/?name=User"}
                            alt="Profile"
                        />
                    </div>
                </div>

                <span className="hidden md:block text-sm font-medium">
                    {user?.displayName || "User"}
                </span>

                <ChevronDown size={15} className="opacity-60" />
            </div>

            {/* Dropdown Menu */}
            <ul
                tabIndex={0}
                className="dropdown-content z-50 mt-3 w-64 rounded-2xl bg-base-100 p-3 shadow-xl border border-base-200"
            >
                {/* User Information Summary */}
                <li className="mb-2">
                    <div className="flex items-center gap-3 p-2 bg-base-200/50 rounded-xl">
                        <div className="avatar">
                            <div className="w-10 rounded-full">
                                <img
                                    src={user?.photoURL || "https://ui-avatars.com/api/?name=User"}
                                    alt="Profile"
                                />
                            </div>
                        </div>

                        <div className="min-w-0">
                            <p className="font-semibold text-sm truncate">
                                {user?.displayName || "User"}
                            </p>
                            <p className="text-xs opacity-60 truncate">
                                {user?.email}
                            </p>
                        </div>
                    </div>
                </li>

                <div className="divider my-1"></div>

                {/* Navigation Options */}
                <li>
                    <Link to="/saved" className="flex items-center gap-2.5 py-2 text-sm rounded-lg hover:bg-base-200">
                        <Bookmark size={16} />
                        My Saved Sites
                    </Link>
                </li>

                <li>
                    <Link to="/compare" className="flex items-center gap-2.5 py-2 text-sm rounded-lg hover:bg-base-200">
                        <User size={16} />
                        Compare Targets
                    </Link>
                </li>

                <div className="divider my-1"></div>

                {/* Logout Action */}
                <li>
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-2.5 w-full text-error hover:bg-error/10 py-2 text-sm rounded-lg transition"
                    >
                        <LogOut size={16} />
                        Sign Out
                    </button>
                </li>
            </ul>
        </div>
    );
};

export default Profile;
