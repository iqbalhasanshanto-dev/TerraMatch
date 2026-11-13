import { useContext } from "react";
import StateContext from "../States/StateContext";

// Exposes synchronized saved bookmarks state and actions from StateContext
const useSaved = () => {
    const context = useContext(StateContext);

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
