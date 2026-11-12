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
 * Firebase Auth error codes that indicate popup-based OAuth cannot complete in
 * the current browser/COOP environment and should transparently fall back to
 * full-page redirect authentication.
 */
const REDIRECT_FALLBACK_ERROR_CODES = new Set([
    "auth/internal-error",
    "auth/popup-blocked",
    "auth/operation-not-supported-in-this-environment",
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
     * Attempts `signInWithPopup` first; if the browser or COOP policy causes
     * `auth/internal-error`, `auth/popup-blocked`, or
     * `auth/operation-not-supported-in-this-environment`, automatically falls
     * back to `signInWithRedirect`.
     *
     * @returns {Promise<import("firebase/auth").UserCredential | void>}
     */
    const signInGoogle = async () => {
        setLoading(true);
        if (!isAuthAvailable) {
            console.warn("Firebase Auth is not available or unconfigured.");
            setLoading(false);
            throw new Error(
                "Firebase Authentication is not configured. Please add your credentials to the .env file."
            );
        }

        try {
            const result = await signInWithPopup(auth, googleProvider);
            // Synchronously hydrate `user` immediately without waiting for the next auth observer tick
            if (result?.user) {
                setUser(result.user);
            }
            setLoading(false);
            return result;
        } catch (error) {
            if (shouldFallbackToRedirect(error)) {
                console.warn(
                    `Google popup sign-in failed (${error.code}); falling back to redirect sign-in.`
                );
                try {
                    return await signInWithRedirect(auth, googleProvider);
                } catch (redirectError) {
                    setLoading(false);
                    throw redirectError;
                }
            }
            setLoading(false);
            throw error;
        }
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
                console.error("Google redirect sign-in error:", error);
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
