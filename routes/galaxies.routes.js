const router = require("express").Router();
const asyncHandler = require("../context/asyncHandler");
const { requireAuth } = require("../middlewares/auth");
const GalaxyController = require("../controllers/galaxy.controller");

router.post("/", requireAuth, asyncHandler(GalaxyController.createGalaxy));
router.get("/my", requireAuth, asyncHandler(GalaxyController.getMyGalaxies));
router.get("/:id", requireAuth, asyncHandler(GalaxyController.getGalaxy));
router.put("/:id", requireAuth, asyncHandler(GalaxyController.updateGalaxy));
router.delete("/:id", requireAuth, asyncHandler(GalaxyController.deleteGalaxy));

module.exports = router;
