import { useEffect, useState } from "react";
import { AuthContext } from "./AuthContext";
import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
// Note: Matched file casing with Firebase.ini.js to prevent Linux/Vite case-sensitivity build errors
import { auth } from "./Firebase.ini";

// Initialize Google Auth Provider
const googleProvider = new GoogleAuthProvider();

/**
 * AuthProvider component that provides authentication state and methods
 * across the entire application using React Context.
 */
const AuthProvider = ({ children }) => {
    const isAuthAvailable = Boolean(auth && !auth.isFallback);
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(isAuthAvailable);

    // Sign in using Google OAuth Popup
    const signInGoogle = () => {
        setLoading(true);
        if (!isAuthAvailable) {
            console.warn("Firebase Auth is not available or unconfigured.");
            setLoading(false);
            return Promise.reject(
                new Error("Firebase Authentication is not configured. Please add your credentials to the .env file.")
            );
        }
        return signInWithPopup(auth, googleProvider).finally(() => {
            setLoading(false);
        });
    };

    // Sign out current authenticated user
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

    // Listen to Firebase authentication state changes
    useEffect(() => {
        if (!isAuthAvailable) {
            return;
        }

        let unSubscribe;
        try {
            unSubscribe = onAuthStateChanged(
                auth,
                (currentUser) => {
                    setUser(currentUser);
                    setLoading(false);
                },
                (error) => {
                    console.error("Firebase Auth state error:", error);
                    setUser(null);
                    setLoading(false);
                }
            );
        } catch (error) {
            console.error("Error setting up auth state listener:", error);
            queueMicrotask(() => {
                setUser(null);
                setLoading(false);
            });
        }

        return () => {
            if (typeof unSubscribe === "function") {
                unSubscribe();
            }
        };
    }, [isAuthAvailable]);

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
