import { useState, useEffect } from 'react'
import api from '../api/axios'
import ServiceCard from './ServiceCard'
import './categoryModal.css'
import defaultImage from '../assets/images/services/ac-servicing.webp'

export default function ACServicesModal({ isOpen, onClose }) {
  const [quantities, setQuantities] = useState({})
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!isOpen) return

    const fetchServices = async () => {
      try {
        setLoading(true)
        setError(null)

        const res = await api.get('/services')
        const allServices = res.data.data || []

        const filtered = allServices.filter(
          s => s.category === 'ac' && s.isActive !== false
        )

        setServices(filtered)
      } catch (err) {
        console.error('Failed to fetch services', err)
        setError('Failed to load services')
      } finally {
        setLoading(false)
      }
    }

    fetchServices()
  }, [isOpen])

  if (!isOpen) return null

  const orderedServices = [
    ...services.filter(service => !service.name.includes('Custom')),
    ...services.filter(service => service.name.includes('Custom'))
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>AC Services</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          {loading && <div style={{ textAlign: 'center', padding: '20px' }}>Loading services...</div>}
          {error && <div style={{ textAlign: 'center', padding: '20px', color: 'red' }}>{error}</div>}

          {!loading && !error && (
            <div className="services-grid-modal">
              {services.length === 0 ? (
                <p style={{ textAlign: 'center', width: '100%' }}>
                  No services found in this category.
                </p>
              ) : (
                orderedServices.map(service => (
                  <ServiceCard
                    key={service._id}
                    service={{
                      ...service,
                      id: service._id,
                      image: service.image || defaultImage
                    }}
                    showQuantity={!service.isCustom}
                    quantity={quantities[service._id] || 1}
                    onQuantityChange={(qty) =>
                      setQuantities(prev => ({
                        ...prev,
                        [service._id]: qty
                      }))
                    }
                  />
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}