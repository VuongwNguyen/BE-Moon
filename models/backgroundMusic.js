const { model, Schema } = require("mongoose");

const backgroundMusicSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  url: {
    type: String,
    // Chỉ bắt buộc với nhạc upload; nhạc SoundCloud resolve stream URL lúc phát
    required: function () { return this.source !== "soundcloud"; },
  },
  source: {
    type: String,
    enum: ["upload", "soundcloud"],
    default: "upload",
  },
  trackId: {
    type: String,
  },
  permalink: {
    type: String,
    required: function () { return this.source === "soundcloud"; },
  },
  artist: { type: String, trim: true },
  artworkUrl: { type: String },
  status: {
    type: String,
    enum: ["active", "inactive"],
    default: "active",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = model("BackgroundMusic", backgroundMusicSchema, "backgroundmusics");
