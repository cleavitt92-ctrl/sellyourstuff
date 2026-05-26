export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return res.status(500).json({ error: "API key not found" });

  try {
    const bodyStr = JSON.stringify(req.body);
    const bodySizeKB = Math.round(Buffer.byteLength(bodyStr, 'utf8') / 1024);
    console.log(`Request body size: ${bodySizeKB}KB`);

    if (!req.body || !req.body.messages) {
      return res.status(400).json({ error: "Invalid request body", received: Object.keys(req.body || {}) });
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: bodyStr,
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    console.error("Handler error:", err.message);
    res.status(500).json({ error: err.message, stack: err.stack?.split('\n')[0] });
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "20mb",
    },
  },
  maxDuration: 30,
};
