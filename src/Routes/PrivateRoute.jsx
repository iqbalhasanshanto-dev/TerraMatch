import { Navigate, useLocation } from "react-router";
import Loader from "../Components/Loader";
import useAuth from "../Hooks/useAuth";

const PrivateRoute = ({children}) => {
    const {user, loading} = useAuth()
    const location = useLocation()
    if(loading) return <Loader></Loader>
    if(!user) return <Navigate state={location.pathname} to='/login'></Navigate>
    return children
};

export default PrivateRoute;