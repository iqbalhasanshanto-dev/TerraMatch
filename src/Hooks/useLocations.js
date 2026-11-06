import axios from "axios";
import { useEffect, useState } from "react";
import { API_BASE_URL } from "../utils/api";

/**
 * Custom Hook: useLocations
 * Fetches all candidate planetary analog locations from the database.
 */
const useLocations = () => {
    const [locData, setLocData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        setLoading(true);
        axios(`${API_BASE_URL}/location`)
            .then(response => {
                setLocData(response.data || []);
            })
            .catch(err => {
                console.error("Failed to fetch locations:", err);
                setError(err);
            })
            .finally(() => setLoading(false));
    }, []);

    return { locData, loading, error };
};

export default useLocations;
