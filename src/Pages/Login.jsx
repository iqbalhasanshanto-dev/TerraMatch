import useAuth from "../Hooks/useAuth";
import { toast } from "react-toastify";
import { useLocation, useNavigate } from "react-router";
import Logo from "../Components/Logo";

/**
 * ============================================================================
 * Login Component
 * ============================================================================
 * Enlarged, clean Google OAuth sign-in portal styled with TerraMatch's
 * custom deep-space color palette:
 * - Page Background: `#07090E`
 * - Card Container: `#0B0E13` with `#21242C` border (`max-w-md`, `p-3`, `shadow-2xl`)
 * - Inner Container: `#21242C` border with generous `px-8 py-10` breathing room
 * - Top Branding: Scaled custom `<Logo />` orbital Mars/Earth emblem + wordmark
 * - Primary CTA: Large tactile Google Sign-In button (`#1A1D23`, hover `#83CAD8`)
 */
const Login = () => {
    // ------------------------------------------------------------------------
    // 1. Authentication Hooks & Router Navigation
    // ------------------------------------------------------------------------
    const { signInGoogle } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();

    // ------------------------------------------------------------------------
    // 2. Google OAuth Sign-In Handler
    // ------------------------------------------------------------------------
    /**
     * Triggers Firebase Google OAuth popup sign-in and redirects back to the
     * user's originating route (or `/` Dashboard) upon success.
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
    // 3. Component Render Block
    // ------------------------------------------------------------------------
    return (
        <div className="min-h-screen bg-[#07090E] flex flex-col items-center justify-center px-4 relative select-none">
            {/* Enlarged Outer Authentication Card Container */}
            <div className="w-full max-w-md bg-[#0B0E13] border border-[#21242C] rounded-2xl p-3 shadow-2xl">
                {/* Inner Framed Content Container */}
                <div className="border border-[#21242C] rounded-xl px-8 py-10 text-center">
                    {/* Centered Custom TerraMatch Orbital Mars/Earth Logo */}
                    <div className="flex justify-center mb-6 scale-125">
                        <Logo />
                    </div>

                    {/* Clear Lead Copy (Replaces Legacy "Welcome" Heading) */}
                    <p className="text-sm sm:text-base leading-relaxed text-[#8891A0] mb-7 max-w-xs mx-auto">
                        Sign in to access candidate analog sites and compare targets side by side.
                    </p>

                    {/* Large Tactile Google OAuth Login Button */}
                    <button
                        type="button"
                        onClick={handleGoogleSignIn}
                        className="w-full h-11 rounded-xl bg-[#1A1D23] border border-[#21242C] text-[#F1EEE9] text-sm font-semibold hover:border-[#83CAD8] hover:bg-[#1E2129] flex items-center justify-center gap-3 transition cursor-pointer shadow-md"
                    >
                        <svg
                            aria-label="Google logo"
                            width="18"
                            height="18"
                            viewBox="0 0 48 48"
                        >
                            <path
                                fill="#FFC107"
                                d="M43.6 20.5H42V20H24v8h11.3A12 12 0 1112 24c0-1.3.2-2.5.6-3.7l-6.6-5.1A20 20 0 1024 44c11 0 20-9 20-20 0-1.2-.1-2.4-.4-3.5Z"
                            />
                            <path
                                fill="#FF3D00"
                                d="m6 15.2 6.6 5.1A12 12 0 0133 15.9l5.9-5.9A20 20 0 006 15.2Z"
                            />
                            <path
                                fill="#4CAF50"
                                d="M24 44a20 20 0 0013.4-5.2l-6.2-5.2A12 12 0 0112 24l-6.6 5.1A20 20 0 0024 44Z"
                            />
                            <path
                                fill="#1976D2"
                                d="M43.6 20.5H42V20H24v8h11.3a12 12 0 01-4.1 5.6l6.2 5.2A20 20 0 0044 24c0-1.2-.1-2.4-.4-3.5Z"
                            />
                        </svg>
                        <span>Login with Google</span>
                    </button>

                    {/* Support & Legal Links */}
                    <div className="text-xs text-[#8891A0] mt-7 space-y-2">
                        <p>
                            Need help?{" "}
                            <a
                                href="mailto:support@terramatch.com"
                                className="text-[#83CAD8] hover:underline"
                            >
                                Contact support
                            </a>
                        </p>

                        <p className="leading-relaxed">
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

            {/* Subtle Bottom Platform Footer Notice */}
            <div className="absolute bottom-4 text-center">
                <p className="text-[10px] text-[#8891A0]/70">
                    © 2026 TerraMatch • Planetary Analog Platform
                </p>
                <p className="text-[10px] text-[#8891A0]/60 mt-1">
                    TerraMatch Platform v2.4
                </p>
            </div>
        </div>
    );
};

export default Login;
