import { useState } from "react";

/**
 * ============================================================================
 * Logo Component
 * ============================================================================
 * Renders the official TerraMatch branding in the top navbar and footers:
 * - Brand Icon: Vector globe/planetary emblem loaded dynamically from `/logo.svg`,
 *   with an automatic fallback to `/favicon.svg` if a custom logo asset is absent.
 * - Typography: Stacked title "TerraMatch" and subtitle "Planetary Analog Platform".
 */
const Logo = () => {
    // ------------------------------------------------------------------------
    // 1. State: Dynamic Logo Image Source with Graceful Fallback
    // ------------------------------------------------------------------------
    // Attempts to load the custom `/logo.svg` first; seamlessly falls back
    // to the planetary vector `/favicon.svg` if `/logo.svg` is not found or errors.
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
            {/* Logo Image Container with Dark Astro Styling */}
            <div className="w-8 h-8 rounded-lg bg-[#182029] border border-slate-700/60 p-1 flex items-center justify-center shrink-0 shadow-xs group-hover:border-slate-500 transition">
                <img
                    src={logoSrc}
                    alt="TerraMatch Logo"
                    onError={handleImageError}
                    className="w-full h-full object-contain"
                />
            </div>

            {/* Stacked Brand Typography */}
            <div className="flex flex-col">
                <h1 className="text-base font-bold text-white tracking-tight leading-tight">
                    TerraMatch
                </h1>
                <p className="text-[10px] text-slate-400 font-normal leading-tight">
                    Planetary Analog Platform
                </p>
            </div>
        </div>
    );
};

export default Logo;
