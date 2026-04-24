const ThemeModel = require('../models/theme');
const BackgroundMusicModel = require('../models/backgroundMusic');
const { errorResponse } = require('../context/responseHandle');

class MediaService {
  async createTheme(data) {
    return ThemeModel.create(data);
  }

  async getThemes() {
    return ThemeModel.find({ status: 'active' });
  }

  async updateTheme(id, data) {
    return ThemeModel.findByIdAndUpdate(id, data, { new: true });
  }

  async deleteTheme(id) {
    return ThemeModel.findByIdAndUpdate(id, { status: 'inactive' });
  }

  async createMusic(data) {
    return BackgroundMusicModel.create(data);
  }

  async getMusics() {
    return BackgroundMusicModel.find({ status: 'active' });
  }

  async updateMusic(id, data) {
    return BackgroundMusicModel.findByIdAndUpdate(id, data, { new: true });
  }

  async deleteMusic(id) {
    return BackgroundMusicModel.findByIdAndUpdate(id, { status: 'inactive' });
  }
}

module.exports = new MediaService();
