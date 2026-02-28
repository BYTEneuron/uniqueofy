import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useEffect } from 'react';

export default function Payment() {
  const navigate = useNavigate();
  const { orderId } = useParams();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { state: { next: `/payment/${orderId}` } });
    }
  }, [isAuthenticated, navigate, orderId]);

  const shortOrderId = orderId ? orderId.slice(-6).toUpperCase() : 'N/A';

  return (
    <div style={{ maxWidth: '600px', margin: '40px auto', padding: '0 20px' }}>
      <div
        style={{
          backgroundColor: '#fff',
          borderRadius: '12px',
          padding: '30px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
          border: '1px solid #e0e0e0',
          textAlign: 'center',
        }}
      >
        <h1 style={{ marginBottom: '20px', color: '#333' }}>Payment</h1>

        <div style={{ marginBottom: '16px', color: '#555', fontWeight: '600' }}>
          Order ID: #{shortOrderId}
        </div>

        <p style={{ marginBottom: '12px', color: '#333', fontSize: '1rem', fontWeight: '500' }}>
          Online payments are coming soon.
        </p>

        <p style={{ marginBottom: '24px', color: '#666', lineHeight: '1.5' }}>
          For now, you can pay by cash at service time or through a secure link shared by our team.
        </p>

        <button
          onClick={() => navigate('/orders')}
          style={{
            backgroundColor: '#1976D2',
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
          onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#1565C0')}
          onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#1976D2')}
        >
          Back to My Orders
        </button>
      </div>
    </div>
  );
}
