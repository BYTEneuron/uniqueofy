import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import api from '../api/axios'
import './auth.css'

export default function ProfileSetup() {
  const [form, setForm] = useState({ firstName: '', lastName: '' })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [serverError, setServerError] = useState(null)
  
  const { updateUser } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const redirectPath = location.state?.next || sessionStorage.getItem('auth_flow_next') || '/'

  // Persist the redirect intent through refresh
  useEffect(() => {
    if (redirectPath && redirectPath !== '/') {
        sessionStorage.setItem('auth_flow_next', redirectPath)
    }
  }, [redirectPath])

  const handleNameChange = (e) => {
    const { name, value } = e.target
    const processed = value
      .replace(/[^A-Za-z ]/g, "")     // only letters & space
      .replace(/\s{2,}/g, " ")        // collapse multiple spaces
      .replace(/^\s/, "")             // prevent leading space

    setForm(prev => ({ ...prev, [name]: processed }))
    
    // Clear error
    if (errors[name]) {
        setErrors(prev => ({ ...prev, [name]: null }))
    }
    if (serverError) setServerError(null)
  }

  const validate = () => {
    const newErrors = {}
    
    if (!form.firstName.trim() || !/^[A-Za-z]+(?: [A-Za-z]+)*$/.test(form.firstName.trim())) {
      newErrors.firstName = "Enter a valid first name"
    }

    if (!form.lastName.trim() || !/^[A-Za-z]+(?: [A-Za-z]+)*$/.test(form.lastName.trim())) {
      newErrors.lastName = "Enter a valid last name"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return

    setLoading(true)
    setServerError(null)

    try {
      const { firstName, lastName } = form
      const response = await api.put('/auth/profile', { 
        firstName: firstName.trim(), 
        lastName: lastName.trim() 
      })

      const updatedUser = response.data.data

      if (updateUser) {
        updateUser(updatedUser)
      }

      sessionStorage.removeItem('auth_flow_next') // Clean up flow state
      navigate(redirectPath)
    } catch (err) {
      console.error('Profile update failed:', err)
      const message = err.response?.data?.message || 'Failed to update profile'
      setServerError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-container">
      <h1 className="auth-title">Complete Profile</h1>
      <p style={{ color: '#666', marginBottom: '24px' }}>
        Please enter your details to continue.
      </p>
      
      {serverError && (
        <div className="auth-error" style={{ marginBottom: '16px', textAlign: 'center' }}>
          {serverError}
        </div>
      )}

      <div className="auth-form">
        <div className="auth-field">
          <label>First Name</label>
          <input
            type="text"
            name="firstName"
            className="auth-input"
            value={form.firstName}
            onChange={handleNameChange}
            placeholder="Enter first name"
            disabled={loading}
          />
          {errors.firstName && <div className="auth-error">{errors.firstName}</div>}
        </div>

        <div className="auth-field">
          <label>Last Name</label>
          <input
            type="text"
            name="lastName"
            className="auth-input"
            value={form.lastName}
            onChange={handleNameChange}
            placeholder="Enter last name"
            disabled={loading}
          />
          {errors.lastName && <div className="auth-error">{errors.lastName}</div>}
        </div>

        <button 
          className="auth-btn clickable-hover" 
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading ? 'Saving...' : 'Continue to Home'}
        </button>
      </div>
    </div>
  )
}
