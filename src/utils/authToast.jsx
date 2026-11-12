import { toast } from "react-toastify";

/**
 * ============================================================================
 * Authentication Prompt Toast Helper (`showSignInPromptToast`)
 * ============================================================================
 * Displays a non-intrusive dark notification in the bottom-left toast area
 * whenever an unauthenticated guest attempts to save or compare an analog site.
 * Includes an interactive cyan `"Sign in →"` CTA button that closes the toast
 * and navigates directly to `/login`.
 *
 * @param {Function} [navigate] - React Router `navigate` function from the caller.
 */
export const showSignInPromptToast = (navigate) => {
    toast(
        ({ closeToast }) => (
            <div className="flex items-center justify-between gap-2 w-full">
                {/* Informative guest prompt message */}
                <span className="text-xs text-[#F1EEE9] leading-snug">
                    Please sign in to save and compare analog locations.
                </span>

                {/* Interactive cyan CTA navigating directly to the Login portal */}
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        closeToast?.();
                        if (typeof navigate === "function") {
                            navigate("/login");
                        } else {
                            window.location.assign("/login");
                        }
                    }}
                    className="bg-[#83CAD8] text-[#090D15] px-2.5 py-1 rounded-md font-semibold text-xs flex items-center gap-1 ml-3 cursor-pointer shrink-0 hover:opacity-90 transition"
                >
                    <span>Sign in</span>
                    <span aria-hidden="true">→</span>
                </button>
            </div>
        ),
        {
            toastId: "terramatch-signin-prompt",
            autoClose: 5000,
        }
    );
};

