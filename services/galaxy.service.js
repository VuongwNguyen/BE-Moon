const GalaxyModel = require("../models/galaxy");
const SubscriptionModel = require("../models/subscription");
const { PLAN_RANK, PLANS, FREE_MAX_GALAXIES } = require("../config/plans");
const { errorResponse } = require("../context/responseHandle");

class GalaxyService {
  async createGalaxy({ userId, name, userRole }) {
    const existing = await GalaxyModel.findOne({ userId, name });
    if (existing) {
      throw new errorResponse({ message: "Galaxy name already exists", statusCode: 409 });
    }

    if (userRole !== 'admin' && userRole !== 'partner') {
      const count = await GalaxyModel.countDocuments({ userId, status: 'active' });
      const sub = await SubscriptionModel.findOne({ userId, status: 'active', expiredAt: { $gt: new Date() } });
      const max = sub ? (PLANS[sub.plan]?.maxGalaxies ?? FREE_MAX_GALAXIES) : FREE_MAX_GALAXIES;
      if (count >= max) {
        throw new errorResponse({ message: `Bạn đã đạt giới hạn ${max} galaxy. Nâng cấp plan để tạo thêm.`, statusCode: 403 });
      }
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

    // Delete all images from ImageKit
    const GalleryModel = require("../models/gallery");
    const images = await GalleryModel.find({ galaxyId });
    
    if (images.length > 0) {
      const ImageKit = require("imagekit");
      const imagekit = new ImageKit({
        publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
        privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
        urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
      });

      await Promise.allSettled(
        images.map(async (image) => {
          try {
            const fileId = image.fileId;
            if (!fileId) return;
            await imagekit.deleteFile(fileId);
          } catch (error) {
            console.error(`Failed to delete image ${image._id}:`, error);
          }
        })
      );

      // Delete all gallery items
      await GalleryModel.deleteMany({ galaxyId });
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
