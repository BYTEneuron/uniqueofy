import { Suspense, lazy } from 'react'
import './App.css'
import Header from './components/Header'
import { CartProvider } from './context/CartContext'
import { AuthProvider } from './context/AuthContext'
import { Routes, Route } from 'react-router-dom'
import ErrorBoundary from './components/ErrorBoundary'

// Lazy Load Pages
const Home = lazy(() => import('./pages/Home'))
const Orders = lazy(() => import('./pages/Orders'))
const Payment = lazy(() => import('./pages/Payment'))
const CartPage = lazy(() => import('./pages/CartPage'))
const Login = lazy(() => import('./pages/Login'))
const VerifyOtp = lazy(() => import('./pages/VerifyOtp'))
const ProfileSetup = lazy(() => import('./pages/ProfileSetup'))

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <CartProvider>
          <Header />

          <main className="app-main">
            <Suspense fallback={<div className="loading-fallback">Loading...</div>}>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/cart" element={<CartPage />} />
                <Route path="/orders" element={<Orders />} />
                <Route path="/payment" element={<Payment />} />
                <Route path="/login" element={<Login />} />
                <Route path="/verify-otp" element={<VerifyOtp />} />
                <Route path="/profile-setup" element={<ProfileSetup />} />
              </Routes>
            </Suspense>
          </main>
        </CartProvider>
      </AuthProvider>
    </ErrorBoundary>
  )
}

export default App

