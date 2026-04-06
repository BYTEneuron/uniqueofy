import { Suspense, lazy } from 'react'
import './App.css'
import Header from './components/Header'
import Footer from './components/Footer'
import { CartProvider } from './context/CartContext'
import { AuthProvider } from './context/AuthContext'
import { Routes, Route, Link } from 'react-router-dom'
import ErrorBoundary from './components/ErrorBoundary'
import ProtectedRoute from './components/ProtectedRoute'
import ScrollToTop from './components/ScrollToTop'

// Lazy Load Pages
const Home = lazy(() => import('./pages/Home'))
const Orders = lazy(() => import('./pages/Orders'))
const Payment = lazy(() => import('./pages/Payment'))
const CartPage = lazy(() => import('./pages/CartPage'))
const Login = lazy(() => import('./pages/Login'))
const ProfileSetup = lazy(() => import('./pages/ProfileSetup'))
const About = lazy(() => import('./pages/About'))

function NotFound() {
  return (
    <div style={{ textAlign: 'center', padding: '80px 20px' }}>
      <h1 style={{ fontSize: '3rem', color: '#333', marginBottom: '10px' }}>404</h1>
      <p style={{ color: '#666', fontSize: '1.1rem', marginBottom: '20px' }}>Page not found</p>
      <Link to="/" style={{ color: '#1976D2', textDecoration: 'underline', fontSize: '1rem' }}>Go Home</Link>
    </div>
  )
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <CartProvider>
          <ScrollToTop />
          <Header />

          <main className="app-main">
            <Suspense fallback={
              <div className="loading-fallback">
                <div className="loading-spinner" />
              </div>
            }>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/cart" element={<CartPage />} />
                <Route path="/orders" element={<ProtectedRoute><Orders /></ProtectedRoute>} />
                <Route path="/payment/:orderId" element={<ProtectedRoute><Payment /></ProtectedRoute>} />
                <Route path="/login" element={<Login />} />
                <Route path="/profile-setup" element={<ProtectedRoute><ProfileSetup /></ProtectedRoute>} />
                <Route path="/about" element={<About />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </main>
          
          <Footer />
        </CartProvider>
      </AuthProvider>
    </ErrorBoundary>
  )
}

export default App

