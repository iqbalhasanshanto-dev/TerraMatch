import Container from "../Components/Container";
import { BookOpen, Globe2, Compass, ShieldCheck } from "lucide-react";

/**
 * AboutPage Component
 * Provides background on the TerraMatch Planetary Analog Research Platform,
 * detailing how terrestrial analog sites simulate lunar and martian environmental conditions.
 */
const AboutPage = () => {
    return (
        <Container>
            <div className="py-10 px-4 max-w-4xl mx-auto space-y-8">
                {/* Header */}
                <div className="border-b border-base-300 pb-5">
                    <div className="flex items-center gap-2 text-primary text-sm font-semibold mb-1">
                        <BookOpen size={18} />
                        <span>Platform Documentation</span>
                    </div>
                    <h1 className="text-3xl font-extrabold tracking-tight">About TerraMatch</h1>
                    <p className="text-sm opacity-70 mt-1">
                        Accelerating planetary exploration through terrestrial analog science and geospatial indexing.
                    </p>
                </div>

                {/* Mission Section */}
                <div className="border border-base-300 rounded-2xl p-6 bg-base-100 shadow-sm space-y-4">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <Globe2 size={20} className="text-primary" />
                        What are Planetary Analogs?
                    </h2>
                    <p className="text-sm leading-relaxed opacity-85">
                        Planetary analogs are locations on Earth that exhibit geological, environmental, or atmospheric conditions
                        resembling those found on other celestial bodies, notably the Moon and Mars. Testing robotics, space suits,
                        and scientific instruments at these sites helps mission teams prepare for the challenges of off-world exploration.
                    </p>
                </div>

                {/* Key Research Features */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="border border-base-300 rounded-xl p-5 bg-base-100 space-y-2">
                        <div className="flex items-center gap-2 font-semibold">
                            <Compass size={18} className="text-primary" />
                            Multi-variable Environmental Matching
                        </div>
                        <p className="text-xs leading-relaxed opacity-75">
                            Filter candidate sites by specific terrain composition (volcanic basalt, polar permafrost, desert regolith)
                            and environmental extremes including aridity and temperature.
                        </p>
                    </div>

                    <div className="border border-base-300 rounded-xl p-5 bg-base-100 space-y-2">
                        <div className="flex items-center gap-2 font-semibold">
                            <ShieldCheck size={18} className="text-primary" />
                            Side-by-Side Target Comparison
                        </div>
                        <p className="text-xs leading-relaxed opacity-75">
                            Bookmark prospective research fields and compare environmental similarity scores, elevation profiles,
                            and coordinate telemetry in a unified comparison matrix.
                        </p>
                    </div>
                </div>
            </div>
        </Container>
    );
};

export default AboutPage;
