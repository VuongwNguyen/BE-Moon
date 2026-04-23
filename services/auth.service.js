const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const UserModel = require("../models/user");
const EmailService = require("./email.service");
const { errorResponse } = require("../context/responseHandle");

const OTP_EXPIRES_MINUTES = 5;
const OTP_RESEND_SECONDS = 60;

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function signToken(user) {
  return jwt.sign(
    { _id: user._id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

class AuthService {
  async register({ email, password }) {
    const existing = await UserModel.findOne({ email });

    if (existing && existing.isVerified) {
      throw new errorResponse({ message: "Email already exists", statusCode: 409 });
    }

    const otp = generateOtp();
    const otpCode = await bcrypt.hash(otp, 10);
    const otpExpiresAt = new Date(Date.now() + OTP_EXPIRES_MINUTES * 60 * 1000);
    const otpSentAt = new Date();

    if (existing && !existing.isVerified) {
      existing.passwordHash = await bcrypt.hash(password, 10);
      existing.otpCode = otpCode;
      existing.otpExpiresAt = otpExpiresAt;
      existing.otpSentAt = otpSentAt;
      await existing.save();
    } else {
      const passwordHash = await bcrypt.hash(password, 10);
      await UserModel.create({ email, passwordHash, otpCode, otpExpiresAt, otpSentAt });
    }

    await EmailService.sendOtp(email, otp);
    return { email };
  }

  async verifyOtp({ email, otp }) {
    const user = await UserModel.findOne({ email });
    if (!user || user.isVerified) {
      throw new errorResponse({ message: "Invalid request", statusCode: 400 });
    }
    if (!user.otpCode || !user.otpExpiresAt) {
      throw new errorResponse({ message: "No OTP found, please register again", statusCode: 400 });
    }
    if (new Date() > user.otpExpiresAt) {
      throw new errorResponse({ message: "OTP expired, please request a new one", statusCode: 400 });
    }
    const valid = await bcrypt.compare(otp, user.otpCode);
    if (!valid) {
      throw new errorResponse({ message: "Invalid OTP", statusCode: 400 });
    }

    user.isVerified = true;
    user.otpCode = null;
    user.otpExpiresAt = null;
    user.otpSentAt = null;
    await user.save();

    const token = signToken(user);
    return { token, user: { _id: user._id, email: user.email, role: user.role } };
  }

  async resendOtp({ email }) {
    const user = await UserModel.findOne({ email });
    if (!user) {
      throw new errorResponse({ message: "Email not found", statusCode: 404 });
    }
    if (user.isVerified) {
      throw new errorResponse({ message: "Email already verified", statusCode: 400 });
    }
    if (user.otpSentAt) {
      const secondsSince = (Date.now() - new Date(user.otpSentAt).getTime()) / 1000;
      if (secondsSince < OTP_RESEND_SECONDS) {
        const wait = Math.ceil(OTP_RESEND_SECONDS - secondsSince);
        throw new errorResponse({ message: `Please wait ${wait} seconds before requesting a new OTP`, statusCode: 429 });
      }
    }

    const otp = generateOtp();
    user.otpCode = await bcrypt.hash(otp, 10);
    user.otpExpiresAt = new Date(Date.now() + OTP_EXPIRES_MINUTES * 60 * 1000);
    user.otpSentAt = new Date();
    await user.save();

    await EmailService.sendOtp(email, otp);
    return { email };
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
    if (!user.isVerified) {
      try { await this.resendOtp({ email }); } catch (_) {}
      throw new errorResponse({ message: "Email not verified. A new OTP has been sent.", statusCode: 403 });
    }
    const token = signToken(user);
    return { token, user: { _id: user._id, email: user.email, role: user.role } };
  }

  async me(userId) {
    const GalaxyModel = require("../models/galaxy");
    const user = await UserModel.findById(userId).select("-passwordHash -otpCode -otpExpiresAt -otpSentAt");
    if (!user) {
      throw new errorResponse({ message: "User not found", statusCode: 404 });
    }
    const galaxies = await GalaxyModel.find({ userId, status: "active" });
    return { user, galaxies };
  }
}

module.exports = new AuthService();
