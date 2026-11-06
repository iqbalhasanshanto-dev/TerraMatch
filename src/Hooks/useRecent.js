import axios from "axios";
import { useEffect, useState, useCallback } from "react";
import useAuth from "./useAuth";
import { API_BASE_URL } from "../utils/api";

/**
 * Custom Hook: useRecent
 * Fetches and manages the recent search history for the logged-in user.
 */
const useRecent = () => {
    const { user } = useAuth();
    const [recentSearched, setRecentSearched] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Fetch user's recent searches
    const fetchRecentSearches = useCallback(() => {
        if (!user?.email) {
            setRecentSearched([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        axios(`${API_BASE_URL}/recent-searches/${encodeURIComponent(user.email)}`)
            .then(response => {
                setRecentSearched(response.data || []);
            })
            .catch(err => {
                console.error("Failed to fetch recent searches:", err);
                setError(err);
            })
            .finally(() => setLoading(false));
    }, [user?.email]);

    useEffect(() => {
        fetchRecentSearches();
    }, [fetchRecentSearches]);

    return {
        recentSearched,
        setRecentSearched,
        refetchRecent: fetchRecentSearches,
        loading,
        error
    };
};

export default useRecent;
