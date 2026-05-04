const router = require("express").Router();
const asyncHandler = require("../context/asyncHandler");
const { requireAuth } = require("../middlewares/auth");
const AuthController = require("../controllers/auth.controller");

router.post("/register", asyncHandler(AuthController.register));
router.post("/verify-otp", asyncHandler(AuthController.verifyOtp));
router.post("/resend-otp", asyncHandler(AuthController.resendOtp));
router.post("/login", asyncHandler(AuthController.login));
router.post("/forgot-password", asyncHandler(AuthController.forgotPassword));
router.post("/verify-reset-otp", asyncHandler(AuthController.verifyResetOtp));
router.post("/reset-password", asyncHandler(AuthController.resetPassword));
router.put("/change-password", requireAuth, asyncHandler(AuthController.changePassword));
router.delete("/account", requireAuth, asyncHandler(AuthController.deleteAccount));
router.get("/me", requireAuth, asyncHandler(AuthController.me));

module.exports = router;
