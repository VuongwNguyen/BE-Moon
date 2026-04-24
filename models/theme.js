const { model, Schema } = require("mongoose");

const themeSchema = new Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  colors: {
    primary: String,
    secondary: String,
    background: String,
  },
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

module.exports = model("Theme", themeSchema, "themes");
