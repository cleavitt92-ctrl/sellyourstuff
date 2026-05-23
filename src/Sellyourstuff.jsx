import { useState, useRef } from "react";

const SYSTEM_PROMPT = `You are Sellyourstuff, an expert resale AI that helps people photograph household items, antiques, collectibles, and furniture — then turns those photos into ready-to-post listings.

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
- Specialized: rare coins, stamps, vintage watches, sports cards, instruments (mention the specific site)

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

For diamondAlert: if this item might be significantly more valuable than it appears (rare variant, valuable collectible, undervalued antique), set this to a string explaining why. Otherwise null.

Be accurate and realistic with valuations based on current resale markets.`;

const platformColors = {
  eBay: "#e53238",
  "Facebook Marketplace": "#1877f2",
  Craigslist: "#7e0012",
  Etsy: "#f1641e",
  OfferUp: "#6bbd5b",
  Specialized: "#7c5cbf",
};

function SavedCard({ item, index }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [postInstructions, setPostInstructions] = useState(null);
  const pColor = platformColors[item.result.platform] || "#888";

  const getListingText = () =>
    `${item.result.title}\n\n${item.result.description}\n\nAsking price: $${item.result.askingPrice}`;

  const copyListing = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(getListingText()).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const postToFacebook = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(getListingText()).then(() => {
      setPostInstructions("facebook");
      window.open("https://www.facebook.com/marketplace/create/item", "_blank");
    });
  };

  const postToEbay = (e) => {
    e.stopPropagation();
    const titleEncoded = encodeURIComponent(item.result.title);
    navigator.clipboard.writeText(getListingText()).then(() => {
      setPostInstructions("ebay");
      window.open(`https://www.ebay.com/sell/selectformat?title=${titleEncoded}`, "_blank");
    });
  };

  return (
    <div className="saved-card" style={{ animationDelay: `${index * 0.05}s` }}>
      <div className="saved-header" onClick={() => setOpen((o) => !o)}>
        <div className="saved-thumb-wrap">
          {item.thumbUrl
            ? <img className="saved-thumb" src={item.thumbUrl} alt="" />
            : <div className="saved-thumb saved-thumb-empty">box</div>
          }
        </div>
        <div className="saved-meta">
          <div className="saved-name">{item.result.itemName}</div>
          <div className="saved-sub">
            <span className="saved-price">${item.result.askingPrice}</span>
            <span className="saved-badge" style={{ background: pColor }}>
              {item.result.platformName || item.result.platform}
            </span>
          </div>
        </div>
        <div className="saved-chevron">{open ? "▲" : "▼"}</div>
      </div>

      {open && (
        <div className="saved-body">
          <div className="val-row">
            <div className="val-big">${item.result.askingPrice}</div>
            <div className="val-meta">
              asking · market ${item.result.estimatedValue?.low}–${item.result.estimatedValue?.high}
              · <span className={`conf-dot conf-${item.result.confidence}`} />{item.result.confidence} confidence
            </div>
          </div>
          <div className="info-box">
            <strong>Why {item.result.platformName || item.result.platform}?</strong>
            {item.result.platformReason}
          </div>
          {item.result.diamondAlert && (
            <div className="diamond-box">
              <span className="diamond-icon">💎</span>
              <div className="diamond-body">
                <strong>Heads up — this might be worth more</strong>
                {item.result.diamondAlert}
              </div>
            </div>
          )}
          <div className="sec-label">Your ready-to-post listing</div>
          <div className="listing-box">
            <div className="listing-title">{item.result.title}</div>
            <div className="listing-desc">{item.result.description}</div>
          </div>
          {item.result.tips?.length > 0 && (
            <>
              <div className="sec-label">Selling tips</div>
              <ul className="tips">
                {item.result.tips.map((t, i) => <li key={i}>{t}</li>)}
              </ul>
            </>
          )}
          <div className="post-section">
            <div className="sec-label">Post your listing</div>
            <button className="btn-post btn-post-fb" onClick={postToFacebook}>
              <span className="btn-post-icon">📘</span>Post on Facebook Marketplace
            </button>
            <button className="btn-post btn-post-ebay" onClick={postToEbay}>
              <span className="btn-post-icon">🛒</span>Post on eBay
            </button>
            {postInstructions === "facebook" && (
              <div className="instructions-box">
                <strong>Your listing is copied! Here is what to do next:</strong>
                <ol className="instructions-steps">
                  <li><span className="step-num">1</span>Facebook Marketplace should be open in a new tab</li>
                  <li><span className="step-num">2</span>Click "Item for sale" and add your photos</li>
                  <li><span className="step-num">3</span>Type the title: {item.result.title}</li>
                  <li><span className="step-num">4</span>Click in the description box and press Ctrl+V to paste</li>
                  <li><span className="step-num">5</span>Set the price to ${item.result.askingPrice} and hit Publish!</li>
                </ol>
              </div>
            )}
            {postInstructions === "ebay" && (
              <div className="instructions-box ebay">
                <strong>Your listing is copied! Here is what to do next:</strong>
                <ol className="instructions-steps">
                  <li><span className="step-num ebay">1</span>eBay should be open in a new tab — sign in if needed</li>
                  <li><span className="step-num ebay">2</span>The title may already be filled in</li>
                  <li><span className="step-num ebay">3</span>Click in the description box and press Ctrl+V to paste</li>
                  <li><span className="step-num ebay">4</span>Add your photos and set the price to ${item.result.askingPrice}</li>
                  <li><span className="step-num ebay">5</span>Review and click List it!</li>
                </ol>
              </div>
            )}
          </div>
          <div className="actions-row">
            <button className="btn-ghost" onClick={copyListing}
              style={copied ? { borderColor: "#4caf50", color: "#4caf50" } : {}}>
              {copied ? "Copied!" : "Copy Listing Text"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SellYourStuff() {
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
  const fileInputRef = useRef(null);
  const historyRef = useRef([]);
  const dragRef = useRef(null);
  const currentThumbRef = useRef(null);

  const toBase64 = (file) =>
    new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(r.result.split(",")[1]);
      r.onerror = rej;
      r.readAsDataURL(file);
    });

  const addPhotos = (files) => {
    const valid = Array.from(files).filter((f) => f.type.startsWith("image/"));
    const newPhotos = valid.map((f) => ({
      file: f,
      url: URL.createObjectURL(f),
      id: Math.random(),
    }));
    setPhotos((prev) => [...prev, ...newPhotos].slice(0, 6));
  };

  const callClaude = async (messages) => {
    const API_KEY = "YOUR_API_KEY_HERE";
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": API_KEY,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model: "claude-opus-4-5",
        max_tokens: 1000,
        system: SYSTEM_PROMPT,
        messages,
      }),
    });
    if (!response.ok) throw new Error("API error");
    const data = await response.json();
    const text = data.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("");
    return JSON.parse(text.replace(/```json\n?|\n?```/g, "").trim());
  };

  const analyze = async () => {
    if (!photos.length) return;
    setLoading(true);
    setError(null);
    setPhase("analyzing");
    currentThumbRef.current = photos[0]?.url || null;

    try {
      const imageBlocks = await Promise.all(
        photos.map(async (p) => ({
          type: "image",
          source: {
            type: "base64",
            media_type: p.file.type || "image/jpeg",
            data: await toBase64(p.file),
          },
        }))
      );

      const firstMsg = {
        role: "user",
        content: [
          ...imageBlocks,
          { type: "text", text: "I want to sell this item. What is it worth and how should I list it?" },
        ],
      };

      historyRef.current = [firstMsg];
      const parsed = await callClaude(historyRef.current);
      historyRef.current.push({ role: "assistant", content: JSON.stringify(parsed) });

      if (parsed.type === "question") {
        setChatMessages([{ role: "assistant", data: parsed }]);
        setPhase("chat");
      } else {
        setResult(parsed);
        setPhase("result");
      }
    } catch (e) {
      setError("Couldn't analyze the photos. Please try again.");
      setPhase("upload");
    } finally {
      setLoading(false);
    }
  };

  const sendAnswer = async () => {
    const text = inputText.trim();
    if (!text || loading) return;
    setInputText("");
    setLoading(true);

    const userMsg = { role: "user", content: text };
    historyRef.current.push(userMsg);
    setChatMessages((prev) => [...prev, { role: "user", text }]);

    try {
      const parsed = await callClaude(historyRef.current);
      historyRef.current.push({ role: "assistant", content: JSON.stringify(parsed) });

      if (parsed.type === "listing") {
        setResult(parsed);
        setPhase("result");
      } else {
        setChatMessages((prev) => [...prev, { role: "assistant", data: parsed }]);
      }
    } catch (e) {
      setError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const saveAndAddAnother = () => {
    if (result) {
      setSavedListings((prev) => [
        { id: Math.random(), result, thumbUrl: currentThumbRef.current },
        ...prev,
      ]);
    }
    setPhase("upload");
    setPhotos([]);
    setChatMessages([]);
    setInputText("");
    setResult(null);
    setError(null);
    setPostInstructions(null);
    historyRef.current = [];
    currentThumbRef.current = null;
  };

  const getListingText = () =>
    result ? `${result.title}\n\n${result.description}\n\nAsking price: $${result.askingPrice}` : "";

  const copyListing = () => {
    navigator.clipboard.writeText(getListingText()).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const postToFacebook = () => {
    navigator.clipboard.writeText(getListingText()).then(() => {
      setPostInstructions("facebook");
      window.open("https://www.facebook.com/marketplace/create/item", "_blank");
    });
  };

  const postToEbay = () => {
    const titleEncoded = encodeURIComponent(result.title);
    navigator.clipboard.writeText(getListingText()).then(() => {
      setPostInstructions("ebay");
      window.open(`https://www.ebay.com/sell/selectformat?title=${titleEncoded}`, "_blank");
    });
  };

  const onDragOver = (e) => { e.preventDefault(); dragRef.current?.classList.add("dz-hover"); };
  const onDragLeave = () => dragRef.current?.classList.remove("dz-hover");
  const onDrop = (e) => { e.preventDefault(); dragRef.current?.classList.remove("dz-hover"); addPhotos(e.dataTransfer.files); };

  const pColor = result ? platformColors[result.platform] || "#888" : "#888";

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=DM+Sans:wght@300;400;500;600&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        body{background:#f7ede2}
        .app{min-height:100vh;background:#f7ede2;font-family:'DM Sans',sans-serif;color:#2c1810;background-image:radial-gradient(ellipse at 15% 40%,rgba(210,140,70,.09) 0%,transparent 55%),radial-gradient(ellipse at 85% 15%,rgba(180,100,50,.07) 0%,transparent 50%)}
        .container{max-width:660px;margin:0 auto;padding:0 1rem 3rem}
        .header{text-align:center;padding:2.5rem 1rem 1.25rem}
        .logo{font-family:'Playfair Display',serif;font-size:2.8rem;font-weight:900;color:#c4622d;letter-spacing:-1px;line-height:1}
        .logo span{color:#2c1810}
        .tagline{font-size:.9rem;color:#8b5a3c;margin-top:.35rem;letter-spacing:.02em}
        .card{background:#fffaf6;border-radius:22px;border:1.5px solid #e8d5c4;box-shadow:0 4px 28px rgba(140,70,30,.09);max-width:640px;margin:0 auto 2rem;padding:1.75rem;animation:fadeUp .35s ease both}
        @keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
        .drop-zone{border:2.5px dashed #d4a574;border-radius:16px;padding:2.75rem 2rem;text-align:center;cursor:pointer;transition:all .2s;background:rgba(255,255,255,.45)}
        .drop-zone:hover,.drop-zone.dz-hover{border-color:#c4622d;background:rgba(196,98,45,.05)}
        .drop-icon{font-size:2.8rem;margin-bottom:.65rem;display:block}
        .drop-text{font-size:1rem;font-weight:500;color:#6b3c24}
        .drop-sub{font-size:.83rem;color:#a07050;margin-top:.25rem}
        .photo-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:.7rem;margin-top:1.1rem}
        .thumb{position:relative;aspect-ratio:1;border-radius:11px;overflow:hidden}
        .thumb img{width:100%;height:100%;object-fit:cover}
        .thumb-x{position:absolute;top:4px;right:4px;background:rgba(0,0,0,.55);color:#fff;border:none;border-radius:50%;width:22px;height:22px;font-size:12px;cursor:pointer;display:flex;align-items:center;justify-content:center}
        .photo-count{font-size:.83rem;color:#a07050;margin-top:.7rem;text-align:center}
        .btn-primary{display:block;width:100%;padding:1rem;background:#c4622d;color:#fff;border:none;border-radius:14px;font-family:'DM Sans',sans-serif;font-size:1rem;font-weight:600;cursor:pointer;margin-top:1.4rem;transition:all .2s;letter-spacing:.01em}
        .btn-primary:hover:not(:disabled){background:#a84f24;transform:translateY(-1px)}
        .btn-primary:disabled{opacity:.4;cursor:not-allowed}
        .btn-ghost{flex:1;padding:.85rem 1rem;background:transparent;border:1.5px solid #d4a574;border-radius:12px;color:#8b5a3c;font-family:'DM Sans',sans-serif;font-size:.95rem;font-weight:500;cursor:pointer;transition:all .2s;text-align:center}
        .btn-ghost:hover{border-color:#c4622d;color:#c4622d}
        .analyzing{text-align:center;padding:3rem 1rem}
        .spin{width:50px;height:50px;border:3px solid #e8d5c4;border-top-color:#c4622d;border-radius:50%;animation:spin .85s linear infinite;margin:0 auto 1.4rem}
        @keyframes spin{to{transform:rotate(360deg)}}
        .bubble{padding:.9rem 1.15rem;border-radius:16px;margin-bottom:.85rem;font-size:.93rem;line-height:1.6}
        .bubble.ai{background:#fdf0e5;border:1.5px solid #e8d5c4;max-width:88%}
        .bubble.me{background:#c4622d;color:#fff;margin-left:auto;max-width:88%;text-align:right}
        .seen-label{font-size:.82rem;color:#a07050;margin-bottom:.4rem}
        .why-note{font-size:.8rem;color:#a07050;font-style:italic;margin-top:.35rem}
        .chat-row{display:flex;gap:.65rem;margin-top:.85rem}
        .chat-input{flex:1;padding:.85rem 1rem;border:1.5px solid #d4a574;border-radius:12px;font-family:'DM Sans',sans-serif;font-size:.93rem;background:#fff;color:#2c1810;outline:none;transition:border .2s}
        .chat-input:focus{border-color:#c4622d}
        .chat-send{padding:.85rem 1.15rem;background:#c4622d;color:#fff;border:none;border-radius:12px;font-family:'DM Sans',sans-serif;font-weight:600;cursor:pointer;transition:background .2s;white-space:nowrap}
        .chat-send:hover:not(:disabled){background:#a84f24}
        .chat-send:disabled{opacity:.38;cursor:not-allowed}
        .plat-badge{display:inline-flex;align-items:center;gap:.35rem;padding:.35rem .85rem;border-radius:20px;font-size:.82rem;font-weight:600;color:#fff;margin-bottom:.9rem}
        .item-name{font-family:'Playfair Display',serif;font-size:1.3rem;font-weight:700;margin-bottom:.2rem}
        .val-row{display:flex;align-items:baseline;gap:.45rem;margin:.4rem 0 1.1rem;flex-wrap:wrap}
        .val-big{font-family:'Playfair Display',serif;font-size:2.4rem;font-weight:700;color:#c4622d}
        .val-meta{font-size:.83rem;color:#a07050}
        .info-box{font-size:.88rem;color:#5c3c28;line-height:1.65;padding:.7rem .95rem;background:#fdf0e5;border-radius:10px;margin-bottom:1.1rem}
        .info-box strong{display:block;font-size:.75rem;text-transform:uppercase;letter-spacing:.07em;color:#8b5a3c;margin-bottom:.2rem}
        .diamond-box{background:linear-gradient(135deg,#fff8e1,#fff3cd);border:1.5px solid #ffc107;border-radius:12px;padding:.95rem 1.15rem;margin-bottom:1.1rem;display:flex;gap:.7rem;align-items:flex-start}
        .diamond-icon{font-size:1.4rem;flex-shrink:0}
        .diamond-body{font-size:.88rem;color:#5a4000;line-height:1.55}
        .diamond-body strong{display:block;margin-bottom:.15rem}
        .sec-label{font-size:.72rem;font-weight:600;text-transform:uppercase;letter-spacing:.1em;color:#a07050;margin-bottom:.45rem}
        .listing-box{background:#fff;border:1.5px solid #e8d5c4;border-radius:14px;padding:1.15rem;margin-bottom:1.1rem}
        .listing-title{font-size:1rem;font-weight:600;margin-bottom:.65rem;line-height:1.45}
        .listing-desc{font-size:.88rem;color:#5c3c28;line-height:1.75;white-space:pre-wrap}
        .tips{list-style:none;display:flex;flex-direction:column;gap:.45rem;margin-bottom:1.1rem}
        .tips li{display:flex;gap:.45rem;font-size:.88rem;color:#5c3c28;align-items:flex-start}
        .tips li::before{content:"→";color:#c4622d;font-weight:700;flex-shrink:0}
        .post-section{margin-bottom:1.1rem}
        .post-section .sec-label{margin-bottom:.7rem}
        .btn-post{display:flex;align-items:center;justify-content:center;gap:.6rem;width:100%;padding:1.1rem;border:none;border-radius:14px;font-family:'DM Sans',sans-serif;font-size:1rem;font-weight:600;cursor:pointer;transition:all .2s;margin-bottom:.65rem;letter-spacing:.01em}
        .btn-post-fb{background:#1877f2;color:#fff}
        .btn-post-fb:hover{background:#1558b0;transform:translateY(-1px)}
        .btn-post-ebay{background:#e53238;color:#fff}
        .btn-post-ebay:hover{background:#c0272c;transform:translateY(-1px)}
        .btn-post-icon{font-size:1.2rem}
        .instructions-box{background:#f0f7ff;border:1.5px solid #b3d4f5;border-radius:14px;padding:1.1rem 1.25rem;margin-bottom:1rem;animation:fadeUp .25s ease both}
        .instructions-box.ebay{background:#fff0f0;border-color:#f5b3b3}
        .instructions-steps{list-style:none;display:flex;flex-direction:column;gap:.55rem;margin-top:.5rem}
        .instructions-steps li{display:flex;gap:.6rem;font-size:.92rem;color:#1a3a5c;align-items:flex-start;line-height:1.5}
        .step-num{background:#1877f2;color:#fff;border-radius:50%;width:22px;height:22px;font-size:.75rem;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:1px}
        .step-num.ebay{background:#e53238}
        .instructions-box strong{font-size:.9rem;color:#1a3a5c;display:block}
        .instructions-box.ebay strong{color:#5c1a1a}
        .actions-row{display:flex;gap:.7rem;flex-wrap:wrap;margin-top:.3rem}
        .conf-dot{display:inline-block;width:7px;height:7px;border-radius:50%;margin-right:4px;vertical-align:middle}
        .conf-high{background:#4caf50}.conf-medium{background:#ff9800}.conf-low{background:#f44336}
        .err{background:#fdecea;border:1.5px solid #f5c6cb;color:#721c24;border-radius:10px;padding:.7rem .95rem;font-size:.88rem;margin-top:.85rem}
        .my-listings-header{display:flex;align-items:center;justify-content:space-between;max-width:640px;margin:0 auto 1rem;padding:0 .25rem}
        .my-listings-title{font-family:'Playfair Display',serif;font-size:1.25rem;font-weight:700;color:#2c1810}
        .my-listings-count{background:#c4622d;color:#fff;border-radius:20px;padding:.2rem .65rem;font-size:.8rem;font-weight:600}
        .saved-card{background:#fffaf6;border-radius:18px;border:1.5px solid #e8d5c4;box-shadow:0 2px 16px rgba(140,70,30,.07);max-width:640px;margin:0 auto .85rem;overflow:hidden;animation:fadeUp .3s ease both}
        .saved-header{display:flex;align-items:center;gap:.85rem;padding:1rem 1.25rem;cursor:pointer;transition:background .15s;user-select:none}
        .saved-header:hover{background:rgba(196,98,45,.04)}
        .saved-thumb-wrap{flex-shrink:0}
        .saved-thumb{width:52px;height:52px;border-radius:10px;object-fit:cover}
        .saved-thumb-empty{width:52px;height:52px;border-radius:10px;background:#f0e0d0;display:flex;align-items:center;justify-content:center;font-size:.75rem;color:#a07050;font-weight:600}
        .saved-meta{flex:1;min-width:0}
        .saved-name{font-weight:600;font-size:.97rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-bottom:.25rem}
        .saved-sub{display:flex;align-items:center;gap:.5rem;flex-wrap:wrap}
        .saved-price{font-family:'Playfair Display',serif;font-size:1.1rem;font-weight:700;color:#c4622d}
        .saved-badge{padding:.2rem .6rem;border-radius:20px;font-size:.75rem;font-weight:600;color:#fff}
        .saved-chevron{color:#a07050;font-size:.75rem;flex-shrink:0}
        .saved-body{padding:0 1.25rem 1.25rem;border-top:1px solid #f0e0d0}
      `}</style>

      <div className="app">
        <div className="container">
          <div className="header">
            <div className="logo">Sell Your<span>Stuff</span></div>
            <div className="tagline">Snap a photo. Get a price. Post it in minutes.</div>
          </div>

          {phase === "upload" && (
            <div className="card">
              <div className="drop-zone" ref={dragRef} onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop} onClick={() => fileInputRef.current?.click()}>
                <span className="drop-icon">📷</span>
                <div className="drop-text">Tap or drag to add photos</div>
                <div className="drop-sub">Up to 6 photos · furniture, antiques, electronics, anything</div>
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" multiple style={{ display: "none" }} onChange={(e) => addPhotos(e.target.files)} />
              {photos.length > 0 && (
                <>
                  <div className="photo-grid">
                    {photos.map((p, i) => (
                      <div key={p.id} className="thumb">
                        <img src={p.url} alt="" />
                        <button className="thumb-x" onClick={(e) => { e.stopPropagation(); setPhotos((prev) => prev.filter((_, j) => j !== i)); }}>x</button>
                      </div>
                    ))}
                  </div>
                  <div className="photo-count">{photos.length} photo{photos.length !== 1 ? "s" : ""} ready</div>
                </>
              )}
              {error && <div className="err">{error}</div>}
              <button className="btn-primary" disabled={!photos.length || loading} onClick={analyze}>Analyze and Price It</button>
            </div>
          )}

          {phase === "analyzing" && (
            <div className="card">
              <div className="analyzing">
                <div className="spin" />
                <div style={{ fontFamily: "'Playfair Display',serif", fontSize: "1.35rem", fontWeight: 700, marginBottom: ".4rem" }}>Analyzing your item...</div>
                <div style={{ color: "#a07050", fontSize: ".88rem" }}>Checking resale value, best platform, and drafting your listing</div>
              </div>
            </div>
          )}

          {phase === "chat" && (
            <div className="card">
              <div style={{ marginBottom: "1rem" }}>
                <div style={{ fontFamily: "'Playfair Display',serif", fontSize: "1.15rem", fontWeight: 700, marginBottom: ".2rem" }}>One quick question</div>
                <div style={{ fontSize: ".83rem", color: "#a07050" }}>This helps me give you a more accurate valuation</div>
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
              {loading && (
                <div className="bubble ai">
                  <div className="spin" style={{ width: 22, height: 22, borderWidth: 2, margin: "0 auto" }} />
                </div>
              )}
              <div className="chat-row">
                <input className="chat-input" value={inputText} onChange={(e) => setInputText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendAnswer()} placeholder="Type your answer..." disabled={loading} />
                <button className="chat-send" onClick={sendAnswer} disabled={!inputText.trim() || loading}>Send</button>
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
              <div className="info-box">
                <strong>Why {result.platformName || result.platform}?</strong>
                {result.platformReason}
              </div>
              {result.diamondAlert && (
                <div className="diamond-box">
                  <span className="diamond-icon">💎</span>
                  <div className="diamond-body"><strong>Heads up — this might be worth more</strong>{result.diamondAlert}</div>
                </div>
              )}
              <div className="sec-label">Your ready-to-post listing</div>
              <div className="listing-box">
                <div className="listing-title">{result.title}</div>
                <div className="listing-desc">{result.description}</div>
              </div>
              {result.tips?.length > 0 && (
                <>
                  <div className="sec-label">Selling tips</div>
                  <ul className="tips">{result.tips.map((t, i) => <li key={i}>{t}</li>)}</ul>
                </>
              )}
              <div className="post-section">
                <div className="sec-label">Post your listing</div>
                <button className="btn-post btn-post-fb" onClick={postToFacebook}><span className="btn-post-icon">📘</span>Post on Facebook Marketplace</button>
                <button className="btn-post btn-post-ebay" onClick={postToEbay}><span className="btn-post-icon">🛒</span>Post on eBay</button>
                {postInstructions === "facebook" && (
                  <div className="instructions-box">
                    <strong>Your listing is copied! Here is what to do next:</strong>
                    <ol className="instructions-steps">
                      <li><span className="step-num">1</span>Facebook Marketplace should be open in a new tab</li>
                      <li><span className="step-num">2</span>Click Item for sale and add your photos</li>
                      <li><span className="step-num">3</span>Type the title: {result.title}</li>
                      <li><span className="step-num">4</span>Click in the description box and press Ctrl+V to paste</li>
                      <li><span className="step-num">5</span>Set the price to ${result.askingPrice} and hit Publish!</li>
                    </ol>
                  </div>
                )}
                {postInstructions === "ebay" && (
                  <div className="instructions-box ebay">
                    <strong>Your listing is copied! Here is what to do next:</strong>
                    <ol className="instructions-steps">
                      <li><span className="step-num ebay">1</span>eBay should be open in a new tab — sign in if needed</li>
                      <li><span className="step-num ebay">2</span>The title may already be filled in</li>
                      <li><span className="step-num ebay">3</span>Click in the description box and press Ctrl+V to paste</li>
                      <li><span className="step-num ebay">4</span>Add your photos and set the price to ${result.askingPrice}</li>
                      <li><span className="step-num ebay">5</span>Review and click List it!</li>
                    </ol>
                  </div>
                )}
              </div>
              <div className="actions-row">
                <button className="btn-ghost" onClick={copyListing} style={copied ? { borderColor: "#4caf50", color: "#4caf50" } : {}}>
                  {copied ? "Copied!" : "Copy Listing Text"}
                </button>
                <button className="btn-ghost" onClick={saveAndAddAnother}>+ Add Another Item</button>
              </div>
            </div>
          )}

          {savedListings.length > 0 && (
            <>
              <div className="my-listings-header">
                <div className="my-listings-title">My Listings</div>
                <div className="my-listings-count">{savedListings.length} item{savedListings.length !== 1 ? "s" : ""}</div>
              </div>
              {savedListings.map((item, i) => (
                <SavedCard key={item.id} item={item} index={i} />
              ))}
            </>
          )}

        </div>
      </div>
    </>
  );
}