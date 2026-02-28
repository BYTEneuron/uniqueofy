import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

export default function Orders() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cancellingId, setCancellingId] = useState(null);

  const handleCancel = async (order) => {
    if (!window.confirm('Are you sure you want to cancel this booking?')) return;
    try {
      setCancellingId(order._id);
      await api.put(`/orders/${order._id}/cancel`);
      setOrders(prev =>
        prev.map(o =>
          o._id === order._id ? { ...o, status: 'cancelled' } : o
        )
      );
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to cancel order');
    } finally {
      setCancellingId(null);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { replace: true });
      return;
    }

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
      <div style={{ textAlign: 'center', padding: '50px', fontSize: '1.2rem', color: '#666' }}>
        Loading your orders...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: '50px', color: '#e53935', fontSize: '1.2rem' }}>
        {error}
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div style={{ maxWidth: '800px', margin: '40px auto', padding: '60px 20px', backgroundColor: '#f9f9f9', borderRadius: '8px', textAlign: 'center' }}>
        <h2 style={{ color: '#333', marginBottom: '10px' }}>You have no bookings yet.</h2>
        <p style={{ color: '#666', marginBottom: '20px' }}>Explore our services and book your first appointment!</p>
        <button 
          onClick={() => navigate('/')}
          style={{
            backgroundColor: '#333',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '1rem'
          }}
        >
          Explore Services
        </button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '800px', margin: '40px auto', padding: '0 20px' }}>
      <h1 style={{ marginBottom: '30px', textAlign: 'center', color: '#333' }}>My Bookings</h1>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {orders.map((order) => {
           const statusColors = getStatusColor(order.status);
           return (
            <div 
              key={order._id} 
              style={{ 
                border: '1px solid #e0e0e0', 
                borderRadius: '12px', 
                padding: '24px',
                backgroundColor: '#fff',
                boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                transition: 'transform 0.2s',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', borderBottom: '1px solid #f0f0f0', paddingBottom: '15px' }}>
                <div>
                  <span style={{ fontWeight: '600', color: '#555', fontSize: '0.9rem', display: 'block' }}>Order ID</span>
                  <span style={{ color: '#333', fontSize: '1rem', fontFamily: 'monospace' }}>#{order._id.slice(-6).toUpperCase()}</span>
                </div>
                <div style={{ 
                  padding: '6px 12px', 
                  borderRadius: '20px', 
                  fontSize: '0.85rem', 
                  fontWeight: 'bold',
                  backgroundColor: statusColors.bg,
                  color: statusColors.text,
                  border: `1px solid ${statusColors.text}`
                }}>
                  {formatStatus(order.status)}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '20px', marginBottom: '20px' }}>
                <div>
                  <div style={{ fontSize: '0.85rem', color: '#888', marginBottom: '4px' }}>Service Date</div>
                  <div style={{ fontWeight: '500', color: '#333' }}>
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
                    <div style={{ fontSize: '0.85rem', color: '#888', marginBottom: '4px' }}>Time Slot</div>
                    <div style={{ fontWeight: '500', color: '#333' }}>{order.timeSlot}</div>
                  </div>
                )}
              </div>

              <div style={{ marginBottom: '20px' }}>
                  <div style={{ fontSize: '0.85rem', color: '#888', marginBottom: '4px' }}>Address</div>
                  <div style={{ fontWeight: '500', lineHeight: '1.5', color: '#333' }}>
                    {formatAddress(order.address)}
                  </div>
              </div>

              <div style={{ backgroundColor: '#f9fafb', padding: '16px', borderRadius: '8px', marginBottom: '20px' }}>
                <div style={{ fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '12px', color: '#444' }}>Services</div>
                {order.services && order.services.map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.95rem', borderBottom: idx !== order.services.length - 1 ? '1px dashed #eee' : 'none', paddingBottom: idx !== order.services.length - 1 ? '8px' : '0' }}>
                    <span style={{ color: '#333' }}>{item.name}</span>
                    <span style={{ color: '#666', fontWeight: '500' }}><span>× {item.quantity}</span></span>
                  </div>
                ))}
              </div>

              <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: '20px' }}>
                {order.paymentStatus === 'paid' ? (
                  <div style={{ 
                    color: '#1B5E20', 
                    backgroundColor: '#E8F5E9', 
                    padding: '12px 16px', 
                    borderRadius: '6px', 
                    fontSize: '0.95rem',
                  }}>
                    <div style={{ fontWeight: '600' }}>Payment Received</div>
                    {order.paidAt && (
                      <div style={{ marginTop: '4px', color: '#2E7D32' }}>
                        Paid on: {new Date(order.paidAt).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                ) : order.isAmountFinalized === true && order.paymentStatus === 'unpaid' ? (
                   <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#333' }}>
                      To Pay: <span style={{ color: '#2E7D32' }}><span>₹{order.finalAmount}</span></span>
                    </div>
                    <button style={{
                      backgroundColor: '#2E7D32',
                      color: 'white',
                      border: 'none',
                      padding: '12px 24px',
                      borderRadius: '6px',
                      fontSize: '1rem',
                      cursor: 'pointer',
                      fontWeight: '600',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                      transition: 'background-color 0.2s',
                    }}
                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#1B5E20'}
                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#2E7D32'}
                    onClick={() => navigate(`/payment/${order._id}`)}
                    >
                      Proceed to Payment
                    </button>
                   </div>
                ) : !order.isAmountFinalized ? (
                  <div style={{ 
                    color: '#0277BD', 
                    backgroundColor: '#E1F5FE', 
                    padding: '12px 16px', 
                    borderRadius: '6px', 
                    fontSize: '0.95rem', 
                    display: 'flex', 
                    alignItems: 'center',
                  }}>
                    <span style={{ marginRight: '10px', fontSize: '1.2rem' }}>??</span> 
                    Pricing will be finalized after inspection.
                  </div>
                ) : null}
              </div>

              {order.status === 'pending_review' && (
                <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    disabled={cancellingId === order._id}
                    onClick={() => handleCancel(order)}
                    style={{
                      backgroundColor: cancellingId === order._id ? '#E57373' : '#C62828',
                      color: 'white',
                      border: 'none',
                      padding: '12px 24px',
                      borderRadius: '6px',
                      fontSize: '1rem',
                      cursor: cancellingId === order._id ? 'not-allowed' : 'pointer',
                      fontWeight: '600',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                      transition: 'background-color 0.2s',
                      opacity: cancellingId === order._id ? 0.7 : 1,
                    }}
                    onMouseOver={(e) => { if (cancellingId !== order._id) e.currentTarget.style.backgroundColor = '#B71C1C'; }}
                    onMouseOut={(e) => { if (cancellingId !== order._id) e.currentTarget.style.backgroundColor = '#C62828'; }}
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
    quote_in_progress: 'Quote In Progress',
    quote_finalized: 'Quote Finalized',
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

    case 'quote_in_progress':
      return { bg: '#E3F2FD', text: '#1565C0' };

    case 'quote_finalized':
      return { bg: '#E8F5E9', text: '#2E7D32' };

    case 'completed':
      return { bg: '#E8F5E9', text: '#2E7D32' };

    case 'cancelled':
      return { bg: '#FFEBEE', text: '#C62828' };

    default:
      return { bg: '#F5F5F5', text: '#616161' };
  }
}

