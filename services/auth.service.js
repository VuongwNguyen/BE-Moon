const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const UserModel = require("../models/user");
const { errorResponse } = require("../context/responseHandle");

class AuthService {
  async register({ email, password }) {
    const existing = await UserModel.findOne({ email });
    if (existing) {
      throw new errorResponse({ message: "Email already exists", statusCode: 409 });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await UserModel.create({ email, passwordHash });
    const token = jwt.sign(
      { _id: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );
    return { token, user: { _id: user._id, email: user.email, role: user.role } };
  }

  async login({ email, password }) {
    const user = await UserModel.findOne({ email });
    if (!user) {
      throw new errorResponse({ message: "Invalid credentials", statusCode: 401 });
    }
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw new errorResponse({ message: "Invalid credentials", statusCode: 401 });
    }
    const token = jwt.sign(
      { _id: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );
    return { token, user: { _id: user._id, email: user.email, role: user.role } };
  }

  async me(userId) {
    const GalaxyModel = require("../models/galaxy");
    const user = await UserModel.findById(userId).select("-passwordHash");
    if (!user) {
      throw new errorResponse({ message: "User not found", statusCode: 404 });
    }
    const galaxies = await GalaxyModel.find({ userId, status: "active" });
    return { user, galaxies };
  }
}

module.exports = new AuthService();
