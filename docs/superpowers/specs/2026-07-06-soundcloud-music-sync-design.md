# SoundCloud Music Sync — Design

**Ngày:** 2026-07-06
**Mục tiêu:** Admin tìm nhạc trên SoundCloud và thêm vào thư viện nhạc nền chung; viewer phát bằng stream trực tiếp từ SoundCloud (đúng terms API, không tải file về).

## Bối cảnh hiện tại

- `models/backgroundMusic.js`: `{ name, url, status }` — admin upload MP3 lên ImageKit qua `/media/upload-music`.
- Admin quản lý ở `public/admin` (bảng music, `public/admin/js/main.js`).
- `galaxy-setup.js` tab Nhạc liệt kê từ `GET /media/musics`; galaxy lưu `backgroundMusicId`; viewer phát bằng `music.url`.

## Kiến trúc

### 1. Service: `services/soundcloud.service.js`

- OAuth `client_credentials` với `SOUNDCLOUD_CLIENT_ID` / `SOUNDCLOUD_CLIENT_SECRET` (`.env`).
- Cache access token trong memory đến trước khi hết hạn (SoundCloud trả `expires_in`).
- `searchTracks(q, limit=20)` → gọi `GET https://api.soundcloud.com/tracks?q=...&access=playable`, trả `[{ trackId, title, artist, duration, artworkUrl, permalink }]`, chỉ giữ track streamable.
- `getStreamUrl(trackId)` → `GET /tracks/:id/streams` lấy `http_mp3_128_url` (URL tươi, có hạn dùng ngắn).
- Chưa cấu hình key → ném lỗi có `statusCode: 503`.

### 2. Model: mở rộng `backgroundMusicSchema`

- `source: { type: String, enum: ['upload', 'soundcloud'], default: 'upload' }`
- `trackId: String` (bắt buộc khi source=soundcloud)
- `artist: String`, `artworkUrl: String`
- `url` chỉ required khi `source === 'upload'`.

### 3. Routes (`media.routes.js` + `media.controller.js` + `media.service.js`)

- `GET /media/soundcloud/search?q=` — `requireAdmin`. Trả kết quả search. 503 khi thiếu key.
- `GET /media/soundcloud/preview/:trackId` — `requireAdmin`. Redirect 302 sang stream URL tươi, dùng cho nút nghe thử ở admin trước khi thêm.
- `GET /media/musics/:id/stream` — public.
  - source=upload → `302` sang `music.url` (ImageKit).
  - source=soundcloud → resolve stream URL tươi → `302`.
  - Track bị gỡ / SoundCloud lỗi → `404` message rõ ràng.
- `POST /media/musics` (đã có, requireAdmin) chấp nhận thêm `{ source, trackId, artist, artworkUrl }`.

### 4. Frontend

- **Admin** (`public/admin`): trong section Music thêm ô tìm kiếm SoundCloud → danh sách kết quả (ảnh bìa, tên, nghệ sĩ, nút nghe thử bằng `<audio>` trỏ `/media/soundcloud/preview/:trackId`, nút "Thêm"). Thêm xong reload bảng music. Khi search trả 503 → hiện "Chưa cấu hình SoundCloud API".
- **Phát nhạc** (`galaxy-setup.js`, viewer): đổi nguồn `<audio>` từ `music.url` sang `/media/musics/${id}/stream` cho mọi bài — một đường phát thống nhất, nhạc upload cũ vẫn chạy qua redirect.

## Xử lý lỗi

- Thiếu key: search 503; stream soundcloud 503; nhạc upload không ảnh hưởng.
- SoundCloud token hết hạn giữa chừng: service tự refresh 1 lần rồi retry.
- Track không còn streamable: stream endpoint 404, viewer im lặng bỏ qua (không vỡ trang).

## Kiểm thử

- Unit-level bằng curl: search (khi có key), stream redirect cho cả 2 loại source.
- E2E: thêm track từ admin, chọn ở galaxy-setup, mở galaxy nghe được nhạc.
- Khi chưa có key: xác nhận admin UI báo 503 gọn gàng, nhạc cũ vẫn phát.

## Ngoài phạm vi

- User tự thêm nhạc SoundCloud riêng (chỉ admin).
- Tải file về ImageKit (vi phạm terms).
- Playlist/nhiều bài cho một galaxy.

---

## Bản sửa đổi 2026-07-06 (chiều): chuyển sang Widget miễn phí

**Lý do:** SoundCloud yêu cầu Artist Pro (trả phí) mới tạo được API app. Chuyển sang oEmbed + Widget API — miễn phí, không cần key.

### Thay đổi kiến trúc

1. **Admin flow đổi từ search → dán link**: admin dán URL track SoundCloud → `GET /media/soundcloud/resolve?url=` (admin) → server gọi `https://soundcloud.com/oembed?format=json&url=...` (không cần key) → trả `{permalink, trackId, title, artist, artworkUrl}` (trackId parse từ iframe src trong oembed html, có thể rỗng). Chống SSRF: chỉ chấp nhận hostname `soundcloud.com` / `on.soundcloud.com`.
2. **Model**: thêm `permalink: String` (required khi source=soundcloud thay cho trackId; trackId thành optional).
3. **Phát nhạc qua Widget**: file mới `public/shared/js/sc-widget-audio.js` export `window.createGalaxyAudio(url)`:
   - url chứa `soundcloud.com` → trả object giả lập HTMLAudioElement (play/pause/paused/loop/volume/muted/preload + onplay/onpause/oncanplay...) bọc SC.Widget iframe ẩn (`https://w.soundcloud.com/player/?url=<permalink>`), tự load `w.soundcloud.com/player/api.js` một lần, loop qua event FINISH→seekTo(0)+play, volume 0-1 → setVolume 0-100.
   - ngược lại → `new Audio(url)`.
4. **4 viewer** (galaxy-moon/story/aurora/fall index.html): thêm `<script src="/shared/js/sc-widget-audio.js">` và đổi `new Audio(url)` → `window.createGalaxyAudio(url)` trong musicManager. Không đổi gì khác.
5. **galaxy.service view map**: soundcloud → `url = permalink` (bỏ map sang /stream).
6. **galaxy-setup tab Nhạc**: bài soundcloud preview bằng adapter (m.permalink), bài upload giữ `/media/musics/:id/stream`.
7. **CSP** (index.js): thêm `frameSrc: ["'self'", "https://w.soundcloud.com"]`, scriptSrc thêm `https://w.soundcloud.com`.
8. **Giữ nguyên**: endpoint search/preview/stream cũ (dùng lại được nếu sau này có key), stream endpoint vẫn 503 cho soundcloud khi không key — không còn chỗ nào gọi tới nhánh đó.
9. **Admin preview**: nhúng thẳng iframe oembed html vào modal (widget hiển thị được là chứng minh track phát được).
