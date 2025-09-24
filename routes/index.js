const router = require("express").Router();

router.use("/gallary", require("./gallary.routes"));
// router.use("/information");

module.exports = router;
