import { useId } from "react";

// Unified TerraMatch brand vector emblem and wordmark
const Logo = () => {
    // Unique SVG clipPath and mask identifiers
    const uid = useId();
    const globeClipId = `terramatch-globe-clip-${uid}`;
    const globeMaskId = `terramatch-globe-mask-${uid}`;
    const backOrbitMaskId = `terramatch-back-orbit-mask-${uid}`;
    const frontOrbitMaskId = `terramatch-front-orbit-mask-${uid}`;
    const pinHoleMaskId = `terramatch-pin-mask-${uid}`;
    const marsClipId = `terramatch-mars-clip-${uid}`;

    return (
        <div className="flex items-center gap-2.5 select-none bg-transparent">
            {/* Vector planetary emblem */}
            <svg
                viewBox="0 0 64 64"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
                className="w-9 h-9 shrink-0 bg-transparent"
            >
                {/* Transparency masks and clip paths */}
                <defs>
                    {/* Earth wireframe clip circle */}
                    <clipPath id={globeClipId}>
                        <circle cx="28" cy="32" r="19.5" />
                    </clipPath>

                    {/* Globe clearance mask */}
                    <mask id={globeMaskId}>
                        <rect width="64" height="64" fill="white" />
                        <path
                            d="M 57 32 A 29 9 0 0 1 -1 32"
                            transform="rotate(-22 28 32)"
                            stroke="black"
                            strokeWidth="4.8"
                            strokeLinecap="butt"
                        />
                        <path
                            d="M 42 7 C 38.4 7 35.5 9.9 35.5 13.5 C 35.5 17.8 42 23.5 42 23.5 C 42 23.5 48.5 17.8 48.5 13.5 C 48.5 9.9 45.6 7 42 7 Z"
                            fill="black"
                            stroke="black"
                            strokeWidth="2.4"
                            strokeLinejoin="round"
                        />
                        <circle cx="44" cy="44" r="12.6" fill="black" />
                    </mask>

                    {/* Back orbit cutout mask */}
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

                    {/* Front orbit cutout mask */}
                    <mask id={frontOrbitMaskId}>
                        <rect width="64" height="64" fill="white" />
                        <circle cx="44" cy="44" r="12.6" fill="black" />
                    </mask>

                    {/* Pin center cutout mask */}
                    <mask id={pinHoleMaskId}>
                        <rect width="64" height="64" fill="white" />
                        <circle cx="42" cy="13.5" r="2.3" fill="black" />
                    </mask>

                    {/* Mars sphere clip circle */}
                    <clipPath id={marsClipId}>
                        <circle cx="44" cy="44" r="11" />
                    </clipPath>
                </defs>

                {/* Back arc of orbital ring */}
                <path
                    d="M -1 32 A 29 9 0 0 1 57 32"
                    transform="rotate(-22 28 32)"
                    stroke="#2A6F85"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    mask={`url(#${backOrbitMaskId})`}
                />

                {/* Cyan wireframe globe */}
                <g mask={`url(#${globeMaskId})`}>
                    <g clipPath={`url(#${globeClipId})`}>
                        {/* Central meridian */}
                        <line
                            x1="28"
                            y1="12"
                            x2="28"
                            y2="52"
                            stroke="#00D8F6"
                            strokeWidth="2.5"
                        />

                        {/* Longitude meridian arcs */}
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

                        {/* Equator arc */}
                        <path
                            d="M 8 32 Q 28 28 48 32"
                            stroke="#00D8F6"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                        />

                        {/* Terrain contour ribbon */}
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

                        {/* Grid rungs */}
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

                        {/* Planetary terrain ribs */}
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

                    {/* Outer globe boundary */}
                    <circle
                        cx="28"
                        cy="32"
                        r="20"
                        stroke="#00D8F6"
                        strokeWidth="2.5"
                    />
                </g>

                {/* Front arc of orbital ring */}
                <path
                    d="M 57 32 A 29 9 0 0 1 -1 32"
                    transform="rotate(-22 28 32)"
                    stroke="#2A6F85"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    mask={`url(#${frontOrbitMaskId})`}
                />

                {/* Location pin badge */}
                <path
                    d="M 42 7 C 38.4 7 35.5 9.9 35.5 13.5 C 35.5 17.8 42 23.5 42 23.5 C 42 23.5 48.5 17.8 48.5 13.5 C 48.5 9.9 45.6 7 42 7 Z"
                    fill="#00D8F6"
                    mask={`url(#${pinHoleMaskId})`}
                />

                {/* Mars sphere with craters */}
                <g clipPath={`url(#${marsClipId})`}>
                    <circle cx="44" cy="44" r="11" fill="#C25922" />
                    <circle cx="41.4" cy="41.4" r="10.4" fill="#E87D3E" />
                    <circle cx="40.2" cy="40.8" r="2.1" fill="#B8521E" />
                    <circle cx="47.2" cy="39.2" r="1.2" fill="#B8521E" />
                </g>
            </svg>

            {/* Brand wordmark */}
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight leading-none flex items-center">
                <span className="text-[#F1EEE9]">Terra</span>
                <span className="text-[#00D8F6]">Match</span>
            </h1>
        </div>
    );
};

export default Logo;
