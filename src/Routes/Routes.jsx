import { createBrowserRouter } from "react-router";
import MainLayout from "../LayOuts/MainLayout";
import Home from "../Pages/Home";
import Loader from "../Components/Loader";
import SearchPage from "../Pages/SearchPage";
import LocDetailsPage from "../Pages/LocDetailsPage";
import ErrorPage from "../Components/ErrorPage";
import AuthLayout from "../LayOuts/AuthLayout";
import Login from "../Pages/Login";
import SavedPage from "../Pages/SavedPage";
import ComparePage from "../Pages/ComparePage";
import AboutPage from "../Pages/AboutPage";
import DataServerPage from "../Pages/DataServerPage";

/**
 * ============================================================================
 * React Router Configuration
 * ============================================================================
 * Maps application paths to page components within nested layout shells:
 * - All primary exploration tabs (`Dashboard`, `Search`, `Saved`, `Compare`,
 *   `Data Sources`, `About`) are openly browsable by guests as well as
 *   authenticated users without forced redirects.
 * - Guests attempting to save or compare locations are guided to `/login`
 *   via an interactive in-app toast prompt.
 */
const router = createBrowserRouter([
    {
        // --------------------------------------------------------------------
        // Primary Application Layout Shell (Navbar + Active Route Viewport)
        // --------------------------------------------------------------------
        path: "/",
        element: <MainLayout />,
        hydrateFallbackElement: <Loader />,
        errorElement: <ErrorPage />,
        children: [
            {
                index: true,
                element: <Home />,
            },
            {
                path: "/search",
                element: <SearchPage />,
            },
            {
                path: "/details/:_id",
                element: <LocDetailsPage />,
            },
            {
                path: "/saved",
                element: <SavedPage />,
            },
            {
                path: "/compare",
                element: <ComparePage />,
            },
            {
                path: "/data-server",
                element: <DataServerPage />,
            },
            {
                path: "/data-sources",
                element: <DataServerPage />,
            },
            {
                path: "/about",
                element: <AboutPage />,
            },
        ],
    },
    {
        // --------------------------------------------------------------------
        // Standalone Authentication Layout Shell
        // --------------------------------------------------------------------
        path: "/",
        Component: AuthLayout,
        children: [
            {
                path: "/login",
                Component: Login,
            },
        ],
    },
]);

export default router;
