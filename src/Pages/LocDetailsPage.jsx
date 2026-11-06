import { useParams, Link } from "react-router";
import useLocations from "../Hooks/useLocations";
import Loader from "../Components/Loader";
import useAuth from "../Hooks/useAuth";
import { toast } from "react-toastify";
import { API_BASE_URL } from "../utils/api";
import Container from "../Components/Container";
import { ArrowLeft, Bookmark, Globe, MapPin } from "lucide-react";

/**
 * LocDetailsPage Component
 * Displays comprehensive planetary analog metrics, terrain features, environmental data,
 * and geographic coordinates for an individual candidate location.
 */
const LocDetailsPage = () => {
    const { _id } = useParams();
    const { locData, loading } = useLocations();
    const { user } = useAuth();

    if (loading) return <Loader />;

    // Find the requested location by ID
    const neededLocation = (locData || []).find(loc => loc._id === _id);

    // Guard if the location doesn't exist
    if (!neededLocation) {
        return (
            <Container>
                <div className="py-16 text-center">
                    <Globe size={40} className="mx-auto opacity-30 mb-3" />
                    <h2 className="text-2xl font-bold">Location Not Found</h2>
                    <p className="text-sm opacity-60 mt-1 max-w-sm mx-auto">
                        We could not find candidate analog details for ID "{_id}".
                    </p>
                    <Link to="/" className="btn btn-sm btn-primary mt-5">
                        <ArrowLeft size={16} /> Back to Dashboard
                    </Link>
                </div>
            </Container>
        );
    }

    // Save location to user's saved bookmarks
    const handleSave = () => {
        if (!user?.email) {
            toast.warn("Please log in to save this candidate site.");
            return;
        }

        fetch(`${API_BASE_URL}/savedLocs`, {
            method: "POST",
            headers: {
                "Content-type": "application/json",
            },
            body: JSON.stringify({
                ...neededLocation,
                created_at: new Date(),
                created_by: user.email,
            }),
        })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    toast.success("Location saved successfully!");
                }
            })
            .catch(err => {
                console.error("Save error:", err);
                toast.error(err.message || "Failed to save location");
            });
    };

    return (
        <Container>
            <div className="py-8 px-4 max-w-4xl mx-auto space-y-6">
                {/* Navigation Back Link */}
                <Link to="/" className="inline-flex items-center gap-2 text-sm opacity-70 hover:opacity-100 hover:text-primary transition">
                    <ArrowLeft size={16} /> Back to Map
                </Link>

                {/* Hero Header Card */}
                <div className="border border-base-300 rounded-2xl p-6 bg-base-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-3xl font-extrabold tracking-tight">
                                {neededLocation.name}
                            </h1>
                            <span className="badge badge-primary font-mono text-xs">
                                {neededLocation.similarityScore}% Match
                            </span>
                        </div>
                        <p className="text-sm opacity-70 flex items-center gap-1.5 mt-1">
                            <MapPin size={15} /> {neededLocation.country}
                        </p>
                    </div>

                    <button
                        onClick={handleSave}
                        className="btn btn-primary flex items-center gap-2"
                    >
                        <Bookmark size={16} /> Save this Location
                    </button>
                </div>

                {/* Analog Classifications */}
                <div className="flex flex-wrap gap-2">
                    {neededLocation.analogType?.map((type) => (
                        <span key={type} className="badge badge-outline badge-lg uppercase font-semibold">
                            {type} Analog Target
                        </span>
                    ))}
                </div>

                {/* Overview Description */}
                <div className="border border-base-300 rounded-xl p-5 bg-base-100">
                    <h2 className="text-lg font-semibold mb-2">Scientific Description</h2>
                    <p className="text-sm leading-relaxed opacity-85">
                        {neededLocation.description}
                    </p>
                </div>

                {/* Environmental & Terrain Breakdown */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {/* Environment Metrics */}
                    <div className="border border-base-300 rounded-xl p-5 bg-base-100 space-y-3">
                        <h2 className="text-lg font-semibold border-b border-base-200 pb-2">
                            Environmental Conditions
                        </h2>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                                <span className="opacity-60 text-xs block">Climate</span>
                                <span className="font-medium capitalize">{neededLocation.environment?.climate || "N/A"}</span>
                            </div>
                            <div>
                                <span className="opacity-60 text-xs block">Humidity</span>
                                <span className="font-medium capitalize">{neededLocation.environment?.humidity || "N/A"}</span>
                            </div>
                            <div>
                                <span className="opacity-60 text-xs block">Vegetation</span>
                                <span className="font-medium capitalize">{neededLocation.environment?.vegetation || "N/A"}</span>
                            </div>
                            <div>
                                <span className="opacity-60 text-xs block">Elevation</span>
                                <span className="font-medium">{neededLocation.environment?.elevationMeters?.toLocaleString()} meters</span>
                            </div>
                        </div>
                    </div>

                    {/* Terrain Characteristics */}
                    <div className="border border-base-300 rounded-xl p-5 bg-base-100 space-y-3">
                        <h2 className="text-lg font-semibold border-b border-base-200 pb-2">
                            Terrain Features
                        </h2>
                        <div className="flex flex-wrap gap-2 pt-1">
                            {neededLocation.terrain?.map((item) => (
                                <span key={item} className="badge badge-neutral text-xs">
                                    {item}
                                </span>
                            ))}
                        </div>
                        <div className="pt-3 border-t border-base-200 text-xs opacity-70">
                            <strong>Coordinates:</strong> {neededLocation.coordinates?.latitude}° N, {neededLocation.coordinates?.longitude}° E
                        </div>
                    </div>
                </div>
            </div>
        </Container>
    );
};

export default LocDetailsPage;
