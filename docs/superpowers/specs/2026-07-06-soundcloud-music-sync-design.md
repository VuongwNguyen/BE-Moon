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
