import { useEffect, useState } from "react";
import Container from "../Components/Container";
import { Database, Server, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";
import { API_BASE_URL } from "../utils/api";

/**
 * DataServerPage Component
 * Provides telemetry on the backend server, database connectivity, and an overview of
 * available REST API endpoints for the TerraMatch platform.
 */
const DataServerPage = () => {
    const [healthStatus, setHealthStatus] = useState({
        loading: true,
        healthy: false,
        data: null,
        error: null,
    });

    const checkServerHealth = () => {
        setHealthStatus(prev => ({ ...prev, loading: true, error: null }));
        fetch(`${API_BASE_URL}/health`)
            .then(res => res.json())
            .then(data => {
                setHealthStatus({
                    loading: false,
                    healthy: data.status === "healthy",
                    data,
                    error: null,
                });
            })
            .catch(err => {
                setHealthStatus({
                    loading: false,
                    healthy: false,
                    data: null,
                    error: err.message || "Failed to reach backend server",
                });
            });
    };

    useEffect(() => {
        checkServerHealth();
    }, []);

    const endpoints = [
        { method: "GET", path: "/location", desc: "Fetch all planetary analog candidate locations." },
        { method: "POST", path: "/recent-searches", desc: "Record a new search query in the user's history." },
        { method: "GET", path: "/recent-searches/:email", desc: "Retrieve recent search entries for an authenticated user." },
        { method: "DELETE", path: "/recent-searches/:id", desc: "Delete a specific search log entry by ID." },
        { method: "DELETE", path: "/recent-searches/user/:email", desc: "Clear all search logs associated with a user." },
        { method: "POST", path: "/savedLocs", desc: "Bookmark an analog candidate site." },
        { method: "GET", path: "/savedLocs/:email", desc: "Retrieve all bookmarked locations for a user." },
        { method: "DELETE", path: "/savedLocs/:id", desc: "Remove a bookmarked site from user's saved list." },
    ];

    return (
        <Container>
            <div className="py-10 px-4 max-w-4xl mx-auto space-y-6">
                {/* Header */}
                <div className="border-b border-base-300 pb-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <div className="flex items-center gap-2 text-primary text-sm font-semibold mb-1">
                            <Server size={18} />
                            <span>Backend Services</span>
                        </div>
                        <h1 className="text-3xl font-extrabold tracking-tight">Data Server & Telemetry</h1>
                        <p className="text-sm opacity-70 mt-1">
                            Monitor database connectivity and API route status for the TerraMatch backend.
                        </p>
                    </div>

                    <button
                        onClick={checkServerHealth}
                        disabled={healthStatus.loading}
                        className="btn btn-sm btn-outline flex items-center gap-1.5"
                    >
                        <RefreshCw size={14} className={healthStatus.loading ? "animate-spin" : ""} />
                        Refresh Status
                    </button>
                </div>

                {/* Server Status Indicator */}
                <div className="border border-base-300 rounded-2xl p-6 bg-base-100 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${
                            healthStatus.healthy ? "bg-success/20 text-success" : "bg-error/20 text-error"
                        }`}>
                            {healthStatus.healthy ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />}
                        </div>
                        <div>
                            <h2 className="text-lg font-bold">
                                {healthStatus.loading ? "Pinging Server..." : healthStatus.healthy ? "Server Online & Connected" : "Server Offline"}
                            </h2>
                            <p className="text-xs opacity-70">
                                Target Endpoint: <code className="font-mono">{API_BASE_URL}</code>
                            </p>
                        </div>
                    </div>

                    {healthStatus.data && (
                        <div className="text-right text-xs opacity-80 font-mono">
                            <div>Database: <span className="text-success font-semibold">{healthStatus.data.database}</span></div>
                            <div>Uptime: {Math.round(healthStatus.data.uptime)}s</div>
                        </div>
                    )}
                </div>

                {/* API Endpoints Catalog */}
                <div className="border border-base-300 rounded-2xl p-6 bg-base-100 shadow-sm space-y-4">
                    <h2 className="text-lg font-bold flex items-center gap-2">
                        <Database size={20} className="text-primary" />
                        Available REST API Endpoints
                    </h2>

                    <div className="divide-y divide-base-200">
                        {endpoints.map((ep, i) => (
                            <div key={i} className="py-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-sm">
                                <div className="flex items-center gap-2">
                                    <span className={`badge badge-sm font-mono text-[10px] ${
                                        ep.method === "GET" ? "badge-info" : ep.method === "POST" ? "badge-success" : "badge-error"
                                    }`}>
                                        {ep.method}
                                    </span>
                                    <code className="font-mono text-xs font-semibold">{ep.path}</code>
                                </div>
                                <span className="text-xs opacity-70">{ep.desc}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </Container>
    );
};

export default DataServerPage;
