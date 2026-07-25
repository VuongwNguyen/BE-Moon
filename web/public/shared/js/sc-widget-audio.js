// sc-widget-audio.js — adapter phát nhạc SoundCloud qua Widget API, giả lập HTMLAudioElement
// Dùng: window.createGalaxyAudio(url) — url soundcloud.com → widget ẩn, ngược lại → new Audio(url)
(function () {
  const WIDGET_API_SRC = 'https://w.soundcloud.com/player/api.js';
  let apiPromise = null;

  function loadWidgetApi() {
    if (window.SC && window.SC.Widget) return Promise.resolve();
    if (apiPromise) return apiPromise;
    apiPromise = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = WIDGET_API_SRC;
      s.onload = () => resolve();
      s.onerror = () => { apiPromise = null; reject(new Error('Không tải được SoundCloud Widget API')); };
      document.head.appendChild(s);
    });
    return apiPromise;
  }

  class SoundCloudAudio {
    constructor(permalink) {
      this._permalink = permalink;
      this.src = permalink;
      this._widget = null;
      this._ready = false;
      this._wantPlay = false;
      this._volume = 1;
      this._muted = false;
      this._loop = false;
      this.paused = true;
      // các handler mà musicManager có thể gán
      this.onplay = null;
      this.onpause = null;
      this.oncanplay = null;
      this.onloadeddata = null;
      this.onloadedmetadata = null;
      this.onended = null;
      this.onerror = null;
      this.preload = 'auto'; // no-op, giữ tương thích
      this._setup();
    }

    _setup() {
      loadWidgetApi().then(() => {
        const iframe = document.createElement('iframe');
        iframe.allow = 'autoplay';
        iframe.style.cssText = 'position:fixed;width:1px;height:1px;left:-9999px;bottom:0;border:0;opacity:0;pointer-events:none';
        iframe.src = 'https://w.soundcloud.com/player/?url=' + encodeURIComponent(this._permalink) +
          '&auto_play=false&show_artwork=false&visual=false&hide_related=true&show_comments=false&show_user=false';
        document.body.appendChild(iframe);
        this._iframe = iframe;
        const w = window.SC.Widget(iframe);
        this._widget = w;
        w.bind(window.SC.Widget.Events.READY, () => {
          this._ready = true;
          this._applyVolume();
          if (this.oncanplay) this.oncanplay();
          if (this.onloadedmetadata) this.onloadedmetadata();
          if (this.onloadeddata) this.onloadeddata();
          if (this._wantPlay) w.play();
        });
        w.bind(window.SC.Widget.Events.PLAY, () => {
          this.paused = false;
          if (this.onplay) this.onplay();
        });
        w.bind(window.SC.Widget.Events.PAUSE, () => {
          this.paused = true;
          if (this.onpause) this.onpause();
        });
        w.bind(window.SC.Widget.Events.FINISH, () => {
          if (this._loop) { w.seekTo(0); w.play(); }
          else { this.paused = true; if (this.onended) this.onended(); }
        });
        w.bind(window.SC.Widget.Events.ERROR, () => {
          if (this.onerror) this.onerror(new Error('SoundCloud widget error'));
        });
      }).catch((e) => { if (this.onerror) this.onerror(e); });
    }

    _applyVolume() {
      if (this._ready && this._widget) this._widget.setVolume(this._muted ? 0 : Math.round(this._volume * 100));
    }

    play() {
      this._wantPlay = true;
      this.paused = false; // optimistic — event PLAY của widget có thể trễ
      if (this._ready && this._widget) this._widget.play();
      return Promise.resolve();
    }

    pause() {
      this._wantPlay = false;
      this.paused = true;
      if (this._ready && this._widget) this._widget.pause();
    }

    destroy() {
      this._wantPlay = false;
      this.paused = true;
      try { if (this._widget) this._widget.pause(); } catch (e) {}
      if (this._iframe) { this._iframe.remove(); this._iframe = null; }
      this._widget = null;
    }

    get loop() { return this._loop; }
    set loop(v) { this._loop = !!v; }
    get volume() { return this._volume; }
    set volume(v) { this._volume = v; this._applyVolume(); }
    get muted() { return this._muted; }
    set muted(v) { this._muted = !!v; this._applyVolume(); }
  }

  window.createGalaxyAudio = function (url) {
    if (typeof url === 'string' && /(^|\.)soundcloud\.com\//.test(url.replace(/^https?:\/\//, ''))) {
      return new SoundCloudAudio(url);
    }
    return new Audio(url);
  };
})();
