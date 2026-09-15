import './Logo.css';

function Logo({ size = 'large', className = '' }) {
  return (
    <img
      src="/SUNFEED LOGO.png"
      alt="Sunfeed Logo"
      className={`sunfeed-logo sunfeed-logo--${size} ${className}`}
    />
  );
}

export default Logo;
