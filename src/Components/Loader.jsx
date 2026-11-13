// Centered spinner indicator styled with primary cyan token
const Loader = () => {
    return (
        <div className="flex justify-center items-center min-h-[60vh] w-full bg-[#07090E] select-none">
            <span className="loading loading-spinner loading-lg text-[#83CAD8]"></span>
        </div>
    );
};

export default Loader;
