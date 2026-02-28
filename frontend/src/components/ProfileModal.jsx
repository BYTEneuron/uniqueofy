import React, { useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import './profileModal.css'

export default function ProfileModal({ isOpen, onClose }) {
  const { user } = useAuth()

  // Prevent background scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'auto'
    }
    return () => {
      document.body.style.overflow = 'auto'
    }
  }, [isOpen])

  if (!isOpen || !user) return null

  // Get initials for avatar
  const initials = `${user.firstName?.charAt(0) || ''}${user.lastName?.charAt(0) || ''}`.toUpperCase()

  return (
    <div className="profile-modal-overlay" onClick={onClose}>
      <div className="profile-modal-content" onClick={(e) => e.stopPropagation()}>
        
        <div className="profile-modal-header">
          <h2>My Profile</h2>
          <button className="close-modal-btn clickable-hover" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="profile-avatar-section">
            <div className="profile-avatar-circle">
                {initials}
            </div>
            <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>
                {user.firstName} {user.lastName}
            </div>
        </div>

        <div className="profile-field">
          <label className="profile-label">Full Name</label>
          <div className="profile-value">
            {user.firstName} {user.lastName}
          </div>
        </div>

        <div className="profile-field">
          <label className="profile-label">Phone Number</label>
          <div className="profile-value">
            +91 {user.phone}
          </div>
        </div>

        <div style={{ marginTop: '30px', textAlign: 'center', color: '#888', fontSize: '0.8rem' }}>
           Member since {user.createdAt ? new Date(user.createdAt).getFullYear() : new Date().getFullYear()}
        </div>

      </div>
    </div>
  )
}
