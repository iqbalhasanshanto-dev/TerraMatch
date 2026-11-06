import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { RouterProvider } from "react-router";
import router from "./Routes/Routes.jsx";
import StateProvider from "./States/StateProvider.jsx";
import AuthProvider from "./FirebaseAuth/AuthProvider.jsx";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

/**
 * ============================================================================
 * TerraMatch Application Root Entry Point
 * ============================================================================
 * Bootstraps providers for Firebase authentication, global UI state,
 * routing, and dark space-themed toast notifications.
 *
 * Toast Notifications Configuration:
 * - Theme: "dark" to eliminate default white popups.
 * - Position: "bottom-left" non-intrusive notification banner.
 * - Custom styling: Dark background (`#181f28`), slate border, and rounded corners.
 */
createRoot(document.getElementById("root")).render(
    <StrictMode>
        {/* Dark Space-Themed Notification Toast Container */}
        <ToastContainer
            theme="dark"
            position="bottom-left"
            autoClose={3500}
            hideProgressBar={false}
            newestOnTop={true}
            closeOnClick
            rtl={false}
            pauseOnFocusLoss={false}
            draggable
            pauseOnHover
            toastClassName="!bg-[#181f28] !text-slate-200 !border !border-slate-700/80 !rounded-xl !shadow-2xl text-xs"
        />

        <AuthProvider>
            <StateProvider>
                <RouterProvider router={router} />
            </StateProvider>
        </AuthProvider>
    </StrictMode>
);
