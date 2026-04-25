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
  fileId: {
    type: String,
    default: null,
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

gallerySchema.index({ galaxyId: 1, status: 1 });

module.exports = model("Gallery", gallerySchema, "gallery");
