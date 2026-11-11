import { useContext } from "react";
import StateContext from "../States/StateContext";

/**
 * ============================================================================
 * useRecent Custom Hook
 * ============================================================================
 * Convenience hook exposing the centralized Recent Searches state and actions
 * managed inside `StateProvider` (`recentSearched`, `setRecentSearched`,
 * `recordRecentSearch`, `deleteRecentSearch`, `clearRecentSearches`, `refetchRecent`).
 * Sharing a single context source prevents out-of-sync local hook copies across
 * `Tweaks`, `ShowRecentSearches`, and `Map`.
 */
const useRecent = () => {
    const context = useContext(StateContext);

    return {
        recentSearched: context?.recentSearched || [],
        setRecentSearched: context?.setRecentSearched,
        recordRecentSearch: context?.recordRecentSearch,
        deleteRecentSearch: context?.deleteRecentSearch,
        clearRecentSearches: context?.clearRecentSearches,
        refetchRecent: context?.refetchRecent,
        loading: Boolean(context?.recentLoading),
    };
};

export default useRecent;
