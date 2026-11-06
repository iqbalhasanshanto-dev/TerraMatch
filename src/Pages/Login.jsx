import useAuth from "../Hooks/useAuth";
import { toast } from "react-toastify";
import { Globe2 } from "lucide-react";
import { useLocation, useNavigate } from "react-router";

const Login = () => {

    const { signInGoogle } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();


    const handleGoogleSignIn = () => {
        signInGoogle()
            .then(result => {
                console.log(result.user);
                toast.success("Successfully signed in with Google!");
                navigate(location?.state || '/')
            })
            .catch(error => {
                console.log(error);
                toast.error(error.message);
            })
    }

    return (
        <div className="min-h-screen bg-[#14181d] flex flex-col items-center justify-center px-4 relative">

            {/* Login Card */}
            <div className="w-full max-w-88.5 bg-[#171e24] border border-[#34434e] rounded-2xl p-2 shadow-[0_12px_35px_rgba(0,0,0,0.35)]">

                <div className="border border-[#34434e] rounded-xl px-6 py-7 text-center">

                    {/* Logo */}
                    <div className="flex items-center justify-center gap-2 mb-1">
                        <Globe2 size={23} className="text-[#91a7b6]" />

                        <h1 className="text-xl font-bold text-[#e8e6d9]">
                            TerraMatch
                        </h1>
                    </div>

                    <p className="text-[11px] text-[#8999a7]">
                        Planetary Analog Platform
                    </p>

                    {/* Welcome */}
                    <div className="mt-5">
                        <h2 className="text-lg font-medium text-[#e8e6d9]">
                            Welcome
                        </h2>

                        <p className="text-[11px] leading-5 text-[#929eaa] mt-1">
                            Sign in to access candidate analog sites and compare
                            targets side by side.
                        </p>
                    </div>

                    {/* Google Login */}
                    <button
                        onClick={handleGoogleSignIn}
                        className="mt-4 w-full h-8.5 flex items-center justify-center gap-2 rounded-md bg-[#293f4e] border border-[#7598ac] text-[#e5eaf0] text-xs font-medium shadow-[0_0_10px_rgba(105,164,194,0.18)] hover:bg-[#324c5c] transition duration-200"
                    >
                        <svg
                            aria-label="Google logo"
                            width="17"
                            height="17"
                            viewBox="0 0 48 48"
                        >
                            <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3A12 12 0 1112 24c0-1.3.2-2.5.6-3.7l-6.6-5.1A20 20 0 1024 44c11 0 20-9 20-20 0-1.2-.1-2.4-.4-3.5Z" />
                            <path fill="#FF3D00" d="m6 15.2 6.6 5.1A12 12 0 0133 15.9l5.9-5.9A20 20 0 006 15.2Z" />
                            <path fill="#4CAF50" d="M24 44a20 20 0 0013.4-5.2l-6.2-5.2A12 12 0 0112 24l-6.6 5.1A20 20 0 0024 44Z" />
                            <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3a12 12 0 01-4.1 5.6l6.2 5.2A20 20 0 0044 24c0-1.2-.1-2.4-.4-3.5Z" />
                        </svg>

                        Login with Google
                    </button>

                    {/* Support */}
                    <div className="mt-5">
                        <p className="text-[9px] text-[#8295a4]">
                            Need help?{" "}
                            <a href="mailto:support@terramatch.com"
                                className="text-[#a7bdcc] hover:underline">
                                Contact support
                            </a>
                        </p>

                        <p className="text-[9px] text-[#8295a4] mt-2 leading-4">
                            By signing in, you agree to our{" "}
                            <a href="#" className="text-[#a7bdcc] hover:underline">
                                Terms
                            </a>{" "}
                            and{" "}
                            <a href="#" className="text-[#a7bdcc] hover:underline">
                                Privacy Policy
                            </a>
                        </p>
                    </div>

                </div>
            </div>

            {/* Footer */}
            <div className="absolute bottom-3 text-center">
                <p className="text-[9px] text-[#75818d]">
                    © 2026 TerraMatch • Planetary Analog Platform
                </p>

                <p className="text-[9px] text-[#75818d] mt-2">
                    TerraMatch Platform v1.2
                </p>
            </div>

        </div>
    );
};

export default Login;