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
import PrivateRoute from "./PrivateRoute";
import ComparePage from "../Pages/ComparePage";
import AboutPage from "../Pages/AboutPage";
import DataServerPage from "../Pages/DataServerPage";
import SettingsPage from "../Pages/SettingsPage";

/**
 * React Router Configuration
 * Maps application paths to components with nested layouts and private route protections.
 */
const router = createBrowserRouter([
    {
        path: '/',
        element: <MainLayout />,
        hydrateFallbackElement: <Loader />,
        errorElement: <ErrorPage />,
        children: [
            {
                index: true,
                element: <Home />,
            },
            {
                path: '/search',
                element: <SearchPage />,
            },
            {
                path: '/details/:_id',
                element: <LocDetailsPage />
            },
            {
                path: '/saved',
                element: (
                    <PrivateRoute>
                        <SavedPage />
                    </PrivateRoute>
                ),
            },
            {
                path: '/compare',
                element: (
                    <PrivateRoute>
                        <ComparePage />
                    </PrivateRoute>
                ),
            },
            {
                path: '/data-server',
                element: <DataServerPage />,
            },
            {
                path: '/data-sources',
                element: <DataServerPage />,
            },
            {
                path: '/about',
                element: <AboutPage />,
            },
            {
                path: '/settings',
                element: <SettingsPage />,
            },
        ]
    },
    {
        path: '/',
        Component: AuthLayout,
        children: [
            {
                path: '/login',
                Component: Login,
            },
        ]
    }
]);

export default router;
