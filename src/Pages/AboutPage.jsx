import { UserCheck } from "lucide-react";

// Core contributors leading TerraMatch research and engineering
const TEAM_MEMBERS = [
    {
        id: "iqbal-hasan",
        name: "Md. Iqbal Hasan",
        role: "Team Lead & Frontend Developer",
        initials: "IH",
        specialty: "Platform Architecture & Interactive Map Systems",
    },
    {
        id: "tajbin-ovie",
        name: "Md Tajbin Ahmed Ovie",
        role: "Backend Developer",
        initials: "TO",
        specialty: "API Engineering & MongoDB Atlas Integration",
    },
    {
        id: "abdullah-mahmood",
        name: "Mohd Abdullah Al Mahmood",
        role: "UI/UX Developer",
        initials: "AM",
        specialty: "Deep-Space Interface Design & User Experience",
    },
    {
        id: "jihan-joty",
        name: "Mst. Jihan Jimi Joty",
        role: "Research Lead",
        initials: "JJ",
        specialty: "Planetary Analog Data & Scientific Evaluation",
    },
    {
        id: "nusrat-sumiya",
        name: "Nusrat Jahan Sumiya",
        role: "Story Teller",
        initials: "NS",
        specialty: "Mission Narrative & Scientific Communication",
    },
    {
        id: "asmaul-islam",
        name: "Md. Asmaul Islam",
        role: "Scope Keeper",
        initials: "AI",
        specialty: "Project Scope Management & Feature Alignment",
    },
];

// About page presenting platform mission and contributor roster
const AboutPage = () => {
    return (
        <div className="w-full h-full overflow-y-auto bg-[#07090E] text-[#F1EEE9] select-none px-4 sm:px-6 lg:px-12 py-10 pb-24">
            <div className="max-w-6xl mx-auto space-y-8">
                {/* Header title and subtitle */}
                <div className="space-y-1.5 border-b border-[#21242C] pb-5">
                    <h1 className="text-3xl font-bold text-[#F1EEE9] tracking-tight">
                        About TerraMatch
                    </h1>
                    <p className="text-sm text-[#8891A0]">
                        Learn about the platform, our mission, and the team behind it.
                    </p>
                </div>

                {/* Project overview section */}
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

                {/* Contributor team section */}
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

                    {/* Team grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4.5">
                        {TEAM_MEMBERS.map((member) => (
                            <div
                                key={member.id}
                                className="bg-[#0B0E13] border border-[#21242C] rounded-xl p-4 flex items-center gap-4 hover:border-[#83CAD8]/50 transition-all duration-150 shadow-md group"
                            >
                                <div className="w-14 h-14 rounded-full bg-[#1A1D23] border border-[#21242C] flex items-center justify-center text-[#83CAD8] font-semibold text-sm shrink-0 group-hover:border-[#83CAD8] transition">
                                    {member.initials}
                                </div>

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

                {/* Footnote */}
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
