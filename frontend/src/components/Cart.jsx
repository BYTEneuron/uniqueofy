import { useCart } from '../context/useCart'
import { useNavigate } from 'react-router-dom'
import './cart.css'
import cartIcon from '../assets/icons/cart.svg'

export default function Cart() {
  const { cart, removeFromCart, updateQuantity } = useCart()
  const navigate = useNavigate()
  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  if (cart.length === 0) {
    return (
      <div className="cart-section">
        <h3>
          <img src={cartIcon} alt="" className="cart-header-icon" />
          Your Cart
        </h3>
        <p className="empty-cart">Your cart is empty</p>
      </div>
    )
  }

  return (
    <div className="cart-section">
      <h3>
        <img src={cartIcon} alt="" className="cart-header-icon" />
        Your Cart ({cart.length} {cart.length === 1 ? 'item' : 'items'})
      </h3>
      
      <div className="cart-items">
        {cart.map((item) => (
          <div key={item._id} className="cart-item">
            <div className="cart-item-info">
              <h4>{item.name}</h4>
              <div className="cart-item-price" style={{ fontWeight: '600', color: '#16a34a' }}>
                ₹{item.price} x {item.quantity} = ₹{item.price * item.quantity}
              </div>
            </div>

            <div className="cart-item-controls">
              {!item.isCustom && (
                <div className="quantity-selector">
                  <button 
                    className="qty-btn"
                    onClick={() => updateQuantity(item._id, Math.max(0, item.quantity - 1))}
                  >
                    −
                  </button>
                  <span className="qty-display">{item.quantity}</span>
                  <button 
                    className="qty-btn"
                    onClick={() => updateQuantity(item._id, item.quantity + 1)}
                  >
                    +
                  </button>
                </div>
              )}
              <button 
                className="remove-btn"
                onClick={() => removeFromCart(item._id)}
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="cart-summary">
        <div style={{ fontWeight: '700', marginBottom: '10px', color: '#1a1a2e' }}>
          Total: <span style={{ color: '#16a34a' }}>₹{cartTotal}</span>
        </div>
        <button className="checkout-btn" onClick={() => navigate('/cart')}>
          Proceed to Checkout
        </button>  
      </div>
    </div>
  )
}
