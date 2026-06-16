import { Link } from "react-router-dom";

export default function Support() {
  return (
    <div className="blog-app">
      <nav className="navbar">
        <Link to="/" className="nav-logo" style={{ display: "flex", alignItems: "center", textDecoration: "none" }}>
          <svg width="24" height="24" viewBox="0 0 100 100" style={{ marginRight: "7px" }}>
            <polygon points="50,8 92,50 50,50 8,50" fill="#137a4a"/>
            <polygon points="50,8 50,50 8,50" fill="#a7d3bc"/>
            <polygon points="8,50 50,92 50,50" fill="#0d5c35"/>
            <polygon points="92,50 50,92 50,50" fill="#137a4a"/>
          </svg>
          <span style={{ fontWeight: 800, color: "#1a7a4a" }}>SellYourStuff<span style={{ color: "#a7d3bc", fontWeight: 400 }}>.ai</span></span>
        </Link>
        <div className="nav-links">
          <Link to="/blog" className="nav-link">Tips &amp; Guides</Link>
          <Link to="/support" className="nav-link">Support</Link>
        </div>
      </nav>

      <div className="blog-container" style={{ maxWidth: 640 }}>
        <div className="blog-header">
          <h1 className="blog-title">Support</h1>
          <p className="blog-sub">We're here to help.</p>
        </div>

        <div style={{ background: "#fff", borderRadius: "16px", border: "1px solid #dde8e2", padding: "2rem", marginBottom: "1.5rem" }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#1a2e22", marginBottom: ".75rem" }}>Contact Us</h2>
          <p style={{ fontSize: ".95rem", color: "#5a7a66", lineHeight: 1.7, marginBottom: "1.25rem" }}>
            Have a question, found a bug, or want to share feedback? We read every message and typically respond within 24 hours.
          </p>
          <a
            href="mailto:cleavitt92@gmail.com"
            style={{
              display: "inline-flex", alignItems: "center", gap: ".5rem",
              background: "#1a7a4a", color: "#fff", borderRadius: "10px",
              padding: ".8rem 1.4rem", fontWeight: 600, fontSize: ".95rem",
              textDecoration: "none", transition: "background .2s"
            }}
          >
            ✉️ cleavitt92@gmail.com
          </a>
        </div>

        <div style={{ background: "#fff", borderRadius: "16px", border: "1px solid #dde8e2", padding: "2rem", marginBottom: "1.5rem" }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#1a2e22", marginBottom: ".75rem" }}>Common Questions</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}>
            {[
              { q: "How many free listings do I get?", a: "You get 1 free listing without signing in, and 3 free listings when you create a free account." },
              { q: "What happens to my listings if I close the browser?", a: "If you're signed in, all your listings are saved to your account and will be there when you come back. Without an account, listings are lost when you close the browser." },
              { q: "Which platforms can I post to?", a: "We support Facebook Marketplace, eBay, OfferUp, OLX, Craigslist, and Etsy. We recommend the best platform for each item automatically." },
              { q: "How do I cancel my subscription?", a: "Email us at cleavitt92@gmail.com and we'll cancel it immediately. No questions asked." },
              { q: "Is my photo data stored?", a: "No. Photos are sent directly to our AI for analysis and are never stored on our servers." },
            ].map((item, i) => (
              <div key={i}>
                <div style={{ fontWeight: 600, color: "#1a2e22", fontSize: ".95rem", marginBottom: ".3rem" }}>{item.q}</div>
                <div style={{ fontSize: ".88rem", color: "#5a7a66", lineHeight: 1.65 }}>{item.a}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ textAlign: "center", marginTop: "2rem" }}>
          <Link to="/" className="btn-primary" style={{ display: "inline-block", textDecoration: "none", padding: ".9rem 2rem", borderRadius: "12px" }}>
            ← Back to App
          </Link>
        </div>
      </div>
    </div>
  );
}
