import { Link, Routes, Route, useParams } from "react-router-dom";
import MyParentsMoved from "./posts/my-parents-moved-and-threw-everything-away";
import HowToPriceYourStuff from "./posts/how-to-price-your-stuff";
import BestPlatform from "./posts/best-platform-to-sell-secondhand";
import HowToSellFast from "./posts/how-to-sell-a-lot-of-stuff-fast";
import WhatIsWorthSelling from "./posts/what-is-worth-selling-vs-donating";

const posts = [
  WhatIsWorthSelling,
  HowToSellFast,
  BestPlatform,
  HowToPriceYourStuff,
  MyParentsMoved,
];

// ── Post list page ─────────────────────────────────────────────────────────
function PostList() {
  return (
    <div className="blog-app">
      <nav className="navbar">
        <Link to="/" className="nav-logo">SellYourStuff<span>.ai</span></Link>
        <div className="nav-links">
          <Link to="/blog" className="nav-link" style={{ color: "#1a7a4a", fontWeight: 600 }}>Tips &amp; Guides</Link>
        </div>
      </nav>
      <div className="blog-container">
        <div className="blog-header">
          <h1 className="blog-title">Tips &amp; Guides</h1>
          <p className="blog-sub">Practical advice for selling your stuff online</p>
        </div>
        {posts.length === 0 ? (
          <div style={{ color: "#5a7a66", fontSize: ".95rem", padding: "2rem 0" }}>Posts coming soon!</div>
        ) : (
          <div className="post-list">
            {posts.map(post => (
              <Link to={`/blog/${post.slug}`} key={post.slug} className="post-card">
                <div className="post-date">{post.date}</div>
                <div className="post-title">{post.title}</div>
                <div className="post-excerpt">{post.excerpt}</div>
                <div className="post-read-more">Read more →</div>
              </Link>
            ))}
          </div>
        )}
        <div className="blog-cta">
          <Link to="/" className="btn-primary" style={{ display: "inline-block", textDecoration: "none", padding: ".9rem 2rem", borderRadius: "12px" }}>
            Try SellYourStuff.ai Free →
          </Link>
        </div>
      </div>
    </div>
  );
}

// ── Individual post page ───────────────────────────────────────────────────
function PostDetail() {
  const { slug } = useParams();
  const post = posts.find(p => p.slug === slug);

  if (!post) return (
    <div className="blog-app">
      <nav className="navbar">
        <Link to="/" className="nav-logo">SellYourStuff<span>.ai</span></Link>
      </nav>
      <div className="blog-container">
        <p style={{ color: "#5a7a66" }}>Post not found. <Link to="/blog" style={{ color: "#1a7a4a" }}>Back to blog</Link></p>
      </div>
    </div>
  );

  const renderContent = (text) => {
    return text.trim().split("\n\n").map((block, i) => {
      if (block.startsWith("**") && block.endsWith("**") && !block.slice(2).includes("**")) {
        return <h2 key={i} className="post-h2">{block.slice(2, -2)}</h2>;
      }
      const parts = block.split(/(\*\*[^*]+\*\*)/g).map((part, j) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return <strong key={j}>{part.slice(2, -2)}</strong>;
        }
        return part;
      });
      return <p key={i} className="post-p">{parts}</p>;
    });
  };

  return (
    <div className="blog-app">
      <nav className="navbar">
        <Link to="/" className="nav-logo">SellYourStuff<span>.ai</span></Link>
        <div className="nav-links">
          <Link to="/blog" className="nav-link">Tips &amp; Guides</Link>
        </div>
      </nav>
      <div className="blog-container" style={{ maxWidth: 720 }}>
        <Link to="/blog" className="post-back">← Back to all guides</Link>
        <div className="post-date" style={{ marginBottom: ".5rem" }}>{post.date}</div>
        <h1 className="post-detail-title">{post.title}</h1>
        <div className="post-body">{renderContent(post.content)}</div>
        <div className="blog-cta" style={{ marginTop: "2.5rem" }}>
          <p style={{ marginBottom: "1rem", color: "#5a7a66", fontSize: ".92rem" }}>Ready to sell? Take a photo and get a listing in minutes.</p>
          <Link to="/" className="btn-primary" style={{ display: "inline-block", textDecoration: "none", padding: ".9rem 2rem", borderRadius: "12px" }}>
            Try SellYourStuff.ai Free →
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function Blog() {
  return (
    <Routes>
      <Route path="/" element={<PostList />} />
      <Route path="/:slug" element={<PostDetail />} />
    </Routes>
  );
}
