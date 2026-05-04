const AuthService = require("../services/auth.service");
const { successfullyResponse, errorResponse } = require("../context/responseHandle");

class AuthController {
  async register(req, res, next) {
    const { email, password } = req.body;
    if (!email || !password) {
      return next(new errorResponse({ message: "email and password are required", statusCode: 400 }));
    }
    const result = await AuthService.register({ email, password });
    return new successfullyResponse({
      message: "OTP sent to your email",
      meta: result,
      statusCode: 201,
    }).json(res);
  }

  async verifyOtp(req, res, next) {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return next(new errorResponse({ message: "email and otp are required", statusCode: 400 }));
    }
    const result = await AuthService.verifyOtp({ email, otp });
    return new successfullyResponse({
      message: "Email verified successfully",
      meta: result,
    }).json(res);
  }

  async resendOtp(req, res, next) {
    const { email } = req.body;
    if (!email) {
      return next(new errorResponse({ message: "email is required", statusCode: 400 }));
    }
    const result = await AuthService.resendOtp({ email });
    return new successfullyResponse({
      message: "OTP resent successfully",
      meta: result,
    }).json(res);
  }

  async login(req, res, next) {
    const { email, password } = req.body;
    if (!email || !password) {
      return next(new errorResponse({ message: "email and password are required", statusCode: 400 }));
    }
    const result = await AuthService.login({ email, password });
    return new successfullyResponse({
      message: "Login successful",
      meta: result,
    }).json(res);
  }

  async forgotPassword(req, res, next) {
    const { email } = req.body;
    if (!email) return next(new errorResponse({ message: "email is required", statusCode: 400 }));
    await AuthService.forgotPassword({ email });
    return new successfullyResponse({ message: "If this email exists, an OTP has been sent" }).json(res);
  }

  async verifyResetOtp(req, res, next) {
    const { email, otp } = req.body;
    if (!email || !otp) return next(new errorResponse({ message: "email and otp are required", statusCode: 400 }));
    const result = await AuthService.verifyResetOtp({ email, otp });
    return new successfullyResponse({ message: "OTP verified", meta: result }).json(res);
  }

  async resetPassword(req, res, next) {
    const { email, newPassword } = req.body;
    if (!email || !newPassword) return next(new errorResponse({ message: "email and newPassword are required", statusCode: 400 }));
    await AuthService.resetPassword({ email, newPassword });
    return new successfullyResponse({ message: "Password reset successfully" }).json(res);
  }

  async changePassword(req, res, next) {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return next(new errorResponse({ message: "currentPassword and newPassword are required", statusCode: 400 }));
    await AuthService.changePassword({ userId: req.user._id, currentPassword, newPassword });
    return new successfullyResponse({ message: "Password changed successfully" }).json(res);
  }

  async deleteAccount(req, res, next) {
    const { password } = req.body;
    if (!password) return next(new errorResponse({ message: "password is required", statusCode: 400 }));
    await AuthService.deleteAccount({ userId: req.user._id, password });
    return new successfullyResponse({ message: "Account deleted" }).json(res);
  }

  async me(req, res, next) {
    const result = await AuthService.me(req.user._id);
    return new successfullyResponse({
      message: "User info fetched",
      meta: result,
    }).json(res);
  }
}

module.exports = new AuthController();
