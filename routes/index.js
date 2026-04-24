// routes/index.js
const router = require("express").Router();

router.use("/gallary", require("./gallary.routes"));
router.use("/auth", require("./auth.routes"));
router.use("/galaxies", require("./galaxies.routes"));
router.use("/payment", require("./payment.routes"));

module.exports = router;
