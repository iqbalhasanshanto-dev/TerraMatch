import { Link } from "react-router";
import errorImg from "../assets/TerraMatch_ Lost in Space 404.png";

// 404 error page presenting a lost-in-space graphic with return navigation
const ErrorPage = () => {
    return (
        <div className="min-h-screen w-full bg-[#07090E] flex items-center justify-center select-none overflow-hidden">
            <Link to="/" title="Return to TerraMatch Home" className="block cursor-pointer">
                <img
                    className="max-h-screen max-w-full object-contain mx-auto"
                    src={errorImg}
                    alt="TerraMatch Lost in Space 404"
                />
            </Link>
        </div>
    );
};

export default ErrorPage;
