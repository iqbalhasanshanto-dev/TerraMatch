import axios from "axios";
import { useEffect, useState } from "react";
import { API_BASE_URL } from "../utils/api";

/**
 * Custom Hook: useLocations
 * Fetches all candidate planetary analog locations from the database,
 * with automatic fallback to static analogLocations.json when backend is offline.
 */
const useLocations = () => {
    const [locData, setLocData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        axios(`${API_BASE_URL}/location`)
            .then(response => {
                if (Array.isArray(response.data) && response.data.length > 0) {
                    setLocData(response.data);
                } else {
                    return axios('/analogLocations.json').then(res => {
                        const items = res.data?.locations || [];
                        setLocData(items.map(l => ({ ...l, _id: l.id || l._id })));
                    });
                }
            })
            .catch(() => {
                // Backend unreachable, fallback to local static dataset
                return axios('/analogLocations.json')
                    .then(res => {
                        const items = res.data?.locations || [];
                        setLocData(items.map(l => ({ ...l, _id: l.id || l._id })));
                    })
                    .catch(err => {
                        console.error("Failed to fetch locations:", err);
                        setError(err);
                    });
            })
            .finally(() => setLoading(false));
    }, []);

    return { locData, loading, error };
};

export default useLocations;
