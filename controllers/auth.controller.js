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

  async me(req, res, next) {
    const result = await AuthService.me(req.user._id);
    return new successfullyResponse({
      message: "User info fetched",
      meta: result,
    }).json(res);
  }
}

module.exports = new AuthController();
