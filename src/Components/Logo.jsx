import { useState } from "react";

/**
 * ============================================================================
 * Logo Component
 * ============================================================================
 * Renders the official TerraMatch branding in the top navbar and footers:
 * - Primary Brand Icon: Raster logo loaded from `/logo.jpg` (`public/logo.jpg`).
 * - Fallback Chain: Gracefully degrades `/logo.jpg` -> `/logo.svg` -> `/favicon.svg`
 *   if an image fails to load.
 * - Deep-Space Color Palette:
 *   - Container: `#1A1D23` with `#21242C` border and `#83CAD8` hover accent.
 *   - Brand Title: High-legibility starlight text `#F1EEE9`.
 *   - Subtitle: Muted foreground `#8891A0`.
 */
const Logo = () => {
    // ------------------------------------------------------------------------
    // 1. State: Active Logo Image Source with Multi-Step Fallback Chain
    // ------------------------------------------------------------------------
    // Tracks the currently active image URL; starts with `/logo.jpg`
    const [logoSrc, setLogoSrc] = useState("/logo.jpg");

    // ------------------------------------------------------------------------
    // 2. Helper Function: Image Load Error Fallback Handler
    // ------------------------------------------------------------------------
    /**
     * Advances through the asset fallback chain (`/logo.jpg` -> `/logo.svg` -> `/favicon.svg`)
     * whenever the current source fails to load so the badge never displays a broken icon.
     */
    const handleImageError = () => {
        if (logoSrc === "/logo.jpg") {
            setLogoSrc("/logo.svg");
        } else if (logoSrc === "/logo.svg") {
            setLogoSrc("/favicon.svg");
        }
    };

    // ------------------------------------------------------------------------
    // 3. Component Render Block
    // ------------------------------------------------------------------------
    return (
        <div className="flex items-center gap-2.5 select-none">
            {/* Logo Badge Container: Fixed 32x32 frame with deep-space border tokens */}
            <div className="w-8 h-8 rounded-lg bg-[#1A1D23] border border-[#21242C] p-0.5 flex items-center justify-center shrink-0 overflow-hidden shadow-xs group-hover:border-[#83CAD8] transition">
                <img
                    src={logoSrc}
                    alt="TerraMatch Logo"
                    width={32}
                    height={32}
                    onError={handleImageError}
                    className="w-full h-full object-cover rounded-md"
                />
            </div>

            {/* Stacked Brand Wordmark & Subtitle Block */}
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
