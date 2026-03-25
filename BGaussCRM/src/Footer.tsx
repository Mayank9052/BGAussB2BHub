import "./Footer.css";

const leftLinks = ["About Us", "Advertise With Us", "Contact Us"];
const rightLinks = ["Terms of Use", "Privacy Policy", "Feedback"];
const socials = ["F", "X", "YT", "IG", "IN"]; // placeholder letters for icons

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="bgauss-footer bgauss-footer--flat">
      <div className="bgauss-footer__links">
        <div className="bgauss-footer__col">
          {leftLinks.map((item) => (
            <a key={item}>{item}</a>
          ))}
        </div>
        <div className="bgauss-footer__col">
          {rightLinks.map((item) => (
            <a key={item}>{item}</a>
          ))}
        </div>
      </div>

      <div className="bgauss-footer__brand-block">
        <div>
          <div className="bgauss-footer__logo">BGAUSS</div>
          <div className="bgauss-footer__socials">
            {socials.map((s) => (
              <span key={s} className="bgauss-footer__social">{s}</span>
            ))}
          </div>
        </div>
        <div className="bgauss-footer__appcall">
          <div className="bgauss-footer__apptext">
            <div className="app-title">Download BGauss App</div>
            <div className="app-rating">4.6 ★ User Rating · 10 Lakh+ Downloads</div>
          </div>
          <div className="bgauss-footer__badges">
            <div className="badge badge-play">Get it on Google Play</div>
            <div className="badge badge-apple">Download on the App Store</div>
          </div>
        </div>
      </div>

      <div className="bgauss-footer__legal">© {year} BGAUSS EV Pvt Ltd. All rights reserved.</div>
    </footer>
  );
}
