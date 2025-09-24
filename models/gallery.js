const { model, Schema } = require("mongoose");

const gallerySchema = new Schema({
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  imageUrl: {
    type: String,
    required: true,
  },
  status: {
    enum: ["active", "inactive"],
    default: "active",
    type: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = model("Gallery", gallerySchema, "gallery");
