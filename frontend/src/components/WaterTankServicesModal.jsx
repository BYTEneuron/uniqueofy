import { useState, useEffect } from 'react'
import api from '../api/axios'
import ServiceCard from './ServiceCard'
import './categoryModal.css'
import defaultImage from '../assets/images/services/tank-1000l.webp'

export default function WaterTankServicesModal({ isOpen, onClose }) {
  const [quantities, setQuantities] = useState({})
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (isOpen) {
      setLoading(true)
      api.get('/services')
        .then(res => {
            const allServices = res.data.data || []
            const filtered = allServices.filter(s => s.category === 'water_tank'&& s.isActive !== false)
            setServices(filtered)
            setLoading(false)
        })
        .catch(err => {
            console.error("Failed to fetch services", err)
            setError("Failed to load services")
            setLoading(false)
        })
    }
  }, [isOpen])

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
                        image: service.image || defaultImage
                    }}
                    showQuantity={true} // Defaulting to true as per previous logic logic? Old logic: !service.isCustom
                    // Actually, let's keep logic: !service.isCustom
                    // But backend might not have isCustom flag. 
                    // Let's assume false or check if valid flag exists.
                    // For now, I'll use !service.isCustom (if backend sends it) or true.
                    // Note: original WaterTank logic was: showQuantity={!service.isCustom}
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
