// Popup script for Clear Tab Mind extension

class ClearTabMindPopup {
  constructor() {
    this.currentTab = null;
    this.collections = [];
    this.currentCollection = null;
    this.savedTabs = [];
    this.currentPage = 1;
    this.currentFilter = 'all';
    this.searchQuery = '';
    this.totalTabs = 0;
    this.hasMore = false;
    this.view = 'collections'; // 'collections' or 'tabs'
    this.init();
  }

  async init() {
    await this.getCurrentTab();
    await this.loadCollections();
    this.render();
    this.attachEventListeners();
  }

  async getCurrentTab() {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: 'getCurrentTab' }, (response) => {
        this.currentTab = response.tab;
        resolve(response.tab);
      });
    });
  }

  async loadCollections() {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: 'getCollections' }, (response) => {
        this.collections = response || [];
        resolve(response);
      });
    });
  }

  async loadTabsFromCollection(collectionId, page = 1, filter = 'all', search = '') {
    return new Promise((resolve) => {
      const params = {
        action: search ? 'searchTabs' : 'getTabsFromCollection',
        collectionId: collectionId,
        page: page,
        limit: 15, // Show 15 tabs per page
        filter: filter
      };
      
      if (search) {
        params.query = search;
      }
      
      chrome.runtime.sendMessage(params, (response) => {
        if (response) {
          this.savedTabs = response.tabs || [];
          this.totalTabs = response.total || 0;
          this.currentPage = page;
          this.currentFilter = filter;
          this.searchQuery = search;
          this.hasMore = response.hasMore || false;
          this.currentCollection = response.collection;
        }
        resolve(response);
      });
    });
  }

  async saveTab(title, url, tags = '', note = '', collectionId = 'default') {
    const tabData = {
      title: title,
      url: url,
      tags: tags.split(',').map(tag => tag.trim()).filter(Boolean),
      note: note,
      collectionId: collectionId
    };

    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: 'saveTab', ...tabData }, (response) => {
        if (response.success) {
          this.loadCollections(); // Reload collections
          if (this.view === 'tabs') {
            this.loadTabsFromCollection(this.currentCollection.id);
          }
        }
        resolve(response);
      });
    });
  }

  async createCollection(name, description = '') {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ 
        action: 'createCollection', 
        name: name,
        description: description
      }, (response) => {
        if (response.success) {
          this.loadCollections();
        }
        resolve(response);
      });
    });
  }

  async deleteCollection(collectionId) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ 
        action: 'deleteCollection', 
        collectionId: collectionId
      }, (response) => {
        if (response.success) {
          this.loadCollections();
          if (this.currentCollection && this.currentCollection.id === collectionId) {
            this.view = 'collections';
            this.currentCollection = null;
          }
        }
        resolve(response);
      });
    });
  }

  async updateTabStatus(tabId, status) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ 
        action: 'updateTabStatus', 
        collectionId: this.currentCollection.id,
        tabId: tabId, 
        status: status
      }, (response) => {
        if (response.success) {
          this.loadTabsFromCollection(this.currentCollection.id, this.currentPage, this.currentFilter, this.searchQuery);
        }
        resolve(response);
      });
    });
  }

  async deleteTabFromStorage(tabId) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ 
        action: 'deleteTab', 
        collectionId: this.currentCollection.id,
        tabId: tabId 
      }, (response) => {
        if (response.success) {
          this.loadTabsFromCollection(this.currentCollection.id, this.currentPage, this.currentFilter, this.searchQuery);
        }
        resolve(response);
      });
    });
  }

  async searchTabs(query) {
    if (query.trim()) {
      await this.loadTabsFromCollection(this.currentCollection.id, 1, 'all', query);
    } else {
      await this.loadTabsFromCollection(this.currentCollection.id, 1, this.currentFilter, '');
    }
    this.render();
  }

  async loadMoreTabs() {
    if (this.hasMore) {
      await this.loadTabsFromCollection(this.currentCollection.id, this.currentPage + 1, this.currentFilter, this.searchQuery);
      this.render();
    }
  }

  openCollection(collection) {
    this.currentCollection = collection;
    this.view = 'tabs';
    this.loadTabsFromCollection(collection.id).then(() => {
      this.render();
    });
  }

  backToCollections() {
    this.view = 'collections';
    this.currentCollection = null;
    this.render();
  }

  render() {
    const root = document.getElementById('root');
    
    if (this.view === 'collections') {
      root.innerHTML = this.renderCollectionsView();
    } else {
      root.innerHTML = this.renderTabsView();
    }
  }

  renderCollectionsView() {
    return `
      <div class="popup-container">
        <header class="popup-header">
          <h1>Clear Tab Mind</h1>
          <div class="tab-info">
            <strong>${this.currentTab?.title || 'No tab selected'}</strong>
            <small>${this.currentTab?.url || ''}</small>
          </div>
        </header>

        <div class="popup-content">
          <div class="save-section">
            <h3>Save Tab</h3>
            <form id="saveForm">
              <div class="form-group">
                <label for="title">Title</label>
                <input type="text" id="title" placeholder="Page title" value="${this.currentTab?.title || ''}" required>
              </div>
              <div class="form-group">
                <label for="url">URL</label>
                <input type="url" id="url" placeholder="https://example.com" value="${this.currentTab?.url || ''}" required>
              </div>
              <div class="form-group">
                <label for="collectionSelect">Save to</label>
                <select id="collectionSelect" class="collection-select">
                  ${this.collections.map(collection => 
                    `<option value="${collection.id}">${collection.name} (${collection.tabCount})</option>`
                  ).join('')}
                </select>
              </div>
              <div class="form-group">
                <label for="tags">Tags (comma separated)</label>
                <input type="text" id="tags" placeholder="work, research, todo">
              </div>
              <div class="form-group">
                <label for="note">Note</label>
                <textarea id="note" placeholder="Add a note about this tab..."></textarea>
              </div>
              <button type="submit" class="btn btn-primary">Save Tab</button>
            </form>
          </div>

          <div class="collections-section">
            <div class="collections-header">
              <h3>Your Files</h3>
              <button id="createCollectionBtn" class="btn btn-secondary btn-small">+ New File</button>
            </div>
            
            <div class="collections-list">
              ${this.collections.map(collection => this.renderCollection(collection)).join('')}
            </div>
            
            ${this.collections.length === 0 ? '<p class="no-collections">No files found. Create your first file!</p>' : ''}
          </div>
        </div>
      </div>
    `;
  }

  renderTabsView() {
    return `
      <div class="popup-container">
        <header class="popup-header">
          <div class="header-content">
            <button id="backBtn" class="btn btn-small btn-back">← Back</button>
            <h1>${this.currentCollection?.name || 'Collection'}</h1>
          </div>
          <div class="tab-info">
            <strong>${this.currentTab?.title || 'No tab selected'}</strong>
            <small>${this.currentTab?.url || ''}</small>
          </div>
        </header>

        <div class="popup-content">
          <div class="save-section">
            <h3>Save Tab</h3>
            <form id="saveForm">
              <div class="form-group">
                <label for="title">Title</label>
                <input type="text" id="title" placeholder="Page title" value="${this.currentTab?.title || ''}" required>
              </div>
              <div class="form-group">
                <label for="url">URL</label>
                <input type="url" id="url" placeholder="https://example.com" value="${this.currentTab?.url || ''}" required>
              </div>
              <div class="form-group">
                <label for="tags">Tags (comma separated)</label>
                <input type="text" id="tags" placeholder="work, research, todo">
              </div>
              <div class="form-group">
                <label for="note">Note</label>
                <textarea id="note" placeholder="Add a note about this tab..."></textarea>
              </div>
              <button type="submit" class="btn btn-primary">Save Tab</button>
            </form>
          </div>

          <div class="saved-tabs-section">
            <div class="tabs-header">
              <h3>${this.currentCollection?.name || 'Collection'} (${this.totalTabs})</h3>
              <div class="tabs-controls">
                <input type="text" id="searchInput" placeholder="Search tabs..." class="search-input">
                <select id="filterSelect" class="filter-select">
                  <option value="all">All</option>
                  <option value="unread">Unread</option>
                  <option value="read">Read</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
            </div>
            
            <div class="tabs-list">
              ${this.savedTabs.map(tab => this.renderTab(tab)).join('')}
            </div>
            
            ${this.hasMore ? '<button id="loadMoreBtn" class="btn btn-secondary load-more-btn">Load More</button>' : ''}
            
            ${this.savedTabs.length === 0 ? '<p class="no-tabs">No tabs found. Start saving some tabs!</p>' : ''}
          </div>
        </div>
      </div>
    `;
  }

  renderCollection(collection) {
    const isDefault = collection.id === 'default';
    return `
      <div class="collection-item" data-collection-id="${collection.id}">
        <div class="collection-content">
          <div class="collection-icon">📁</div>
          <div class="collection-info">
            <h4>${collection.name}</h4>
            <p class="collection-stats">
              ${collection.tabCount} tabs • ${collection.unreadCount} unread
            </p>
          </div>
        </div>
        <div class="collection-actions">
          <button class="btn btn-small btn-open-collection" data-collection-id="${collection.id}">Open</button>
          ${!isDefault ? `<button class="btn btn-small btn-danger btn-delete-collection" data-collection-id="${collection.id}">Delete</button>` : ''}
        </div>
      </div>
    `;
  }

  renderTab(tab) {
    const statusClass = tab.status === 'read' ? 'read' : tab.status === 'archived' ? 'archived' : 'unread';
    const readButtonText = tab.status === 'read' ? 'Unread' : 'Read';
    const readButtonClass = tab.status === 'read' ? 'btn-read btn-read-active' : 'btn-read';
    
    return `
      <div class="tab-item ${statusClass}" data-tab-id="${tab.id}">
        <div class="tab-content">
          <h4>${tab.title}</h4>
          <p class="tab-url">${tab.url}</p>
          ${tab.tags.length > 0 ? `<div class="tags">${tab.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}</div>` : ''}
          ${tab.note ? `<p class="note">${tab.note}</p>` : ''}
        </div>
        <div class="tab-actions">
          <button class="btn btn-small btn-open" data-url="${tab.url}">Open</button>
          <button class="btn btn-small ${readButtonClass}" data-tab-id="${tab.id}">${readButtonText}</button>
          <button class="btn btn-small btn-danger btn-delete" data-tab-id="${tab.id}">Delete</button>
        </div>
      </div>
    `;
  }

  attachEventListeners() {
    const saveForm = document.getElementById('saveForm');
    if (saveForm) {
      saveForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const title = document.getElementById('title').value;
        const url = document.getElementById('url').value;
        const tags = document.getElementById('tags').value;
        const note = document.getElementById('note').value;
        const collectionId = document.getElementById('collectionSelect')?.value || 'default';
        
        await this.saveTab(title, url, tags, note, collectionId);
        
        // If in tabs view, reload tabs before rendering
        if (this.view === 'tabs' && this.currentCollection) {
          await this.loadTabsFromCollection(this.currentCollection.id, 1, this.currentFilter, this.searchQuery);
        }

        // Clear form
        document.getElementById('title').value = '';
        document.getElementById('url').value = '';
        document.getElementById('tags').value = '';
        document.getElementById('note').value = '';
        
        // Show success message
        this.showMessage('Tab saved successfully!');
        this.render();
      });
    }

    // Add event delegation for all actions
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('btn-open')) {
        const url = e.target.getAttribute('data-url');
        this.openTab(url);
      } else if (e.target.classList.contains('btn-read')) {
        const tabId = e.target.getAttribute('data-tab-id');
        this.toggleReadStatus(tabId);
      } else if (e.target.classList.contains('btn-delete')) {
        const tabId = e.target.getAttribute('data-tab-id');
        this.handleDelete(tabId);
      } else if (e.target.classList.contains('btn-open-collection')) {
        const collectionId = e.target.getAttribute('data-collection-id');
        const collection = this.collections.find(c => c.id === collectionId);
        if (collection) {
          this.openCollection(collection);
        }
      } else if (e.target.classList.contains('btn-delete-collection')) {
        const collectionId = e.target.getAttribute('data-collection-id');
        this.handleDeleteCollection(collectionId);
      } else if (e.target.id === 'loadMoreBtn') {
        this.loadMoreTabs();
      } else if (e.target.id === 'backBtn') {
        this.backToCollections();
      } else if (e.target.id === 'createCollectionBtn') {
        this.showCreateCollectionDialog();
      }
    });

    // Add search functionality
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
      let searchTimeout;
      searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
          this.searchTabs(e.target.value);
        }, 300);
      });
    }

    // Add filter functionality
    const filterSelect = document.getElementById('filterSelect');
    if (filterSelect) {
      filterSelect.addEventListener('change', async (e) => {
        if (this.currentCollection) {
          await this.loadTabsFromCollection(this.currentCollection.id, 1, e.target.value, this.searchQuery);
          this.render();
        }
      });
    }
  }

  async toggleReadStatus(tabId) {
    const currentTab = this.savedTabs.find(tab => tab.id === tabId);
    if (currentTab) {
      const newStatus = currentTab.status === 'read' ? 'unread' : 'read';
      await this.updateTabStatus(tabId, newStatus);
      if (this.currentCollection) {
        await this.loadTabsFromCollection(this.currentCollection.id, this.currentPage, this.currentFilter, this.searchQuery);
        this.render();
      }
    }
  }

  openTab(url) {
    chrome.tabs.create({ url });
  }

  async handleDelete(tabId) {
    if (confirm('Are you sure you want to delete this tab?')) {
      await this.deleteTabFromStorage(tabId);
      if (this.currentCollection) {
        await this.loadTabsFromCollection(this.currentCollection.id, this.currentPage, this.currentFilter, this.searchQuery);
        this.showMessage('Tab deleted successfully!');
        this.render();
      }
    }
  }

  async handleDeleteCollection(collectionId) {
    if (confirm('Are you sure you want to delete this file? All tabs will be lost.')) {
      await this.deleteCollection(collectionId);
      await this.loadCollections();
      this.showMessage('File deleted successfully!');
      this.render();
    }
  }

  showCreateCollectionDialog() {
    const name = prompt('Enter file name:', '');
    if (name && name.trim()) {
      this.createCollection(name.trim());
      this.showMessage('File created successfully!');
      this.loadCollections().then(() => this.render());
    }
  }

  showMessage(message) {
    const messageEl = document.createElement('div');
    messageEl.className = 'message';
    messageEl.textContent = message;
    document.body.appendChild(messageEl);
    
    setTimeout(() => {
      messageEl.remove();
    }, 3000);
  }
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.popup = new ClearTabMindPopup();
});