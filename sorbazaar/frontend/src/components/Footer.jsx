import { Link } from 'react-router-dom';
import { NAV_ITEMS } from '../api';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div>
            <h4>Tansoura</h4>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, lineHeight: 1.8 }}>
              Honest, authentic & affordable products for everyone. Quality you can trust.
            </p>
          </div>
          <div>
            <h4>Shop</h4>
            <ul>
              {NAV_ITEMS.slice(1, 6).map(item => (
                <li key={item.page}><Link to={item.path}>{item.label}</Link></li>
              ))}
            </ul>
          </div>
          <div>
            <h4>Quick Links</h4>
            <ul>
              <li><Link to="/checkout">Checkout</Link></li>
              <li><Link to="/orders">Track Order</Link></li>
              <li><span style={{ cursor: 'default', color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>Return Policy</span></li>
              <li><a href="mailto:support@tansoura.com">Contact Us</a></li>
            </ul>
          </div>
          <div>
            <h4>Contact</h4>
            <ul>
              <li><a href="mailto:support@tansoura.com">support@tansoura.com</a></li>
              <li><a href="tel:+919285471138">+91 9285471138</a></li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          © 2026 Tansoura. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
