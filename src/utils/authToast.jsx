import { toast } from "react-toastify";

// Displays toast prompting guest users to sign in.
export const showSignInPromptToast = (navigate) => {
    toast(
        ({ closeToast }) => (
            <div className="flex items-center justify-between gap-2 w-full">
                {/* Guest prompt message */}
                <span className="text-xs text-[#F1EEE9] leading-snug">
                    Please sign in to save and compare analog locations.
                </span>

                {/* Sign in button navigating to login */}
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        closeToast?.();

                        const currentPath =
                            typeof window !== "undefined" &&
                            window.location.pathname !== "/login"
                                ? `${window.location.pathname}${window.location.search}`
                                : "/";

                        if (
                            typeof window !== "undefined" &&
                            window.location.pathname !== "/login"
                        ) {
                            window.sessionStorage.setItem(
                                "terramatch_post_login_redirect",
                                currentPath
                            );
                        }

                        if (typeof navigate === "function") {
                            navigate("/login", { state: { from: currentPath } });
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

