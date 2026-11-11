import { useId } from "react";

/**
 * ============================================================================
 * Logo Component
 * ============================================================================
 * Renders the unified TerraMatch brand emblem and wordmark on a 100%
 * transparent background inside the top navigation bar:
 * - Zero Background Box: No bordered badge container or opaque JPEG card.
 * - True Alpha Transparency: Uses SVG `<mask>` definitions to carve clean
 *   negative-space separation around the pin center, foreground orbit arc,
 *   and Mars sphere so every background pixel stays 100% transparent against
 *   any dark navbar surface.
 * - Custom Vector Planetary Emblem (`w-9 h-9` inline SVG, `viewBox="0 0 64 64"`):
 *   1. Cyan Wireframe Globe (`#00D8F6`) with meridians, latitude arc, and
 *      hatched terrain/DNA-style contour lines
 *   2. Top-Right Location Pin (`#00D8F6`) with transparent punched-out dot
 *   3. Tilted Orbital Ring (`#2A6F85`, `rx="29" ry="9"`, `-22deg`) layered
 *      behind the globe on top and sweeping in front of the globe below
 *   4. Foreground Mars Sphere (`#E87D3E` lit face, `#C25922` crescent shadow,
 *      and `#B8521E` craters)
 * - Wordmark Heading: Bold `<h1>TerraMatch</h1>` (`#F1EEE9` + `#00D8F6`) with
 *   no subtitle underneath.
 */
const Logo = () => {
    // ------------------------------------------------------------------------
    // 1. Unique Per-Instance SVG Definition Identifiers
    // ------------------------------------------------------------------------
    // Ensures clipPath and mask IDs remain unique across multiple mounts
    const uid = useId();
    const globeClipId = `terramatch-globe-clip-${uid}`;
    const globeMaskId = `terramatch-globe-mask-${uid}`;
    const backOrbitMaskId = `terramatch-back-orbit-mask-${uid}`;
    const frontOrbitMaskId = `terramatch-front-orbit-mask-${uid}`;
    const pinHoleMaskId = `terramatch-pin-mask-${uid}`;
    const marsClipId = `terramatch-mars-clip-${uid}`;

    // ------------------------------------------------------------------------
    // 2. Component Render Block (Transparent Vector Emblem + H1 Wordmark)
    // ------------------------------------------------------------------------
    return (
        <div className="flex items-center gap-2.5 select-none bg-transparent">
            {/* ============================================================== */}
            {/* Custom Vector Planetary Emblem (`w-9 h-9`, Transparent SVG)    */}
            {/* ============================================================== */}
            <svg
                viewBox="0 0 64 64"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
                className="w-9 h-9 shrink-0 bg-transparent"
            >
                {/* ---------------------------------------------------------- */}
                {/* SVG ClipPaths & Transparency Masks                         */}
                {/* ---------------------------------------------------------- */}
                <defs>
                    {/* Clips Earth interior wireframe lines to the globe circumference */}
                    <clipPath id={globeClipId}>
                        <circle cx="28" cy="32" r="19.5" />
                    </clipPath>

                    {/* Punches transparent separation behind front orbit, pin & Mars on globe */}
                    <mask id={globeMaskId}>
                        <rect width="64" height="64" fill="white" />
                        {/* Transparent clearance under the sweeping front orbital arc */}
                        <path
                            d="M 57 32 A 29 9 0 0 1 -1 32"
                            transform="rotate(-22 28 32)"
                            stroke="black"
                            strokeWidth="4.8"
                            strokeLinecap="butt"
                        />
                        {/* Transparent clearance halo under the top-right location pin */}
                        <path
                            d="M 42 7 C 38.4 7 35.5 9.9 35.5 13.5 C 35.5 17.8 42 23.5 42 23.5 C 42 23.5 48.5 17.8 48.5 13.5 C 48.5 9.9 45.6 7 42 7 Z"
                            fill="black"
                            stroke="black"
                            strokeWidth="2.4"
                            strokeLinejoin="round"
                        />
                        {/* Transparent clearance halo under the foreground Mars sphere */}
                        <circle cx="44" cy="44" r="12.6" fill="black" />
                    </mask>

                    {/* Punches clean Earth & Pin cutouts out of the back orbital arc */}
                    <mask id={backOrbitMaskId}>
                        <rect width="64" height="64" fill="white" />
                        <circle cx="28" cy="32" r="21" fill="black" />
                        <path
                            d="M 42 7 C 38.4 7 35.5 9.9 35.5 13.5 C 35.5 17.8 42 23.5 42 23.5 C 42 23.5 48.5 17.8 48.5 13.5 C 48.5 9.9 45.6 7 42 7 Z"
                            fill="black"
                            stroke="black"
                            strokeWidth="2"
                            strokeLinejoin="round"
                        />
                    </mask>

                    {/* Punches transparent clearance around Mars on the front orbital ring */}
                    <mask id={frontOrbitMaskId}>
                        <rect width="64" height="64" fill="white" />
                        <circle cx="44" cy="44" r="12.6" fill="black" />
                    </mask>

                    {/* Punches a genuinely transparent circular center inside the pin */}
                    <mask id={pinHoleMaskId}>
                        <rect width="64" height="64" fill="white" />
                        <circle cx="42" cy="13.5" r="2.3" fill="black" />
                    </mask>

                    {/* Clips Mars terminator shadow & craters cleanly to the Mars sphere */}
                    <clipPath id={marsClipId}>
                        <circle cx="44" cy="44" r="11" />
                    </clipPath>
                </defs>

                {/* ---------------------------------------------------------- */}
                {/* Layer 1: Back Half of Tilted Orbital Ring (#2A6F85)        */}
                {/* ---------------------------------------------------------- */}
                {/* Upper elliptical arc (`rx=29, ry=9`, `-22deg`) passing behind Earth */}
                <path
                    d="M -1 32 A 29 9 0 0 1 57 32"
                    transform="rotate(-22 28 32)"
                    stroke="#2A6F85"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    mask={`url(#${backOrbitMaskId})`}
                />

                {/* ---------------------------------------------------------- */}
                {/* Layer 2: Cyan Wireframe Globe (#00D8F6)                    */}
                {/* ---------------------------------------------------------- */}
                <g mask={`url(#${globeMaskId})`}>
                    {/* Internal meridians, latitude arc, and hatched terrain/DNA grid */}
                    <g clipPath={`url(#${globeClipId})`}>
                        {/* Central vertical meridian */}
                        <line
                            x1="28"
                            y1="12"
                            x2="28"
                            y2="52"
                            stroke="#00D8F6"
                            strokeWidth="2.5"
                        />

                        {/* Left and right curved longitude meridian arcs */}
                        <path
                            d="M 28 12 C 17 17, 17 47, 28 52"
                            stroke="#00D8F6"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                        />
                        <path
                            d="M 28 12 C 39 17, 39 47, 28 52"
                            stroke="#00D8F6"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                        />

                        {/* Equatorial latitude arc */}
                        <path
                            d="M 8 32 Q 28 28 48 32"
                            stroke="#00D8F6"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                        />

                        {/* Left hemisphere DNA-style twisting contour ribbon */}
                        <path
                            d="M 11 23 C 16 25, 19 31, 13 38 C 11 40, 14 45, 20 47"
                            stroke="#00D8F6"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                        />
                        <path
                            d="M 18 18 C 14 26, 23 35, 21 48"
                            stroke="#00D8F6"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                        />

                        {/* Hatched DNA/terrain grid rungs inside left hemisphere */}
                        <line
                            x1="13"
                            y1="39"
                            x2="21"
                            y2="37"
                            stroke="#00D8F6"
                            strokeWidth="2.2"
                            strokeLinecap="round"
                        />
                        <line
                            x1="14"
                            y1="44"
                            x2="21"
                            y2="42"
                            stroke="#00D8F6"
                            strokeWidth="2.2"
                            strokeLinecap="round"
                        />

                        {/* Parallel hatched planetary terrain ribs across right hemisphere */}
                        <line
                            x1="28"
                            y1="21"
                            x2="37"
                            y2="16"
                            stroke="#00D8F6"
                            strokeWidth="2.3"
                            strokeLinecap="round"
                        />
                        <line
                            x1="28"
                            y1="27"
                            x2="43"
                            y2="19"
                            stroke="#00D8F6"
                            strokeWidth="2.3"
                            strokeLinecap="round"
                        />
                        <line
                            x1="28"
                            y1="35"
                            x2="47"
                            y2="25"
                            stroke="#00D8F6"
                            strokeWidth="2.3"
                            strokeLinecap="round"
                        />
                    </g>

                    {/* Outer cyan globe perimeter circle */}
                    <circle
                        cx="28"
                        cy="32"
                        r="20"
                        stroke="#00D8F6"
                        strokeWidth="2.5"
                    />
                </g>

                {/* ---------------------------------------------------------- */}
                {/* Layer 3: Front Half of Tilted Orbital Ring (#2A6F85)       */}
                {/* ---------------------------------------------------------- */}
                {/* Sweeping foreground elliptical arc crossing in front of Earth */}
                <path
                    d="M 57 32 A 29 9 0 0 1 -1 32"
                    transform="rotate(-22 28 32)"
                    stroke="#2A6F85"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    mask={`url(#${frontOrbitMaskId})`}
                />

                {/* ---------------------------------------------------------- */}
                {/* Layer 4: Top-Right Location Pin Badge (#00D8F6)            */}
                {/* ---------------------------------------------------------- */}
                {/* Teardrop pin perched at (42, 13.5) with a genuinely transparent cutout */}
                <path
                    d="M 42 7 C 38.4 7 35.5 9.9 35.5 13.5 C 35.5 17.8 42 23.5 42 23.5 C 42 23.5 48.5 17.8 48.5 13.5 C 48.5 9.9 45.6 7 42 7 Z"
                    fill="#00D8F6"
                    mask={`url(#${pinHoleMaskId})`}
                />

                {/* ---------------------------------------------------------- */}
                {/* Layer 5: Foreground Mars Sphere (#E87D3E & #C25922)        */}
                {/* ---------------------------------------------------------- */}
                <g clipPath={`url(#${marsClipId})`}>
                    {/* Bottom-right crescent shadow base in warm deep terracotta */}
                    <circle cx="44" cy="44" r="11" fill="#C25922" />

                    {/* Upper-left sunlit Mars hemisphere */}
                    <circle cx="41.4" cy="41.4" r="10.4" fill="#E87D3E" />

                    {/* Two subtle Martian impact craters */}
                    <circle cx="40.2" cy="40.8" r="2.1" fill="#B8521E" />
                    <circle cx="47.2" cy="39.2" r="1.2" fill="#B8521E" />
                </g>
            </svg>

            {/* ============================================================== */}
            {/* Brand Wordmark Heading (No Subtitle)                           */}
            {/* ============================================================== */}
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight leading-none flex items-center">
                <span className="text-[#F1EEE9]">Terra</span>
                <span className="text-[#00D8F6]">Match</span>
            </h1>
        </div>
    );
};

export default Logo;
