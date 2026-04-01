import { useCart } from '../context/useCart'
import './serviceCard.css'

export default function ServiceCard({
  service,
  showQuantity = false,
  quantity = 1,
  onQuantityChange,
  className = '',
}) {
  const { addToCart } = useCart()

  const handleAdd = () => {
    const qtyToAdd = showQuantity ? quantity : 1
    addToCart(service, qtyToAdd)

    // Reset quantity to 1 after adding (only for quantity mode)
    if (showQuantity && onQuantityChange) {
      onQuantityChange(1)
    }
  }

  return (
    <div className={`service-card-modern ${className}`}>
      <div className="service-image-wrapper">
        <img
          src={service.image}
          alt={service.name}
          className="service-image-modern"
        />
      </div>

      <div className="service-card-body">
        <h3 className="service-card-title">{service.name}</h3>

        {service.duration && (
          <p className="service-card-duration">{service.duration}</p>
        )}

        <div className="service-card-footer">
          <div className="service-card-price">
            Price will be discussed
          </div>

          {!service.isCustom && showQuantity && (
            <div className="quantity-selector">
              <button
                className="qty-btn"
                onClick={() => onQuantityChange(Math.max(1, quantity - 1))}
              >
                −
              </button>
              <span className="qty-display">{quantity}</span>
              <button
                className="qty-btn"
                onClick={() => onQuantityChange(quantity + 1)}
              >
                +
              </button>
            </div>
          )}

          <button className="btn-add full-width" onClick={handleAdd}>
            Add
          </button>
        </div>
      </div>
    </div>
  )
}
