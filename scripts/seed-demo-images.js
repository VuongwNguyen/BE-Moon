/**
 * Seed demo images into galaxy for landing page demo
 * Usage: node scripts/seed-demo-images.js
 */
const https = require("https");
const http = require("http");
const FormData = require("form-data");

const BASE = "http://localhost:3030";
const EMAIL = "nguye4567@gmail.com";
const PASS = "changeme123";

const GALAXY_IDS = [
  "69ebae5e63ef717f7b7e9dd0",
];

// Romantic/memory-themed images from picsum (stable, no auth needed)
const IMAGE_URLS = [
  "https://picsum.photos/seed/galaxy1/800/600",
  "https://picsum.photos/seed/galaxy2/800/600",
  "https://picsum.photos/seed/galaxy3/800/600",
  "https://picsum.photos/seed/galaxy4/800/600",
  "https://picsum.photos/seed/galaxy5/800/600",
  "https://picsum.photos/seed/galaxy6/800/600",
  "https://picsum.photos/seed/galaxy7/800/600",
  "https://picsum.photos/seed/galaxy8/800/600",
];

function fetchBuffer(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith("https") ? https : http;
    client.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchBuffer(res.headers.location).then(resolve).catch(reject);
      }
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => resolve({ buffer: Buffer.concat(chunks), contentType: res.headers["content-type"] || "image/jpeg" }));
      res.on("error", reject);
    }).on("error", reject);
  });
}

function post(path, body, token) {
  return new Promise((resolve, reject) => {
    const isForm = body instanceof FormData;
    const headers = isForm
      ? { ...body.getHeaders(), ...(token ? { Authorization: `Bearer ${token}` } : {}) }
      : { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };

    const options = {
      hostname: "localhost",
      port: 3030,
      path,
      method: "POST",
      headers,
    };

    const req = http.request(options, (res) => {
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(Buffer.concat(chunks).toString()) }); }
        catch { resolve({ status: res.statusCode, body: {} }); }
      });
    });
    req.on("error", reject);

    if (isForm) {
      body.pipe(req);
    } else {
      req.write(JSON.stringify(body));
      req.end();
    }
  });
}

async function main() {
  // 1. Login
  console.log("Logging in...");
  const loginRes = await post("/auth/login", { email: EMAIL, password: PASS });
  if (loginRes.status !== 200) {
    console.error("Login failed:", loginRes.body);
    process.exit(1);
  }
  const token = loginRes.body.meta?.token || loginRes.body.token;
  console.log("Logged in, token:", token?.slice(0, 20) + "...");

  // 2. Download images
  console.log("Downloading images...");
  const images = await Promise.all(
    IMAGE_URLS.map(async (url, i) => {
      const { buffer, contentType } = await fetchBuffer(url);
      console.log(`  Image ${i + 1}: ${buffer.length} bytes`);
      return { buffer, contentType, name: `demo-${i + 1}.jpg` };
    })
  );

  // 3. Upload to each galaxy
  for (const galaxyId of GALAXY_IDS) {
    console.log(`\nUploading to galaxy ${galaxyId}...`);
    const form = new FormData();
    form.append("galaxyId", galaxyId);
    form.append("title", "Demo");
    form.append("description", "Demo image");
    for (const img of images) {
      form.append("files", img.buffer, { filename: img.name, contentType: img.contentType });
    }

    const res = await post("/gallary/upload", form, token);
    if (res.status === 200 || res.status === 201) {
      console.log(`  ✓ Uploaded ${images.length} images to ${galaxyId}`);
    } else {
      console.error(`  ✗ Failed (${res.status}):`, res.body);
    }
  }

  console.log("\nDone!");
}

main().catch(console.error);
