# Portal Galaxy Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hoàn thiện User Portal với trang quản lý galaxy chi tiết. User có thể upload/xóa ảnh, copy link galaxy, xóa galaxy.

**Architecture:** Express backend với JWT auth + Frontend vanilla JS. Thêm 2 API endpoints mới và 1 trang galaxy management.

**Tech Stack:** Node.js, Express, JWT, Multer, ImageKit, Vanilla JS

---

## Task 1: Backend APIs Implementation

**Files:**
- Update: `routes/gallary.js` (add DELETE endpoint)
- Update: `routes/gallary.js` (add GET my-items endpoint)  
- Test: `routes/gallary.js` (verify upload with JWT)

- [ ] **Step 1: Implement DELETE /gallary/items/:id**

```js
// Add to routes/gallary.js
router.delete('/items/:id', requireAuth, async (req, res) => {
  try {
    const imageId = req.params.id;
    const userId = req.user.id;
    
    // Find image and verify ownership through galaxy
    const image = await GallaryItem.findById(imageId).populate('galaxyId');
    if (!image) return res.status(404).json({ error: 'Image not found' });
    
    if (image.galaxyId.userId.toString() !== userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    await GallaryItem.findByIdAndDelete(imageId);
    res.json({ message: 'Image deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

- [ ] **Step 2: Implement GET /gallary/my-items**

```js
// Add to routes/gallary.js  
router.get('/my-items', requireAuth, async (req, res) => {
  try {
    const { galaxyId } = req.query;
    const userId = req.user.id;
    
    if (!galaxyId) return res.status(400).json({ error: 'galaxyId required' });
    
    // Verify user owns galaxy
    const galaxy = await Galaxy.findById(galaxyId);
    if (!galaxy || galaxy.userId.toString() !== userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    // Return ALL images including inactive
    const items = await GallaryItem.find({ galaxyId }).sort({ createdAt: -1 });
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

- [ ] **Step 3: Test existing POST /gallary/upload với JWT + galaxyId**

```bash
# Test upload endpoint
curl -X POST http://localhost:3000/gallary/upload \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "image=@test-image.jpg" \
  -F "galaxyId=GALAXY_ID"
```

---

## Task 2: Frontend Galaxy Management Page

**Files:**
- Create: `public/portal/galaxy.html`
- Create: `public/portal/js/galaxy.js`

- [ ] **Step 4: Create galaxy.html layout**

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Galaxy Management</title>
    <link rel="stylesheet" href="../shared/css/portal.css">
</head>
<body>
    <div class="container">
        <header>
            <button id="backBtn">← Back to Portal</button>
            <h1 id="galaxyName">Galaxy Management</h1>
        </header>
        
        <section class="upload-section">
            <input type="file" id="fileInput" multiple accept="image/*">
            <button id="uploadBtn">Upload Images</button>
            <div id="uploadProgress" class="hidden"></div>
        </section>
        
        <section class="actions">
            <button id="copyLinkBtn">Copy Galaxy Link</button>
            <button id="deleteGalaxyBtn" class="danger">Delete Galaxy</button>
        </section>
        
        <section class="image-grid" id="imageGrid">
            <!-- Images will be loaded here -->
        </section>
    </div>
    
    <script src="js/galaxy.js"></script>
</body>
</html>
```

- [ ] **Step 5: Create galaxy.js logic**

```js
// public/portal/js/galaxy.js
class GalaxyManager {
    constructor() {
        this.galaxyId = new URLSearchParams(window.location.search).get('galaxyId');
        this.token = localStorage.getItem('token');
        this.init();
    }
    
    async init() {
        if (!this.galaxyId || !this.token) {
            window.location.href = '/portal/';
            return;
        }
        
        this.setupEventListeners();
        await this.loadImages();
        await this.loadGalaxyInfo();
    }
    
    setupEventListeners() {
        document.getElementById('backBtn').onclick = () => window.location.href = '/portal/';
        document.getElementById('uploadBtn').onclick = () => this.handleUpload();
        document.getElementById('copyLinkBtn').onclick = () => this.copyGalaxyLink();
        document.getElementById('deleteGalaxyBtn').onclick = () => this.deleteGalaxy();
    }
    
    async loadImages() {
        // Implementation for loading images
    }
    
    async handleUpload() {
        // Implementation for file upload
    }
    
    async deleteImage(imageId) {
        // Implementation for deleting image
    }
    
    copyGalaxyLink() {
        // Implementation for copying galaxy link
    }
    
    async deleteGalaxy() {
        // Implementation for deleting entire galaxy
    }
}

new GalaxyManager();
```

---

## Task 3: Update Portal Navigation

**Files:**
- Update: `public/portal/js/main.js`

- [ ] **Step 6: Add galaxy card click handlers**

```js
// Add to public/portal/js/main.js
function setupGalaxyNavigation() {
    document.querySelectorAll('.galaxy-card').forEach(card => {
        card.addEventListener('click', (e) => {
            if (e.target.classList.contains('delete-btn')) return; // Skip if delete button
            
            const galaxyId = card.dataset.galaxyId;
            window.location.href = `/portal/galaxy.html?galaxyId=${galaxyId}`;
        });
    });
}

// Call after loading galaxies
loadGalaxies().then(() => {
    setupGalaxyNavigation();
});
```

---

## Task 4: Testing & Validation

- [ ] **Step 7: Test DELETE API với Postman/curl**
- [ ] **Step 8: Test GET my-items API với different galaxyId**  
- [ ] **Step 9: Test frontend navigation từ portal → galaxy page**
- [ ] **Step 10: Test image upload/delete flow end-to-end**
- [ ] **Step 11: Test galaxy link copy functionality**
- [ ] **Step 12: Test galaxy deletion với confirmation**

---

## Success Criteria

✅ User có thể click vào galaxy card để vào trang quản lý  
✅ Trang galaxy hiển thị tất cả ảnh của galaxy đó  
✅ User có thể upload multiple images cùng lúc  
✅ User có thể xóa từng ảnh với confirmation  
✅ User có thể copy link galaxy public  
✅ User có thể xóa toàn bộ galaxy với double confirmation  
✅ Tất cả operations đều có proper error handling và loading states