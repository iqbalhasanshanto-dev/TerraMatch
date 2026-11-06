import { Outlet } from "react-router";
import Navbar from "../Components/Navbar";

const MainLayout = () => {
    return (
       <div className="h-screen w-full flex flex-col overflow-hidden">
            {/* Navbar */}
            <Navbar />

            {/* Page Content */}
            <main className="flex-1 min-h-0 w-full overflow-hidden">
                <Outlet />
            </main>
        </div>
    );
};

export default MainLayout;