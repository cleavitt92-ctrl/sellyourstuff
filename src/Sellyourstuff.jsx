import { useState, useRef, useEffect } from "react";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import { supabase } from "./supabase";
import Blog from "./Blog";

const buildSystemPrompt = (sellerContext) => `You are SellYourStuff.ai, an expert resale AI that helps people sell household items.

ALWAYS respond in valid JSON only. No markdown fences, no text outside the JSON object.

SELLER CONTEXT:
- Urgency: ${sellerContext.urgency || "within_a_month"}
- Logistics: ${sellerContext.logistics || "both"}
- Effort: ${sellerContext.effort || "moderate"}

BUCKET SORTING — assign every item to one of these:
1. "donate" — not worth listing, value under $5
2. "bundle" — garage sale or lot listing, $5-15
3. "local" — Facebook Marketplace, Craigslist, OfferUp
4. "specialist" — eBay, Etsy, specialist platform
5. "appraise" — potentially high value, get expert appraisal first

URGENCY MODIFIERS:
- this_week: local platforms, price 20% below market
- within_a_month: balanced, fair market pricing
- no_rush: maximize value, specialist platforms

EFFORT MODIFIERS:
- minimal: skip questions, suggest bundle/local
- moderate: ask one follow-up if it changes the recommendation
- happy_to_invest: ask up to two follow-ups, optimize for best outcome

GARAGE SALE LOGIC:
If the item is clearly low-value household goods (cleaning supplies, basic kitchenware, common tools, generic decor), assign bucket "bundle" and suggest garage sale over individual listing.

Platform selection:
- eBay: collectibles, branded electronics, niche items, ships easily
- Facebook Marketplace: furniture, bulky items, local pickup
- Craigslist: furniture, appliances, bulk lots
- OfferUp: casual secondhand, everyday items
- OLX: international local selling
- Etsy: vintage 20+ years, retro decor
- Specialized: rare coins, stamps, watches, sports cards

JSON format when asking a follow-up:
{
  "type": "question",
  "seen": "brief description",
  "question": "your question",
  "why": "one sentence why this changes the recommendation"
}

JSON format for listing:
{
  "type": "listing",
  "itemName": "specific item name",
  "bucket": "donate|bundle|local|specialist|appraise",
  "estimatedValue": { "low": 0, "high": 0 },
  "confidence": "low|medium|high",
  "platform": "eBay|Facebook Marketplace|Craigslist|OfferUp|OLX|Etsy|Specialized|Donate",
  "platformName": "display name",
  "platformReason": "brief explanation tailored to seller context",
  "askingPrice": 0,
  "title": "SEO-optimized listing title under 80 chars",
  "description": "complete ready-to-post listing description",
  "tips": ["tip 1", "tip 2"],
  "diamondAlert": null
}

For diamondAlert: if this might be significantly more valuable than it appears, explain why. Otherwise null.
Be accurate with valuations. Tailor every recommendation to seller context.`;

const platformColors = {
  eBay: "#e53238",
  "Facebook Marketplace": "#1877f2",
  Craigslist: "#444",
  OfferUp: "#6bbd5b",
  OLX: "#6e2fff",
  Etsy: "#f1641e",
  Specialized: "#7c5cbf",
  Donate: "#94a3b8",
};

const SAMPLE_LISTINGS = [
  {
    id: "sample-1",
    isSample: true,
    thumbUrl: null,
    result: {
      itemName: "1987 Fender Stratocaster",
      askingPrice: 850,
      platform: "eBay",
      platformName: "eBay",
      bucket: "specialist",
      confidence: "high",
      estimatedValue: { low: 750, high: 950 },
      platformReason: "Vintage guitars have a global collector market on eBay.",
      title: "1987 Fender Stratocaster Sunburst — Vintage USA Made",
      description: "",
      tips: [],
      diamondAlert: "This could be worth significantly more if it has the original case and hardware. Check the serial number — certain 1987 production runs are highly collectible.",
    }
  },
  {
    id: "sample-2",
    isSample: true,
    thumbUrl: null,
    result: {
      itemName: "Mid-Century Danish Teak Dresser",
      askingPrice: 320,
      platform: "Facebook Marketplace",
      platformName: "Facebook Marketplace",
      bucket: "local",
      confidence: "high",
      estimatedValue: { low: 280, high: 380 },
      platformReason: "Heavy furniture sells best locally — Facebook Marketplace buyers will come to you.",
      title: "Mid-Century Danish Teak 6-Drawer Dresser — Excellent Condition",
      description: "",
      tips: [],
      diamondAlert: null,
    }
  },
  {
    id: "sample-3",
    isSample: true,
    thumbUrl: null,
    result: {
      itemName: "Lot of 45 Pokemon Cards",
      askingPrice: 180,
      platform: "eBay",
      platformName: "eBay",
      bucket: "specialist",
      confidence: "medium",
      estimatedValue: { low: 120, high: 240 },
      platformReason: "Pokemon cards have a huge global collector base on eBay.",
      title: "Lot of 45 Pokemon Cards — Includes Holos, 1st Edition",
      description: "",
      tips: [],
      diamondAlert: null,
    }
  },
  {
    id: "sample-4",
    isSample: true,
    thumbUrl: null,
    result: {
      itemName: "KitchenAid Stand Mixer",
      askingPrice: 95,
      platform: "Facebook Marketplace",
      platformName: "Facebook Marketplace",
      bucket: "local",
      confidence: "high",
      estimatedValue: { low: 80, high: 120 },
      platformReason: "Popular appliance with strong local demand — sells fast on Marketplace.",
      title: "KitchenAid Artisan Stand Mixer 5qt — Works Perfectly",
      description: "",
      tips: [],
      diamondAlert: null,
    }
  },
  {
    id: "sample-5",
    isSample: true,
    thumbUrl: null,
    result: {
      itemName: "Vintage Levi's 501 Jeans",
      askingPrice: 65,
      platform: "Etsy",
      platformName: "Etsy",
      bucket: "specialist",
      confidence: "medium",
      estimatedValue: { low: 50, high: 85 },
      platformReason: "Vintage denim has a dedicated buyer base on Etsy willing to pay premium prices.",
      title: "Vintage Levi's 501 Jeans 32x30 — Made in USA 1990s",
      description: "",
      tips: [],
      diamondAlert: null,
    }
  },
  {
    id: "sample-6",
    isSample: true,
    thumbUrl: null,
    result: {
      itemName: "Box of Misc Hand Tools",
      askingPrice: 0,
      platform: "Craigslist",
      platformName: "Garage Sale",
      bucket: "bundle",
      confidence: "medium",
      estimatedValue: { low: 0, high: 25 },
      platformReason: "Common tools aren't worth listing individually — bundle them at a garage sale.",
      title: "",
      description: "",
      tips: [],
      diamondAlert: null,
    }
  },
];

const bucketLabels = {
  donate: { label: "Donate", color: "#94a3b8", icon: "🤝" },
  bundle: { label: "Bundle / Garage Sale", color: "#f59e0b", icon: "📦" },
  local: { label: "Sell Locally", color: "#1877f2", icon: "📍" },
  specialist: { label: "Sell Online", color: "#e53238", icon: "🌐" },
  appraise: { label: "Get Appraised First", color: "#7c5cbf", icon: "🔍" },
};

// ── Auth modal ─────────────────────────────────────────────────────────────
function AuthModal({ onClose }) {
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState("signin"); // signin | signup
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  const signInWithGoogle = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
    if (error) { setError("Google sign in failed. Please try again."); setLoading(false); }
  };

  const handleEmailAuth = async () => {
    if (!email || !password) { setError("Please enter your email and password."); return; }
    setLoading(true); setError(null);
    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) setError(error.message);
      else { setMessage("Check your email to confirm your account!"); }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError("Invalid email or password.");
      else onClose();
    }
    setLoading(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>×</button>
        <div className="modal-icon">💎</div>
        <h2 className="modal-title">{mode === "signin" ? "Sign in to unlock your listing" : "Create your account"}</h2>
        <p className="modal-sub">Save your listings, unlock full copy, and post directly to eBay, Facebook Marketplace, and more.</p>

        {message ? (
          <div className="modal-message">{message}</div>
        ) : (
          <>
            <button className="btn-google" onClick={signInWithGoogle} disabled={loading}>
              <svg width="18" height="18" viewBox="0 0 18 18"><path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z"/><path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2.04a4.8 4.8 0 0 1-7.18-2.54H1.83v2.07A8 8 0 0 0 8.98 17z"/><path fill="#FBBC05" d="M4.5 10.48A4.8 4.8 0 0 1 4.5 7.5V5.43H1.83a8 8 0 0 0 0 7.14z"/><path fill="#EA4335" d="M8.98 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.59A8 8 0 0 0 1.83 5.43L4.5 7.5c.66-1.97 2.52-3.92 4.48-3.92z"/></svg>
              {loading ? "Signing in..." : "Continue with Google"}
            </button>

            <div className="modal-divider"><span>or</span></div>

            <input className="modal-input" type="email" placeholder="Email address" value={email} onChange={e => setEmail(e.target.value)} disabled={loading} />
            <input className="modal-input" type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === "Enter" && handleEmailAuth()} disabled={loading} />

            {error && <div className="modal-error">{error}</div>}

            <button className="btn-primary" onClick={handleEmailAuth} disabled={loading} style={{ marginTop: ".75rem" }}>
              {loading ? "Please wait..." : mode === "signin" ? "Sign in" : "Create account"}
            </button>

            <div className="modal-switch">
              {mode === "signin" ? (
                <span>Don't have an account? <button onClick={() => { setMode("signup"); setError(null); }}>Sign up</button></span>
              ) : (
                <span>Already have an account? <button onClick={() => { setMode("signin"); setError(null); }}>Sign in</button></span>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Saved listing card ─────────────────────────────────────────────────────
function SavedCard({ item, index, user, onLoginRequired }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [postInstructions, setPostInstructions] = useState(null);
  const pColor = platformColors[item.result.platform] || "#888";
  const bucket = bucketLabels[item.result.bucket] || bucketLabels.local;

  const getListingText = () =>
    `${item.result.title}\n\n${item.result.description}\n\nAsking price: $${item.result.askingPrice}`;

  const handleGatedAction = (action) => {
    if (!user) { onLoginRequired(); return; }
    action();
  };

  const copyListing = (e) => {
    e.stopPropagation();
    handleGatedAction(() => {
      navigator.clipboard.writeText(getListingText()).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2500); });
    });
  };

  const postTo = (platform, url) => (e) => {
    e.stopPropagation();
    handleGatedAction(() => {
      navigator.clipboard.writeText(getListingText()).then(() => { setPostInstructions(platform); window.open(url, "_blank"); });
    });
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
              <div className="sec-label">Your listing</div>
              <div className="listing-box">
                <div className="listing-title">{item.result.title}</div>
                {user ? (
                  <div className="listing-desc">{item.result.description}</div>
                ) : (
                  <>
                    <div className="listing-desc">{item.result.description.slice(0, 120)}...</div>
                    <div className="listing-blur-wrap">
                      <div className="listing-blur" />
                      <button className="listing-unlock-btn" onClick={() => onLoginRequired()}>
                        🔓 Sign in free to unlock full listing
                      </button>
                    </div>
                  </>
                )}
              </div>
              <div className="post-section">
                <button className="btn-post btn-post-fb" onClick={postTo("facebook", "https://www.facebook.com/marketplace/create/item")}><span>📘</span> Post on Facebook Marketplace</button>
                <button className="btn-post btn-post-ebay" onClick={postTo("ebay", `https://www.ebay.com/sell/selectformat?title=${encodeURIComponent(item.result.title)}`)}><span>🛒</span> Post on eBay</button>
                <button className="btn-post btn-post-offerup" onClick={postTo("offerup", "https://offerup.com/sell")}><span>🟢</span> Post on OfferUp</button>
                <button className="btn-post btn-post-olx" onClick={postTo("olx", "https://www.olx.com")}><span>🟣</span> Post on OLX</button>
                {postInstructions && (<div className="instructions-box"><strong>Listing copied! Paste it into the description on {postInstructions}.</strong><ol className="instructions-steps"><li><span className="step-num">1</span>The site opened in a new tab</li><li><span className="step-num">2</span>Click in the description box and press Ctrl+V to paste</li><li><span className="step-num">3</span>Set the price to ${item.result.askingPrice} and publish!</li></ol></div>)}
              </div>
              <button className="btn-ghost" onClick={copyListing} style={copied ? { borderColor: "#2d7a4f", color: "#2d7a4f" } : {}}>{copied ? "✓ Copied!" : "Copy Listing"}</button>
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
  listings.forEach(item => { const b = item.result.bucket || "local"; if (buckets[b]) buckets[b].push(item); });
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

const ADMIN_EMAILS = ["cleavitt92@gmail.com", "jleavitt@rfam.net"];

// ── Main app ───────────────────────────────────────────────────────────────
function MainApp() {
  const [phase, setPhase] = useState("upload");
  const [sellerContext, setSellerContext] = useState({ urgency: "within_a_month", logistics: "both", effort: "moderate" });
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
  const [heroVisible, setHeroVisible] = useState(() => localStorage.getItem("sysHeroSeen") !== "true");
  const [showSummary, setShowSummary] = useState(false);
  const [user, setUser] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showInterview, setShowInterview] = useState(false);
  const fileInputRef = useRef(null);
  const historyRef = useRef([]);
  const dragRef = useRef(null);
  const currentThumbRef = useRef(null);

  // Auth state
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) loadUserData(session.user.id, session.user.email);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) loadUserData(session.user.id, session.user.email);
    });
    return () => subscription.unsubscribe();
  }, []);

  const loadUserData = async (userId, email) => {
    // Admin emails get unlimited credits
    if (ADMIN_EMAILS.includes(email)) {
      setCredits(9999);
    } else {
      const { data: profile } = await supabase.from("profiles").select("credits, plan").eq("id", userId).single();
      if (profile) setCredits(profile.credits);
    }
    const { data: listings } = await supabase.from("listings").select("*").eq("user_id", userId).order("created_at", { ascending: false });
    if (listings?.length) {
      setSavedListings(listings.map(l => ({
        id: l.id,
        thumbUrl: l.thumb_url,
        result: {
          itemName: l.item_name, askingPrice: l.asking_price, platform: l.platform,
          bucket: l.bucket, title: l.title, description: l.description,
          platformReason: l.platform_reason, confidence: l.confidence,
          estimatedValue: { low: l.estimated_value_low, high: l.estimated_value_high },
          tips: l.tips, diamondAlert: l.diamond_alert,
        }
      })));
      // Hide hero if they've listed before
      localStorage.setItem("sysHeroSeen", "true");
      setHeroVisible(false);
    }
  };

  const saveListing = async (userId, listingResult, thumbDataUrl) => {
    await supabase.from("listings").insert({
      user_id: userId, item_name: listingResult.itemName, asking_price: listingResult.askingPrice,
      platform: listingResult.platform, bucket: listingResult.bucket, title: listingResult.title,
      description: listingResult.description, platform_reason: listingResult.platformReason,
      confidence: listingResult.confidence, estimated_value_low: listingResult.estimatedValue?.low,
      estimated_value_high: listingResult.estimatedValue?.high, tips: listingResult.tips,
      diamond_alert: listingResult.diamondAlert, thumb_url: thumbDataUrl,
    });
    await supabase.from("profiles").update({ credits: credits - 1 }).eq("id", userId);
  };

  const toBase64 = (file) => new Promise((res, rej) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        try {
          const MAX = 1024;
          let w = img.width, h = img.height;
          if (w > MAX || h > MAX) {
            if (w > h) { h = Math.round(h * MAX / w); w = MAX; }
            else { w = Math.round(w * MAX / h); h = MAX; }
          }
          const canvas = document.createElement("canvas");
          canvas.width = w; canvas.height = h;
          const ctx = canvas.getContext("2d");
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, w, h);
          ctx.drawImage(img, 0, 0, w, h);
          const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
          res(dataUrl.split(",")[1]);
        } catch (err) { rej(err); }
      };
      img.onerror = () => rej(new Error("Image load failed"));
      img.src = e.target.result;
    };
    reader.onerror = () => rej(new Error("File read failed"));
    reader.readAsDataURL(file);
  });

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

  const analyze = async () => {
    if (!photos.length) return;
    setShowInterview(true);
  };

  const runAnalysis = async (context) => {
    setShowInterview(false);
    setSellerContext(context);
    setHeroVisible(false); setLoading(true); setError(null); setPhase("analyzing");
    try {
      const imageBlocks = await Promise.all(photos.map(async p => {
        const b64 = await toBase64(p.file);
        return { type: "image", source: { type: "base64", media_type: "image/jpeg", data: b64 } };
      }));
      // Store first photo as compressed base64 for thumbnail
      const firstB64 = imageBlocks[0]?.source?.data;
      currentThumbRef.current = firstB64 ? `data:image/jpeg;base64,${firstB64.slice(0, 2000)}` : null;
      const firstMsg = { role: "user", content: [...imageBlocks, { type: "text", text: "I want to sell this item. What is it worth and how should I list it?" }] };
      historyRef.current = [firstMsg];
      const parsed = await callClaude(historyRef.current);
      historyRef.current.push({ role: "assistant", content: JSON.stringify(parsed) });
      if (parsed.type === "question") { setChatMessages([{ role: "assistant", data: parsed }]); setPhase("chat"); }
      else { setResult(parsed); setPhase("result"); }
    } catch (e) {
      console.error("Analysis error:", e.message);
      setError(`Couldn't analyze the photos: ${e.message}. Please try again.`);
      setPhase("upload");
    }
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
    } catch { setError("Something went wrong. Try again."); }
    finally { setLoading(false); }
  };

  const getThumbDataUrl = (file) => new Promise((res) => {
    if (!file) return res(null);
    // If it's already a data URL or http URL, use it directly
    if (typeof file === "string") {
      const img = new Image();
      img.onload = () => {
        const SIZE = 120;
        let w = img.width, h = img.height;
        if (w > h) { h = Math.round(h * SIZE / w); w = SIZE; }
        else { w = Math.round(w * SIZE / h); h = SIZE; }
        const canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        canvas.getContext("2d").drawImage(img, 0, 0, w, h);
        res(canvas.toDataURL("image/jpeg", 0.7));
      };
      img.onerror = () => res(null);
      img.src = file;
      return;
    }
    res(null);
  });

  const uploadThumb = async (userId, dataUrl) => {
    if (!dataUrl) return null;
    // Convert blob URL to small base64 data URL for storage
    const thumbDataUrl = await getThumbDataUrl(dataUrl);
    return thumbDataUrl;
  };

  const saveAndAddAnother = async () => {
    if (result) {
      let thumbUrl = currentThumbRef.current;
      if (user && thumbUrl) thumbUrl = await uploadThumb(user.id, thumbUrl) || thumbUrl;
      const newListing = { id: Math.random(), result, thumbUrl };
      setSavedListings(prev => [newListing, ...prev]);
      if (user) await saveListing(user.id, result, thumbUrl);
      // Hide hero permanently after first real listing
      localStorage.setItem("sysHeroSeen", "true");
      setHeroVisible(false);
      const newCredits = credits - 1;
      setCredits(newCredits);
      if (newCredits <= 0 && !user) { setPhase("paywall"); resetUpload(); return; }
    }
    resetUpload(); setPhase("upload");
  };

  const saveAndShowSummary = async () => {
    if (result) {
      let thumbUrl = currentThumbRef.current;
      if (user && thumbUrl) thumbUrl = await uploadThumb(user.id, thumbUrl) || thumbUrl;
      setSavedListings(prev => [{ id: Math.random(), result, thumbUrl }, ...prev]);
      if (user) await saveListing(user.id, result, thumbUrl);
      localStorage.setItem("sysHeroSeen", "true");
      setHeroVisible(false);
      setCredits(c => c - 1);
    }
    resetUpload(); setShowSummary(true); setPhase("upload");
  };

  const resetUpload = () => {
    setPhotos([]); setChatMessages([]); setInputText(""); setResult(null);
    setError(null); setPostInstructions(null); historyRef.current = []; currentThumbRef.current = null;
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

  const signOut = async () => { await supabase.auth.signOut(); setUser(null); setCredits(3); setSavedListings([]); };

  const getListingText = () => result ? `${result.title}\n\n${result.description}\n\nAsking price: $${result.askingPrice}` : "";
  const copyListing = () => {
    if (!user) { setShowAuthModal(true); return; }
    navigator.clipboard.writeText(getListingText()).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2500); });
  };
  const postTo = (platform, url) => () => {
    if (!user) { setShowAuthModal(true); return; }
    navigator.clipboard.writeText(getListingText()).then(() => { setPostInstructions(platform); window.open(url, "_blank"); });
  };
  const onDragOver = (e) => { e.preventDefault(); dragRef.current?.classList.add("dz-hover"); };
  const onDragLeave = () => dragRef.current?.classList.remove("dz-hover");
  const onDrop = (e) => { e.preventDefault(); dragRef.current?.classList.remove("dz-hover"); addPhotos(e.dataTransfer.files); };
  const pColor = result ? platformColors[result.platform] || "#888" : "#888";

  return (
    <div className="app">
      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} onLogin={() => setShowAuthModal(false)} />}

      {showInterview && (
        <div className="modal-overlay" onClick={() => setShowInterview(false)}>
          <div className="modal-card interview-modal" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowInterview(false)}>×</button>
            <div className="interview-modal-title">Quick questions before we analyze</div>
            <div className="interview-modal-sub">Helps us give you the best recommendation for this item</div>
            <SellerInterview onComplete={runAnalysis} compact />
          </div>
        </div>
      )}

      <nav className="navbar">
        <div className="nav-logo">SellYourStuff<span>.ai</span></div>
        <div className="nav-links">
          <Link to="/blog" className="nav-link">Tips &amp; Guides</Link>
          {user ? (
            <div className="nav-user">
              <span className="nav-email">{user.email?.split("@")[0]}</span>
              <button className="nav-signout" onClick={signOut}>Sign out</button>
            </div>
          ) : (
            <button className="nav-signin" onClick={() => setShowAuthModal(true)}>Sign in</button>
          )}
        </div>
      </nav>

      {heroVisible && (
        <div className="hero">
          <div className="hero-inner">
            <h1 className="hero-title">Turn your pile of stuff into money. We'll tell you how.</h1>
            <p className="hero-subhead">And we'll make sure you don't miss the diamond in the rough that makes it all worth it.</p>
            <p className="hero-desc">Take photos of your stuff: furniture, collectibles, electronics, clothes, tools, random junk. SellYourStuff.ai figures out what each thing is worth and the smartest way to move it, making listing and selling fast. Whether it's eBay, Facebook Marketplace, local listing, or even a garage sale. We'll make it easy for you!</p>
            <div className="hero-badges">
              <span className="hero-badge">📷 Just upload photos</span>
              <span className="hero-badge">💰 AI pricing</span>
              <span className="hero-badge">💎 Spot the high-value items</span>
              <span className="hero-badge">🎯 Online, local, or garage sale</span>
            </div>
          </div>
        </div>
      )}

      <div className="main-layout">
        <div className="left-panel">
          <div className="panel-header">
            <h1 className="panel-title">New Listing</h1>
            <p className="panel-sub">Upload up to 6 photos — we'll price it, write the listing, and tell you where to post it.</p>
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
              {photos.length > 0 && (<><div className="photo-grid">{photos.map((p, i) => (<div key={p.id} className="thumb"><img src={p.url} alt="" /><button className="thumb-x" onClick={e => { e.stopPropagation(); setPhotos(prev => prev.filter((_, j) => j !== i)); }}>×</button></div>))}</div><div className="photo-count">{photos.length} photo{photos.length !== 1 ? "s" : ""} ready</div></>)}
              {error && <div className="err">{error}</div>}
              <button className="btn-primary" disabled={!photos.length || loading} onClick={analyze}>Analyze &amp; Price It →</button>
            </div>
          )}

          {phase === "paywall" && (
            <div className="paywall-card">
              <div className="paywall-icon">🎉</div>
              <div className="paywall-title">You're on a roll!</div>
              <div className="paywall-sub">You've used your 3 free listings. Keep going!</div>
              <p className="paywall-tip">One good sale covers the cost of any plan.</p>
              <div className="paywall-options">
                <div className="paywall-option paywall-option-pack" onClick={() => handleStripeCheckout("price_1TbKkoLr6wY7Jbr15EyFxLe4", "payment")}>
                  <div className="paywall-option-title">Got a few things to sell</div>
                  <div className="paywall-option-desc">5 more listings</div>
                  <div className="paywall-option-price">$7.99 <span>one time</span></div>
                  <div className="paywall-ppu">$1.60 per listing</div>
                </div>
                <div className="paywall-option paywall-option-20pack" onClick={() => handleStripeCheckout("price_1TbKlDLr6wY7Jbr1x7AluGHw", "payment")}>
                  <div className="paywall-popular">BEST VALUE</div>
                  <div className="paywall-option-title">Clearing out a room or garage</div>
                  <div className="paywall-option-desc">20 more listings</div>
                  <div className="paywall-option-price">$19.99 <span>one time</span></div>
                  <div className="paywall-ppu">$1 per listing</div>
                </div>
                <div className="paywall-option paywall-option-monthly" onClick={() => handleStripeCheckout("price_1TbKlkLr6wY7Jbr1g8aJjfBW", "subscription")}>
                  <div className="paywall-option-title">Selling regularly</div>
                  <div className="paywall-option-desc">Unlimited listings</div>
                  <div className="paywall-option-price">$14.99 <span>/ month</span></div>
                </div>
              </div>
              {stripeLoading && <div className="paywall-loading">Loading payment...</div>}
              <div className="paywall-note">Cancel anytime · Secure payment via Stripe</div>
            </div>
          )}

          {phase === "analyzing" && (<div className="card"><div className="analyzing"><div className="spin" /><div className="analyzing-title">Analyzing your item...</div><div className="analyzing-sub">Checking value, finding the best platform, writing your listing</div></div></div>)}

          {phase === "chat" && (
            <div className="card">
              <div style={{ marginBottom: "1rem" }}><div className="card-title">One quick question</div><div className="card-sub">This helps me give you a better recommendation</div></div>
              {chatMessages.map((msg, i) => msg.role === "assistant" && msg.data?.type === "question" ? (<div key={i} className="bubble ai">{msg.data.seen && <div className="seen-label">I can see: {msg.data.seen}</div>}<div style={{ fontWeight: 500 }}>{msg.data.question}</div>{msg.data.why && <div className="why-note">{msg.data.why}</div>}</div>) : msg.role === "user" ? <div key={i} className="bubble me">{msg.text}</div> : null)}
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
              {result.bucket && bucketLabels[result.bucket] && (<div className="bucket-badge" style={{ background: bucketLabels[result.bucket].color }}>{bucketLabels[result.bucket].icon} {bucketLabels[result.bucket].label}</div>)}
              <div className="plat-badge" style={{ background: pColor }}>Best on: {result.platformName || result.platform}</div>
              <div className="item-name">{result.itemName}</div>
              {result.askingPrice > 0 && (<div className="val-row"><div className="val-big">${result.askingPrice}</div><div className="val-meta">asking · market ${result.estimatedValue?.low}–${result.estimatedValue?.high} · <span className={`conf-dot conf-${result.confidence}`} />{result.confidence} confidence</div></div>)}
              <div className="info-box"><strong>Our recommendation</strong>{result.platformReason}</div>
              {result.diamondAlert && (<div className="diamond-box"><span className="diamond-icon">💎</span><div className="diamond-body"><strong>Heads up — this might be worth more</strong>{result.diamondAlert}</div></div>)}
              {result.bucket !== "donate" && result.bucket !== "appraise" && (
                <>
                  <div className="sec-label">Your listing</div>
                  <div className="listing-box">
                    <div className="listing-title">{result.title}</div>
                    {user ? (
                      <div className="listing-desc">{result.description}</div>
                    ) : (
                      <>
                        <div className="listing-desc">{result.description.slice(0, 150)}...</div>
                        <div className="listing-blur-wrap">
                          <div className="listing-blur" />
                          <button className="listing-unlock-btn" onClick={() => setShowAuthModal(true)}>🔓 Sign in free to unlock full listing</button>
                        </div>
                      </>
                    )}
                  </div>
                  {result.tips?.length > 0 && (<><div className="sec-label">Selling tips</div><ul className="tips">{result.tips.map((t, i) => <li key={i}>{t}</li>)}</ul></>)}
                  <div className="post-section">
                    <div className="sec-label">Post your listing</div>
                    <button className="btn-post btn-post-fb" onClick={postTo("Facebook Marketplace", "https://www.facebook.com/marketplace/create/item")}><span>📘</span> Post on Facebook Marketplace</button>
                    <button className="btn-post btn-post-ebay" onClick={postTo("eBay", `https://www.ebay.com/sell/selectformat?title=${encodeURIComponent(result.title)}`)}><span>🛒</span> Post on eBay</button>
                    <button className="btn-post btn-post-offerup" onClick={postTo("OfferUp", "https://offerup.com/sell")}><span>🟢</span> Post on OfferUp</button>
                    <button className="btn-post btn-post-olx" onClick={postTo("OLX", "https://www.olx.com")}><span>🟣</span> Post on OLX</button>
                    {postInstructions && (<div className="instructions-box"><strong>Listing copied! Paste it into the description on {postInstructions}.</strong><ol className="instructions-steps"><li><span className="step-num">1</span>The site opened in a new tab</li><li><span className="step-num">2</span>Click in the description and press Ctrl+V to paste</li><li><span className="step-num">3</span>Set the price to ${result.askingPrice} and publish!</li></ol></div>)}
                  </div>
                </>
              )}
              <div className="actions-row">
                {result.bucket !== "donate" && result.bucket !== "appraise" && (<button className="btn-ghost" onClick={copyListing} style={copied ? { borderColor: "#2d7a4f", color: "#2d7a4f" } : {}}>{copied ? "✓ Copied!" : "Copy Listing"}</button>)}
                <button className="btn-ghost" onClick={saveAndAddAnother}>+ Add Another Item</button>
                {savedListings.length > 0 && <button className="btn-ghost btn-summary" onClick={saveAndShowSummary}>View My Plan</button>}
              </div>
            </div>
          )}
        </div>

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
                <div className="sample-listings-wrap">
                  <div className="sample-listings-label">
                    <span>✨ Here's what your inventory looks like</span>
                  </div>
                  <div className="sample-listings-overlay">
                    <div className="sample-total-bar">
                      <span>6 sample items</span>
                      <span className="sample-total">Est. $1,510 total</span>
                    </div>
                    {SAMPLE_LISTINGS.map((item, i) => {
                      const bucket = bucketLabels[item.result.bucket] || bucketLabels.local;
                      const pColor = platformColors[item.result.platform] || "#888";
                      return (
                        <div key={item.id} className="sample-card">
                          <div className="sample-thumb">{bucket.icon}</div>
                          <div className="saved-meta">
                            <div className="saved-name">
                              {item.result.itemName}
                              {item.result.diamondAlert && <span className="sample-diamond"> 💎</span>}
                            </div>
                            <div className="saved-sub">
                              {item.result.askingPrice > 0 && <span className="saved-price">${item.result.askingPrice}</span>}
                              <span className="saved-badge" style={{ background: bucket.color }}>{bucket.label}</span>
                              {item.result.askingPrice > 0 && <span className="saved-badge" style={{ background: pColor }}>{item.result.platformName}</span>}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="sample-cta">Upload your first item to build your real inventory →</div>
                </div>
              ) : (
                <>
                  {savedListings.map((item, i) => <SavedCard key={item.id} item={item} index={i} user={user} onLoginRequired={() => setShowAuthModal(true)} />)}
                  {user && savedListings.length >= 1 && (
                    <SellingCoach listings={savedListings} sellerContext={sellerContext} />
                  )}
                </>
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

// ── Selling Coach (inline panel) ──────────────────────────────────────────
function SellingCoach({ listings, sellerContext }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const messagesEndRef = useRef(null);

  const getCoachAdvice = async (userMessage) => {
    setLoading(true);
    const listingSummary = listings.map(l =>
      `${l.result.itemName}: $${l.result.askingPrice}, ${l.result.bucket}, ${l.result.platform}`
    ).join("\n");
    const systemPrompt = `You are a friendly selling coach. Seller: urgency=${sellerContext.urgency}, logistics=${sellerContext.logistics}, effort=${sellerContext.effort}. Listings:\n${listingSummary}\nBe concise, warm, practical. Under 120 words.`;
    try {
      const response = await fetch("/api/claude", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "claude-opus-4-5", max_tokens: 300, system: systemPrompt, messages: [...messages.map(m => ({ role: m.role, content: m.content })), { role: "user", content: userMessage }] }),
      });
      const data = await response.json();
      const text = data.content.filter(b => b.type === "text").map(b => b.text).join("");
      setMessages(prev => [...prev, { role: "assistant", content: text }]);
    } catch { setMessages(prev => [...prev, { role: "assistant", content: "Something went wrong. Try again!" }]); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (!initialized) { setInitialized(true); getCoachAdvice("Give me a quick tip on what to focus on first."); } }, []);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = () => {
    if (!input.trim() || loading) return;
    const msg = input.trim(); setInput("");
    setMessages(prev => [...prev, { role: "user", content: msg }]);
    getCoachAdvice(msg);
  };

  return (
    <div className="coach-inline">
      <div className="coach-inline-header">
        <span className="coach-inline-title">🎯 Selling Coach</span>
        <span className="coach-inline-sub">Ask anything about your listings</span>
      </div>
      <div className="coach-inline-messages">
        {messages.length === 0 && loading && (<div className="coach-bubble ai"><div className="spin" style={{ width: 18, height: 18, borderWidth: 2, margin: "0 auto" }} /></div>)}
        {messages.map((m, i) => (<div key={i} className={`coach-bubble ${m.role === "user" ? "me" : "ai"}`}>{m.content}</div>))}
        {loading && messages.length > 0 && (<div className="coach-bubble ai"><div className="spin" style={{ width: 18, height: 18, borderWidth: 2, margin: "0 auto" }} /></div>)}
        <div ref={messagesEndRef} />
      </div>
      <div className="coach-input-row">
        <input className="coach-input" value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && send()} placeholder="Ask your Selling Coach..." disabled={loading} />
        <button className="coach-send" onClick={send} disabled={!input.trim() || loading}>→</button>
      </div>
    </div>
  );
}

// ── Seller interview ───────────────────────────────────────────────────────
function SellerInterview({ onComplete, compact }) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({ urgency: null, logistics: null, effort: null });
  const questions = [
    { key: "urgency", question: "How fast do you want to sell this?", options: [{ value: "this_week", label: "This week", sub: "Price to move fast" }, { value: "within_a_month", label: "Within a month", sub: "Balanced approach" }, { value: "no_rush", label: "No rush", sub: "Maximize what I get" }] },
    { key: "logistics", question: "Local pickup or can you ship?", options: [{ value: "local_only", label: "Local only", sub: "No shipping" }, { value: "can_ship", label: "I can ship", sub: "Open to online buyers" }, { value: "both", label: "Either works", sub: "Most flexible" }] },
    { key: "effort", question: "How much effort can you put in?", options: [{ value: "minimal", label: "Minimal", sub: "Just get it sold" }, { value: "moderate", label: "Moderate", sub: "Happy to answer questions" }, { value: "happy_to_invest", label: "Invest time", sub: "I want the best price" }] },
  ];
  const current = questions[step];
  const pick = (value) => {
    const newAnswers = { ...answers, [current.key]: value };
    setAnswers(newAnswers);
    if (step < questions.length - 1) setStep(step + 1);
    else onComplete(newAnswers);
  };
  return (
    <div className={compact ? "interview-compact" : "card interview-card"}>
      <div className="interview-progress">{questions.map((_, i) => <div key={i} className={`interview-dot ${i <= step ? "active" : ""}`} />)}</div>
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
        <button className="interview-skip-btn" onClick={() => onComplete({ urgency: "within_a_month", logistics: "both", effort: "moderate" })}>Skip</button>
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
