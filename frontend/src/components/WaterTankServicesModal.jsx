import { useState, useEffect } from 'react'
import api from '../api/axios'
import ServiceCard from './ServiceCard'
import './categoryModal.css'
import tank500lImg from '../assets/images/services/tank-500l.webp'
import tank1000lImg from '../assets/images/services/tank-1000l.webp'
import tank2000lImg from '../assets/images/services/tank-2000l.webp'
import tankCustomImg from '../assets/images/services/tank-custom.webp'

// Map service names to local images
const IMAGE_MAP = {
  '500L Water Tank Cleaning': tank500lImg,
  '1000L Water Tank Cleaning': tank1000lImg,
  '2000L Water Tank Cleaning': tank2000lImg,
  'Custom Size Water Tank': tankCustomImg,
}

function getServiceImage(service) {
  // Try exact name match first
  if (IMAGE_MAP[service.name]) return IMAGE_MAP[service.name]
  // Partial match by size number
  const sizeMatch = service.name.match(/(\d+)L/i)
  if (sizeMatch) {
    const key = Object.keys(IMAGE_MAP).find(k => k.includes(sizeMatch[1] + 'L'))
    if (key) return IMAGE_MAP[key]
  }
  // Custom fallback
  if (service.name.toLowerCase().includes('custom')) return tankCustomImg
  return tank1000lImg
}

export default function WaterTankServicesModal({ isOpen, onClose }) {
  const [quantities, setQuantities] = useState({})
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [hasFetched, setHasFetched] = useState(false)

  useEffect(() => {
    if (!isOpen || hasFetched) return

    setLoading(true)
    api.get('/services')
      .then(res => {
          const allServices = res.data.data || []
          const filtered = allServices.filter(s => s.category === 'water_tank'&& s.isActive !== false)
          setServices(filtered)
          setHasFetched(true)
          setLoading(false)
      })
      .catch(err => {
          console.error("Failed to fetch services", err)
          setError("Failed to load services")
          setLoading(false)
      })
  }, [isOpen, hasFetched])

  if (!isOpen) return null

  const normalServices = services.filter(service => !service.name.includes('Custom'));
  normalServices.sort((a, b) => {
    const numA = parseInt(a.name.match(/\d+/)?.[0] || 0);
    const numB = parseInt(b.name.match(/\d+/)?.[0] || 0);
    return numA - numB;
  });

  const orderedServices = [
    ...normalServices,
    ...services.filter(service => service.name.includes('Custom'))
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Water Tank Cleaning</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '20px' }}>Loading services...</div>
          ) : error ? (
             <div style={{ textAlign: 'center', padding: '20px', color: 'red' }}>{error}</div>
          ) : (
            <div className="services-grid-modal">
              {services.length === 0 ? (
                 <p style={{ textAlign: 'center', width: '100%' }}>No services found in this category.</p>
              ) : (
                orderedServices.map((service) => (
                  <ServiceCard
                    key={service._id}
                    service={{
                        ...service,
                        id: service._id,
                        image: getServiceImage(service)
                    }}
                    showQuantity={!service.isCustom}
                    quantity={quantities[service._id] || 1}
                    onQuantityChange={(qty) =>
                      setQuantities(prev => ({ ...prev, [service._id]: qty }))
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
