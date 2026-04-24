const MediaService = require('../services/media.service');
const { successfullyResponse, errorResponse } = require('../context/responseHandle');

class MediaController {
  async createTheme(req, res, next) {
    const theme = await MediaService.createTheme(req.body);
    return new successfullyResponse({ message: 'Theme created', meta: theme }).json(res);
  }

  async getThemes(req, res, next) {
    const themes = await MediaService.getThemes();
    return new successfullyResponse({ message: 'Themes fetched', meta: themes }).json(res);
  }

  async updateTheme(req, res, next) {
    const theme = await MediaService.updateTheme(req.params.id, req.body);
    return new successfullyResponse({ message: 'Theme updated', meta: theme }).json(res);
  }

  async deleteTheme(req, res, next) {
    await MediaService.deleteTheme(req.params.id);
    return new successfullyResponse({ message: 'Theme deleted' }).json(res);
  }

  async createMusic(req, res, next) {
    const music = await MediaService.createMusic(req.body);
    return new successfullyResponse({ message: 'Music created', meta: music }).json(res);
  }

  async getMusics(req, res, next) {
    const musics = await MediaService.getMusics();
    return new successfullyResponse({ message: 'Musics fetched', meta: musics }).json(res);
  }

  async updateMusic(req, res, next) {
    const music = await MediaService.updateMusic(req.params.id, req.body);
    return new successfullyResponse({ message: 'Music updated', meta: music }).json(res);
  }

  async deleteMusic(req, res, next) {
    await MediaService.deleteMusic(req.params.id);
    return new successfullyResponse({ message: 'Music deleted' }).json(res);
  }

  async uploadMusic(req, res, next) {
    if (!req.musicUrl) {
      return next(new errorResponse({ message: 'Upload failed', statusCode: 400 }));
    }
    return new successfullyResponse({ message: 'Music uploaded', meta: { url: req.musicUrl } }).json(res);
  }
}

module.exports = new MediaController();
