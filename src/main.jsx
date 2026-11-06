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
 * routing, and deep-space themed toast notifications.
 *
 * Toast Notifications Configuration:
 * - Theme: "dark" matching the `#090B10` popover token.
 * - Position: "bottom-left" non-intrusive notification banner.
 * - Custom styling: Popover surface (`#090B10`), border (`#21242C`), and high-legibility text (`#F1EEE9`).
 */
createRoot(document.getElementById("root")).render(
    <StrictMode>
        {/* Deep-Space Themed Notification Toast Container */}
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
            toastClassName="!bg-[#090B10] !text-[#F1EEE9] !border !border-[#21242C] !rounded-xl !shadow-2xl text-xs font-sans"
        />

        <AuthProvider>
            <StateProvider>
                <RouterProvider router={router} />
            </StateProvider>
        </AuthProvider>
    </StrictMode>
);
