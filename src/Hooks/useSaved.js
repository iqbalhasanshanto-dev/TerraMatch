import { useContext } from "react";
import StateContext from "../States/StateContext";

/**
 * ============================================================================
 * Custom Hook: useSaved
 * ============================================================================
 * Consumes the centralized saved-locations state and actions provided by
 * `StateProvider` so all components share a single synchronized bookmark store
 * backed by `localStorage` and MongoDB background sync:
 * - `savedLoc`: Current user's saved analog sites array
 * - `setSavedLoc`: State setter that automatically mirrors to `localStorage`
 * - `saveLocation`: Local-first bookmark saver with quiet MongoDB background sync
 * - `removeSavedLocation`: Local-first removal helper with quiet MongoDB delete
 * - `refetchSaved`: Manual merge/refresh trigger from MongoDB + `localStorage`
 * - `loading` / `error`: Background fetch telemetry status
 */
const useSaved = () => {
    // ------------------------------------------------------------------------
    // 1. Global StateContext Subscription
    // ------------------------------------------------------------------------
    const context = useContext(StateContext);

    // ------------------------------------------------------------------------
    // 2. Defensive Fallback & Return Block
    // ------------------------------------------------------------------------
    return {
        savedLoc: context?.savedLoc || [],
        setSavedLoc: context?.setSavedLoc,
        saveLocation: context?.saveLocation,
        removeSavedLocation: context?.removeSavedLocation,
        refetchSaved: context?.refetchSaved,
        loading: Boolean(context?.savedLoading),
        error: context?.savedError || null,
    };
};

export default useSaved;
