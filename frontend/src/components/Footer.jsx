import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import instagramIcon from '../assets/icons/instagram.svg';
import facebookIcon from '../assets/icons/facebook.svg';

const HoverLink = ({ href, children, target, rel, onClick }) => {
  const [isHovered, setIsHovered] = useState(false);

  const style = {
    color: isHovered ? '#ffffff' : '#a1a1aa',
    textDecoration: 'none',
    transition: 'color 0.2s cubic-bezier(0.4,0,0.2,1)',
    cursor: 'pointer',
    fontSize: '0.95rem',
  };

  const handleClick = (e) => {
    if (onClick) {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <a
      href={href || '#'}
      target={target}
      rel={rel}
      style={style}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleClick}
    >
      {children}
    </a>
  );
};

const SocialIconLink = ({ href, icon, alt }) => {
  const [isHovered, setIsHovered] = useState(false);

  const style = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '40px',
    height: '40px',
    borderRadius: '10px',
    backgroundColor: isHovered ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.06)',
    transition: 'all 0.2s cubic-bezier(0.4,0,0.2,1)',
    transform: isHovered ? 'translateY(-2px)' : 'translateY(0)',
  };

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      style={style}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <img src={icon} alt={alt} width="22" height="22" style={{ opacity: isHovered ? 1 : 0.75 }} />
    </a>
  );
};

const Footer = () => {
  const navigate = useNavigate();
  const instagramUrl = import.meta.env.VITE_INSTAGRAM_URL || null;
  const facebookUrl = import.meta.env.VITE_FACEBOOK_URL || null;

  const footerStyle = {
    backgroundColor: '#0a0a0f',
    color: '#ffffff',
    padding: '52px 24px 28px 24px',
    fontFamily: 'inherit',
    width: '100%',
  };

  const containerStyle = {
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    maxWidth: '1280px',
    margin: '0 auto',
    gap: '32px',
    width: '100%',
    boxSizing: 'border-box',
  };

  const sectionStyle = {
    flex: '1 1 200px',
  };

  const headingStyle = {
    color: '#ffffff',
    fontSize: '1.05rem',
    marginBottom: '18px',
    fontWeight: '700',
    letterSpacing: '0.02em',
  };

  const listStyle = {
    listStyleType: 'none',
    padding: 0,
    margin: 0,
  };

  const listItemStyle = {
    marginBottom: '12px',
  };

  const dividerStyle = {
    borderTop: '1px solid rgba(255,255,255,0.08)',
    margin: '48px auto 24px auto',
    maxWidth: '1280px',
  };

  const bottomStyle = {
    textAlign: 'center',
    color: '#71717a',
    fontSize: '0.85rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  };

  return (
    <footer style={footerStyle}>
      <div style={containerStyle}>
        <div style={sectionStyle}>
          <h3 style={headingStyle}>Company</h3>
          <ul style={listStyle}>
            <li style={listItemStyle}><HoverLink onClick={() => navigate('/about')}>About Us</HoverLink></li>
            <li style={listItemStyle}><span style={{ color: '#3f3f46', cursor: 'default', fontSize: '0.95rem' }}>Contact</span></li>
            <li style={listItemStyle}><span style={{ color: '#3f3f46', cursor: 'default', fontSize: '0.95rem' }}>Terms & Conditions</span></li>
            <li style={listItemStyle}><span style={{ color: '#3f3f46', cursor: 'default', fontSize: '0.95rem' }}>Privacy Policy</span></li>
          </ul>
        </div>

        <div style={sectionStyle}>
          <h3 style={headingStyle}>Services</h3>
          <ul style={listStyle}>
            <li style={listItemStyle}><HoverLink onClick={() => navigate('/', { state: { openModal: 'ac' } })}>AC Services</HoverLink></li>
            <li style={listItemStyle}><HoverLink onClick={() => navigate('/', { state: { openModal: 'water_tank' } })}>Water Tank Cleaning</HoverLink></li>
            <li style={listItemStyle}><HoverLink onClick={() => navigate('/orders')}>My Orders</HoverLink></li>
          </ul>
        </div>

        <div style={sectionStyle}>
          <h3 style={headingStyle}>Social</h3>
          <div style={{ display: 'flex', gap: '15px' }}>
            {instagramUrl && <SocialIconLink href={instagramUrl} icon={instagramIcon} alt="Instagram" />}
            {facebookUrl && <SocialIconLink href={facebookUrl} icon={facebookIcon} alt="Facebook" />}
          </div>
        </div>
      </div>

      <div style={dividerStyle}></div>
      
      <div style={bottomStyle}>
        <div>&copy; 2026 UNIQUEOFY. All rights reserved.</div>
        <div>Made with care in India.</div>
      </div>
    </footer>
  );
};

export default Footer;
