import { useContext } from "react";
import Map from "./Map";
import StateContext from "../States/StateContext";
import Tweaks from "./Tweaks";
import ShowRecentSearches from "./ShowRecentSearches";
import { PanelLeftClose } from "lucide-react";
import { useLocation } from "react-router";

/**
 * RightDashboard Component
 * Core dashboard layout consisting of an interactive world map and a collapsible side drawer.
 * Displays "Tweaks" (search & filter panel) when in search mode or on /search route;
 * otherwise displays "ShowRecentSearches".
 */
const RightDashboard = () => {
    const { isSearch } = useContext(StateContext);
    const location = useLocation();

    // Determine if search filters should be active based on route or context state
    const isSearchActive = isSearch || location.pathname === '/search';

    return (
        <div className="drawer lg:drawer-open drawer-end h-full">
            <input
                id="my-drawer-4"
                type="checkbox"
                className="drawer-toggle inline"
                defaultChecked
            />

            {/* Main Interactive Map Viewport */}
            <div className="drawer-content h-full">
                <Map />
            </div>

            {/* Collapsible Sidebar Drawer */}
            <div className="drawer-side is-drawer-close:overflow-visible z-20">
                <label
                    htmlFor="my-drawer-4"
                    aria-label="close sidebar"
                    className="drawer-overlay"
                />

                <div className="flex min-h-full flex-col items-start bg-base-200 is-drawer-close:w-14 is-drawer-open:w-96 border-l border-base-300">
                    <ul className="menu w-full grow p-2">
                        {/* Drawer Toggle Button */}
                        <label
                            htmlFor="my-drawer-4"
                            aria-label="toggle sidebar"
                            className="btn btn-square btn-ghost drawer-button mb-2"
                        >
                            <PanelLeftClose size={20} />
                        </label>

                        {/* Sidebar Content Panel */}
                        <div className="is-drawer-close:hidden w-full">
                            {isSearchActive ? <Tweaks /> : <ShowRecentSearches />}
                        </div>
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default RightDashboard;
