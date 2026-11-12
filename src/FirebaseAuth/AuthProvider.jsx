import { useEffect, useState } from "react";
import { AuthContext } from "./AuthContext";
import {
    GoogleAuthProvider,
    onAuthStateChanged,
    signInWithPopup,
    signOut,
} from "firebase/auth";
import { toast } from "react-toastify";
// Note: Matched file casing with Firebase.ini.js to prevent Linux/Vite case-sensitivity build errors
import { auth } from "./Firebase.ini";

// ============================================================================
// Google OAuth Provider Configuration (Popup-Only)
// ============================================================================

/**
 * Shared GoogleAuthProvider instance configured to always prompt for account
 * selection so multi-account users can explicitly choose their Google profile.
 * Uses popup-only authentication (`signInWithPopup`) because cross-origin
 * redirect storage is blocked by third-party cookie restrictions in Chrome.
 */
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

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
    /** Tracks pending auth initialization or sign-in/out actions. */
    const [loading, setLoading] = useState(isAuthAvailable);

    // ------------------------------------------------------------------------
    // 2. Authentication Action Helpers
    // ------------------------------------------------------------------------
    /**
     * Signs the user in with Google OAuth using `signInWithPopup` exclusively.
     * Invokes `signInWithPopup(auth, googleProvider)` synchronously inside the
     * user click call stack (without any `async/await` delay) so browsers allow
     * the popup window, and immediately hydrates `user` upon resolution.
     *
     * Redirect-based fallback (`signInWithRedirect`) is intentionally omitted
     * because cross-origin redirect storage is blocked by third-party cookie
     * restrictions in modern browsers.
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
        // before any async gap or state update so browsers do not block it.
        const popupPromise = signInWithPopup(auth, googleProvider);
        setLoading(true);

        return popupPromise
            .then((result) => {
                // Immediately hydrate `user` without waiting for the next auth observer tick
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

                // Do not surface an error toast when the user intentionally closes the popup
                if (error?.code === "auth/popup-closed-by-user") {
                    setLoading(false);
                    throw error;
                }

                const errorCode = error?.code || "unknown";
                const errorMessage =
                    error?.message || "Failed to sign in with Google.";

                if (errorCode === "auth/popup-blocked") {
                    console.warn(
                        `Google sign-in popup blocked (${errorCode}): ${errorMessage}`
                    );
                    toast.error(
                        "Sign-in popup was blocked by your browser. Please allow popups for this site and try again.",
                        { toastId: "google-signin-error" }
                    );
                    setLoading(false);
                    throw error;
                }

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
    // 3. Mount Effect: Auth State Subscription
    // ------------------------------------------------------------------------
    useEffect(() => {
        if (!isAuthAvailable) {
            return;
        }

        /** Guard flag preventing state updates after component unmount. */
        let isMounted = true;
        /** Unsubscribe callback returned by `onAuthStateChanged`. */
        let unSubscribe;

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
