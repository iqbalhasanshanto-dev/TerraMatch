import useAuth from "../Hooks/useAuth";
import { toast } from "react-toastify";
import { Globe2 } from "lucide-react";
import { useLocation, useNavigate } from "react-router";

/**
 * ============================================================================
 * Login Component
 * ============================================================================
 * User authentication portal with Google OAuth sign-in, styled with the
 * deep-space design tokens:
 * - Background: `#07090E`
 * - Card Container: `#0B0E13` with `#21242C` border
 * - Google Sign-In Action: `#1A1D23` with `#21242C` border and hover ring `#83CAD8`
 * - Typography: High-contrast starlight text `#F1EEE9` and descriptions `#8891A0`
 */
const Login = () => {
    // ------------------------------------------------------------------------
    // 1. Authentication Hooks & Navigation
    // ------------------------------------------------------------------------
    const { signInGoogle } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();

    /**
     * Authenticates with Google OAuth and redirects to previous route
     */
    const handleGoogleSignIn = () => {
        signInGoogle()
            .then(() => {
                toast.success("Successfully signed in with Google!");
                navigate(location?.state || "/");
            })
            .catch((error) => {
                console.error("Sign-in error:", error);
                toast.error(error.message || "Failed to sign in. Please try again.");
            });
    };

    // ------------------------------------------------------------------------
    // 2. Render
    // ------------------------------------------------------------------------
    return (
        <div className="min-h-screen bg-[#07090E] flex flex-col items-center justify-center px-4 relative select-none">
            {/* Login Card Container */}
            <div className="w-full max-w-88.5 bg-[#0B0E13] border border-[#21242C] rounded-2xl p-2 shadow-[0_12px_35px_rgba(0,0,0,0.6)]">
                <div className="border border-[#21242C] rounded-xl px-6 py-7 text-center">
                    {/* Logo & Platform Name */}
                    <div className="flex items-center justify-center gap-2 mb-1">
                        <Globe2 size={23} className="text-[#83CAD8]" />
                        <h1 className="text-xl font-bold text-[#F1EEE9]">
                            TerraMatch
                        </h1>
                    </div>

                    <p className="text-[11px] text-[#8891A0]">
                        Planetary Analog Platform
                    </p>

                    {/* Welcome Text */}
                    <div className="mt-5">
                        <h2 className="text-lg font-medium text-[#F1EEE9]">
                            Welcome
                        </h2>
                        <p className="text-[11px] leading-5 text-[#8891A0] mt-1">
                            Sign in to access candidate analog sites and compare
                            targets side by side.
                        </p>
                    </div>

                    {/* Google OAuth Login Action */}
                    <button
                        type="button"
                        onClick={handleGoogleSignIn}
                        className="mt-4 w-full h-9 flex items-center justify-center gap-2.5 rounded-lg bg-[#1A1D23] border border-[#21242C] text-[#F1EEE9] text-xs font-medium hover:border-[#83CAD8] hover:bg-[#1E2129] shadow-sm transition duration-150 cursor-pointer"
                    >
                        <svg
                            aria-label="Google logo"
                            width="17"
                            height="17"
                            viewBox="0 0 48 48"
                        >
                            <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3A12 12 0 1112 24c0-1.3.2-2.5.6-3.7l-6.6-5.1A20 20 0 1024 44c11 0 20-9 20-20 0-1.2-.1-2.4-.4-3.5Z" />
                            <path fill="#FF3D00" d="m6 15.2 6.6 5.1A12 12 0 0133 15.9l5.9-5.9A20 20 0 006 15.2Z" />
                            <path fill="#4CAF50" d="M24 44a20 20 0 0013.4-5.2l-6.2-5.2A12 12 0 0112 24l-6.6 5.1A20 20 0 0024 44Z" />
                            <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3a12 12 0 01-4.1 5.6l6.2 5.2A20 20 0 0044 24c0-1.2-.1-2.4-.4-3.5Z" />
                        </svg>
                        <span>Login with Google</span>
                    </button>

                    {/* Support & Legal Links */}
                    <div className="mt-5">
                        <p className="text-[9px] text-[#8891A0]">
                            Need help?{" "}
                            <a
                                href="mailto:support@terramatch.com"
                                className="text-[#83CAD8] hover:underline"
                            >
                                Contact support
                            </a>
                        </p>

                        <p className="text-[9px] text-[#8891A0] mt-2 leading-4">
                            By signing in, you agree to our{" "}
                            <a href="#" className="text-[#83CAD8] hover:underline">
                                Terms
                            </a>{" "}
                            and{" "}
                            <a href="#" className="text-[#83CAD8] hover:underline">
                                Privacy Policy
                            </a>
                        </p>
                    </div>
                </div>
            </div>

            {/* Footer Notice */}
            <div className="absolute bottom-4 text-center">
                <p className="text-[9px] text-[#8891A0]/70">
                    © 2026 TerraMatch • Planetary Analog Platform
                </p>
                <p className="text-[9px] text-[#8891A0]/60 mt-1">
                    TerraMatch Platform v2.4
                </p>
            </div>
        </div>
    );
};

export default Login;
