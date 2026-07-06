// services/soundcloud.service.js — gọi SoundCloud API (OAuth client_credentials)
// Docs: https://developers.soundcloud.com/docs/api/guide
const axios = require("axios");
const { errorResponse } = require("../context/responseHandle");

const API_BASE = "https://api.soundcloud.com";
const TOKEN_URL = "https://secure.soundcloud.com/oauth/token";

class SoundCloudService {
  constructor() {
    this.token = null;
    this.tokenExpiresAt = 0;
    this._tokenPromise = null;
  }

  isConfigured() {
    return !!(process.env.SOUNDCLOUD_CLIENT_ID && process.env.SOUNDCLOUD_CLIENT_SECRET);
  }

  assertConfigured() {
    if (!this.isConfigured()) {
      throw new errorResponse({ message: "Chưa cấu hình SoundCloud API (SOUNDCLOUD_CLIENT_ID/SECRET)", statusCode: 503 });
    }
  }

  async getToken() {
    this.assertConfigured();
    if (this.token && Date.now() < this.tokenExpiresAt - 60000) return this.token;
    if (!this._tokenPromise) {
      this._tokenPromise = this._fetchToken().finally(() => { this._tokenPromise = null; });
    }
    return this._tokenPromise;
  }

  async _fetchToken() {
    const body = new URLSearchParams({ grant_type: "client_credentials" });
    const res = await axios.post(TOKEN_URL, body.toString(), {
      auth: { username: process.env.SOUNDCLOUD_CLIENT_ID, password: process.env.SOUNDCLOUD_CLIENT_SECRET },
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      timeout: 15000,
    });
    this.token = res.data.access_token;
    this.tokenExpiresAt = Date.now() + (res.data.expires_in || 3600) * 1000;
    return this.token;
  }

  async request(pathname, params = {}) {
    const token = await this.getToken();
    try {
      const res = await axios.get(`${API_BASE}${pathname}`, {
        params,
        headers: { Authorization: `OAuth ${token}` },
        timeout: 15000,
      });
      return res.data;
    } catch (err) {
      // Token hết hạn giữa chừng → refresh một lần rồi thử lại
      if (err.response?.status === 401) {
        this.token = null;
        const fresh = await this.getToken();
        const res = await axios.get(`${API_BASE}${pathname}`, {
          params,
          headers: { Authorization: `OAuth ${fresh}` },
          timeout: 15000,
        });
        return res.data;
      }
      throw err;
    }
  }

  async searchTracks(q, limit = 20) {
    const data = await this.request("/tracks", { q, limit, access: "playable" });
    const tracks = Array.isArray(data) ? data : data.collection || [];
    return tracks
      .filter((t) => t.streamable !== false)
      .map((t) => ({
        trackId: String(t.id),
        title: t.title,
        artist: t.user?.username || "",
        duration: t.duration, // ms
        artworkUrl: t.artwork_url || t.user?.avatar_url || "",
        permalink: t.permalink_url,
      }));
  }

  async getStreamUrl(trackId) {
    const data = await this.request(`/tracks/${encodeURIComponent(trackId)}/streams`);
    const url = data.http_mp3_128_url || data.hls_mp3_128_url || data.preview_mp3_128_url;
    if (!url) throw new errorResponse({ message: "Track không cho phép stream", statusCode: 404 });
    return url;
  }

  // oEmbed công khai — không cần API key
  async resolveByUrl(trackUrl) {
    let parsed;
    try {
      parsed = new URL(trackUrl);
    } catch {
      throw new errorResponse({ message: "Link không hợp lệ", statusCode: 400 });
    }
    const host = parsed.hostname.replace(/^www\./, "");
    // Chống SSRF: chỉ chấp nhận link soundcloud
    if (host !== "soundcloud.com" && host !== "on.soundcloud.com") {
      throw new errorResponse({ message: "Chỉ chấp nhận link soundcloud.com", statusCode: 400 });
    }
    let res;
    try {
      res = await axios.get("https://soundcloud.com/oembed", {
        params: { format: "json", url: trackUrl },
        timeout: 15000,
      });
    } catch (err) {
      if (err.response?.status === 404 || err.response?.status === 403) {
        throw new errorResponse({ message: "Không tìm thấy track (link sai hoặc track private)", statusCode: 404 });
      }
      throw err;
    }
    const d = res.data || {};
    // trackId nằm trong query string của iframe src: ...url=https%3A%2F%2Fapi.soundcloud.com%2Ftracks%2F123456...
    // Chỉ decode giá trị src (không decode nguyên html vì các thuộc tính khác như width="100%" chứa "%" đứng riêng, làm decodeURIComponent throw)
    let trackId = "";
    const srcMatch = (d.html || "").match(/src="([^"]+)"/);
    if (srcMatch) {
      try {
        const decodedSrc = decodeURIComponent(srcMatch[1]);
        const m = decodedSrc.match(/api\.soundcloud\.com\/tracks\/(\d+)/);
        if (m) trackId = m[1];
      } catch {
        // ignore malformed src, trackId sẽ để rỗng
      }
    }
    return {
      permalink: trackUrl,
      trackId,
      title: (d.title || "").replace(/ by .*$/, ""),
      artist: d.author_name || "",
      artworkUrl: d.thumbnail_url || "",
      embedHtml: d.html || "",
    };
  }
}

module.exports = new SoundCloudService();
