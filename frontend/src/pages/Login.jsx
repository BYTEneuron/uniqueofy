import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import './auth.css'

const COOLDOWN_KEY = 'otp_cooldown_until'

function getRemainingCooldown() {
  const until = localStorage.getItem(COOLDOWN_KEY)
  if (!until) return 0
  const remaining = Math.ceil((parseInt(until) - Date.now()) / 1000)
  if (remaining <= 0) {
    localStorage.removeItem(COOLDOWN_KEY)
    return 0
  }
  return remaining
}

export default function Login() {
  const [mobile, setMobile] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [cooldown, setCooldown] = useState(() => getRemainingCooldown())
  const { sendOtp, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const redirectPath = location.state?.next || '/'

  useEffect(() => {
    if (isAuthenticated) {
      navigate(redirectPath, { replace: true })
    }
  }, [isAuthenticated, navigate, redirectPath])

  useEffect(() => {
    if (cooldown <= 0) {
      localStorage.removeItem(COOLDOWN_KEY)
      return
    }
    const timer = setInterval(() => {
      const remaining = getRemainingCooldown()
      if (remaining <= 0) {
        setCooldown(0)
        clearInterval(timer)
      } else {
        setCooldown(remaining)
      }
    }, 1000)
    return () => clearInterval(timer)
  }, [cooldown])

  const handleMobileChange = (e) => {
    // Only numbers
    const value = e.target.value.replace(/\D/g, '')
    // Max 10 digits
    if (value.length <= 10) {
      setMobile(value)
      setError('') // Clear error on type
    }
  }

  const handleSendOtp = async () => {
    if (!mobile) {
      setError('Mobile number is required')
      return
    }
    if (mobile.length !== 10) {
      setError('Please enter a valid 10-digit Indian mobile number')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const response = await sendOtp(mobile)

      if (response.success) {
        sessionStorage.setItem('auth_flow_phone', mobile)
        sessionStorage.setItem('auth_flow_next', redirectPath)
        navigate('/verify-otp', { state: { phone: mobile, next: redirectPath } })
      } else {
        if (response.status === 429 && response.data?.retryAfter) {
          const retryAfter = response.data.retryAfter
          localStorage.setItem(COOLDOWN_KEY, String(Date.now() + retryAfter * 1000))
          setCooldown(retryAfter)
        }
        setError(response.message || 'Failed to send OTP')
      }
    } catch (err) {
      const message = err.response?.data?.message || 'A network error occurred. Please try again.'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="auth-container">
      <h1 className="auth-title">Login to Continue</h1>
      
      <div className="auth-form">
        <div className="auth-field">
          <label>Phone Number</label>
          <div className="auth-phone-wrapper">
            <span className="auth-country-code">🇮🇳 +91</span>
            <input
              type="tel"
              className="auth-input-tel"
              value={mobile}
              onChange={handleMobileChange}
              placeholder="00000 00000"
              disabled={isLoading}
            />
          </div>
          {error && <div className="auth-error">{error}</div>}
        </div>

        <p className="auth-helper-text">
          We will send you a One Time Password (OTP) to this mobile number.
        </p>

        <button 
            className="auth-btn clickable-hover" 
            onClick={handleSendOtp}
            disabled={isLoading || cooldown > 0}
            style={{ opacity: (isLoading || cooldown > 0) ? 0.7 : 1 }}
        >
          {isLoading ? 'Sending OTP...' : cooldown > 0 ? <span style={{ color: '#d32f2f' }}>{`Try again in ${Math.floor(cooldown / 60)}:${String(cooldown % 60).padStart(2, '0')}`}</span> : 'Send OTP'}
        </button>
      </div>
    </div>
  )
}
