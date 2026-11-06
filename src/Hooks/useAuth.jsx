import { use } from "react";
import { AuthContext } from "../FirebaseAuth/AuthContext";

const useAuth = () => {
    const authInfo = use(AuthContext)
    return authInfo
};

export default useAuth;