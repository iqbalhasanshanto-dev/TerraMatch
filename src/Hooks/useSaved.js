import axios from "axios";
import { useEffect, useState, useCallback } from "react";
import useAuth from "./useAuth";
import { API_BASE_URL } from "../utils/api";

/**
 * Custom Hook: useSaved
 * Fetches and manages the saved candidate analog locations for the authenticated user.
 */
const useSaved = () => {
    const { user } = useAuth();
    const [savedLoc, setSavedLoc] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Fetch user's saved locations
    const fetchSavedLocations = useCallback(() => {
        if (!user?.email) {
            setSavedLoc([]);
            return;
        }

        setLoading(true);
        axios(`${API_BASE_URL}/savedLocs/${encodeURIComponent(user.email)}`)
            .then(response => {
                setSavedLoc(response.data || []);
            })
            .catch(err => {
                console.error("Failed to fetch saved locations:", err);
                setError(err);
            })
            .finally(() => setLoading(false));
    }, [user]);

    useEffect(() => {
        let isMounted = true;
        if (!user?.email) {
            return;
        }

        axios(`${API_BASE_URL}/savedLocs/${encodeURIComponent(user.email)}`)
            .then(response => {
                if (isMounted) setSavedLoc(response.data || []);
            })
            .catch(err => {
                if (isMounted) {
                    console.error("Failed to fetch saved locations:", err);
                    setError(err);
                }
            });

        return () => {
            isMounted = false;
        };
    }, [user?.email]);

    return {
        savedLoc,
        setSavedLoc,
        refetchSaved: fetchSavedLocations,
        loading,
        error
    };
};

export default useSaved;
