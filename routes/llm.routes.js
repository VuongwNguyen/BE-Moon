// routes/llm.routes.js — proxy LLM cho PageAgent
// Frontend không giữ key Gemini; PageAgent gửi JWT của user làm apiKey,
// requireAuth xác thực rồi proxy forward sang Gemini với key trong .env.
const router = require("express").Router();
const axios = require("axios");
const { requireAuth } = require("../middlewares/auth");

const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/openai";

router.post("/v1/chat/completions", requireAuth, async (req, res, next) => {
  if (!process.env.GEMINI_API_KEY) {
    return res.status(503).json({ status: false, message: "GEMINI_API_KEY chưa được cấu hình", statusCode: 503 });
  }

  // Ép model phía server — client không tự chọn được model đắt tiền
  const body = { ...req.body, model: process.env.PAGE_AGENT_MODEL || "gemini-2.5-flash-lite" };

  try {
    // Free tier Gemini hay trả 429 (quá RPM) / 503 (quá tải) — retry với backoff
    let upstream;
    for (let attempt = 0; attempt < 4; attempt++) {
      if (attempt > 0) await new Promise(r => setTimeout(r, attempt * 5000));
      upstream = await axios.post(`${GEMINI_BASE_URL}/chat/completions`, body, {
        headers: {
          Authorization: `Bearer ${process.env.GEMINI_API_KEY}`,
          "Content-Type": "application/json",
        },
        responseType: "stream",
        timeout: 120000,
        validateStatus: () => true,
      });
      if ((upstream.status !== 429 && upstream.status !== 503) || attempt === 3) break;
      upstream.data.destroy();
      console.warn(`[llm-proxy] upstream ${upstream.status}, retry ${attempt + 1}/3`);
    }

    res.status(upstream.status);
    if (upstream.headers["content-type"]) res.setHeader("Content-Type", upstream.headers["content-type"]);
    upstream.data.pipe(res);
  } catch (err) {
    console.error("[llm-proxy] error:", err.message);
    res.status(502).json({ status: false, message: "Không kết nối được tới LLM", statusCode: 502 });
  }
});

module.exports = router;
