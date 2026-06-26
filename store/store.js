/**
 * Hecos Store — Public Website JS
 * Fetches the local catalog (index.json) and renders the public store view.
 */

const STATE = {
  catalog: null,
  packages: [],
  filtered: [],
  currentFilter: 'all',
  searchQuery: ''
};

// ── Initialization ────────────────────────────────────────────────────────────

async function initStore() {
  try {
    const res = await fetch('index.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    
    STATE.catalog = await res.json();
    STATE.packages = STATE.catalog.packages || [];
    STATE.filtered = [...STATE.packages];
    
    buildFilters();
    renderGrid();
    setupSearch();
  } catch (err) {
    console.error("Failed to load store catalog:", err);
    document.getElementById('storeGrid').innerHTML = `
      <div class="store-empty">
        <i class="fas fa-exclamation-triangle" style="color:var(--red)"></i>
        <div style="font-weight:700;margin-bottom:8px;">Failed to load catalog</div>
        <div style="font-size:13px;">${err.message}</div>
      </div>
    `;
  }
}

// ── Filtering & Searching ───────────────────────────────────────────────────

function buildFilters() {
  const container = document.getElementById('storeFilters');
  const types = new Set();
  
  STATE.packages.forEach(p => {
    if (p.type) types.add(p.type);
  });
  
  // Create chips
  const sortedTypes = Array.from(types).sort();
  let html = `<div class="chip active" data-type="all">All Packages</div>`;
  
  sortedTypes.forEach(t => {
    const label = t.replace('_', ' ');
    html += `<div class="chip" data-type="${t}">${label}</div>`;
  });
  
  container.innerHTML = html;
  
  // Attach events
  const chips = container.querySelectorAll('.chip');
  chips.forEach(chip => {
    chip.addEventListener('click', (e) => {
      chips.forEach(c => c.classList.remove('active'));
      e.target.classList.add('active');
      STATE.currentFilter = e.target.dataset.type;
      applyFilters();
    });
  });
}

function setupSearch() {
  const input = document.getElementById('storeSearch');
  input.addEventListener('input', (e) => {
    STATE.searchQuery = e.target.value.toLowerCase().trim();
    applyFilters();
  });
}

function applyFilters() {
  STATE.filtered = STATE.packages.filter(p => {
    // Check type
    if (STATE.currentFilter !== 'all' && p.type !== STATE.currentFilter) {
      return false;
    }
    // Check search
    if (STATE.searchQuery) {
      const hay = [
        p.name || '',
        p.description || '',
        p.author || '',
        (p.tags || []).join(' ')
      ].join(' ').toLowerCase();
      
      if (!hay.includes(STATE.searchQuery)) {
        return false;
      }
    }
    return true;
  });
  
  renderGrid();
}

// ── Rendering ───────────────────────────────────────────────────────────────

function formatBytes(bytes) {
  if (!bytes) return 'Unknown size';
  if (bytes >= 1048576) return (bytes / 1048576).toFixed(1) + ' MB';
  return (bytes / 1024).toFixed(1) + ' KB';
}

function getIconForType(type) {
  const icons = {
    'plugin': 'fas fa-plug',
    'app': 'fas fa-desktop',
    'extension': 'fas fa-puzzle-piece',
    'widget': 'fas fa-chart-pie',
    'theme': 'fas fa-palette',
    'persona': 'fas fa-user-astronaut',
    'skill_pack': 'fas fa-graduation-cap'
  };
  return icons[type] || 'fas fa-box';
}

function renderGrid() {
  const grid = document.getElementById('storeGrid');
  
  if (STATE.filtered.length === 0) {
    grid.innerHTML = `
      <div class="store-empty">
        <i class="fas fa-search"></i>
        <div style="font-weight:700;margin-bottom:8px;">No packages found</div>
        <div style="font-size:13px;">Try adjusting your search or filters.</div>
      </div>
    `;
    return;
  }
  
  let html = '';
  STATE.filtered.forEach(p => {
    const typeLabel = (p.type || 'module').replace('_', ' ');
    const iconClass = getIconForType(p.type);
    const sizeStr = formatBytes(p.size_bytes);
    
    html += `
      <div class="pkg-card">
        <div class="pkg-header">
          <div>
            <div class="pkg-title">${p.name || p.id}</div>
            <div class="pkg-author">by ${p.author || 'Unknown'}</div>
          </div>
          <div class="pkg-type-badge">${typeLabel}</div>
        </div>
        
        <div class="pkg-desc" title="${p.description || ''}">
          ${p.description || 'No description provided.'}
        </div>
        
        <div class="pkg-meta">
          <span title="Version"><i class="fas fa-tag"></i> v${p.version || '1.0.0'}</span>
          <span title="Size"><i class="fas fa-hdd"></i> ${sizeStr}</span>
        </div>
        
        <div class="install-cmd">
          <div class="cmd-text" id="cmd-${p.id}">/hpm install ${p.id}</div>
          <button class="cmd-btn" onclick="copyCmd('cmd-${p.id}')" title="Copy to clipboard">
            <i class="far fa-copy"></i>
          </button>
        </div>
      </div>
    `;
  });
  
  grid.innerHTML = html;
}

// ── Utilities ───────────────────────────────────────────────────────────────

window.copyCmd = function(elementId) {
  const text = document.getElementById(elementId).innerText;
  navigator.clipboard.writeText(text).then(() => {
    // Quick visual feedback
    const btn = document.querySelector(`button[onclick="copyCmd('${elementId}')"]`);
    const icon = btn.querySelector('i');
    icon.className = 'fas fa-check';
    btn.style.color = 'var(--green)';
    
    setTimeout(() => {
      icon.className = 'far fa-copy';
      btn.style.color = '';
    }, 2000);
  });
};

// ── Boot ────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', initStore);
