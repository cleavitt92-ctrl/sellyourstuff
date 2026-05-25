import { useState, useRef } from "react";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import Blog from "./Blog";

const SYSTEM_PROMPT = `You are SellYourStuff.ai, an expert resale AI that helps people photograph household items, antiques, collectibles, and furniture — then turns those photos into ready-to-post listings.

ALWAYS respond in valid JSON only. No markdown fences, no text outside the JSON object.

Decision logic:
- If you need ONE critical piece of info (serial number, maker's mark, specific model detail) that would significantly change the valuation, ask for it.
- If you have enough to give a solid assessment, skip straight to the listing.
- Don't ask questions just for formality. Only ask if it genuinely changes value.

Platform selection guide:
- eBay: collectibles, branded electronics, niche items, ships easily, international buyers
- Facebook Marketplace: furniture, bulky items, local pickup, everyday household
- Craigslist: furniture, appliances, bulk lots, local
- Etsy: vintage (20+ years), retro decor, craft supplies, quirky old stuff
- OfferUp: general secondhand, easy mobile app selling
- Specialized: rare coins, stamps, vintage watches, sports cards, instruments

JSON format when you need to ask a question:
{
  "type": "question",
  "seen": "brief description of what you observe in the photos",
  "question": "your specific targeted question",
  "why": "one sentence on why this info affects the valuation"
}

JSON format when ready to generate the listing:
{
  "type": "listing",
  "itemName": "specific descriptive item name",
  "estimatedValue": { "low": 0, "high": 0 },
  "confidence": "low|medium|high",
  "platform": "eBay|Facebook Marketplace|Craigslist|Etsy|OfferUp|Specialized",
  "platformName": "display name",
  "platformReason": "conversational explanation of why this platform is best for this item",
  "askingPrice": 0,
  "title": "SEO-optimized listing title under 80 chars",
  "description": "complete ready-to-post listing: condition, key features, dimensions if relevant, honest disclosure of any flaws",
  "tips": ["actionable selling tip", "another tip"],
  "diamondAlert": null
}

For diamondAlert: if this item might be significantly more valuable than it appears set this to a string explaining why. Otherwise null.
Be accurate and realistic with valuations based on current resale markets.`;

const platformColors = {
  eBay: "#e53238",
  "Facebook Marketplace": "#1877f2",
  Craigslist: "#444",
  Etsy: "#f1641e",
  OfferUp: "#6bbd5b",
  Specialized: "#7c5cbf",
};

// ── Saved listing card ─────────────────────────────────────────────────────
function SavedCard({ item, index }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [postInstructions, setPostInstructions] = useState(null);
  const pColor = platformColors[item.result.platform] || "#888";
  const getListingText = () =>
    `${item.result.title}\n\n${item.result.description}\n\nAsking price: $${item.result.askingPrice}`;
  const copyListing = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(getListingText()).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2500); });
  };
  const postToFacebook = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(getListingText()).then(() => { setPostInstructions("facebook"); window.open("https://www.facebook.com/marketplace/create/item", "_blank"); });
  };
  const postToEbay = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(getListingText()).then(() => { setPostInstructions("ebay"); window.open(`https://www.ebay.com/sell/selectformat?title=${encodeURIComponent(item.result.title)}`, "_blank"); });
  };
  return (
    <div className="saved-card" style={{ animationDelay: `${index * 0.05}s` }}>
      <div className="saved-header" onClick={() => setOpen(o => !o)}>
        <div className="saved-thumb-wrap">
          {item.thumbUrl ? <img className="saved-thumb" src={item.thumbUrl} alt="" /> : <div className="saved-thumb saved-thumb-empty">📦</div>}
        </div>
        <div className="saved-meta">
          <div className="saved-name">{item.result.itemName}</div>
          <div className="saved-sub">
            <span className="saved-price">${item.result.askingPrice}</span>
            <span className="saved-badge" style={{ background: pColor }}>{item.result.platformName || item.result.platform}</span>
          </div>
        </div>
        <div className="saved-chevron">{open ? "▲" : "▼"}</div>
      </div>
      {open && (
        <div className="saved-body">
          <div className="info-box"><strong>Why {item.result.platformName || item.result.platform}?</strong>{item.result.platformReason}</div>
          {item.result.diamondAlert && (<div className="diamond-box"><span className="diamond-icon">💎</span><div className="diamond-body"><strong>Might be worth more</strong>{item.result.diamondAlert}</div></div>)}
          <div className="sec-label">Listing</div>
          <div className="listing-box"><div className="listing-title">{item.result.title}</div><div className="listing-desc">{item.result.description}</div></div>
          <div className="post-section">
            <button className="btn-post btn-post-fb" onClick={postToFacebook}><span>📘</span> Post on Facebook Marketplace</button>
            <button className="btn-post btn-post-ebay" onClick={postToEbay}><span>🛒</span> Post on eBay</button>
            {postInstructions === "facebook" && (<div className="instructions-box"><strong>Listing copied! What to do next:</strong><ol className="instructions-steps"><li><span className="step-num">1</span>Facebook Marketplace opened in new tab</li><li><span className="step-num">2</span>Click "Item for sale" and add photos</li><li><span className="step-num">3</span>Paste with Ctrl+V in description</li><li><span className="step-num">4</span>Set price to ${item.result.askingPrice} and publish</li></ol></div>)}
            {postInstructions === "ebay" && (<div className="instructions-box ebay"><strong>Listing copied! What to do next:</strong><ol className="instructions-steps"><li><span className="step-num ebay">1</span>eBay opened in new tab</li><li><span className="step-num ebay">2</span>Paste with Ctrl+V in description</li><li><span className="step-num ebay">3</span>Set price to ${item.result.askingPrice} and list</li></ol></div>)}
          </div>
          <button className="btn-ghost" onClick={copyListing} style={copied ? { borderColor: "#2d7a4f", color: "#2d7a4f" } : {}}>{copied ? "✓ Copied!" : "Copy Listing Text"}</button>
        </div>
      )}
    </div>
  );
}

// ── Main app ───────────────────────────────────────────────────────────────
function MainApp() {
  const [phase, setPhase] = useState("upload");
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
  const fileInputRef = useRef(null);
  const historyRef = useRef([]);
  const dragRef = useRef(null);
  const currentThumbRef = useRef(null);

  const toBase64 = (file) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result.split(",")[1]); r.onerror = rej; r.readAsDataURL(file); });

  const addPhotos = (files) => {
    const valid = Array.from(files).filter(f => f.type.startsWith("image/"));
    const newPhotos = valid.map(f => ({ file: f, url: URL.createObjectURL(f), id: Math.random() }));
    setPhotos(prev => [...prev, ...newPhotos].slice(0, 6));
  };

  const callClaude = async (messages) => {
    const response = await fetch("/api/claude", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: "claude-opus-4-5", max_tokens: 1000, system: SYSTEM_PROMPT, messages }),
    });
    if (!response.ok) throw new Error("API error");
    const data = await response.json();
    const text = data.content.filter(b => b.type === "text").map(b => b.text).join("");
    return JSON.parse(text.replace(/```json\n?|\n?```/g, "").trim());
  };

  const analyze = async () => {
    if (!photos.length) return;
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
      setSavedListings(prev => [{ id: Math.random(), result, thumbUrl: currentThumbRef.current }, ...prev]);
      const newCredits = credits - 1;
      setCredits(newCredits);
      if (newCredits <= 0) {
        setPhase("paywall"); setPhotos([]); setChatMessages([]); setInputText(""); setResult(null); setError(null); setPostInstructions(null); historyRef.current = []; currentThumbRef.current = null;
        return;
      }
    }
    setPhase("upload"); setPhotos([]); setChatMessages([]); setInputText(""); setResult(null); setError(null); setPostInstructions(null); historyRef.current = []; currentThumbRef.current = null;
  };

  const handleStripeCheckout = async (priceId, mode) => {
    setStripeLoading(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId, mode }),
      });
      const { url } = await res.json();
      window.location.href = url;
    } catch (e) {
      alert("Payment failed to load. Please try again.");
    } finally {
      setStripeLoading(false);
    }
  };

  const getListingText = () => result ? `${result.title}\n\n${result.description}\n\nAsking price: $${result.askingPrice}` : "";
  const copyListing = () => { navigator.clipboard.writeText(getListingText()).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2500); }); };
  const postToFacebook = () => { navigator.clipboard.writeText(getListingText()).then(() => { setPostInstructions("facebook"); window.open("https://www.facebook.com/marketplace/create/item", "_blank"); }); };
  const postToEbay = () => { navigator.clipboard.writeText(getListingText()).then(() => { setPostInstructions("ebay"); window.open(`https://www.ebay.com/sell/selectformat?title=${encodeURIComponent(result.title)}`, "_blank"); }); };
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

      <div className="main-layout">
        {/* ── LEFT: Analysis panel ── */}
        <div className="left-panel">
          <div className="panel-header">
            <h1 className="panel-title">What are you selling?</h1>
            <p className="panel-sub">Upload photos — we'll identify it, price it, and write the listing.</p>
            {credits <= 3 && credits > 0 && (
              <div className="credits-badge">{credits} free listing{credits !== 1 ? "s" : ""} remaining</div>
            )}
          </div>

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
                  <div className="photo-grid">
                    {photos.map((p, i) => (
                      <div key={p.id} className="thumb">
                        <img src={p.url} alt="" />
                        <button className="thumb-x" onClick={e => { e.stopPropagation(); setPhotos(prev => prev.filter((_, j) => j !== i)); }}>×</button>
                      </div>
                    ))}
                  </div>
                  <div className="photo-count">{photos.length} photo{photos.length !== 1 ? "s" : ""} ready</div>
                </>
              )}
              {error && <div className="err">{error}</div>}
              <button className="btn-primary" disabled={!photos.length || loading} onClick={analyze}>Analyze &amp; Price It →</button>
            </div>
          )}

          {phase === "paywall" && (
            <div className="paywall-card">
              <div className="paywall-icon">🎉</div>
              <div className="paywall-title">You're on a roll!</div>
              <div className="paywall-sub">You've used your 3 free listings. Keep going — you're doing great.</div>
              <div className="paywall-options">
                <div className="paywall-option paywall-option-pack" onClick={() => handleStripeCheckout("price_5pack", "payment")}>
                  <div className="paywall-option-title">5 More Listings</div>
                  <div className="paywall-option-desc">Perfect if you just have a few more things to sell</div>
                  <div className="paywall-option-price">$4.99 <span>one time</span></div>
                  <div className="paywall-ppu">about $1 per listing</div>
                </div>
                <div className="paywall-option paywall-option-monthly" onClick={() => handleStripeCheckout("price_monthly", "subscription")}>
                  <div className="paywall-popular">MOST POPULAR</div>
                  <div className="paywall-option-title">Unlimited Listings</div>
                  <div className="paywall-option-desc">Best value if you have a lot to sell</div>
                  <div className="paywall-option-price">$9.99 <span>/ month</span></div>
                </div>
              </div>
              {stripeLoading && <div className="paywall-loading">Loading payment...</div>}
              <div className="paywall-note">Cancel anytime · Secure payment via Stripe</div>
            </div>
          )}

          {phase === "analyzing" && (
            <div className="card">
              <div className="analyzing">
                <div className="spin" />
                <div className="analyzing-title">Analyzing your item...</div>
                <div className="analyzing-sub">Checking resale value, best platform, and drafting your listing</div>
              </div>
            </div>
          )}

          {phase === "chat" && (
            <div className="card">
              <div style={{ marginBottom: "1rem" }}>
                <div className="card-title">One quick question</div>
                <div className="card-sub">This helps me give you a more accurate valuation</div>
              </div>
              {chatMessages.map((msg, i) =>
                msg.role === "assistant" && msg.data?.type === "question" ? (
                  <div key={i} className="bubble ai">
                    {msg.data.seen && <div className="seen-label">I can see: {msg.data.seen}</div>}
                    <div style={{ fontWeight: 500 }}>{msg.data.question}</div>
                    {msg.data.why && <div className="why-note">{msg.data.why}</div>}
                  </div>
                ) : msg.role === "user" ? (
                  <div key={i} className="bubble me">{msg.text}</div>
                ) : null
              )}
              {loading && <div className="bubble ai"><div className="spin" style={{ width: 22, height: 22, borderWidth: 2, margin: "0 auto" }} /></div>}
              <div className="chat-row">
                <input className="chat-input" value={inputText} onChange={e => setInputText(e.target.value)} onKeyDown={e => e.key === "Enter" && sendAnswer()} placeholder="Type your answer..." disabled={loading} />
                <button className="chat-send" onClick={sendAnswer} disabled={!inputText.trim() || loading}>Send →</button>
              </div>
              {error && <div className="err">{error}</div>}
            </div>
          )}

          {phase === "result" && result && (
            <div className="card">
              <div className="plat-badge" style={{ background: pColor }}>Best on: {result.platformName || result.platform}</div>
              <div className="item-name">{result.itemName}</div>
              <div className="val-row">
                <div className="val-big">${result.askingPrice}</div>
                <div className="val-meta">asking · market ${result.estimatedValue?.low}–${result.estimatedValue?.high} · <span className={`conf-dot conf-${result.confidence}`} />{result.confidence} confidence</div>
              </div>
              <div className="info-box"><strong>Why {result.platformName || result.platform}?</strong>{result.platformReason}</div>
              {result.diamondAlert && (<div className="diamond-box"><span className="diamond-icon">💎</span><div className="diamond-body"><strong>Heads up — this might be worth more</strong>{result.diamondAlert}</div></div>)}
              <div className="sec-label">Your ready-to-post listing</div>
              <div className="listing-box"><div className="listing-title">{result.title}</div><div className="listing-desc">{result.description}</div></div>
              {result.tips?.length > 0 && (<><div className="sec-label">Selling tips</div><ul className="tips">{result.tips.map((t, i) => <li key={i}>{t}</li>)}</ul></>)}
              <div className="post-section">
                <div className="sec-label">Post your listing</div>
                <button className="btn-post btn-post-fb" onClick={postToFacebook}><span>📘</span> Post on Facebook Marketplace</button>
                <button className="btn-post btn-post-ebay" onClick={postToEbay}><span>🛒</span> Post on eBay</button>
                {postInstructions === "facebook" && (<div className="instructions-box"><strong>Listing copied! What to do next:</strong><ol className="instructions-steps"><li><span className="step-num">1</span>Facebook Marketplace opened in new tab</li><li><span className="step-num">2</span>Click "Item for sale" and add your photos</li><li><span className="step-num">3</span>Paste with Ctrl+V in the description box</li><li><span className="step-num">4</span>Set price to ${result.askingPrice} and publish!</li></ol></div>)}
                {postInstructions === "ebay" && (<div className="instructions-box ebay"><strong>Listing copied! What to do next:</strong><ol className="instructions-steps"><li><span className="step-num ebay">1</span>eBay opened in new tab — sign in if needed</li><li><span className="step-num ebay">2</span>Paste with Ctrl+V in the description box</li><li><span className="step-num ebay">3</span>Set price to ${result.askingPrice} and list it!</li></ol></div>)}
              </div>
              <div className="actions-row">
                <button className="btn-ghost" onClick={copyListing} style={copied ? { borderColor: "#2d7a4f", color: "#2d7a4f" } : {}}>{copied ? "✓ Copied!" : "Copy Listing Text"}</button>
                <button className="btn-ghost" onClick={saveAndAddAnother}>+ Add Another Item</button>
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT: My Listings panel ── */}
        <div className="right-panel">
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
