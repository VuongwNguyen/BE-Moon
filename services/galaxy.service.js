const GalaxyModel = require("../models/galaxy");
const SubscriptionModel = require("../models/subscription");
const { PLAN_RANK } = require("../config/plans");
const { errorResponse } = require("../context/responseHandle");

class GalaxyService {
  async createGalaxy({ userId, name }) {
    const existing = await GalaxyModel.findOne({ userId, name });
    if (existing) {
      throw new errorResponse({ message: "Galaxy name already exists", statusCode: 409 });
    }
    return await GalaxyModel.create({ userId, name });
  }

  async getMyGalaxies(userId) {
    return await GalaxyModel.find({ userId, status: "active" }).sort({ createdAt: -1 });
  }

  async getGalaxy({ galaxyId, userId }) {
    const galaxy = await GalaxyModel.findOne({ _id: galaxyId, userId });
    if (!galaxy) {
      throw new errorResponse({ message: "Galaxy not found", statusCode: 404 });
    }
    return galaxy;
  }

  async deleteGalaxy({ galaxyId, userId }) {
    const galaxy = await GalaxyModel.findById(galaxyId);
    if (!galaxy) {
      throw new errorResponse({ message: "Galaxy not found", statusCode: 404 });
    }
    if (galaxy.userId.toString() !== userId.toString()) {
      throw new errorResponse({ message: "Forbidden", statusCode: 403 });
    }
    await GalaxyModel.findByIdAndDelete(galaxyId);
  }

  async getGalaxyView(galaxyId) {
    const galaxy = await GalaxyModel.findById(galaxyId)
      .populate("themeId", "name colors")
      .populate("backgroundMusicId", "name url");
    if (!galaxy || galaxy.status !== "active") {
      throw new errorResponse({ message: "Galaxy not found", statusCode: 404 });
    }
    return {
      _id: galaxy._id,
      name: galaxy.name,
      caption: galaxy.caption,
      theme: galaxy.themeId || null,
      music: galaxy.backgroundMusicId || null,
    };
  }

  async updateGalaxy({ galaxyId, userId, user, data }) {
    const galaxy = await GalaxyModel.findOne({ _id: galaxyId, userId });
    if (!galaxy) {
      throw new errorResponse({ message: "Galaxy not found", statusCode: 404 });
    }

    if (user.role !== "admin") {
      const wantsTheme = data.themeId !== undefined;
      const wantsMusic = data.backgroundMusicId !== undefined;
      const wantsCaption = data.caption !== undefined;

      if (wantsTheme || wantsMusic || wantsCaption) {
        const sub = await SubscriptionModel.findOne({ userId, status: "active" });
        const hasActiveSub = sub && sub.expiredAt > new Date();

        if (!hasActiveSub) {
          throw new errorResponse({ message: "Active subscription required", statusCode: 403 });
        }

        // music và caption cần pro
        if ((wantsMusic || wantsCaption) && PLAN_RANK[sub.plan] < PLAN_RANK["pro"]) {
          throw new errorResponse({ message: "Pro plan required to set music or caption", statusCode: 403 });
        }

        // theme cần plus trở lên (plus=1, pro=2 đều pass)
        if (wantsTheme && PLAN_RANK[sub.plan] < PLAN_RANK["plus"]) {
          throw new errorResponse({ message: "Plus plan or higher required to set theme", statusCode: 403 });
        }
      }
    }

    return await GalaxyModel.findByIdAndUpdate(galaxyId, data, { new: true });
  }
}

module.exports = new GalaxyService();
