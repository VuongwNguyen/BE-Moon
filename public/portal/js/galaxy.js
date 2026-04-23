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
    document.getElementById('uploadBtn').onclick = () => this.handleUpload();
    document.getElementById('copyLinkBtn').onclick = () => this.copyGalaxyLink();
    document.getElementById('deleteGalaxyBtn').onclick = () => this.deleteGalaxy();
    
    // File input change
    document.getElementById('fileInput').onchange = (e) => {
      const files = e.target.files;
      if (files.length > 0) {
        document.querySelector('.upload-area p').textContent = `${files.length} file(s) selected`;
      }
    };
  }

  async loadGalaxyInfo() {
    try {
      const response = await fetch(`/api/galaxy/${this.galaxyId}`, {
        headers: { 'Authorization': `Bearer ${this.token}` }
      });
      
      if (response.ok) {
        const galaxy = await response.json();
        document.getElementById('galaxyName').textContent = galaxy.name || 'Galaxy Management';
      }
    } catch (error) {
      console.error('Error loading galaxy info:', error);
    }
  }

  async loadImages() {
    try {
      const response = await fetch(`/gallary/my-items?galaxyId=${this.galaxyId}`, {
        headers: { 'Authorization': `Bearer ${this.token}` }
      });

      if (!response.ok) {
        throw new Error('Failed to load images');
      }

      const data = await response.json();
      const images = data.meta || [];
      this.renderImages(images);
    } catch (error) {
      console.error('Error loading images:', error);
      document.getElementById('imageGrid').innerHTML = '<div class="loading">Error loading images</div>';
    }
  }

  renderImages(images) {
    const grid = document.getElementById('imageGrid');
    
    if (images.length === 0) {
      grid.innerHTML = '<div class="loading">No images uploaded yet</div>';
      return;
    }

    grid.innerHTML = images.map(image => `
      <div class="image-item">
        <img src="${image.imageUrl}?tr=w-200,h-200,fo-auto" alt="${image.title}">
        <button class="delete-image" onclick="galaxyManager.deleteImage('${image._id}')" title="Delete image">×</button>
      </div>
    `).join('');
  }

  async handleUpload() {
    const fileInput = document.getElementById('fileInput');
    const files = fileInput.files;
    
    if (files.length === 0) {
      alert('Please select files to upload');
      return;
    }

    const formData = new FormData();
    for (let file of files) {
      formData.append('files', file);
    }
    formData.append('galaxyId', this.galaxyId);
    formData.append('title', 'Uploaded image');
    formData.append('description', 'Image uploaded from portal');

    const progressContainer = document.getElementById('uploadProgress');
    const progressBar = document.getElementById('progressBar');
    
    progressContainer.classList.remove('hidden');
    progressBar.style.width = '0%';

    try {
      const xhr = new XMLHttpRequest();
      
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const percent = (e.loaded / e.total) * 100;
          progressBar.style.width = percent + '%';
        }
      };

      xhr.onload = () => {
        progressContainer.classList.add('hidden');
        if (xhr.status === 200) {
          fileInput.value = '';
          document.querySelector('.upload-area p').textContent = 'Click to select images or drag & drop';
          this.loadImages(); // Reload images
        } else {
          alert('Upload failed');
        }
      };

      xhr.onerror = () => {
        progressContainer.classList.add('hidden');
        alert('Upload failed');
      };

      xhr.open('POST', '/gallary/upload');
      xhr.setRequestHeader('Authorization', `Bearer ${this.token}`);
      xhr.send(formData);
    } catch (error) {
      console.error('Upload error:', error);
      progressContainer.classList.add('hidden');
      alert('Upload failed');
    }
  }

  async deleteImage(imageId) {
    if (!confirm('Are you sure you want to delete this image?')) {
      return;
    }

    try {
      const response = await fetch(`/gallary/items/${imageId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${this.token}` }
      });

      if (response.ok) {
        this.loadImages(); // Reload images
      } else {
        alert('Failed to delete image');
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert('Failed to delete image');
    }
  }

  copyGalaxyLink() {
    const link = `${window.location.origin}/galaxy-moon/?galaxyId=${this.galaxyId}`;
    navigator.clipboard.writeText(link).then(() => {
      alert('Galaxy link copied to clipboard!');
    }).catch(() => {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = link;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      alert('Galaxy link copied to clipboard!');
    });
  }

  async deleteGalaxy() {
    if (!confirm('Are you sure you want to delete this entire galaxy? This will delete all images and cannot be undone.')) {
      return;
    }
    
    if (!confirm('This action is permanent. Are you absolutely sure?')) {
      return;
    }

    try {
      const response = await fetch(`/api/galaxy/${this.galaxyId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${this.token}` }
      });

      if (response.ok) {
        alert('Galaxy deleted successfully');
        window.location.href = '/portal/';
      } else {
        alert('Failed to delete galaxy');
      }
    } catch (error) {
      console.error('Delete galaxy error:', error);
      alert('Failed to delete galaxy');
    }
  }
}

// Initialize when page loads
const galaxyManager = new GalaxyManager();