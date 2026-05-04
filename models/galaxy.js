const { model, Schema } = require("mongoose");

const galaxySchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  themeId: {
    type: Schema.Types.ObjectId,
    ref: "Theme",
  },
  backgroundMusicId: {
    type: Schema.Types.ObjectId,
    ref: "BackgroundMusic",
  },
  caption: {
    type: [String],
    default: [],
  },
  status: {
    type: String,
    enum: ["active", "inactive"],
    default: "active",
  },
  template: {
    type: String,
    enum: ["galaxy", "fall", "aurora"],
    default: "galaxy",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// name unique per user (2 users can have galaxy "moon" but not same user)
galaxySchema.index({ userId: 1, name: 1 }, { unique: true });

module.exports = model("Galaxy", galaxySchema, "galaxies");
