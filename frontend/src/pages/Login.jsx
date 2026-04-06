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
  const [step, setStep] = useState('PHONE')
  const [mobile, setMobile] = useState('')
  const [otp, setOtp] = useState('')
  const [error, setError] = useState('')
  const [notification, setNotification] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [cooldown, setCooldown] = useState(() => getRemainingCooldown())
  const { sendOtp, verifyOtp, isAuthenticated, user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const redirectPath = location.state?.next || '/'

  useEffect(() => {
    if (isAuthenticated && user) {
      if (!user.firstName) {
        navigate('/profile-setup', { state: { next: redirectPath }, replace: true })
      } else {
        sessionStorage.removeItem('auth_flow_next')
        navigate(redirectPath, { replace: true })
      }
    }
  }, [isAuthenticated, user, navigate, redirectPath])

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
    if (isLoading) return

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
        if (step === 'OTP') setNotification('OTP sent successfully')
        const defaultCooldown = 20
        localStorage.setItem(COOLDOWN_KEY, String(Date.now() + defaultCooldown * 1000))
        setCooldown(defaultCooldown)
        sessionStorage.setItem('auth_flow_phone', mobile)
        sessionStorage.setItem('auth_flow_next', redirectPath)
        setError('')
        setOtp('')
        setStep('OTP')
      } else {
        if (response.status === 429 && response.data?.retryAfter) {
          const retryAfter = response.data.retryAfter
          localStorage.setItem(COOLDOWN_KEY, String(Date.now() + retryAfter * 1000))
          setCooldown(retryAfter)
        } else {
          // Explicitly show any non-cooldown errors (500s, 400s) to the user
          setError(response.message || 'Failed to send OTP')
        }
      }
    } catch (err) {
      const message = err.response?.data?.message || 'A network error occurred. Please try again.'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleOtpChange = (e) => {
    const value = e.target.value.replace(/\D/g, '')
    if (value.length <= 6) {
      setOtp(value)
      setError('')
      setNotification('')
    }
  }

  const handleVerify = async () => {
    if (isLoading) return

    if (otp.length !== 6) {
      setError('Please enter a 6-digit OTP')
      return
    }

    setIsLoading(true)
    setError('')

    const response = await verifyOtp(mobile, otp)

    if (response.success) {
      sessionStorage.removeItem('auth_flow_phone')
      // Routing is now handled automatically by the useEffect above
    } else {
      setError(response.message || 'Invalid OTP. Please try again.')
      setIsLoading(false)
    }
  }

  return (
    <div className="auth-container">
      <h1 className="auth-title">Login / Sign Up</h1>

      <div className="auth-form">
        {step === 'PHONE' && (
          <>
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
              Enter your mobile number to login or sign up. We will send you a One Time Password (OTP).
            </p>

            <button
              className="auth-btn clickable-hover"
              onClick={handleSendOtp}
              disabled={isLoading || cooldown > 0}
              style={{ opacity: (isLoading || cooldown > 0) ? 0.7 : 1 }}
            >
              {isLoading ? 'Sending OTP...' : cooldown > 0 ? <span style={{ color: '#d32f2f' }}>{`Try again in ${Math.floor(cooldown / 60)}:${String(cooldown % 60).padStart(2, '0')}`}</span> : 'Send OTP'}
            </button>
          </>
        )}

        {step === 'OTP' && (
          <>
            <p className="auth-helper-text">
              We have sent a verification code to +91 {mobile}
            </p>

            <div className="auth-field">
              <input
                type="text"
                className="auth-input"
                value={otp}
                onChange={handleOtpChange}
                placeholder="Enter 6-digit OTP"
                style={{ textAlign: 'center', letterSpacing: '4px', fontSize: '1.2rem' }}
                maxLength="6"
                disabled={isLoading}
              />
              {error && <div className="auth-error" style={{ textAlign: 'center' }}>{error}</div>}
              {notification && <div className="auth-error" style={{ textAlign: 'center' }}>{notification}</div>}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
              <button
                className="auth-btn clickable-hover"
                onClick={handleVerify}
                disabled={isLoading}
                style={{ opacity: isLoading ? 0.7 : 1 }}
              >
                {isLoading ? 'Verifying...' : 'Verify OTP'}
              </button>

              <button
                className="auth-btn clickable-hover"
                onClick={handleSendOtp}
                disabled={isLoading || cooldown > 0}
                style={{ background: 'transparent', color: cooldown > 0 ? '#999' : '#333', fontWeight: 'normal', border: 'none', padding: '0' }}
              >
                {cooldown > 0 ? `Resend OTP (${cooldown}s)` : 'Resend OTP'}
              </button>

              <button
                className="auth-btn clickable-hover"
                style={{ background: 'transparent', color: '#666', fontWeight: 'normal' }}
                onClick={() => {
                  setStep('PHONE')
                  setError('')
                  setNotification('')
                }}
                disabled={isLoading}
              >
                Change Phone Number
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
