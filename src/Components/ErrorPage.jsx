import { Link } from 'react-router';
import errorImg from '../assets/TerraMatch_ Lost in Space 404.png'

const ErrorPage = () => {
    return (
        <div>
            <Link to='/'>
                <img className='h-screen w-screen' src={errorImg} alt="" />
            </Link>
        </div>
    );
};

export default ErrorPage;