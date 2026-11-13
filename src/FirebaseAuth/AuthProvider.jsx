import { useEffect, useState } from "react";
import { AuthContext } from "./AuthContext";
import {
    GoogleAuthProvider,
    onAuthStateChanged,
    signInWithPopup,
    signOut,
} from "firebase/auth";
import { toast } from "react-toastify";
import { auth } from "./Firebase.ini";

// Google OAuth provider instance configured with account selector
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

// Authentication context provider component
const AuthProvider = ({ children }) => {
    // Auth configuration check and state
    const isAuthAvailable = Boolean(auth && !auth.isFallback);
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(isAuthAvailable);

    // Initiates Google sign-in via popup
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

        const popupPromise = signInWithPopup(auth, googleProvider);
        setLoading(true);

        return popupPromise
            .then((result) => {
                if (result?.user) {
                    setUser(result.user);
                }
                setLoading(false);
                return result;
            })
            .catch((error) => {
                if (auth?.currentUser) {
                    setUser(auth.currentUser);
                    setLoading(false);
                    return { user: auth.currentUser };
                }

                if (error?.code === "auth/cancelled-popup-request") {
                    setLoading(false);
                    return null;
                }

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

    // Signs out active user
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

    // Subscribes to Firebase auth state changes
    useEffect(() => {
        if (!isAuthAvailable) {
            return;
        }

        let isMounted = true;
        let unSubscribe;

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

    // Auth context payload
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
