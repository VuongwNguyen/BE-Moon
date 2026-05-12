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
    enum: ["galaxy", "fall"],
    default: "galaxy",
  },
  seEffect: {
    type: String,
    enum: ['none', 'stardust', 'firefly', 'aurora'],
    default: 'none',
  },
  storyType: {
    type: String,
    enum: ['couple', 'birthday', 'friendship', 'school', 'family', 'self', 'travel', 'special'],
    default: null,
  },
  occasion: {
    type: String,
    default: null,
  },
  chapters: {
    type: [
      {
        id:       { type: String },
        hookText: { type: String, default: null },
      }
    ],
    default: [],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// name unique per user (2 users can have galaxy "moon" but not same user)
galaxySchema.index({ userId: 1, name: 1 }, { unique: true });

module.exports = model("Galaxy", galaxySchema, "galaxies");
