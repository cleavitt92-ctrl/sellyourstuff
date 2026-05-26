import { useState, useRef } from "react";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import Blog from "./Blog";

const buildSystemPrompt = (sellerContext) => `You are SellYourStuff.ai, an expert resale AI that helps people sell household items online.

ALWAYS respond in valid JSON only. No markdown fences, no text outside the JSON object.

SELLER CONTEXT:
- Urgency: ${sellerContext.urgency || "unknown"} (this_week / within_a_month / no_rush)
- Logistics: ${sellerContext.logistics || "unknown"} (local_only / can_ship / both)
- Effort: ${sellerContext.effort || "unknown"} (minimal / moderate / happy_to_invest)

BUCKET SORTING — assign every item to one of these:
1. "donate" — not worth the effort to list, value under $5 or too common
2. "bundle" — worth including in a garage sale or lot listing, $5-15
3. "local" — Facebook Marketplace or Craigslist, bulky or low shipping value
4. "specialist" — eBay, Etsy, or specialist platform, collector value or ships easily
5. "appraise" — potentially high value, do not price yet, get expert appraisal first

URGENCY MODIFIERS:
- this_week: prioritize local platforms, price 20% below market to move fast
- within_a_month: balanced approach, fair market pricing
- no_rush: maximize value, specialist platforms, patient pricing

EFFORT MODIFIERS:
- minimal: skip questions, go straight to listing, suggest bundle/local
- moderate: ask one follow-up if it meaningfully changes the recommendation
- happy_to_invest: ask up to two follow-ups, optimize for best possible outcome

Platform selection:
- eBay: collectibles, branded electronics, niche items, ships easily
- Facebook Marketplace: furniture, bulky items, local pickup
- Craigslist: furniture, appliances, bulk lots, local
- OfferUp: casual secondhand, mobile sellers, everyday items
- Etsy: vintage 20+ years, retro decor, handmade
- Specialized: rare coins, stamps, vintage watches, sports cards

JSON format when asking a follow-up question:
{
  "type": "question",
  "seen": "brief description of what you observe",
  "question": "your targeted question",
  "why": "one sentence on why this changes the recommendation"
}

JSON format for listing:
{
  "type": "listing",
  "itemName": "specific item name",
  "bucket": "donate|bundle|local|specialist|appraise",
  "estimatedValue": { "low": 0, "high": 0 },
  "confidence": "low|medium|high",
  "platform": "eBay|Facebook Marketplace|Craigslist|OfferUp|Etsy|Specialized|Donate",
  "platformName": "display name",
  "platformReason": "brief explanation tailored to seller urgency and logistics",
  "askingPrice": 0,
  "title": "SEO-optimized listing title under 80 chars",
  "description": "complete ready-to-post listing description",
  "tips": ["tip 1", "tip 2"],
  "diamondAlert": null
}

For donate/bundle buckets, set askingPrice to 0 and title/description accordingly.
For appraise bucket, set askingPrice to 0 and explain why in platformReason.
Be accurate with valuations. Tailor every recommendation to the seller context above.`;

const platformColors = {
  eBay: "#e53238",
  "Facebook Marketplace": "#1877f2",
  Craigslist: "#444",
  OfferUp: "#6bbd5b",
  Etsy: "#f1641e",
  Specialized: "#7c5cbf",
  Donate: "#94a3b8",
};

const bucketLabels = {
  donate: { label: "Donate", color: "#94a3b8", icon: "🤝" },
  bundle: { label: "Bundle / Garage Sale", color: "#f59e0b", icon: "📦" },
  local: { label: "Sell Locally", color: "#1877f2", icon: "📍" },
  specialist: { label: "Sell Online", color: "#e53238", icon: "🌐" },
  appraise: { label: "Get Appraised First", color: "#7c5cbf", icon: "🔍" },
};

// ── Saved listing card ─────────────────────────────────────────────────────
function SavedCard({ item, index }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [postInstructions, setPostInstructions] = useState(null);
  const pColor = platformColors[item.result.platform] || "#888";
  const bucket = bucketLabels[item.result.bucket] || bucketLabels.local;

  const getListingText = () =>
    `${item.result.title}\n\n${item.result.description}\n\nAsking price: $${item.result.askingPrice}`;

  const copyListing = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(getListingText()).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2500); });
  };
  const postTo = (platform, url) => (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(getListingText()).then(() => { setPostInstructions(platform); window.open(url, "_blank"); });
  };

  return (
    <div className="saved-card" style={{ animationDelay: `${index * 0.05}s` }}>
      <div className="saved-header" onClick={() => setOpen(o => !o)}>
        <div className="saved-thumb-wrap">
          {item.thumbUrl ? <img className="saved-thumb" src={item.thumbUrl} alt="" /> : <div className="saved-thumb saved-thumb-empty">{bucket.icon}</div>}
        </div>
        <div className="saved-meta">
          <div className="saved-name">{item.result.itemName}</div>
          <div className="saved-sub">
            {item.result.askingPrice > 0 && <span className="saved-price">${item.result.askingPrice}</span>}
            <span className="saved-badge" style={{ background: bucket.color }}>{bucket.label}</span>
          </div>
        </div>
        <div className="saved-chevron">{open ? "▲" : "▼"}</div>
      </div>
      {open && (
        <div className="saved-body">
          <div className="info-box"><strong>Recommendation</strong>{item.result.platformReason}</div>
          {item.result.diamondAlert && (<div className="diamond-box"><span className="diamond-icon">💎</span><div className="diamond-body"><strong>Might be worth more</strong>{item.result.diamondAlert}</div></div>)}
          {item.result.bucket !== "donate" && item.result.bucket !== "appraise" && (
            <>
              <div className="sec-label">Your ready-to-post listing</div>
              <div className="listing-box"><div className="listing-title">{item.result.title}</div><div className="listing-desc">{item.result.description}</div></div>
              <div className="post-section">
                <button className="btn-post btn-post-fb" onClick={postTo("facebook", "https://www.facebook.com/marketplace/create/item")}><span>📘</span> Post on Facebook Marketplace</button>
                <button className="btn-post btn-post-ebay" onClick={postTo("ebay", `https://www.ebay.com/sell/selectformat?title=${encodeURIComponent(item.result.title)}`)}><span>🛒</span> Post on eBay</button>
                <button className="btn-post btn-post-offerup" onClick={postTo("offerup", "https://offerup.com/sell")}><span>🟢</span> Post on OfferUp</button>
                {postInstructions && (
                  <div className="instructions-box">
                    <strong>Listing copied! Paste it into the description on {postInstructions === "facebook" ? "Facebook Marketplace" : postInstructions === "ebay" ? "eBay" : "OfferUp"}.</strong>
                  </div>
                )}
              </div>
              <button className="btn-ghost" onClick={copyListing} style={copied ? { borderColor: "#2d7a4f", color: "#2d7a4f" } : {}}>{copied ? "✓ Copied!" : "Copy Listing Text"}</button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── Session summary ────────────────────────────────────────────────────────
function SessionSummary({ listings, onAddMore }) {
  const buckets = { donate: [], bundle: [], local: [], specialist: [], appraise: [] };
  listings.forEach(item => {
    const b = item.result.bucket || "local";
    if (buckets[b]) buckets[b].push(item);
  });

  const totalValue = listings.reduce((sum, item) => sum + (item.result.askingPrice || 0), 0);
  const sellable = listings.filter(i => i.result.bucket !== "donate").length;

  return (
    <div className="summary-card">
      <div className="summary-header">
        <div className="summary-icon">🎯</div>
        <h2 className="summary-title">Your Selling Plan</h2>
        <p className="summary-sub">{listings.length} items analyzed · {sellable} to sell · estimated ${totalValue} total</p>
      </div>

      {Object.entries(buckets).map(([key, items]) => {
        if (!items.length) return null;
        const b = bucketLabels[key];
        return (
          <div key={key} className="summary-bucket">
            <div className="summary-bucket-header" style={{ background: b.color }}>
              <span>{b.icon} {b.label}</span>
              <span>{items.length} item{items.length !== 1 ? "s" : ""}</span>
            </div>
            <ul className="summary-bucket-items">
              {items.map((item, i) => (
                <li key={i} className="summary-item">
                  <span className="summary-item-name">{item.result.itemName}</span>
                  {item.result.askingPrice > 0 && <span className="summary-item-price">${item.result.askingPrice}</span>}
                </li>
              ))}
            </ul>
          </div>
        );
      })}

      <div className="summary-cta">
        <p className="summary-tip">One good sale covers the cost of any SellYourStuff.ai plan.</p>
        <button className="btn-primary" onClick={onAddMore}>+ Add More Items</button>
      </div>
    </div>
  );
}

// ── Main app ───────────────────────────────────────────────────────────────
function MainApp() {
  const [phase, setPhase] = useState("interview");
  const [sellerContext, setSellerContext] = useState({ urgency: null, logistics: null, effort: null });
  const [photos, setPhotos] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [postInstructions, setPostInstructions] = useState(null);
  const [savedListings, setSavedListings] = useState([]);
  const [credits, setCredits] = useState(3);
  const [stripeLoading, setStripeLoading] = useState(false);
  const [heroVisible, setHeroVisible] = useState(true);
  const [showSummary, setShowSummary] = useState(false);
  const fileInputRef = useRef(null);
  const historyRef = useRef([]);
  const dragRef = useRef(null);
  const currentThumbRef = useRef(null);

  const toBase64 = (file) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result.split(",")[1]); r.onerror = rej; r.readAsDataURL(file); });

  const addPhotos = (files) => {
    const valid = Array.from(files).filter(f => f.type.startsWith("image/"));
    setPhotos(prev => [...prev, ...valid.map(f => ({ file: f, url: URL.createObjectURL(f), id: Math.random() }))].slice(0, 6));
  };

  const callClaude = async (messages) => {
    const response = await fetch("/api/claude", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: "claude-opus-4-5", max_tokens: 1024, system: buildSystemPrompt(sellerContext), messages }),
    });
    if (!response.ok) throw new Error("API error");
    const data = await response.json();
    const text = data.content.filter(b => b.type === "text").map(b => b.text).join("");
    return JSON.parse(text.replace(/```json\n?|\n?```/g, "").trim());
  };

  const finishInterview = (context) => {
    setSellerContext(context);
    setPhase("upload");
  };

  const analyze = async () => {
    if (!photos.length) return;
    setHeroVisible(false);
    setLoading(true); setError(null); setPhase("analyzing");
    currentThumbRef.current = photos[0]?.url || null;
    try {
      const imageBlocks = await Promise.all(photos.map(async p => ({ type: "image", source: { type: "base64", media_type: p.file.type || "image/jpeg", data: await toBase64(p.file) } })));
      const firstMsg = { role: "user", content: [...imageBlocks, { type: "text", text: "I want to sell this item. What is it worth and how should I list it?" }] };
      historyRef.current = [firstMsg];
      const parsed = await callClaude(historyRef.current);
      historyRef.current.push({ role: "assistant", content: JSON.stringify(parsed) });
      if (parsed.type === "question") { setChatMessages([{ role: "assistant", data: parsed }]); setPhase("chat"); }
      else { setResult(parsed); setPhase("result"); }
    } catch (e) { setError("Couldn't analyze the photos. Please try again."); setPhase("upload"); }
    finally { setLoading(false); }
  };

  const sendAnswer = async () => {
    const text = inputText.trim();
    if (!text || loading) return;
    setInputText(""); setLoading(true);
    historyRef.current.push({ role: "user", content: text });
    setChatMessages(prev => [...prev, { role: "user", text }]);
    try {
      const parsed = await callClaude(historyRef.current);
      historyRef.current.push({ role: "assistant", content: JSON.stringify(parsed) });
      if (parsed.type === "listing") { setResult(parsed); setPhase("result"); }
      else { setChatMessages(prev => [...prev, { role: "assistant", data: parsed }]); }
    } catch (e) { setError("Something went wrong. Try again."); }
    finally { setLoading(false); }
  };

  const saveAndAddAnother = () => {
    if (result) {
      const newListings = [{ id: Math.random(), result, thumbUrl: currentThumbRef.current }, ...savedListings];
      setSavedListings(newListings);
      const newCredits = credits - 1;
      setCredits(newCredits);
      if (newCredits <= 0) { setPhase("paywall"); resetUpload(); return; }
    }
    resetUpload();
    setPhase("upload");
  };

  const savAndShowSummary = () => {
    if (result) {
      setSavedListings(prev => [{ id: Math.random(), result, thumbUrl: currentThumbRef.current }, ...prev]);
      setCredits(c => c - 1);
    }
    resetUpload();
    setShowSummary(true);
    setPhase("upload");
  };

  const resetUpload = () => {
    setPhotos([]); setChatMessages([]); setInputText(""); setResult(null); setError(null); setPostInstructions(null);
    historyRef.current = []; currentThumbRef.current = null;
  };

  const handleStripeCheckout = async (priceId, mode) => {
    setStripeLoading(true);
    try {
      const res = await fetch("/api/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ priceId, mode }) });
      const { url } = await res.json();
      window.location.href = url;
    } catch { alert("Payment failed to load. Please try again."); }
    finally { setStripeLoading(false); }
  };

  const getListingText = () => result ? `${result.title}\n\n${result.description}\n\nAsking price: $${result.askingPrice}` : "";
  const copyListing = () => { navigator.clipboard.writeText(getListingText()).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2500); }); };
  const postTo = (platform, url) => () => { navigator.clipboard.writeText(getListingText()).then(() => { setPostInstructions(platform); window.open(url, "_blank"); }); };
  const onDragOver = (e) => { e.preventDefault(); dragRef.current?.classList.add("dz-hover"); };
  const onDragLeave = () => dragRef.current?.classList.remove("dz-hover");
  const onDrop = (e) => { e.preventDefault(); dragRef.current?.classList.remove("dz-hover"); addPhotos(e.dataTransfer.files); };
  const pColor = result ? platformColors[result.platform] || "#888" : "#888";

  return (
    <div className="app">
      <nav className="navbar">
        <div className="nav-logo">SellYourStuff<span>.ai</span></div>
        <div className="nav-links">
          <Link to="/blog" className="nav-link">Tips &amp; Guides</Link>
        </div>
      </nav>

      {heroVisible && (
        <div className="hero">
          <div className="hero-inner">
            <h1 className="hero-title">Selling your stuff online just got a lot easier.</h1>
            <p className="hero-desc">Take a few photos of your stuff: furniture, collectibles, electronics, clothes, sports gear, etc. and SellYourStuff.ai figures out what it's worth, writes a ready-to-post listing, and tells you exactly where to sell it. eBay, Facebook Marketplace, Craigslist, Etsy; we pick the right one for you.</p>
            <p className="hero-desc">Perfect for a garage sale, a house move, or just clearing out years of stuff. List 25 things in the time it used to take to list one!</p>
            <div className="hero-badges">
              <span className="hero-badge">📷 Just upload photos</span>
              <span className="hero-badge">💰 AI pricing</span>
              <span className="hero-badge">📋 Ready-to-post listings</span>
              <span className="hero-badge">🎯 Best platform picked for you</span>
            </div>
          </div>
        </div>
      )}

      <div className="main-layout">
        {/* ── LEFT ── */}
        <div className="left-panel">
          <div className="panel-header">
            <h1 className="panel-title">{phase === "interview" ? "Before we start..." : "What are you selling?"}</h1>
            <p className="panel-sub">{phase === "interview" ? "Three quick questions so we can tailor every recommendation to you." : "Upload up to 6 photos — we'll price it, write the listing, and tell you where to post it."}</p>
            {phase !== "interview" && credits <= 3 && credits > 0 && (
              <div className="credits-badge">{credits} free listing{credits !== 1 ? "s" : ""} remaining</div>
            )}
          </div>

          {/* INTERVIEW */}
          {phase === "interview" && (
            <SellerInterview onComplete={finishInterview} />
          )}

          {/* UPLOAD */}
          {phase === "upload" && (
            <div className="card">
              <div className="drop-zone" ref={dragRef} onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop} onClick={() => fileInputRef.current?.click()}>
                <span className="drop-icon">📷</span>
                <div className="drop-text">Tap or drag to add photos</div>
                <div className="drop-sub">Up to 6 photos · furniture, antiques, electronics, anything</div>
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" multiple style={{ display: "none" }} onChange={e => addPhotos(e.target.files)} />
              {photos.length > 0 && (
                <>
                  <div className="photo-grid">{photos.map((p, i) => (<div key={p.id} className="thumb"><img src={p.url} alt="" /><button className="thumb-x" onClick={e => { e.stopPropagation(); setPhotos(prev => prev.filter((_, j) => j !== i)); }}>×</button></div>))}</div>
                  <div className="photo-count">{photos.length} photo{photos.length !== 1 ? "s" : ""} ready</div>
                </>
              )}
              {error && <div className="err">{error}</div>}
              <button className="btn-primary" disabled={!photos.length || loading} onClick={analyze}>Analyze &amp; Price It →</button>
            </div>
          )}

          {/* PAYWALL */}
          {phase === "paywall" && (
            <div className="paywall-card">
              <div className="paywall-icon">🎉</div>
              <div className="paywall-title">You're on a roll!</div>
              <div className="paywall-sub">You've used your 3 free listings. Keep going!</div>
              <p className="paywall-tip">One good sale covers the cost of any plan.</p>
              <div className="paywall-options">
                <div className="paywall-option paywall-option-pack" onClick={() => handleStripeCheckout("price_5pack", "payment")}>
                  <div className="paywall-option-title">Got a few things to sell</div>
                  <div className="paywall-option-desc">5 more listings</div>
                  <div className="paywall-option-price">$7.99 <span>one time</span></div>
                  <div className="paywall-ppu">$1.60 per listing</div>
                </div>
                <div className="paywall-option paywall-option-20pack" onClick={() => handleStripeCheckout("price_20pack", "payment")}>
                  <div className="paywall-popular">BEST VALUE</div>
                  <div className="paywall-option-title">Clearing out a room or garage</div>
                  <div className="paywall-option-desc">20 more listings</div>
                  <div className="paywall-option-price">$19.99 <span>one time</span></div>
                  <div className="paywall-ppu">$1 per listing</div>
                </div>
                <div className="paywall-option paywall-option-monthly" onClick={() => handleStripeCheckout("price_monthly", "subscription")}>
                  <div className="paywall-option-title">Selling regularly</div>
                  <div className="paywall-option-desc">Unlimited listings</div>
                  <div className="paywall-option-price">$14.99 <span>/ month</span></div>
                </div>
              </div>
              {stripeLoading && <div className="paywall-loading">Loading payment...</div>}
              <div className="paywall-note">Cancel anytime · Secure payment via Stripe</div>
            </div>
          )}

          {/* ANALYZING */}
          {phase === "analyzing" && (
            <div className="card">
              <div className="analyzing">
                <div className="spin" />
                <div className="analyzing-title">Analyzing your item...</div>
                <div className="analyzing-sub">Checking value, finding the best platform, writing your listing</div>
              </div>
            </div>
          )}

          {/* CHAT */}
          {phase === "chat" && (
            <div className="card">
              <div style={{ marginBottom: "1rem" }}><div className="card-title">One quick question</div><div className="card-sub">This helps me give you a better recommendation</div></div>
              {chatMessages.map((msg, i) =>
                msg.role === "assistant" && msg.data?.type === "question" ? (
                  <div key={i} className="bubble ai">
                    {msg.data.seen && <div className="seen-label">I can see: {msg.data.seen}</div>}
                    <div style={{ fontWeight: 500 }}>{msg.data.question}</div>
                    {msg.data.why && <div className="why-note">{msg.data.why}</div>}
                  </div>
                ) : msg.role === "user" ? <div key={i} className="bubble me">{msg.text}</div> : null
              )}
              {loading && <div className="bubble ai"><div className="spin" style={{ width: 22, height: 22, borderWidth: 2, margin: "0 auto" }} /></div>}
              <div className="chat-row">
                <input className="chat-input" value={inputText} onChange={e => setInputText(e.target.value)} onKeyDown={e => e.key === "Enter" && sendAnswer()} placeholder="Type your answer..." disabled={loading} />
                <button className="chat-send" onClick={sendAnswer} disabled={!inputText.trim() || loading}>Send →</button>
              </div>
              {error && <div className="err">{error}</div>}
            </div>
          )}

          {/* RESULT */}
          {phase === "result" && result && (
            <div className="card">
              {result.bucket && bucketLabels[result.bucket] && (
                <div className="bucket-badge" style={{ background: bucketLabels[result.bucket].color }}>
                  {bucketLabels[result.bucket].icon} {bucketLabels[result.bucket].label}
                </div>
              )}
              <div className="plat-badge" style={{ background: pColor }}>Best on: {result.platformName || result.platform}</div>
              <div className="item-name">{result.itemName}</div>
              {result.askingPrice > 0 && (
                <div className="val-row">
                  <div className="val-big">${result.askingPrice}</div>
                  <div className="val-meta">asking · market ${result.estimatedValue?.low}–${result.estimatedValue?.high} · <span className={`conf-dot conf-${result.confidence}`} />{result.confidence} confidence</div>
                </div>
              )}
              <div className="info-box"><strong>Our recommendation</strong>{result.platformReason}</div>
              {result.diamondAlert && (<div className="diamond-box"><span className="diamond-icon">💎</span><div className="diamond-body"><strong>Heads up — this might be worth more</strong>{result.diamondAlert}</div></div>)}
              {result.bucket !== "donate" && result.bucket !== "appraise" && (
                <>
                  <div className="sec-label">Your ready-to-post listing</div>
                  <div className="listing-box"><div className="listing-title">{result.title}</div><div className="listing-desc">{result.description}</div></div>
                  {result.tips?.length > 0 && (<><div className="sec-label">Selling tips</div><ul className="tips">{result.tips.map((t, i) => <li key={i}>{t}</li>)}</ul></>)}
                  <div className="post-section">
                    <div className="sec-label">Post your listing</div>
                    <button className="btn-post btn-post-fb" onClick={postTo("facebook", "https://www.facebook.com/marketplace/create/item")}><span>📘</span> Post on Facebook Marketplace</button>
                    <button className="btn-post btn-post-ebay" onClick={postTo("ebay", `https://www.ebay.com/sell/selectformat?title=${encodeURIComponent(result.title)}`)}><span>🛒</span> Post on eBay</button>
                    <button className="btn-post btn-post-offerup" onClick={postTo("offerup", "https://offerup.com/sell")}><span>🟢</span> Post on OfferUp</button>
                    {postInstructions && (<div className="instructions-box"><strong>Listing copied! Paste it into the description on {postInstructions === "facebook" ? "Facebook Marketplace" : postInstructions === "ebay" ? "eBay" : "OfferUp"}.</strong><ol className="instructions-steps"><li><span className="step-num">1</span>The site opened in a new tab</li><li><span className="step-num">2</span>Click in the description box and press Ctrl+V to paste</li><li><span className="step-num">3</span>Set the price to ${result.askingPrice} and publish!</li></ol></div>)}
                  </div>
                </>
              )}
              <div className="actions-row">
                {result.bucket !== "donate" && result.bucket !== "appraise" && (
                  <button className="btn-ghost" onClick={copyListing} style={copied ? { borderColor: "#2d7a4f", color: "#2d7a4f" } : {}}>{copied ? "✓ Copied!" : "Copy Listing"}</button>
                )}
                <button className="btn-ghost" onClick={saveAndAddAnother}>+ Add Another Item</button>
                {savedListings.length > 0 && <button className="btn-ghost btn-summary" onClick={savAndShowSummary}>View My Plan</button>}
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT ── */}
        <div className="right-panel">
          {showSummary && savedListings.length > 0 ? (
            <SessionSummary listings={savedListings} onAddMore={() => { setShowSummary(false); setPhase("upload"); }} />
          ) : (
            <>
              <div className="panel-header">
                <h2 className="panel-title">My Listings</h2>
                {savedListings.length > 0 && <span className="listings-count">{savedListings.length} item{savedListings.length !== 1 ? "s" : ""}</span>}
              </div>
              {savedListings.length === 0 ? (
                <div className="empty-listings">
                  <div className="empty-icon">📋</div>
                  <div className="empty-text">Your listings will appear here</div>
                  <div className="empty-sub">Analyze an item to get started</div>
                </div>
              ) : (
                savedListings.map((item, i) => <SavedCard key={item.id} item={item} index={i} />)
              )}
            </>
          )}
        </div>
      </div>

      <footer className="footer">
        <div className="footer-inner">
          <span>© 2026 SellYourStuff.ai</span>
          <Link to="/blog" className="footer-link">Tips &amp; Guides</Link>
        </div>
      </footer>
    </div>
  );
}

// ── Seller interview ───────────────────────────────────────────────────────
function SellerInterview({ onComplete }) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({ urgency: null, logistics: null, effort: null });

  const questions = [
    {
      key: "urgency",
      question: "How fast do you want to sell?",
      options: [
        { value: "this_week", label: "This week", sub: "Price to move fast" },
        { value: "within_a_month", label: "Within a month", sub: "Balanced approach" },
        { value: "no_rush", label: "No rush", sub: "Maximize what I get" },
      ]
    },
    {
      key: "logistics",
      question: "Can you meet buyers locally or ship items?",
      options: [
        { value: "local_only", label: "Local only", sub: "Pickup only, no shipping" },
        { value: "can_ship", label: "I can ship", sub: "Open to eBay and online buyers" },
        { value: "both", label: "Either works", sub: "Most flexible" },
      ]
    },
    {
      key: "effort",
      question: "How much effort can you put in per item?",
      options: [
        { value: "minimal", label: "Minimal", sub: "Just get it sold" },
        { value: "moderate", label: "Moderate", sub: "Happy to answer a question or two" },
        { value: "happy_to_invest", label: "Happy to invest", sub: "I want the best price" },
      ]
    }
  ];

  const current = questions[step];

  const pick = (value) => {
    const newAnswers = { ...answers, [current.key]: value };
    setAnswers(newAnswers);
    if (step < questions.length - 1) {
      setStep(step + 1);
    } else {
      onComplete(newAnswers);
    }
  };

  return (
    <div className="card interview-card">
      <div className="interview-progress">
        {questions.map((_, i) => <div key={i} className={`interview-dot ${i <= step ? "active" : ""}`} />)}
      </div>
      <div className="interview-q">{current.question}</div>
      <div className="interview-options">
        {current.options.map(opt => (
          <button key={opt.value} className="interview-option" onClick={() => pick(opt.value)}>
            <div className="interview-option-label">{opt.label}</div>
            <div className="interview-option-sub">{opt.sub}</div>
          </button>
        ))}
      </div>
      <div className="interview-skip">
        <button className="interview-skip-btn" onClick={() => onComplete({ urgency: "within_a_month", logistics: "both", effort: "moderate" })}>
          Skip and use defaults
        </button>
      </div>
    </div>
  );
}

export default function SellYourStuff() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainApp />} />
        <Route path="/blog/*" element={<Blog />} />
      </Routes>
    </BrowserRouter>
  );
}
