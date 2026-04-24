const GalaxyService = require("../services/galaxy.service");
const { successfullyResponse, errorResponse } = require("../context/responseHandle");

class GalaxyController {
  async createGalaxy(req, res, next) {
    const { name } = req.body;
    if (!name) {
      return next(new errorResponse({ message: "name is required", statusCode: 400 }));
    }
    const galaxy = await GalaxyService.createGalaxy({ userId: req.user._id, name });
    return new successfullyResponse({
      message: "Galaxy created",
      meta: galaxy,
      statusCode: 201,
    }).json(res);
  }

  async getMyGalaxies(req, res, next) {
    const galaxies = await GalaxyService.getMyGalaxies(req.user._id);
    return new successfullyResponse({
      message: "Galaxies fetched",
      meta: galaxies,
    }).json(res);
  }

  async getGalaxy(req, res, next) {
    const galaxy = await GalaxyService.getGalaxy({ galaxyId: req.params.id, userId: req.user._id });
    return new successfullyResponse({ message: "Galaxy fetched", meta: galaxy }).json(res);
  }

  async deleteGalaxy(req, res, next) {
    await GalaxyService.deleteGalaxy({ galaxyId: req.params.id, userId: req.user._id });
    return new successfullyResponse({ message: "Galaxy deleted" }).json(res);
  }
}

module.exports = new GalaxyController();
