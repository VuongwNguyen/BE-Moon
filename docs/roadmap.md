# Galaxy Project — Roadmap

**Cập nhật:** 2026-04-23

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

## Thứ tự build đề xuất

```
Subsystem 3 (Portal đầy đủ)
    → Subsystem 2 (PayOS)
        → Subsystem 4 (Admin Panel)
```

Lý do: S3 cần xong để user có thể dùng thực sự. S2 cần S3 vì portal cần hiển thị subscription. S4 cần S2 vì admin cần xem payment history.
