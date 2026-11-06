import { UserCheck } from "lucide-react";

/**
 * ============================================================================
 * Team Members Data Structure
 * ============================================================================
 * Roster of multidisciplinary specialists leading planetary analog science,
 * aerospace engineering, geospatial machine learning, and UX architecture.
 */
const TEAM_MEMBERS = [
    {
        id: "elena-rostova",
        name: "Dr. Elena Rostova",
        role: "Project Lead & Planetary Scientist",
        initials: "ER",
        specialty: "Astrobiology & Martian Regolith Modeling",
    },
    {
        id: "marcus-chen",
        name: "Marcus Chen",
        role: "Lead Software Engineer",
        initials: "MC",
        specialty: "Distributed Geospatial Computing & WebGL",
    },
    {
        id: "sarah-jenkins",
        name: "Sarah Jenkins",
        role: "Geology & Regolith Specialist",
        initials: "SJ",
        specialty: "Volcanic Basalt & Lunar Magma Ocean Terrains",
    },
    {
        id: "david-kim",
        name: "Dr. David Kim",
        role: "Data & AI Architect",
        initials: "DK",
        specialty: "Orbital Telemetry Ingestion & Similarity Indexing",
    },
    {
        id: "aisha-patel",
        name: "Aisha Patel",
        role: "UI/UX Designer",
        initials: "AP",
        specialty: "Geospatial Human-Computer Interfaces & Telemetry UX",
    },
    {
        id: "liam-oconnor",
        name: "Liam O'Connor",
        role: "Space Simulation Specialist",
        initials: "LO",
        specialty: "Robotic Rover Mobility & Extreme Field Trials",
    },
];

/**
 * ============================================================================
 * AboutPage Component
 * ============================================================================
 * Presents background on the TerraMatch Planetary Analog Platform,
 * core mission objectives, and the research team responsible for development.
 * Styled in the custom deep-space aesthetic:
 * - Background: `#07090E` with starlight text `#F1EEE9`
 * - Card Surfaces: `#0B0E13` (Card) with border `#21242C`
 * - Team Avatars: `#1A1D23` with `#21242C` border and `#83CAD8` initials
 * - Muted Descriptions: `#8891A0`
 */
const AboutPage = () => {
    return (
        <div className="w-full h-full overflow-y-auto bg-[#07090E] text-[#F1EEE9] select-none px-4 sm:px-6 lg:px-12 py-10 pb-24">
            <div className="max-w-6xl mx-auto space-y-8">
                {/* ========================================================== */}
                {/* 1. Header Section: Title & Subtitle                        */}
                {/* ========================================================== */}
                <div className="space-y-1.5 border-b border-[#21242C] pb-5">
                    <h1 className="text-3xl font-bold text-[#F1EEE9] tracking-tight">
                        About TerraMatch
                    </h1>
                    <p className="text-sm text-[#8891A0]">
                        Learn about the platform, our mission, and the team behind it.
                    </p>
                </div>

                {/* ========================================================== */}
                {/* 2. Project Overview Section                                */}
                {/* ========================================================== */}
                <section
                    aria-labelledby="project-overview-title"
                    className="bg-[#0B0E13] border border-[#21242C] rounded-2xl p-6 sm:p-8 space-y-4 shadow-xl"
                >
                    <h2
                        id="project-overview-title"
                        className="text-lg sm:text-xl font-bold text-[#F1EEE9] tracking-tight flex items-center gap-2.5"
                    >
                        Project Overview
                    </h2>

                    <div className="space-y-3.5 text-xs sm:text-sm text-[#F1EEE9] leading-relaxed">
                        <p>
                            TerraMatch is an open planetary science intelligence platform designed to
                            systematically discover, index, and evaluate terrestrial field sites that serve as
                            geological and environmental analogues for the Moon and Mars. Testing rovers, autonomous
                            science payloads, habitat structures, and EVA spacesuits in Earth-based analogs dramatically
                            lowers mission risk and speeds development for future lunar and martian exploration.
                        </p>

                        <p className="text-[#8891A0]">
                            By integrating multi-source satellite remote sensing, global orbital elevation models
                            (DEMs), climate reanalysis, and regolith mineralogy databases, TerraMatch computes
                            quantitative analog similarity scores across multiple physical variables: topographic slope,
                            surface regolith composition, extreme aridity regimes, ambient radiation profiles, and
                            temperature boundaries.
                        </p>

                        <p className="text-[#8891A0] text-xs pt-1 border-t border-[#21242C]">
                            Our goal is to give aerospace engineers, astrobiologists, and planetary mission architects
                            the data and tools they need to prepare for life and operations on another world.
                        </p>
                    </div>
                </section>

                {/* ========================================================== */}
                {/* 3. Our Team Section                                        */}
                {/* ========================================================== */}
                <section aria-labelledby="our-team-title" className="space-y-4 pt-2">
                    <div className="flex items-center justify-between">
                        <h2
                            id="our-team-title"
                            className="text-2xl font-bold text-[#F1EEE9] tracking-tight"
                        >
                            Our Team
                        </h2>
                        <span className="text-xs text-[#8891A0] font-mono">
                            6 Principal Contributors
                        </span>
                    </div>

                    {/* 3-Column Team Members Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4.5">
                        {TEAM_MEMBERS.map((member) => (
                            <div
                                key={member.id}
                                className="bg-[#0B0E13] border border-[#21242C] rounded-xl p-4 flex items-center gap-4 hover:border-[#83CAD8]/50 transition-all duration-150 shadow-md group"
                            >
                                {/* Circular Avatar with Initials in Cyan #83CAD8 */}
                                <div className="w-14 h-14 rounded-full bg-[#1A1D23] border border-[#21242C] flex items-center justify-center text-[#83CAD8] font-semibold text-sm shrink-0 group-hover:border-[#83CAD8] transition">
                                    {member.initials}
                                </div>

                                {/* Member Information Block */}
                                <div className="min-w-0 flex-1">
                                    <h3 className="text-sm font-semibold text-[#F1EEE9] truncate leading-tight group-hover:text-white transition">
                                        {member.name}
                                    </h3>
                                    <p className="text-xs text-[#8891A0] truncate mt-0.5">
                                        {member.role}
                                    </p>
                                    <p className="text-[10px] text-[#8891A0] truncate mt-1 font-mono">
                                        {member.specialty}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* ========================================================== */}
                {/* 4. Institutional Collaboration Footnote                    */}
                {/* ========================================================== */}
                <div className="border-t border-[#21242C] pt-6 text-center text-xs text-[#8891A0] space-y-1">
                    <p className="flex items-center justify-center gap-1.5 text-[#8891A0]">
                        <UserCheck size={14} className="text-[#83CAD8]" />
                        <span>Curated in partnership with international analog science working groups.</span>
                    </p>
                    <p className="text-[11px] text-[#8891A0]/70">
                        TerraMatch v2.4 • Planetary Analog Exploration Platform
                    </p>
                </div>
            </div>
        </div>
    );
};

export default AboutPage;
