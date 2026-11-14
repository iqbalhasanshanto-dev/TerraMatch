// Backend API base URL: only use localhost when running locally on the developer machine.
// On production hosts (e.g. Vercel), omit the localhost fallback so Chrome's Local Network Access
// security prompt ("wants to access other apps and services on this device") is never triggered.
const isLocalhostEnv =
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1");

export const API_BASE_URL =
    import.meta.env.VITE_API_URL || (isLocalhostEnv ? "http://localhost:3000" : "");
