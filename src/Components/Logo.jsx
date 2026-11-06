import { useState } from "react";

/**
 * ============================================================================
 * Logo Component
 * ============================================================================
 * Renders the official TerraMatch branding in the top navbar and footers:
 * - Brand Icon: Vector globe/planetary emblem loaded dynamically from `/logo.svg`,
 *   with an automatic fallback to `/favicon.svg` if a custom logo asset is absent.
 * - Surfaces & Colors:
 *   - Container: Secondary surface `#1A1D23` with border `#21242C` and hover ring `#83CAD8`.
 *   - Heading: High-legibility starlight text `#F1EEE9`.
 *   - Subtitle: Muted foreground `#8891A0`.
 */
const Logo = () => {
    // ------------------------------------------------------------------------
    // 1. State: Dynamic Logo Image Source with Graceful Fallback
    // ------------------------------------------------------------------------
    const [logoSrc, setLogoSrc] = useState("/logo.svg");

    /**
     * Handles image load errors gracefully by switching to the built-in fallback.
     */
    const handleImageError = () => {
        if (logoSrc !== "/favicon.svg") {
            setLogoSrc("/favicon.svg");
        }
    };

    // ------------------------------------------------------------------------
    // 2. Render
    // ------------------------------------------------------------------------
    return (
        <div className="flex items-center gap-2.5 select-none">
            {/* Logo Image Container with Deep-Space Tokens */}
            <div className="w-8 h-8 rounded-lg bg-[#1A1D23] border border-[#21242C] p-1 flex items-center justify-center shrink-0 shadow-xs group-hover:border-[#83CAD8] transition">
                <img
                    src={logoSrc}
                    alt="TerraMatch Logo"
                    onError={handleImageError}
                    className="w-full h-full object-contain"
                />
            </div>

            {/* Stacked Brand Typography */}
            <div className="flex flex-col">
                <h1 className="text-base font-bold text-[#F1EEE9] tracking-tight leading-tight">
                    TerraMatch
                </h1>
                <p className="text-[10px] text-[#8891A0] font-normal leading-tight">
                    Planetary Analog Platform
                </p>
            </div>
        </div>
    );
};

export default Logo;
