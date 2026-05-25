import { Link, Routes, Route, useParams } from "react-router-dom";

const posts = [
  {
    slug: "how-to-price-your-stuff",
    title: "How to Price Your Stuff to Actually Sell It",
    date: "May 2026",
    excerpt: "The biggest mistake sellers make is pricing too high. Here's the formula that works.",
    content: `
The biggest mistake people make when selling secondhand is pricing based on what they paid, not what buyers will pay.

**The 3x Rule**

A simple starting point: price at one-third of what the item cost new if it's in good condition. So a $150 coffee maker you bought three years ago? List it at $45–50.

**Check sold listings, not active ones**

On eBay, filter by "Sold Items" to see what things actually sold for — not what sellers hope to get. This is the single most useful thing you can do before pricing anything.

**Price to move, then negotiate up**

List 10–15% below what you actually want. Buyers love to negotiate. If you want $40, list at $45. You'll get more inquiries and end up at your target price more often than not.

**Condition matters more than you think**

A lamp in perfect condition can sell for 3x what the same lamp with a scratch sells for. Clean your items before photographing. It takes 10 minutes and can double what you get.

**When to bundle**

If you have several small related items that each sell for under $5 — old books, VHS tapes, small kitchen gadgets — bundle them. "Lot of 10 vintage paperbacks" sells faster and for more than 10 individual listings.
    `
  },
  {
    slug: "best-platforms-for-selling",
    title: "eBay vs Facebook Marketplace vs Craigslist: Which Is Right for Your Item?",
    date: "May 2026",
    excerpt: "Not everything belongs on eBay. Here's how to pick the right platform for what you're selling.",
    content: `
Where you list matters as much as how you price. Here's a quick guide.

**Facebook Marketplace: Best for big, local stuff**

Furniture, appliances, exercise equipment, anything heavy. Facebook Marketplace is free, has a huge local audience, and lets buyers message you directly. The downside: you'll deal with no-shows. Always confirm the day before pickup.

**eBay: Best for collectibles and niche items**

Baseball cards, vintage electronics, brand-name clothing, tools with model numbers. eBay has global reach — meaning there's a collector in Germany who wants your 1987 Topps set. eBay charges fees (roughly 13% of sale price) but the audience is worth it for the right items.

**Craigslist: Best for free or very cheap bulk items**

Old furniture you just want gone, boxes of books, appliances that work but aren't worth much. Craigslist buyers expect low prices and will come pick things up. Good for clearing space fast.

**Etsy: Best for vintage and handmade**

If something is 20+ years old and has aesthetic appeal — mid-century lamps, retro kitchenware, vintage clothing — Etsy buyers actively search for it and pay premium prices.

**The rule of thumb**

Ships easily and has collector value → eBay. Heavy and local → Facebook Marketplace. Just want it gone → Craigslist.
    `
  },
  {
    slug: "selling-tips-for-seniors",
    title: "5 Tips for Seniors Selling Stuff Online for the First Time",
    date: "May 2026",
    excerpt: "Online selling doesn't have to be complicated. Here's what you actually need to know.",
    content: `
If you've never sold anything online before, it can feel overwhelming. It doesn't have to be.

**1. Start with Facebook Marketplace**

If you're already on Facebook, Marketplace is built right in. Tap the shop icon, take a few photos, set a price. Local buyers come to you. No shipping, no accounts to create.

**2. Take photos in good light**

Natural light near a window is best. Take 3–5 photos: one straight-on, a few from different angles, and one close-up of any wear or damage. Honest photos get better results — buyers appreciate knowing what they're getting.

**3. Don't meet strangers alone**

For local pickup, meet in a public place like a coffee shop parking lot, or have someone with you at home. Most buyers are perfectly nice, but it's just good practice.

**4. You don't need to know what something is worth**

That's what SellYourStuff.ai is for. Take a photo, upload it, and let the AI figure out what it's worth and where to sell it. Most listings take under two minutes to create.

**5. Start with one item**

Don't try to sell everything at once. Pick one item, list it, sell it. Once you've done it once the whole process feels a lot less intimidating. Then you can tackle the garage.
    `
  }
];

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
        <div className="blog-cta">
          <Link to="/" className="btn-primary" style={{ display: "inline-block", textDecoration: "none", padding: ".9rem 2rem", borderRadius: "12px" }}>
            Try SellYourStuff.ai Free →
          </Link>
        </div>
      </div>
    </div>
  );
}

function PostDetail() {
  const { slug } = useParams();
  const post = posts.find(p => p.slug === slug);
  if (!post) return <div style={{ padding: "2rem" }}>Post not found. <Link to="/blog">Back to blog</Link></div>;

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
