import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import './auth.css'

export default function VerifyOtp() {
  const [otp, setOtp] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const { verifyOtp } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  
  const phone = location.state?.phone || sessionStorage.getItem('auth_flow_phone')
  const nextPath = location.state?.next || sessionStorage.getItem('auth_flow_next') || '/'

  // Ensure state propagates to sessionStorage if they landed here via history navigation
  useEffect(() => {
    if (phone) sessionStorage.setItem('auth_flow_phone', phone)
    if (nextPath) sessionStorage.setItem('auth_flow_next', nextPath)
  }, [phone, nextPath])

  useEffect(() => {
    if (!phone) {
      navigate('/login')
    }
  }, [phone, navigate])


  const handleOtpChange = (e) => {
    // Only numbers
    const value = e.target.value.replace(/\D/g, '')
    // Max 6 digits
    if (value.length <= 6) {
      setOtp(value)
      setError('')
    }
  }

  const handleVerify = async () => {
    if (otp.length !== 6) {
      setError('Please enter a 6-digit OTP')
      return
    }

    setIsLoading(true)
    setError('')

    const response = await verifyOtp(phone, otp)
    
    if (response.success) {
      sessionStorage.removeItem('auth_flow_phone') // Clear just the phone
      
      // Check if profile is complete (firstName is a required field for profile completion)
      if (!response.user.firstName) {
        navigate('/profile-setup', { state: { next: nextPath } })
      } else {
        sessionStorage.removeItem('auth_flow_next') // Process complete, clear fully
        navigate(nextPath, { replace: true })
      }
    } else {
      setError(response.message || 'Invalid OTP. Please try again.')
      setIsLoading(false)
    }
  }

  return (
    <div className="auth-container">
      <h1 className="auth-title">Enter OTP</h1>
      
      <p style={{ marginBottom: '24px', color: '#666' }}>
        We have sent a verification code to <br />
        <strong>+91 {phone}</strong>
      </p>

      <div className="auth-form">
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
        </div>

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
          style={{ background: 'transparent', color: '#666', marginTop: '0', fontWeight: 'normal' }}
          onClick={() => navigate('/login')}
          disabled={isLoading}
        >
          Change Phone Number
        </button>
      </div>
    </div>
  )
}
