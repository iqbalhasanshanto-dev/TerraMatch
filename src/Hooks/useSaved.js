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
            setLoading(false);
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
    }, [user?.email]);

    useEffect(() => {
        fetchSavedLocations();
    }, [fetchSavedLocations]);

    return {
        savedLoc,
        setSavedLoc,
        refetchSaved: fetchSavedLocations,
        loading,
        error
    };
};

export default useSaved;
