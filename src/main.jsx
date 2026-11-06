import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { RouterProvider } from 'react-router'
import router from './Routes/Routes.jsx'
import StateProvider from './States/StateProvider.jsx'
import AuthProvider from './FirebaseAuth/AuthProvider.jsx'
import { ToastContainer } from 'react-toastify'
import "react-toastify/dist/ReactToastify.css";

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ToastContainer />
    <AuthProvider>
       <StateProvider>
        <RouterProvider router={router}></RouterProvider>
    </StateProvider>
    </AuthProvider>
  </StrictMode>,
)
