import { useState } from "react";

/**
 * ============================================================================
 * Logo Component
 * ============================================================================
 * Renders the unified TerraMatch brand mark inside the top navigation bar:
 * - Single Clean Image Element: Displays the full horizontal TerraMatch logo
 *   from `/logo.jpg` (`public/logo.jpg`) without any surrounding badge box,
 *   border, grey container fill, or redundant HTML heading/subtitle text.
 * - Seamless Dark Integration: Uses `bg-transparent` and `object-contain` so
 *   the emblem scales naturally within the 56px (`h-14`) navbar (`#0B0E13`).
 * - Graceful Fallback Chain: Automatically degrades `/logo.jpg` -> `/logo.svg`
 *   -> `/favicon.svg` if an asset fails to load.
 */
const Logo = () => {
    // ------------------------------------------------------------------------
    // 1. State: Active Logo Source with Multi-Step Error Fallback
    // ------------------------------------------------------------------------
    // Tracks the active image URL; defaults to the primary raster logo `/logo.jpg`
    const [logoSrc, setLogoSrc] = useState("/logo.jpg");

    // ------------------------------------------------------------------------
    // 2. Helper Function: Image Load Error Fallback Handler
    // ------------------------------------------------------------------------
    /**
     * Steps through the fallback asset chain (`/logo.jpg` -> `/logo.svg` ->
     * `/favicon.svg`) whenever an image load fails so a broken icon never appears.
     */
    const handleImageError = () => {
        if (logoSrc === "/logo.jpg") {
            setLogoSrc("/logo.svg");
        } else if (logoSrc === "/logo.svg") {
            setLogoSrc("/favicon.svg");
        }
    };

    // ------------------------------------------------------------------------
    // 3. Component Render Block (Unified Transparent Brand Image)
    // ------------------------------------------------------------------------
    return (
        <img
            src={logoSrc}
            alt="TerraMatch - Planetary Analog Platform"
            width={logoSrc === "/logo.jpg" ? 512 : 36}
            height={logoSrc === "/logo.jpg" ? 286 : 36}
            onError={handleImageError}
            className="h-9 sm:h-10 w-auto object-contain bg-transparent select-none"
        />
    );
};

export default Logo;
