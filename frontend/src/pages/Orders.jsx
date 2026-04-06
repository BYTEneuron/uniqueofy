import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import api from '../api/axios';
import './orders.css';

export default function Orders() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cancellingId, setCancellingId] = useState(null);
  const [cancelError, setCancelError] = useState(null);
  const errorTimeoutRef = useRef(null);

  const handleCancel = async (order) => {
    if (!window.confirm('Are you sure you want to cancel this booking?')) return;
    setCancelError(null);
    try {
      setCancellingId(order._id);
      await api.put(`/orders/${order._id}/cancel`);
      setOrders(prev =>
        prev.map(o =>
          o._id === order._id ? { ...o, status: 'cancelled' } : o
        )
      );
    } catch (err) {
      if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
      setCancelError(err.response?.data?.message || 'Failed to cancel order');
      errorTimeoutRef.current = setTimeout(() => setCancelError(null), 5000);
    } finally {
      setCancellingId(null);
    }
  };

  useEffect(() => {
    return () => {
      if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        const { data } = await api.get('/orders/myorders');
        
        if (data.success) {
          setOrders(data.data);
        } else {
          setError('Failed to fetch orders.');
        }
      } catch (err) {
        console.error('Order fetch error:', err);
        setError(err.response?.data?.message || 'Failed to load your orders.');
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [isAuthenticated, navigate]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 20px', fontSize: '1.1rem', color: '#6b7280' }}>
        <div className="loading-spinner" style={{ margin: '0 auto 16px' }}></div>
        Loading your orders...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 20px', color: '#ef4444', fontSize: '1.1rem', fontWeight: '500' }}>
        {error}
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div style={{ maxWidth: '800px', margin: '60px auto', padding: '80px 24px', backgroundColor: '#fff', borderRadius: '16px', textAlign: 'center', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.07)' }}>
        <h2 style={{ color: '#1a1a2e', marginBottom: '12px', fontWeight: '700' }}>You have no bookings yet.</h2>
        <p style={{ color: '#6b7280', marginBottom: '28px', fontSize: '1rem' }}>Explore our services and book your first appointment!</p>
        <button 
          className="orders-explore-btn"
          onClick={() => navigate('/')}
          style={{
            backgroundColor: '#111827',
            color: 'white',
            border: 'none',
            padding: '12px 28px',
            borderRadius: '10px',
            cursor: 'pointer',
            fontSize: '1rem',
            fontWeight: '600',
            transition: 'all 0.2s',
          }}
        >
          Explore Services
        </button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '800px', margin: '40px auto', padding: '0 20px', animation: 'slideUp 0.4s ease-out' }}>
      <h1 style={{ marginBottom: '32px', textAlign: 'center', color: '#1a1a2e', fontWeight: '800', letterSpacing: '-0.02em' }}>My Bookings</h1>
      {cancelError && (
        <div style={{ backgroundColor: '#fee2e2', color: '#dc2626', padding: '12px 16px', borderRadius: '8px', marginBottom: '24px', textAlign: 'center', border: '1px solid #f87171', fontWeight: '500' }}>
          {cancelError}
        </div>
      )}

      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {orders.map((order) => {
           const statusColors = getStatusColor(order.status);
           return (
            <div 
              key={order._id} 
              style={{ 
                border: '1px solid #e5e7eb', 
                borderRadius: '16px', 
                padding: '28px',
                backgroundColor: '#fff',
                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.07), 0 2px 4px -2px rgba(0,0,0,0.05)',
                transition: 'all 0.2s cubic-bezier(0.4,0,0.2,1)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', borderBottom: '1px solid #f3f4f6', paddingBottom: '18px' }}>
                <div>
                  <span style={{ fontWeight: '600', color: '#9ca3af', fontSize: '0.8rem', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Order ID</span>
                  <span style={{ color: '#1a1a2e', fontSize: '1rem', fontFamily: 'monospace', fontWeight: '600' }}>#{order._id.slice(-6).toUpperCase()}</span>
                </div>
                <div style={{ 
                  padding: '6px 14px', 
                  borderRadius: '20px', 
                  fontSize: '0.82rem', 
                  fontWeight: '700',
                  backgroundColor: statusColors.bg,
                  color: statusColors.text,
                  border: `1px solid ${statusColors.text}20`,
                  letterSpacing: '0.02em',
                }}>
                  {formatStatus(order.status)}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '20px', marginBottom: '20px' }}>
                <div>
                  <div style={{ fontSize: '0.8rem', color: '#9ca3af', marginBottom: '6px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Service Date</div>
                  <div style={{ fontWeight: '600', color: '#1a1a2e' }}>
                    {order.serviceDate ? new Date(order.serviceDate).toLocaleDateString(undefined, { 
                      weekday: 'short', 
                      year: 'numeric', 
                      month: 'short', 
                      day: 'numeric' 
                    }) : 'Not scheduled'}
                  </div>
                </div>
                
                {order.timeSlot && (
                  <div>
                    <div style={{ fontSize: '0.8rem', color: '#9ca3af', marginBottom: '6px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Time Slot</div>
                    <div style={{ fontWeight: '600', color: '#1a1a2e' }}>{order.timeSlot}</div>
                  </div>
                )}
              </div>

              <div style={{ marginBottom: '20px' }}>
                  <div style={{ fontSize: '0.8rem', color: '#9ca3af', marginBottom: '6px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Address</div>
                  <div style={{ fontWeight: '500', lineHeight: '1.6', color: '#374151' }}>
                    {formatAddress(order.address)}
                  </div>
              </div>

              <div style={{ backgroundColor: '#f9fafb', padding: '18px', borderRadius: '12px', marginBottom: '20px', border: '1px solid #f3f4f6' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: '700', marginBottom: '14px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Services</div>
                {order.services && order.services.map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.93rem', borderBottom: idx !== order.services.length - 1 ? '1px dashed #e5e7eb' : 'none', paddingBottom: idx !== order.services.length - 1 ? '8px' : '0' }}>
                    <span style={{ color: '#374151', fontWeight: '500' }}>{item.name}</span>
                    <span style={{ color: '#6b7280', fontWeight: '600' }}>
                      {item.quantity} x ₹{item.unitPrice} = ₹{item.lineTotal}
                    </span>
                  </div>
                ))}
              </div>

              <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: '20px' }}>
                {order.paymentStatus === 'paid' ? (
                  <div style={{ color: '#166534', backgroundColor: '#f0fdf4', padding: '14px 18px', borderRadius: '10px', fontSize: '0.93rem', border: '1px solid #bbf7d0' }}>
                    <div style={{ fontWeight: '700' }}>Payment Received</div>
                    {order.paidAt && (
                      <div style={{ marginTop: '4px', color: '#16a34a', fontSize: '0.88rem' }}>
                        Paid on: {new Date(order.paidAt).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '1.2rem', fontWeight: '800', color: '#1a1a2e' }}>
                      Total: <span style={{ color: '#16a34a' }}>₹{order.totalAmount}</span>
                    </div>
                    {order.status !== 'cancelled' && (
                      <button style={{ backgroundColor: '#16a34a', color: 'white', border: 'none', padding: '12px 28px', borderRadius: '10px', fontSize: '1rem', cursor: 'pointer', fontWeight: '700', boxShadow: '0 2px 8px rgba(22,163,74,0.25)', transition: 'all 0.2s cubic-bezier(0.4,0,0.2,1)' }}
                        className="orders-payment-btn"
                        onClick={() => navigate(`/payment/${order._id}`)}
                      >
                        Proceed to Payment
                      </button>
                    )}
                  </div>
                )}
              </div>

              {order.status === 'pending_review' && (
                <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    className="orders-cancel-btn"
                    disabled={cancellingId === order._id}
                    onClick={() => handleCancel(order)}
                    style={{
                      backgroundColor: cancellingId === order._id ? '#fca5a5' : '#dc2626',
                      color: 'white',
                      border: 'none',
                      padding: '12px 28px',
                      borderRadius: '10px',
                      fontSize: '0.95rem',
                      cursor: cancellingId === order._id ? 'not-allowed' : 'pointer',
                      fontWeight: '700',
                      boxShadow: '0 2px 8px rgba(220,38,38,0.2)',
                      transition: 'all 0.2s cubic-bezier(0.4,0,0.2,1)',
                      opacity: cancellingId === order._id ? 0.7 : 1,
                    }}
                  >
                    {cancellingId === order._id ? 'Cancelling...' : 'Cancel Booking'}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Helper to format address object or string
function formatAddress(addr) {
  if (!addr) return 'No address provided';
  if (typeof addr === 'string') return addr;
  // Handle different potential address structures
  return [
    addr.street,
    addr.city,
    addr.state,
    addr.zip
  ].filter(Boolean).join(', ') || 'Address details unavailable';
}

// Helper to format raw status to human-readable label
function formatStatus(status) {
  const STATUS_LABELS = {
    pending_review: 'Pending Review',
    confirmed: 'Confirmed',
    completed: 'Completed',
    cancelled: 'Cancelled',
  };
  return STATUS_LABELS[status] || status;
}

// Helper for status badge colors
function getStatusColor(status) {
  switch (status) {
    case 'pending_review':
      return { bg: '#FFF3E0', text: '#EF6C00' };

    case 'confirmed':
      return { bg: '#E3F2FD', text: '#1565C0' };

    case 'completed':
      return { bg: '#E8F5E9', text: '#2E7D32' };

    case 'cancelled':
      return { bg: '#FFEBEE', text: '#C62828' };

    default:
      return { bg: '#F5F5F5', text: '#616161' };
  }
}

