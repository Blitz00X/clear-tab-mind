// Popup script for Clear Tab Mind extension

class ClearTabMindPopup {
  constructor() {
    this.currentTab = null;
    this.savedTabs = [];
    this.init();
  }

  async init() {
    await this.getCurrentTab();
    await this.loadSavedTabs();
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

  async loadSavedTabs() {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: 'getSavedTabs' }, (response) => {
        this.savedTabs = response.tabs;
        resolve(response.tabs);
      });
    });
  }

  async saveCurrentTab(tags = '', note = '') {
    if (!this.currentTab) return;

    const tabData = {
      title: this.currentTab.title,
      url: this.currentTab.url,
      tags: tags.split(',').map(tag => tag.trim()).filter(Boolean),
      note: note
    };

    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: 'saveTab', ...tabData }, (response) => {
        if (response.success) {
          this.savedTabs.unshift(response.tab);
          this.render();
        }
        resolve(response);
      });
    });
  }

  async updateTabStatus(tabId, status) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ 
        action: 'updateTabStatus', 
        tabId, 
        status 
      }, (response) => {
        if (response.success) {
          this.loadSavedTabs().then(() => this.render());
        }
        resolve(response);
      });
    });
  }

  async deleteTab(tabId) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ 
        action: 'deleteTab', 
        tabId 
      }, (response) => {
        if (response.success) {
          this.loadSavedTabs().then(() => this.render());
        }
        resolve(response);
      });
    });
  }

  render() {
    const root = document.getElementById('root');
    root.innerHTML = `
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
            <h3>Save Current Tab</h3>
            <form id="saveForm">
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
            <h3>Saved Tabs (${this.savedTabs.length})</h3>
            <div class="tabs-list">
              ${this.savedTabs.slice(0, 5).map(tab => this.renderTab(tab)).join('')}
            </div>
            ${this.savedTabs.length > 5 ? '<p class="more-tabs">... and ' + (this.savedTabs.length - 5) + ' more</p>' : ''}
          </div>
        </div>
      </div>
    `;
  }

  renderTab(tab) {
    const statusClass = tab.status === 'read' ? 'read' : tab.status === 'archived' ? 'archived' : 'unread';
    return `
      <div class="tab-item ${statusClass}" data-tab-id="${tab.id}">
        <div class="tab-content">
          <h4>${tab.title}</h4>
          <p class="tab-url">${tab.url}</p>
          ${tab.tags.length > 0 ? `<div class="tags">${tab.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}</div>` : ''}
          ${tab.note ? `<p class="note">${tab.note}</p>` : ''}
        </div>
        <div class="tab-actions">
          <button class="btn btn-small" onclick="window.popup.openTab('${tab.url}')">Open</button>
          <button class="btn btn-small" onclick="window.popup.markAsRead('${tab.id}')">Read</button>
          <button class="btn btn-small btn-danger" onclick="window.popup.deleteTab('${tab.id}')">Delete</button>
        </div>
      </div>
    `;
  }

  attachEventListeners() {
    const saveForm = document.getElementById('saveForm');
    if (saveForm) {
      saveForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const tags = document.getElementById('tags').value;
        const note = document.getElementById('note').value;
        await this.saveCurrentTab(tags, note);
        
        // Clear form
        document.getElementById('tags').value = '';
        document.getElementById('note').value = '';
        
        // Show success message
        this.showMessage('Tab saved successfully!');
      });
    }
  }

  async markAsRead(tabId) {
    await this.updateTabStatus(tabId, 'read');
  }

  openTab(url) {
    chrome.tabs.create({ url });
  }

  async deleteTab(tabId) {
    if (confirm('Are you sure you want to delete this tab?')) {
      await this.deleteTab(tabId);
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