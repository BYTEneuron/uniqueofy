import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import instagramIcon from '../assets/icons/instagram.svg';
import facebookIcon from '../assets/icons/facebook.svg';

const HoverLink = ({ href, children, target, rel, onClick }) => {
  const [isHovered, setIsHovered] = useState(false);

  const style = {
    color: isHovered ? '#ffffff' : '#bdbdbd',
    textDecoration: 'none',
    transition: 'color 0.2s ease',
    cursor: 'pointer',
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
    display: 'inline-block',
    transition: 'opacity 0.2s ease, transform 0.2s ease',
    opacity: isHovered ? 1 : 0.8,
    transform: isHovered ? 'scale(1.1)' : 'scale(1)',
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
      <img src={icon} alt={alt} width="24" height="24" />
    </a>
  );
};

const Footer = () => {
  const navigate = useNavigate();
  const instagramUrl = import.meta.env.VITE_INSTAGRAM_URL || null;
  const facebookUrl = import.meta.env.VITE_FACEBOOK_URL || null;

  const footerStyle = {
    backgroundColor: '#0f0f0f',
    color: '#ffffff',
    padding: '40px 20px 20px 20px',
    fontFamily: 'inherit',
  };

  const containerStyle = {
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    maxWidth: '1200px',
    margin: '0 auto',
    gap: '20px',
  };

  const sectionStyle = {
    flex: '1 1 200px',
  };

  const headingStyle = {
    color: '#ffffff',
    fontSize: '1.2rem',
    marginBottom: '15px',
  };

  const listStyle = {
    listStyleType: 'none',
    padding: 0,
    margin: 0,
  };

  const listItemStyle = {
    marginBottom: '10px',
  };

  const dividerStyle = {
    borderTop: '1px solid #333',
    margin: '40px auto 20px auto',
    maxWidth: '1200px',
  };

  const bottomStyle = {
    textAlign: 'center',
    color: '#bdbdbd',
    fontSize: '0.9rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  };

  return (
    <footer style={footerStyle}>
      <div style={containerStyle}>
        <div style={sectionStyle}>
          <h3 style={headingStyle}>Company</h3>
          <ul style={listStyle}>
            <li style={listItemStyle}><HoverLink onClick={() => navigate('/about')}>About Us</HoverLink></li>
            <li style={listItemStyle}><span style={{ color: '#555', cursor: 'default' }}>Contact</span></li>
            <li style={listItemStyle}><span style={{ color: '#555', cursor: 'default' }}>Terms & Conditions</span></li>
            <li style={listItemStyle}><span style={{ color: '#555', cursor: 'default' }}>Privacy Policy</span></li>
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
