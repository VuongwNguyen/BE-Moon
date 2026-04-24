# Galaxy Project — Roadmap

**Cập nhật:** 2026-04-24

---

## Subsystem 3: User Portal đầy đủ

**Mục tiêu:** User tự quản lý ảnh và galaxies của mình.

### Backend cần thêm

| API | Mô tả |
|-----|-------|
| `DELETE /gallary/items/:id` | Xóa ảnh (chỉ xóa ảnh thuộc galaxy của mình) |
| `GET /gallary/my-items?galaxyId=` | Lấy tất cả ảnh của 1 galaxy (bao gồm inactive, dùng cho quản lý) |
| `POST /gallary/upload` | Đã có, nhưng cần test lại với JWT + galaxyId |

### Frontend Portal — thêm vào

**Trang quản lý galaxy (click vào galaxy card):**
- Danh sách ảnh đã upload (grid thumbnail)
- Nút upload ảnh mới (file picker, multiselect)
- Nút xóa từng ảnh (confirm trước khi xóa)
- Nút copy link galaxy (`/galaxy-moon/?galaxyId=...`)
- Nút xóa galaxy (confirm, xóa luôn tất cả ảnh)

**Folder structure mới:**
```
public/portal/
├── index.html          ← danh sách galaxies (đã có)
├── galaxy.html         ← trang quản lý 1 galaxy (mới)
├── js/
│   ├── main.js         ← đã có
│   └── galaxy.js       ← logic trang galaxy (mới)
```

### Lưu ý kỹ thuật
- Upload từ portal: FE gửi file qua `multipart/form-data` với JWT header
- `DELETE /gallary/items/:id`: verify ảnh thuộc galaxy thuộc user
- Thumbnail: dùng ImageKit URL transformation (`tr=w-200,h-200,fo-auto`)

---

## Subsystem 2: Subscription + PayOS

**Mục tiêu:** User trả tiền theo tháng/năm để giữ galaxy active. Giới hạn số galaxy theo plan.

### Data Models mới

```js
// Plan config (hardcode)
PLANS = {
  basic:   { maxGalaxies: 1, price: { monthly: 29000, yearly: 290000 } },
  premium: { maxGalaxies: 3, price: { monthly: 59000, yearly: 590000 } },
}

// Subscription schema
{
  userId:     ObjectId ref User
  plan:       "basic" | "premium"
  period:     "monthly" | "yearly"
  maxGalaxies: Number
  startDate:  Date
  expiredAt:  Date
  status:     "active" | "expired" | "cancelled"
  payosOrderCode: String  // để đối soát
}
```

### Thay đổi User Model
Thêm field: `subscriptionId` (ref Subscription) hoặc query trực tiếp từ Subscription collection.

### API mới

| API | Mô tả |
|-----|-------|
| `POST /payment/create` | Tạo PayOS payment link, trả về `checkoutUrl` |
| `POST /payment/webhook` | PayOS gọi về khi thanh toán xong → activate subscription |
| `GET /payment/status` | User xem subscription hiện tại |

### Logic quan trọng
- Tạo galaxy: check subscription còn hạn + chưa vượt `maxGalaxies`
- `GET /gallary/items?galaxyId=`: check subscription còn hạn, nếu hết → 403 (galaxy bị ẩn)
- Webhook PayOS: verify signature → tạo/gia hạn Subscription
- Cron job (hoặc lazy check): mark subscription `expired` khi quá `expiredAt`

### Frontend Portal — thêm vào
- Tab "Subscription": hiển thị plan hiện tại, ngày hết hạn, nút gia hạn
- Chọn plan (basic/premium) + period (monthly/yearly) → redirect PayOS checkout
- Sau thanh toán: PayOS redirect về `/portal/?payment=success`

### PayOS integration
- Docs: https://payos.vn/docs
- Cần: `PAYOS_CLIENT_ID`, `PAYOS_API_KEY`, `PAYOS_CHECKSUM_KEY` trong `.env`
- Package: `@payos/node`

---

## Subsystem 4: Admin Panel

**Mục tiêu:** Admin quản lý users, subscription, doanh thu.

### API mới (tất cả cần `requireAdmin` middleware)

| API | Mô tả |
|-----|-------|
| `GET /admin/users` | Danh sách users + subscription status, có search/filter |
| `GET /admin/users/:id` | Chi tiết 1 user: galaxies, ảnh, lịch sử payment |
| `PATCH /admin/users/:id/subscription` | Cấp/gia hạn subscription thủ công (miễn phí) |
| `PATCH /admin/users/:id/status` | Activate/deactivate user |
| `GET /admin/payments` | Lịch sử tất cả payments |
| `GET /admin/stats` | Tổng quan: tổng user, user active, doanh thu tháng này |

### Frontend Admin — `public/admin/`

**Pages:**
- `index.html` — Dashboard: stats cards (total users, active, revenue)
- `users.html` — Danh sách users, search, filter theo subscription status
- `user-detail.html` — Chi tiết user: galaxies, ảnh, subscription history, manual grant

**Folder structure:**
```
public/admin/
├── index.html      ← dashboard
├── users.html      ← user list
├── js/
│   ├── dashboard.js
│   └── users.js
```

### Lưu ý
- Admin login dùng chung `POST /auth/login` → redirect `/admin/` nếu role là admin
- Non-admin vào `/admin/` → redirect `/portal/`

---

---

## Ý tưởng nâng cấp visual Galaxy (monetizable qua Theme)

> Mục tiêu: làm galaxy viewer lãng mạn hơn, khác biệt hơn, và gắn vào subscription để thu tiền.

### 1. Particle shape (★ dễ implement)
Thay đổi hình dạng của từng hạt particle trong thiên hà qua GLSL fragment shader.

| Shape | GLSL technique | Ghi chú |
|-------|---------------|---------|
| `circle` | `length(uv - 0.5) < 0.5` | Default, miễn phí |
| `star` | `cos(atan(y,x) * 5.0)` polar radius | |
| `diamond` | `abs(x-0.5) + abs(y-0.5) < 0.5` | |
| `cross` | horizontal + vertical strip | |
| `heart` | implicit heart equation | Phức tạp nhất |

**Monetize:** circle = free, các shape còn lại chỉ available trong paid theme.

---

### 2. Floating Polaroids — đổi cách render ảnh (★★★ recommended)
Thay `PointsMaterial` (mỗi ảnh là hàng nghìn particle nhỏ) bằng `PlaneGeometry` — mỗi ảnh là một **tấm ảnh nổi** trong không gian, tự xoay nhẹ, có viền glow phát sáng.

- Zoom ra: thấy các "ký ức" trôi nổi quanh thiên hà
- Zoom vào: thấy rõ từng tấm ảnh, viền sáng, cảm giác như nhìn qua album vũ trụ
- Option thêm: khung ảnh theo shape (tròn, trái tim, vuông)

**Cần làm:** thay loop tạo `Points` → tạo `Mesh(PlaneGeometry, MeshBasicMaterial({ map: texture }))` với billboard effect + glow sprite.

---

### 3. Heart-shaped galaxy (★★★ impactful)
Thay toàn bộ công thức phân bố particle từ **xoắn ốc Archimedes → hình trái tim 3D**.

- Nhìn từ trên xuống: một trái tim khổng lồ làm từ ánh sáng
- Có độ sâu 3D (spread Y axis)
- Đặc biệt, không app nào làm thế này

**Công thức heart:** `x = 16sin³(t)`, `y = 13cos(t) - 5cos(2t) - 2cos(3t) - cos(4t)` — scale lên không gian 3D và thêm randomness.

---

### 4. Bloom / Dreamy glow (★★ quick win)
Thêm `UnrealBloomPass` từ Three.js post-processing pipeline.

- Tất cả particle và ảnh có quầng sáng mờ ảo xung quanh
- Cảm giác "dreamlike", rất phù hợp với concept lãng mạn
- Implementation nhỏ (~20 lines), visual impact lớn

```js
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
```

**Có thể tune qua theme:** `bloomStrength`, `bloomRadius`, `bloomThreshold`.

---

### 5. Photo orbiting rings (★★)
Mỗi ảnh upload trở thành một **tấm ảnh nhỏ bay theo quỹ đạo** quanh planet trung tâm — như các mặt trăng nhỏ mang theo ký ức.

- Ảnh đầu tiên orbit gần nhất, ảnh sau orbit xa hơn
- Tốc độ orbit khác nhau tạo cảm giác sống động
- Có thể kết hợp với Polaroid style (tấm ảnh có khung)

---

### 6. Galaxy render mode selector (theme field)
Thêm `renderMode` vào Theme model để chọn kiểu render tổng thể:

| Mode | Mô tả |
|------|-------|
| `spiral` | Xoắn ốc thiên hà cổ điển (hiện tại) |
| `heart` | Hình trái tim (ý tưởng #3) |
| `nebula` | Dày đặc, ít cấu trúc, giống đám mây vũ trụ |
| `ring` | Các vòng đồng tâm như Saturn's rings |

---

### 7. "Fall through memories" template — Pro/Premium tier

Template hoàn toàn mới, song song với Galaxy. Concept: **camera rơi xuyên qua vũ trụ ký ức**.

- Ảnh upload → polaroid 3D nổi, spawn ở xa, trôi về phía camera liên tục
- Click tinh cầu trung tâm → music bật, camera lao về phía trước, ảnh vút qua hai bên
- OrbitControls giới hạn → xoay đầu nhìn xung quanh khi đang "rơi"
- Caption trôi ngang như tia sáng
- Metaphor: *"Rơi xuyên qua những ký ức của 2 người"*

**Plan gating:** Pro hoặc Premium tier riêng (39k/tháng).

**Cần làm:**
- Thêm `template` field vào Galaxy model (`'galaxy' | 'fall'`)
- `fall.js` — scene mới hoàn toàn (PlaneGeometry polaroids, drift physics)
- Portal: chọn template trong Customization (gated by plan)

> ⏸ Chưa implement — để sau khi core features ổn định.

---

### Thứ tự recommend implement

```
Bloom (quick win, ít code)
  → Particle shapes (gắn vào theme field, dễ sell)
    → Floating Polaroids (visual WOW, re-define the product)
      → "Fall" template (signature premium feature)
        → Heart galaxy + render modes (sau khi có paying users)
```

---

## Thứ tự build đề xuất

```
Subsystem 3 (Portal đầy đủ)
    → Subsystem 2 (PayOS)
        → Subsystem 4 (Admin Panel)
```

Lý do: S3 cần xong để user có thể dùng thực sự. S2 cần S3 vì portal cần hiển thị subscription. S4 cần S2 vì admin cần xem payment history.
