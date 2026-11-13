import { useContext } from "react";
import StateContext from "../States/StateContext";

// Exposes centralized Recent Searches state and actions from StateContext
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
