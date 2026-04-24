# Portal Galaxy Management — Design Spec

**Date:** 2026-04-23  
**Status:** Approved

## Overview

Hoàn thiện User Portal với trang quản lý galaxy chi tiết. User có thể upload/xóa ảnh, copy link galaxy, xóa galaxy. Thêm 2 API mới và 1 trang frontend mới.

---

## Backend APIs cần thêm

### DELETE /gallary/items/:id
```js
// Xóa ảnh (chỉ xóa ảnh thuộc galaxy của mình)
Method: DELETE
Auth: JWT required
Params: id (image ObjectId)
Logic: 
  - Verify user owns galaxy containing this image
  - Delete image from database
  - Return 200 OK or 404 Not Found
```

### GET /gallary/my-items?galaxyId=
```js  
// Lấy tất cả ảnh của 1 galaxy (bao gồm inactive, dùng cho quản lý)
Method: GET
Auth: JWT required  
Query: galaxyId (required)
Logic:
  - Verify user owns the galaxy
  - Return ALL images including inactive ones
Response: Array of image objects with full metadata
```

### POST /gallary/upload (existing - test only)
```js
// Đã có, nhưng cần test lại với JWT + galaxyId
Method: POST
Auth: JWT required
Body: multipart/form-data with galaxyId field
Logic: Verify user owns galaxy before upload
```

---

## Frontend Structure

```
public/portal/
├── index.html          ← existing (galaxy list)
├── galaxy.html         ← NEW (galaxy management page)
├── js/
│   ├── main.js         ← UPDATE (add navigation)
│   └── galaxy.js       ← NEW (galaxy page logic)
```

---

## Galaxy Management Page Features

### galaxy.html Layout
- **Header**: Galaxy name + back button to portal
- **Image Grid**: Thumbnail grid (200x200) với delete button per image
- **Upload Section**: File picker (multiple files) + upload button với progress
- **Actions**: Copy galaxy public link, Delete entire galaxy (with confirmation)

### galaxy.js Functionality  
- Load images via `GET /gallary/my-items?galaxyId=`
- Handle multiple file upload với progress bar
- Delete individual images với confirmation dialog
- Copy galaxy public link (`/galaxy-moon/?galaxyId=xxx`) to clipboard
- Delete entire galaxy với double confirmation

### main.js Updates
- Add click handlers to galaxy cards in portal
- Navigate to `galaxy.html?galaxyId=xxx`

---

## Technical Requirements

### Image Thumbnails
- Use ImageKit transformation: `?tr=w-200,h-200,fo-auto`
- CSS Grid layout for responsive image grid

### File Upload
- `multipart/form-data` với JWT trong Authorization header
- Progress bar cho multiple file uploads
- Error handling cho file size/type limits

### Security
- All API calls require JWT authentication
- Verify galaxy ownership before any operation
- Confirmation dialogs for destructive actions (delete image, delete galaxy)

### UI/UX
- Responsive design for mobile/desktop
- Loading states for all async operations
- Toast notifications for success/error messages