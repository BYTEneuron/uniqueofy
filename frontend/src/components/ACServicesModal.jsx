import { useState, useEffect } from 'react'
import api from '../api/axios'
import ServiceCard from './ServiceCard'
import './categoryModal.css'
import acServicingImg from '../assets/images/services/ac-servicing.webp'
import acInstallationImg from '../assets/images/services/ac-installation.webp'
import acCustomImg from '../assets/images/services/ac-custom.webp'

// Map service names to local images
const IMAGE_MAP = {
  'AC Servicing': acServicingImg,
  'AC Installation': acInstallationImg,
  'Custom AC Request': acCustomImg,
}

function getServiceImage(service) {
  // Try exact name match first, then partial match
  if (IMAGE_MAP[service.name]) return IMAGE_MAP[service.name]
  const key = Object.keys(IMAGE_MAP).find(k =>
    service.name.toLowerCase().includes(k.toLowerCase()) ||
    k.toLowerCase().includes(service.name.toLowerCase())
  )
  return key ? IMAGE_MAP[key] : acServicingImg
}

export default function ACServicesModal({ isOpen, onClose }) {
  const [quantities, setQuantities] = useState({})
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [hasFetched, setHasFetched] = useState(false)

  useEffect(() => {
    if (!isOpen || hasFetched) return

    const fetchServices = async () => {
      try {
        setLoading(true)
        setError(null)

        const res = await api.get('/services?category=ac')
        
        setServices(res.data.data || [])
        setHasFetched(true)
      } catch (err) {
        console.error('Failed to fetch services', err)
        setError('Failed to load services')
      } finally {
        setLoading(false)
      }
    }

    fetchServices()
  }, [isOpen, hasFetched])

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
                    className="ac-service-card"
                    service={{
                      ...service,
                      image: getServiceImage(service)
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