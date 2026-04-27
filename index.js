const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const logger = require("morgan");
const createError = require("http-errors");
const cookieParser = require("cookie-parser");
const path = require("path");
const { rateLimit } = require("express-rate-limit");
const connectToDatabase = require("./connection");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 3030;
const isDev = process.env.NODE_ENV !== "production";

if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET is not set");

// ── Database ──────────────────────────────────────
connectToDatabase.connect();

// ── CORS ──────────────────────────────────────────
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map(o => o.trim())
  : null;

app.use(cors({
  origin: allowedOrigins
    ? (origin, cb) => {
        if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
        cb(new Error("CORS: origin not allowed"));
      }
    : true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
}));

// ── Security headers ──────────────────────────────
const hasSSL = process.env.HTTPS === "true";
app.use(helmet({
  hsts: hasSSL ? { maxAge: 31536000, includeSubDomains: true } : false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://unpkg.com", "https://cdnjs.cloudflare.com"],
      scriptSrcAttr: ["'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://cdnjs.cloudflare.com", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      mediaSrc: ["'self'", "https://ik.imagekit.io"],
      connectSrc: ["'self'"],
      // null = tắt directive này; khi có SSL thì set HTTPS=true trong .env để bật lại
      upgradeInsecureRequests: hasSSL ? [] : null,
    },
  },
}));

// ── Rate limiters ─────────────────────────────────
// Auth: chặt để phòng brute force và spam OTP
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 phút
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: false, message: "Too many requests, please try again later.", statusCode: 429 },
  skip: () => isDev,
});

// Payment: vừa phải
const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: false, message: "Too many requests, please try again later.", statusCode: 429 },
  skip: () => isDev,
});

// API chung: thoải mái hơn
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: false, message: "Too many requests, please try again later.", statusCode: 429 },
  skip: () => isDev,
});

// ── Body parsing ──────────────────────────────────
app.use(logger(isDev ? "dev" : "combined"));
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

// ── Routes với rate limiting ───────────────────────
app.use("/auth", authLimiter);
app.use("/payment", paymentLimiter);
app.use("/", apiLimiter);
app.use("/", require("./routes"));

app.get("/ping", (req, res) => {
  res.status(200).json({ status: true, message: "pong", statusCode: 200 });
});

// ── 404 ───────────────────────────────────────────
app.use(function (req, res, next) {
  next(createError(404));
});

// ── Error handler ─────────────────────────────────
app.use((err, req, res, next) => {
  if (err.status === 404)
    return res.status(404).json({ status: false, message: "Not found", statusCode: 404 });

  if (err.code === "LIMIT_FILE_SIZE")
    return res.status(413).json({ status: false, message: "File quá lớn, tối đa 20MB", statusCode: 413 });

  if (!isDev) {
    // Không leak stack trace lên production
    console.error("[ERROR]", err.message);
  } else {
    console.error("lỗi", err.stack);
  }

  res.status(err.statusCode || 500).json({
    statusResponse: err.statusResponse || false,
    message: isDev ? err.message : "Internal server error",
    statusCode: err.statusCode || 500,
  });
});

app.listen(port, '0.0.0.0', () => {
  const { networkInterfaces } = require('os');
  const ip = Object.values(networkInterfaces()).flat().find(i => i.family === 'IPv4' && !i.internal)?.address;
  console.log(`Server is running on http://localhost:${port}`);
  if (ip) console.log(`Local network:     http://${ip}:${port}`);
});
