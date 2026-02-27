import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'
import './cartPage.css'

export default function CartPage() {
  const { cart, removeFromCart, updateQuantity, clearCart } = useCart()
  const { user, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [formData, setFormData] = useState({
    fullName: '',
    mobile: '',
    address: '',
    date: '',
    timeSlot: '',
    instructions: ''
  })
  
  const [loading, setLoading] = useState(false)
  const [submissionError, setSubmissionError] = useState(null)
  const [errors, setErrors] = useState({})

  const handleChange = (e) => {
    const { name, value } = e.target
    
    // Custom handling based on field type
    let processedValue = value

    if (name === 'fullName') {
      // Allow only letters and spaces, replace multiple spaces with single space (>1), prevent leading space
      processedValue = value
        .replace(/[^a-zA-Z ]/g, "")
        .replace(/\s{2,}/g, " ")
        .replace(/^\s+/g, "")
    } else if (name === 'mobile') {
      // Allow only numbers
      processedValue = value.replace(/\D/g, '')
    }

    setFormData(prev => ({ ...prev, [name]: processedValue }))
    
    // Clear error when user types
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }))
    }
  }

  const validate = () => {
    const newErrors = {}
    
    // Name validation
    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Full Name is required'
    } else if (!/^[A-Za-z]+(?: [A-Za-z]+)*$/.test(formData.fullName.trim())) {
      newErrors.fullName = 'Name should contain only letters'
    }

    // Mobile validation
    if (!formData.mobile.trim()) {
      newErrors.mobile = 'Mobile Number is required'
    } else if (!/^[0-9]{10}$/.test(formData.mobile)) {
      newErrors.mobile = 'Please enter a valid 10-digit Indian mobile number'
    }

    if (!formData.address.trim()) newErrors.address = 'Address is required'
    if (!formData.date) {
      newErrors.date = 'Preferred Date is required'
    } else {
      const selectedDate = new Date(formData.date)
      const todayDate = new Date()
      todayDate.setHours(0, 0, 0, 0)

      if (selectedDate <= todayDate) {
        newErrors.date = 'Same day bookings are not allowed'
      }
    }
    if (!formData.timeSlot) newErrors.timeSlot = 'Please select a preferred time slot'
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async () => {
    // If user is not authenticated, redirect to login
    // Note: checking isLoggedIn (from user object) or isAuthenticated (state) depending on context
    // Assuming context provides isAuthenticated as per AuthContext code read earlier
    if (!isAuthenticated) { 
      localStorage.setItem('pendingBookingForm', JSON.stringify(formData))
      navigate('/login', { state: { from: location.pathname } })
      return
    }

    if (validate()) {
      setLoading(true)
      setSubmissionError(null)

      try {
        const payload = {
          services: cart.map(item => ({
             serviceId: item.id,
             name: item.name,
             quantity: item.quantity
          })),
          serviceDate: formData.date,
          timeSlot: formData.timeSlot,
          address: formData.address,
          note: formData.instructions
        }

        await api.post('/orders', payload)
        
        clearCart()
        localStorage.removeItem('pendingBookingForm')
        navigate('/orders', { state: { newBooking: true } })

      } catch (error) {
        console.error('Order submission failed:', error)
        setSubmissionError(error.response?.data?.message || 'Failed to submit order. Please try again.')
      } finally {
        setLoading(false)
      }
    }
  }

  // Restore pending form data if exists
  useEffect(() => {
    const savedForm = localStorage.getItem('pendingBookingForm')
    if (savedForm) {
      setFormData(prev => ({ ...prev, ...JSON.parse(savedForm) }))
      // Clear it immediately so it doesn't persist on reload/logout
      localStorage.removeItem('pendingBookingForm')
    }
  }, [])

  // Pre-fill mobile number if logged in
  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        mobile: user.phone || '',
        fullName: `${user.firstName || ''} ${user.lastName || ''}`.trim()
      }))
    }
  }, [user])

  // Get tomorrow's date for min attribute
  const getTomorrowLocal = () => {
    const now = new Date()
    now.setDate(now.getDate() + 1)
    const offset = now.getTimezoneOffset()
    const local = new Date(now.getTime() - offset * 60 * 1000)
    return local.toISOString().split('T')[0]
  }

  const tomorrow = getTomorrowLocal()

  return (
    <div className="cart-page">
      <h1 className="cart-page-title">Your Booking Request</h1>

      {cart.length === 0 ? (
        <div className="cart-page-section empty-cart-message">
          <p>Your cart is empty.</p>
          <Link to="/">Browse Services</Link>
        </div>
      ) : (
        <>
          {/* Cart Items Section */}
          <div className="cart-page-section">
        <h3>Services</h3>
        
        {cart.map(item => (
          <div key={item.id} className="cart-page-item">
            <img src={item.image} alt={item.name} className="cart-item-img" />
            
            <div className="cart-item-details">
              <h4>{item.name}</h4>
              <p className="cart-item-duration">{item.duration}</p>
              <p className="cart-item-price-placeholder">Price will be discussed</p>
            </div>

            <div className="cart-item-actions">
              {!item.isCustom && (
                <div className="quantity-selector">
                  <button 
                    className="qty-btn"
                    onClick={() => updateQuantity(item.id, Math.max(0, item.quantity - 1))}
                  >
                    −
                  </button>
                  <span className="qty-display">{item.quantity}</span>
                  <button 
                    className="qty-btn"
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                  >
                    +
                  </button>
                </div>
              )}
              
              <button 
                className="remove-btn" 
                onClick={() => removeFromCart(item.id)}
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Special Instructions Section */}
      <div className="cart-page-section">
        <h3>Special Instructions (Optional)</h3>
        <textarea
          name="instructions"
          className="form-control"
          placeholder="“Please call before arrival”, “Bring ladder”"
          value={formData.instructions}
          onChange={handleChange}
        />
      </div>

      {/* Customer Details Section */}
      <div className="cart-page-section">
        <h3>Customer Details</h3>
        
        <div className="form-group">
          <label>Full Name *</label>
          <input
            type="text"
            name="fullName"
            className="form-control"
            value={formData.fullName}
            onChange={handleChange}
            disabled={!!user}
          />
          {errors.fullName && <div className="inline-error">{errors.fullName}</div>}
        </div>

        <div className="form-group">
          <label>Mobile Number *</label>
          <div className="phone-input-wrapper">
            <span className="country-code">🇮🇳 +91</span>
            <input
              type="tel"
              name="mobile"
              maxLength="10"
              className="form-control"
              value={formData.mobile}
              onChange={handleChange}
              disabled={!!user}
            />
          </div>
          {errors.mobile && <div className="inline-error">{errors.mobile}</div>}
        </div>

        <div className="form-group">
          <label>Address *</label>
          <textarea
            name="address"
            className="form-control"
            value={formData.address}
            onChange={handleChange}
          />
          {errors.address && <div className="inline-error">{errors.address}</div>}
        </div>

        <div className="form-group">
          <label>Preferred Service Date *</label>
          <input
            type="date"
            name="date"
            min={tomorrow}
            className="form-control"
            value={formData.date}
            onChange={handleChange}
          />
          {errors.date && <div className="inline-error">{errors.date}</div>}
        </div>

        <div className="form-group">
          <label>Preferred Time Slot *</label>
          <select
            name="timeSlot"
            className="form-control"
            value={formData.timeSlot}
            onChange={handleChange}
          >
            <option value="">Select a time slot</option>
            <option value="Morning (9am–12pm)">Morning (9am–12pm)</option>
            <option value="Afternoon (12pm–4pm)">Afternoon (12pm–4pm)</option>
            <option value="Evening (4pm–7pm)">Evening (4pm–7pm)</option>
          </select>
          {errors.timeSlot && <div className="inline-error">{errors.timeSlot}</div>}
        </div>
      </div>

      <div className="cart-page-footer">
        {submissionError && (
          <div className="inline-error" style={{ marginBottom: '10px', textAlign: 'center' }}>
            {submissionError}
          </div>
        )}

        <button 
          className="confirm-btn clickable-hover" 
          onClick={handleSubmit} 
          disabled={loading}
          style={{ opacity: loading ? 0.7 : 1 }}
        >
          {loading ? 'Processing...' : 'Confirm Booking Request'}
        </button>
      </div>
        </>
      )}
    </div>
  )
}
