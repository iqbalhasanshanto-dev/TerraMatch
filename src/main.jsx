import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { RouterProvider } from "react-router";
import router from "./Routes/Routes.jsx";
import StateProvider from "./States/StateProvider.jsx";
import AuthProvider from "./FirebaseAuth/AuthProvider.jsx";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// ============================================================================
// Programmatic Netlify Badge / Deploy-Drawer Suppression Observer
// ============================================================================

/**
 * Inspects DOM nodes outside `#root` and removes any Netlify-injected
 * deploy-preview drawers, identity widgets, or fixed bottom-right
 * `"Powered by Netlify"` badges so they never cover map controls or UI panels.
 */
const removeInjectedNetlifyBadges = () => {
    if (typeof document === "undefined") return;

    const rootEl = document.getElementById("root");

    /**
     * Checks whether a candidate DOM element lives strictly outside `#root`.
     */
    const isOutsideRoot = (el) =>
        Boolean(el && (!rootEl || (el !== rootEl && !rootEl.contains(el))));

    // 1. Remove known Netlify drawer, iframe, and Identity widget selectors
    const explicitSelectors = [
        'iframe[src*="netlify"]',
        'iframe[id*="netlify"]',
        "[data-netlify-deploy-drawer]",
        "#netlify-identity-widget",
        ".netlify-identity-button",
        '[class*="netlify-identity"]',
        "[data-netlify-identity-widget]",
    ];

    explicitSelectors.forEach((selector) => {
        document.querySelectorAll(selector).forEach((el) => {
            if (isOutsideRoot(el)) {
                el.remove();
            }
        });
    });

    // 2. Remove any fixed bottom-right `a[href*="netlify.com"]` outside `#root`
    document.querySelectorAll('a[href*="netlify.com"]').forEach((anchor) => {
        if (!isOutsideRoot(anchor)) return;
        const container = anchor.closest("div, aside, footer") || anchor;
        if (isOutsideRoot(container)) {
            const style = window.getComputedStyle(container);
            const anchorStyle = window.getComputedStyle(anchor);
            if (
                style.position === "fixed" ||
                anchorStyle.position === "fixed" ||
                (anchor.textContent || "").toLowerCase().includes("netlify")
            ) {
                container.remove();
            }
        }
    });

    // 3. Remove any fixed bottom-right `div` outside `#root` containing "Powered by Netlify"
    document.querySelectorAll("body > div, html > div").forEach((div) => {
        if (!isOutsideRoot(div)) return;
        const text = (div.textContent || "").toLowerCase();
        if (text.includes("powered by netlify")) {
            div.remove();
        }
    });
};

/**
 * Attaches a lightweight `MutationObserver` on `document.documentElement`
 * (covering both `<html>` and `<body>`) to strip dynamically injected Netlify
 * overlay elements as soon as they appear.
 */
const startNetlifyBadgeObserver = () => {
    if (typeof window === "undefined" || typeof MutationObserver === "undefined") {
        return;
    }

    // Perform an immediate sweep on script evaluation
    removeInjectedNetlifyBadges();

    const observer = new MutationObserver((mutations) => {
        const hasAddedNodes = mutations.some(
            (mutation) => mutation.addedNodes && mutation.addedNodes.length > 0
        );
        if (hasAddedNodes) {
            removeInjectedNetlifyBadges();
        }
    });

    observer.observe(document.documentElement, {
        childList: true,
        subtree: true,
    });
};

startNetlifyBadgeObserver();

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
