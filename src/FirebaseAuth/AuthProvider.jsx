import { useEffect, useState } from "react";
import { AuthContext } from "./AuthContext";
import {
    GoogleAuthProvider,
    getRedirectResult,
    onAuthStateChanged,
    signInWithPopup,
    signInWithRedirect,
    signOut,
} from "firebase/auth";
import { toast } from "react-toastify";
// Note: Matched file casing with Firebase.ini.js to prevent Linux/Vite case-sensitivity build errors
import { auth } from "./Firebase.ini";

// ============================================================================
// Google OAuth Provider & Popup-to-Redirect Fallback Configuration
// ============================================================================

/**
 * Shared GoogleAuthProvider instance configured to always prompt for account
 * selection so multi-account users can explicitly choose their Google profile.
 */
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

/**
 * Firebase Auth error codes that indicate the browser blocked popup-based
 * OAuth and should fall back to redirect authentication.
 * Excludes `auth/popup-closed-by-user` and `auth/internal-error` so user
 * cancellations and internal errors are never hidden by a silent redirect.
 */
const REDIRECT_FALLBACK_ERROR_CODES = new Set([
    "auth/popup-blocked",
]);

/**
 * Checks whether a Firebase Authentication error should trigger an automatic
 * fallback from `signInWithPopup` to `signInWithRedirect`.
 *
 * @param {unknown} error - Caught error object from Firebase Auth.
 * @returns {boolean} True when redirect fallback should be invoked.
 */
const shouldFallbackToRedirect = (error) =>
    Boolean(error?.code && REDIRECT_FALLBACK_ERROR_CODES.has(error.code));

// ============================================================================
// AuthProvider Context Component
// ============================================================================

/**
 * AuthProvider component that provides authentication state and methods
 * across the entire application using React Context.
 */
const AuthProvider = ({ children }) => {
    // ------------------------------------------------------------------------
    // 1. Authentication Availability & React State
    // ------------------------------------------------------------------------
    /** True when real Firebase Auth credentials are active (not the fallback stub). */
    const isAuthAvailable = Boolean(auth && !auth.isFallback);
    /** Currently signed-in Firebase User object, or `null` when unauthenticated. */
    const [user, setUser] = useState(null);
    /** Tracks pending auth initialization, redirect resolution, or sign-in/out actions. */
    const [loading, setLoading] = useState(isAuthAvailable);

    // ------------------------------------------------------------------------
    // 2. Authentication Action Helpers
    // ------------------------------------------------------------------------
    /**
     * Signs the user in with Google OAuth.
     * Calls `signInWithPopup(auth, googleProvider)` synchronously on the user
     * click handler stack (without any `async/await` delay) so browsers do not
     * block the popup. Falls back to `signInWithRedirect` only for
     * `auth/popup-blocked`; all other errors (including `auth/internal-error`)
     * are logged and surfaced via toast with their exact code and message.
     *
     * @returns {Promise<import("firebase/auth").UserCredential | null>}
     */
    const signInGoogle = () => {
        if (!isAuthAvailable) {
            console.warn("Firebase Auth is not available or unconfigured.");
            setLoading(false);
            return Promise.reject(
                new Error(
                    "Firebase Authentication is not configured. Please add your credentials to the .env file."
                )
            );
        }

        // Invoke signInWithPopup synchronously inside the click handler stack
        // before any async gap or state update so browsers allow the popup.
        const popupPromise = signInWithPopup(auth, googleProvider);
        setLoading(true);

        return popupPromise
            .then((result) => {
                // Synchronously hydrate `user` immediately without waiting for the next auth observer tick
                if (result?.user) {
                    setUser(result.user);
                }
                setLoading(false);
                return result;
            })
            .catch((error) => {
                // If Firebase actually completed auth before reporting popup closure, use that user
                if (auth?.currentUser) {
                    setUser(auth.currentUser);
                    setLoading(false);
                    return { user: auth.currentUser };
                }

                // Ignore duplicate-click cancellations quietly while the active flow proceeds
                if (error?.code === "auth/cancelled-popup-request") {
                    setLoading(false);
                    return null;
                }

                // Do not fall back to redirect or show an error toast when the user closes the popup
                if (error?.code === "auth/popup-closed-by-user") {
                    setLoading(false);
                    throw error;
                }

                if (shouldFallbackToRedirect(error)) {
                    const errorCode = error?.code || "auth/popup-blocked";
                    const errorMessage =
                        error?.message || "Popup was blocked by your browser.";
                    console.warn(
                        `Google popup sign-in blocked (${errorCode}: ${errorMessage}); falling back to redirect sign-in.`
                    );
                    toast.info(
                        "Popup was blocked. Redirecting to Google sign-in, or allow popups for this site and try again.",
                        { toastId: "google-signin-popup-blocked" }
                    );
                    return signInWithRedirect(auth, googleProvider).catch(
                        (redirectError) => {
                            const redirectCode = redirectError?.code || "unknown";
                            const redirectMessage =
                                redirectError?.message ||
                                "Redirect sign-in failed. Please allow popups for this site and try again.";
                            console.error(
                                `Google redirect sign-in failed (${redirectCode}): ${redirectMessage}`,
                                redirectError
                            );
                            toast.error(
                                `Sign-in failed (${redirectCode}): ${redirectMessage}`,
                                { toastId: "google-signin-error" }
                            );
                            setLoading(false);
                            throw redirectError;
                        }
                    );
                }

                const errorCode = error?.code || "unknown";
                const errorMessage =
                    error?.message || "Failed to sign in with Google.";
                console.error(
                    `Google sign-in failed (${errorCode}): ${errorMessage}`,
                    error
                );
                toast.error(
                    `Sign-in failed (${errorCode}): ${errorMessage}`,
                    { toastId: "google-signin-error" }
                );
                setLoading(false);
                throw error;
            });
    };

    /**
     * Signs out the currently authenticated user and resets local auth loading state.
     *
     * @returns {Promise<void>}
     */
    const logOut = () => {
        setLoading(true);
        if (!isAuthAvailable) {
            setUser(null);
            setLoading(false);
            return Promise.resolve();
        }
        return signOut(auth).finally(() => {
            setLoading(false);
        });
    };

    // ------------------------------------------------------------------------
    // 3. Mount Effect: Redirect Result Capture & Auth State Subscription
    // ------------------------------------------------------------------------
    useEffect(() => {
        if (!isAuthAvailable) {
            return;
        }

        /** Guard flag preventing state updates after component unmount. */
        let isMounted = true;
        /** Unsubscribe callback returned by `onAuthStateChanged`. */
        let unSubscribe;

        // Capture user credentials if returning from a `signInWithRedirect` OAuth flow
        getRedirectResult(auth)
            .then((result) => {
                if (!isMounted) return;
                if (result?.user) {
                    setUser(result.user);
                    setLoading(false);
                }
            })
            .catch((error) => {
                const errorCode = error?.code || "unknown";
                const errorMessage =
                    error?.message || "Failed to complete Google redirect sign-in.";
                console.error(
                    `Google redirect sign-in error (${errorCode}): ${errorMessage}`,
                    error
                );
                toast.error(
                    `Redirect sign-in failed (${errorCode}): ${errorMessage}`,
                    { toastId: "google-signin-error" }
                );
                if (isMounted) {
                    setLoading(false);
                }
            });

        // Subscribe to persistent Firebase authentication state changes
        try {
            unSubscribe = onAuthStateChanged(
                auth,
                (currentUser) => {
                    if (!isMounted) return;
                    setUser(currentUser);
                    setLoading(false);
                },
                (error) => {
                    console.error("Firebase Auth state error:", error);
                    if (!isMounted) return;
                    setUser(null);
                    setLoading(false);
                }
            );
        } catch (error) {
            console.error("Error setting up auth state listener:", error);
            queueMicrotask(() => {
                if (!isMounted) return;
                setUser(null);
                setLoading(false);
            });
        }

        return () => {
            isMounted = false;
            if (typeof unSubscribe === "function") {
                unSubscribe();
            }
        };
    }, [isAuthAvailable]);

    // ------------------------------------------------------------------------
    // 4. Context Value & Provider Render
    // ------------------------------------------------------------------------
    /** Public authentication context payload consumed via `useAuth()`. */
    const authInfo = {
        signInGoogle,
        user,
        loading,
        logOut,
    };

    return (
        <AuthContext value={authInfo}>
            {children}
        </AuthContext>
    );
};

export default AuthProvider;
