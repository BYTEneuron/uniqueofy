import { Suspense, lazy } from 'react'
import './App.css'
import Header from './components/Header'
import Footer from './components/Footer'
import { CartProvider } from './context/CartContext'
import { AuthProvider } from './context/AuthContext'
import { Routes, Route, Link, useLocation } from 'react-router-dom'
import ErrorBoundary from './components/ErrorBoundary'
import ProtectedRoute from './components/ProtectedRoute'
import ScrollToTop from './components/ScrollToTop'
import AdminRoute from './components/AdminRoute'
import AdminLayout from './components/admin/AdminLayout'

// Lazy Load Pages
const Home = lazy(() => import('./pages/Home'))
const Orders = lazy(() => import('./pages/Orders'))
const Payment = lazy(() => import('./pages/Payment'))
const CartPage = lazy(() => import('./pages/CartPage'))
const Login = lazy(() => import('./pages/Login'))
const ProfileSetup = lazy(() => import('./pages/ProfileSetup'))
const About = lazy(() => import('./pages/About'))
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'))
const AdminOrders = lazy(() => import('./pages/admin/AdminOrders'))
const AdminServices = lazy(() => import('./pages/admin/AdminServices'))
const AdminUsers = lazy(() => import('./pages/admin/AdminUsers'))

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
  const location = useLocation()
  const isAdminRoute = location.pathname.startsWith('/admin')

  return (
    <ErrorBoundary>
      <AuthProvider>
        <CartProvider>
          <ScrollToTop />
            {!isAdminRoute && <Header />}

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

                  <Route path="/admin" element={<AdminRoute />}>
                    <Route element={<AdminLayout />}>
                      <Route index element={<AdminDashboard />} />
                      <Route path="orders" element={<AdminOrders />} />
                      <Route path="services" element={<AdminServices />} />
                      <Route path="users" element={<AdminUsers />} />
                    </Route>
                  </Route>

                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </main>

            {!isAdminRoute && <Footer />}
        </CartProvider>
      </AuthProvider>
    </ErrorBoundary>
  )
}

export default App

