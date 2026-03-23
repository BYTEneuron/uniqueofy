import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'
import ProfileModal from './ProfileModal'
import './header.css'
import logo from '../assets/logos/uniqueofy-logo.svg'
import cartIcon from '../assets/icons/cart.svg'

export default function Header() {
  const { getServiceCount, clearCart } = useCart()
  const { isAuthenticated, user, logout } = useAuth()
  const navigate = useNavigate()
  const cartCount = getServiceCount()
  
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [showProfileModal, setShowProfileModal] = useState(false)
  const dropdownRef = useRef(null)
  const timeoutRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    setDropdownOpen(true)
  }

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setDropdownOpen(false)
    }, 200)
  }

  const handleLogout = () => {
    logout()
    clearCart()
    localStorage.removeItem('pendingBookingForm')
    setDropdownOpen(false)
    navigate('/')
  }

  const handleNavigation = (path) => {
    navigate(path)
    setDropdownOpen(false)
  }

  return (
    <header className="site-header">
      <div className="header-content">
        <h1>
          <Link to="/" className="header-logo clickable-hover">
            <img src={logo} alt="Uniqueofy logo" className="brand-logo" />
            <span className="logo-text">UNIQUEOFY</span>
          </Link>
        </h1>

        <div className="header-actions">
          {/* Cart Icon - Moved to left of login/profile as per request */}
          <div className="cart-icon-wrapper" style={{ marginRight: '20px' }}>
            <Link to="/cart" className="cart-icon-btn clickable-hover">
              <img src={cartIcon} alt="Cart" className="cart-icon-svg" />
              {cartCount > 0 && (
                <span className="cart-badge">{cartCount}</span>
              )}
            </Link>
          </div>

          {/* User Dropdown Menu */}
          <div className="auth-dropdown" ref={dropdownRef} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
             <button 
               className={`header-btn login-btn clickable-hover ${isAuthenticated ? 'logged-in' : ''}`}
               onClick={() => isAuthenticated ? setDropdownOpen(!dropdownOpen) : handleNavigation('/login')}
             >
                {/* User Icon */}
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                </svg>

                {/* 'Login' Text - Only if NOT logged in */}
                {!isAuthenticated && <span>Login</span>}

                {/* Chevron Down Icon */}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'transform 0.2s', transform: dropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                    <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
             </button>

             {/* Dropdown Content */}
             {dropdownOpen && (
                 <div className="dropdown-menu">
                    {isAuthenticated ? (
                        <>
                           {/* User Info Header */}
                           <div className="dropdown-header">
                               <div className="dropdown-user-label">Signed in as</div>
                               <div className="dropdown-user-name">Hi, {user?.firstName}</div>
                           </div>
                           
                           {/* Logged In Items */}
                           <button onClick={() => { setShowProfileModal(true); setDropdownOpen(false) }} className="dropdown-item">
                               <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                               My Profile
                           </button>
                           <button onClick={() => handleNavigation('/orders')} className="dropdown-item">
                               <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg>
                               My Orders
                           </button>
                           
                           <div className="dropdown-divider"></div>
                           
                           <button onClick={handleLogout} className="dropdown-item text-red">
                               <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                               Logout
                           </button>
                        </>
                    ) : (
                        <>
                           {/* New Customer / Sign Up Header */}
                           <div className="dropdown-header-signup">
                               <span className="new-customer-text">New customer?</span>
                               <button 
                                   onClick={() => handleNavigation('/login')} 
                                   className="signup-link-btn"
                               >
                                   Sign Up
                               </button>
                           </div>

                           {/* Logged Out Items */}
                           <button onClick={() => handleNavigation('/login')} className="dropdown-item">
                               <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                               My Profile
                           </button>
                           <button onClick={() => handleNavigation('/login')} className="dropdown-item">
                               <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg>
                               My Orders
                           </button>
                        </>
                    )}
                 </div>
             )}
          </div>
        </div>
      </div>
      
      {/* Profile Modal */}
      <ProfileModal 
         isOpen={showProfileModal} 
         onClose={() => setShowProfileModal(false)} 
      />
    </header>
  )
}

