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
}

module.exports = new SoundCloudService();
