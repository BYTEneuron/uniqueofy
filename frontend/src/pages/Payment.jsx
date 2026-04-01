import { useNavigate, useParams } from 'react-router-dom';

export default function Payment() {
  const { orderId } = useParams();
  const navigate = useNavigate();

  const shortOrderId = orderId ? orderId.slice(-6).toUpperCase() : 'N/A';

  return (
    <div style={{ maxWidth: '600px', margin: '60px auto', padding: '0 20px', animation: 'slideUp 0.4s ease-out' }}>
      <div
        style={{
          backgroundColor: '#fff',
          borderRadius: '20px',
          padding: '40px 36px',
          boxShadow: '0 10px 15px -3px rgba(0,0,0,0.08), 0 4px 6px -4px rgba(0,0,0,0.04)',
          border: '1px solid #e5e7eb',
          textAlign: 'center',
        }}
      >
        <h1 style={{ marginBottom: '24px', color: '#1a1a2e', fontWeight: '800', letterSpacing: '-0.02em', fontSize: '1.8rem' }}>Payment</h1>

        <div style={{ marginBottom: '20px', color: '#6b7280', fontWeight: '700', fontFamily: 'monospace', fontSize: '1rem', backgroundColor: '#f9fafb', padding: '10px 16px', borderRadius: '8px', display: 'inline-block' }}>
          Order #{shortOrderId}
        </div>

        <p style={{ marginBottom: '12px', color: '#1a1a2e', fontSize: '1.05rem', fontWeight: '600' }}>
          Online payments are coming soon.
        </p>

        <p style={{ marginBottom: '32px', color: '#6b7280', lineHeight: '1.7' }}>
          For now, you can pay by cash at service time or through a secure link shared by our team.
        </p>

        <button
          onClick={() => navigate('/orders')}
          style={{
            backgroundColor: '#16a34a',
            color: 'white',
            border: 'none',
            padding: '13px 32px',
            borderRadius: '10px',
            fontSize: '1rem',
            cursor: 'pointer',
            fontWeight: '700',
            boxShadow: '0 4px 12px rgba(22,163,74,0.25)',
            transition: 'all 0.2s cubic-bezier(0.4,0,0.2,1)',
          }}
          onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#15803d'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(22,163,74,0.3)'; }}
          onMouseOut={(e) => { e.currentTarget.style.backgroundColor = '#16a34a'; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(22,163,74,0.25)'; }}
        >
          Back to My Orders
        </button>
      </div>
    </div>
  );
}
