import { useState } from 'react';
import StateContext from './StateContext';

/**
 * StateProvider Component
 * Manages global UI states including search panel visibility, filtered locations,
 * and active map target coordinates for smooth map navigation.
 */
const StateProvider = ({ children }) => {
    // Controls whether the search/filter panel ("Tweaks") is open
    const [isSearch, setIsSearch] = useState(false);

    // List of locations currently filtered by criteria
    const [filteredLoc, setFilteredLoc] = useState([]);

    // Target coordinates to pan/fly the Leaflet map to [latitude, longitude]
    const [mapTarget, setMapTarget] = useState(null);

    const stateInfo = {
        isSearch,
        setIsSearch,
        filteredLoc,
        setFilteredLoc,
        mapTarget,
        setMapTarget,
    };

    return (
        <StateContext value={stateInfo}>
            {children}
        </StateContext>
    );
};

export default StateProvider;
