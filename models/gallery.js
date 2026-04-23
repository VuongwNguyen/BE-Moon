const { model, Schema } = require("mongoose");

const gallerySchema = new Schema({
  galaxyId: {
    type: Schema.Types.ObjectId,
    ref: "Galaxy",
    required: true,
    index: true,
  },
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
