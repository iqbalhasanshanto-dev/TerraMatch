/**
 * ============================================================================
 * Loader Component
 * ============================================================================
 * Centered spinner indicator displayed during data fetches and lazy route loads,
 * styled with the primary cyan token `#83CAD8`.
 */
const Loader = () => {
    return (
        <div className="flex justify-center items-center min-h-[60vh] w-full bg-[#07090E] select-none">
            <span className="loading loading-spinner loading-lg text-[#83CAD8]"></span>
        </div>
    );
};

export default Loader;
