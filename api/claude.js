import { createClient } from "@supabase/supabase-js";

// Simple in-memory rate limiter — 20 requests per 10 minutes per IP
const rateLimitMap = new Map();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_REQUESTS = 20;

function isRateLimited(ip) {
  const now = Date.now();
  const record = rateLimitMap.get(ip) || { count: 0, start: now };
  if (now - record.start > WINDOW_MS) {
    rateLimitMap.set(ip, { count: 1, start: now });
    return false;
  }
  if (record.count >= MAX_REQUESTS) return true;
  record.count++;
  rateLimitMap.set(ip, record);
  return false;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  // Rate limit by IP
  const ip = req.headers["x-forwarded-for"]?.split(",")[0] || "unknown";
  if (isRateLimited(ip)) {
    return res.status(429).json({ error: "Too many requests. Please wait a few minutes and try again." });
  }

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return res.status(500).json({ error: "Configuration error" });

  // Server-side credit check for authenticated users
  // Only check for full listing requests (not text appraisals which are cheaper)
  const authHeader = req.headers.authorization;
  if (authHeader && req.body?.system?.includes("bucket")) {
    try {
      const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_KEY
      );
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabase.auth.getUser(token);
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("credits, plan")
          .eq("id", user.id)
          .single();
        // Block if out of credits (9999 = unlimited/admin)
        if (profile && profile.credits !== 9999 && profile.credits <= 0) {
          return res.status(402).json({ error: "No credits remaining. Please upgrade to continue." });
        }
      }
    } catch (err) {
      console.error("Credit check error:", err.message);
      // Don't block on credit check errors — fail open for now
    }
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(req.body),
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    console.error("Claude API error:", err.message);
    res.status(500).json({ error: "Something went wrong. Please try again." });
  }
}

export const config = {
  api: {
    bodyParser: { sizeLimit: "20mb" },
  },
  maxDuration: 30,
};
