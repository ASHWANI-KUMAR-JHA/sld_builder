import './Footer.css';

function Footer({ className = '' }) {
  return (
    <footer className={`sunfeed-footer ${className}`}>
      <img
        src="/ADDRESS.png"
        alt="Sunfeed Address"
        className="sunfeed-footer-address"
      />
    </footer>
  );
}

export default Footer;
