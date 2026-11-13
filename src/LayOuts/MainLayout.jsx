import { Outlet } from "react-router";
import Navbar from "../Components/Navbar";

// Application shell wrapping navbar and routed viewport
const MainLayout = () => {
    return (
        <div className="h-screen w-full flex flex-col overflow-hidden bg-[#07090E] text-[#F1EEE9]">
            {/* Top Navigation Bar */}
            <Navbar />

            {/* Dynamic Routed Viewport */}
            <main className="flex-1 min-h-0 w-full overflow-hidden">
                <Outlet />
            </main>
        </div>
    );
};

export default MainLayout;
