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

let _detailCarousel = { images: [], index: 0 };

const TYPE_META = {
  plugin:      { label: 'Plugin',      icon: 'fa-plug',              color: '#3b82f6' },
  extension:   { label: 'Extension',   icon: 'fa-puzzle-piece',      color: '#45a29e' },
  app:         { label: 'App',         icon: 'fa-th-large',          color: '#8b5cf6' },
  widget:      { label: 'Widget',      icon: 'fa-expand-arrows-alt', color: '#f59e0b' },
  persona:     { label: 'Persona',     icon: 'fa-user-astronaut',    color: '#ec4899' },
  theme:       { label: 'Theme',       icon: 'fa-palette',           color: '#10b981' },
  skill_pack:  { label: 'Skill Pack',  icon: 'fa-graduation-cap',    color: '#f97316' },
  core_module: { label: 'Core',        icon: 'fa-microchip',         color: '#66fcf1' },
};

function _t(en, it, es) {
  const l = (document.documentElement.lang || 'en').toLowerCase();
  if (l.startsWith('it')) return it;
  if (l.startsWith('es')) return es;
  return en;
}

// ── Initialization ────────────────────────────────────────────────────────────

async function initStore() {
  try {
    const res = await fetch('index.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    
    STATE.catalog = await res.json();
    STATE.packages = STATE.catalog.packages || [];
    STATE.filtered = [...STATE.packages];
    
    // Inject Modal HTML into the DOM
    const modalContainer = document.createElement('div');
    modalContainer.innerHTML = _hpmStoreBuildDetailModal();
    document.body.appendChild(modalContainer);
    
    // Load marked.js for markdown rendering if not present
    if (typeof marked === 'undefined') {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/marked/marked.min.js';
      document.head.appendChild(script);
    }

    buildFilters();
    renderGrid();
    setupSearch();
  } catch (err) {
    console.error("Failed to load store catalog:", err);
    document.getElementById('storeGrid').innerHTML = `
      <div class="store-empty" style="grid-column: 1/-1; text-align: center; padding: 60px 0;">
        <i class="fas fa-exclamation-triangle" style="font-size:32px; color:var(--red); margin-bottom:16px;"></i>
        <div style="font-weight:700;margin-bottom:8px;">Failed to load catalog</div>
        <div style="font-size:13px; color:var(--muted);">${err.message}</div>
      </div>
    `;
  }
}

// ── Filtering & Searching ───────────────────────────────────────────────────

function buildFilters() {
  const container = document.getElementById('storeFilters');
  const types = ['all', ...new Set(STATE.packages.map(p => p.type))];
  const counts = {};
  STATE.packages.forEach(p => { counts[p.type] = (counts[p.type] || 0) + 1; });

  container.innerHTML = types.map(type => {
    const meta = TYPE_META[type] || { label: type, icon: 'fa-cube', color: '#6b7280' };
    const count = type === 'all' ? STATE.packages.length : (counts[type] || 0);
    const isActive = STATE.currentFilter === type;
    return `
      <div class="chip ${isActive ? 'active' : ''}" data-type="${type}"
           style="display:inline-flex;align-items:center;gap:6px;font-size:0.8em;padding:6px 14px;border-radius:20px;cursor:pointer;
                  background:${isActive ? 'rgba(0,217,178,0.15)' : 'var(--bg)'};
                  border:1px solid ${isActive ? 'var(--accent)' : 'var(--border)'};
                  color:${isActive ? 'var(--accent)' : 'var(--muted)'};">
        ${type !== 'all' ? `<i class="fas ${meta.icon}" style="color:${isActive ? 'var(--accent)' : meta.color};"></i>` : '<i class="fas fa-border-all"></i>'}
        ${type === 'all' ? 'All Packages' : meta.label}
        <span style="background:rgba(255,255,255,0.1);padding:1px 6px;border-radius:10px;font-size:0.85em;">${count}</span>
      </div>`;
  }).join('');
  
  const chips = container.querySelectorAll('.chip');
  chips.forEach(chip => {
    chip.addEventListener('click', (e) => {
      STATE.currentFilter = chip.dataset.type;
      buildFilters();
      applyFilters();
    });
  });
}

function setupSearch() {
  const input = document.getElementById('storeSearch');
  if (input) {
    input.addEventListener('input', (e) => {
      STATE.searchQuery = e.target.value.toLowerCase().trim();
      applyFilters();
    });
  }
}

function applyFilters() {
  STATE.filtered = STATE.packages.filter(p => {
    if (STATE.currentFilter !== 'all' && p.type !== STATE.currentFilter) return false;
    if (STATE.searchQuery) {
      const hay = [p.name, p.description, p.author, ...(p.tags || [])].join(' ').toLowerCase();
      if (!hay.includes(STATE.searchQuery)) return false;
    }
    return true;
  });
  renderGrid();
}

// ── Utilities ───────────────────────────────────────────────────────────────

function _hesc(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

window.copyCmd = function(elementId) {
  const text = document.getElementById(elementId).innerText;
  navigator.clipboard.writeText(text).then(() => {
    const btn = document.querySelector(`button[onclick="copyCmd('${elementId}')"]`);
    if(btn) {
      const icon = btn.querySelector('i');
      icon.className = 'fas fa-check';
      btn.style.color = 'var(--green)';
      setTimeout(() => {
        icon.className = 'far fa-copy';
        btn.style.color = 'var(--muted)';
      }, 2000);
    }
  });
};

// ── Rendering ───────────────────────────────────────────────────────────────

function renderGrid() {
  const grid = document.getElementById('storeGrid');
  if (!grid) return;
  
  if (STATE.filtered.length === 0) {
    grid.innerHTML = `
      <div style="text-align:center;padding:50px;color:var(--muted);grid-column:1/-1;">
        <i class="fas fa-box-open" style="font-size:2.5em;opacity:.3;display:block;margin-bottom:12px;"></i>
        <div style="font-size:0.9em;">No modules found.</div>
      </div>`;
    return;
  }
  
  grid.innerHTML = STATE.filtered.map(pkg => _hpmStoreRenderCard(pkg)).join('');
}

function _hpmStoreRenderCard(pkg) {
  const meta = TYPE_META[pkg.type] || { label: pkg.type, icon: 'fa-cube', color: '#6b7280' };
  const sizeFmt = pkg.size_bytes ? `${(pkg.size_bytes / 1024).toFixed(1)} KB` : '';
  const icon = pkg.fa_icon || 'fa-cube';
  const fallbackIcon = 'https://raw.githubusercontent.com/Hecos-Project/Hecos-Packages/main/Hecos_module_Image_preview_square.png';
  const fallbackScreenshot = 'https://raw.githubusercontent.com/Hecos-Project/Hecos-Packages/main/Hecos_module_Image_preview.png';
  const finalIconUrl = pkg.icon_url || fallbackIcon;
  const screenshots = (pkg.screenshots && pkg.screenshots.length > 0) ? pkg.screenshots : [fallbackScreenshot];
  const hasMultiple = screenshots.length > 1;

  const readMoreLabel = _t('Read more', 'Leggi di più', 'Leer más');

  // Direct Command Box for the website
  const installCmdHtml = `
    <div style="display:flex;align-items:center;background:var(--bg);border:1px solid var(--border);border-radius:6px;padding:6px 10px;gap:8px;width:100%;">
      <div id="cmd-${pkg.id}" style="font-family:var(--font-mono);font-size:0.75em;color:var(--accent2);flex-grow:1;user-select:all;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">/hpm install ${pkg.id}</div>
      <button onclick="copyCmd('cmd-${pkg.id}')" style="background:transparent;border:none;color:var(--muted);cursor:pointer;padding:4px;display:flex;align-items:center;justify-content:center;transition:color 0.2s;" onmouseover="this.style.color='var(--text)'" onmouseout="this.style.color='var(--muted)'" title="Copy command">
        <i class="far fa-copy"></i>
      </button>
    </div>`;

  return `
    <div style="background:var(--bg2);border:1px solid var(--border);border-radius:14px;
         padding:18px;display:flex;flex-direction:column;gap:14px;transition:border-color .2s,box-shadow .2s;"
         onmouseover="this.style.borderColor='${meta.color}55';this.style.boxShadow='0 4px 20px ${meta.color}22';"
         onmouseout="this.style.borderColor='var(--border)';this.style.boxShadow='none';">

      <!-- Header -->
      <div style="display:flex;align-items:flex-start;gap:13px;">
        <div style="width:44px;height:44px;border-radius:12px;flex-shrink:0;background:${meta.color}20;
                    display:flex;align-items:center;justify-content:center;overflow:hidden;">
          <img src="${_hesc(finalIconUrl)}" style="width:100%;height:100%;object-fit:cover;border-radius:12px;"
               onerror="this.outerHTML='<i class=\\'fas ${icon}\\' style=\\'color:${meta.color};font-size:18px;\\'></i>'">
        </div>
        <div style="flex:1;min-width:0;">
          <div style="font-weight:700;color:var(--text);font-size:0.95em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${_hesc(pkg.name)}</div>
          <div style="display:flex;align-items:center;gap:6px;margin-top:3px;flex-wrap:wrap;">
            <span style="font-size:0.7em;font-weight:700;letter-spacing:.6px;text-transform:uppercase;color:${meta.color};background:${meta.color}18;padding:2px 7px;border-radius:5px;">${meta.label}</span>
            <span style="font-size:0.72em;color:var(--muted);">v${_hesc(pkg.version)}</span>
            ${sizeFmt ? `<span style="font-size:0.7em;color:var(--muted);">${sizeFmt}</span>` : ''}
          </div>
        </div>
      </div>

      <!-- Screenshot (first image + multi-counter badge) -->
      <div style="width:100%;aspect-ratio:16/9;border-radius:8px;overflow:hidden;border:1px solid rgba(255,255,255,0.08);
                  background:#050505;display:flex;align-items:center;justify-content:center;position:relative;cursor:pointer;"
           onclick="hpmStoreShowReadMe('${pkg.id}')">
        <img src="${_hesc(screenshots[0])}" style="width:100%;height:100%;object-fit:contain;padding:8px;box-sizing:border-box;
             transition:transform 0.3s ease;" onmouseover="this.style.transform='scale(1.04)'" onmouseout="this.style.transform='scale(1)'"
             loading="lazy" onerror="this.parentElement.style.display='none'">
        ${hasMultiple ? `<div style="position:absolute;bottom:7px;right:9px;background:rgba(0,0,0,.65);color:#fff;font-size:0.68em;padding:2px 8px;border-radius:10px;pointer-events:none;font-weight:600;">1 / ${screenshots.length}</div>` : ''}
      </div>

      <!-- Description -->
      <div style="font-size:0.8em;color:var(--muted);line-height:1.5;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">
        ${_hesc(pkg.description || 'No description available.')}
      </div>
      <div style="margin-top:-6px;text-align:right;">
        <span onclick="hpmStoreShowReadMe('${pkg.id}')" style="font-size:0.75em;color:var(--accent);cursor:pointer;font-weight:600;">
          ${readMoreLabel} <i class="fas fa-chevron-right" style="font-size:0.8em;margin-left:2px;"></i>
        </span>
      </div>

      <!-- Tags -->
      ${pkg.tags && pkg.tags.length ? `
        <div style="display:flex;gap:5px;flex-wrap:wrap;">
          ${pkg.tags.slice(0, 4).map(t => `<span style="font-size:0.68em;background:rgba(255,255,255,.06);color:var(--muted);padding:2px 7px;border-radius:5px;">#${_hesc(t)}</span>`).join('')}
        </div>` : ''}

      <!-- Footer Command -->
      <div style="display:flex;align-items:center;justify-content:space-between;margin-top:auto;padding-top:12px;border-top:1px solid var(--border);">
        ${installCmdHtml}
      </div>
    </div>`;
}


// ── Detail Modal HTML skeleton ────────────────────────────────────────────────
function _hpmStoreBuildDetailModal() {
  const closeLabel = _t('Close', 'Chiudi', 'Cerrar');
  return `
    <div id="hpm-store-detail-modal"
         style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.85);z-index:9999;
                align-items:flex-start;justify-content:center;padding:24px;overflow-y:auto;"
         onclick="if(event.target===this)this.style.display='none'">
      <div style="background:var(--bg2);border:1px solid var(--border);border-radius:20px;
                  max-width:800px;width:100%;margin:auto;box-shadow:0 32px 80px rgba(0,0,0,.75);
                  position:relative;overflow:hidden;">

        <!-- Accent band -->
        <div id="hpm-detail-band" style="height:5px;background:linear-gradient(90deg,var(--accent),#7c3aed);"></div>

        <!-- Close X -->
        <button onclick="document.getElementById('hpm-store-detail-modal').style.display='none'"
                style="position:absolute;top:14px;right:14px;background:rgba(255,255,255,.08);border:none;
                       border-radius:50%;width:32px;height:32px;color:var(--text);font-size:1em;cursor:pointer;
                       display:flex;align-items:center;justify-content:center;z-index:2;transition:background .2s;"
                onmouseover="this.style.background='rgba(255,255,255,.18)'"
                onmouseout="this.style.background='rgba(255,255,255,.08)'">
          <i class="fas fa-times"></i>
        </button>

        <!-- Package meta header -->
        <div id="hpm-detail-header" style="padding:24px 28px 0;"></div>

        <!-- Image carousel -->
        <div id="hpm-detail-carousel-wrap" style="display:none;padding:18px 28px 0;">
          <div style="position:relative;border-radius:12px;overflow:hidden;background:#060606;
                      border:1px solid rgba(255,255,255,0.08);aspect-ratio:16/9;">
            <img id="hpm-detail-carousel-img" src="" alt=""
                 style="width:100%;height:100%;object-fit:contain;display:block;cursor:zoom-in;"
                 onclick="window.open(this.src,'_blank')">
            <button id="hpm-carousel-prev" onclick="_hpmCarouselStep(-1)"
                    style="display:none;position:absolute;left:10px;top:50%;transform:translateY(-50%);
                           background:rgba(0,0,0,.6);border:none;border-radius:50%;width:38px;height:38px;
                           color:#fff;font-size:1em;cursor:pointer;align-items:center;justify-content:center;
                           transition:background .2s;"
                    onmouseover="this.style.background='rgba(0,0,0,.9)'"
                    onmouseout="this.style.background='rgba(0,0,0,.6)'">
              <i class="fas fa-chevron-left"></i>
            </button>
            <button id="hpm-carousel-next" onclick="_hpmCarouselStep(1)"
                    style="display:none;position:absolute;right:10px;top:50%;transform:translateY(-50%);
                           background:rgba(0,0,0,.6);border:none;border-radius:50%;width:38px;height:38px;
                           color:#fff;font-size:1em;cursor:pointer;align-items:center;justify-content:center;
                           transition:background .2s;"
                    onmouseover="this.style.background='rgba(0,0,0,.9)'"
                    onmouseout="this.style.background='rgba(0,0,0,.6)'">
              <i class="fas fa-chevron-right"></i>
            </button>
            <div id="hpm-carousel-counter"
                 style="display:none;position:absolute;bottom:10px;right:12px;background:rgba(0,0,0,.65);
                        color:#fff;font-size:0.72em;padding:3px 9px;border-radius:12px;
                        pointer-events:none;font-weight:600;letter-spacing:.4px;"></div>
          </div>
          <!-- Thumbnail strip -->
          <div id="hpm-carousel-thumbs" style="display:flex;gap:7px;margin-top:10px;overflow-x:auto;padding-bottom:4px;"></div>
        </div>

        <!-- README content -->
        <div style="padding:22px 28px 4px;">
          <div id="hpm-store-detail-content" style="color:var(--text);font-size:0.88em;line-height:1.75;"></div>
        </div>

        <!-- Footer -->
        <div style="padding:16px 28px 22px;border-top:1px solid var(--border);
                    display:flex;align-items:center;justify-content:flex-end;gap:10px;">
          <div id="hpm-detail-install-btn" style="flex:1;"></div>
          <button onclick="document.getElementById('hpm-store-detail-modal').style.display='none'"
                  style="background:var(--bg);border:1px solid var(--border);color:var(--text);border-radius:8px;padding:8px 16px;cursor:pointer;font-size:0.85em;transition:background 0.2s;"
                  onmouseover="this.style.background='rgba(255,255,255,0.05)'" onmouseout="this.style.background='var(--bg)'">${closeLabel}</button>
        </div>
      </div>
    </div>`;
}

// ── Carousel logic ────────────────────────────────────────────────────────────
window._hpmCarouselStep = function (dir) {
  const imgs = _detailCarousel.images;
  if (!imgs.length) return;
  _detailCarousel.index = (_detailCarousel.index + dir + imgs.length) % imgs.length;
  _hpmCarouselRender();
};

window._hpmCarouselGoto = function (i) {
  _detailCarousel.index = i;
  _hpmCarouselRender();
};

function _hpmCarouselRender() {
  const { images, index } = _detailCarousel;
  const img     = document.getElementById('hpm-detail-carousel-img');
  const counter = document.getElementById('hpm-carousel-counter');
  const prev    = document.getElementById('hpm-carousel-prev');
  const next    = document.getElementById('hpm-carousel-next');
  const thumbs  = document.getElementById('hpm-carousel-thumbs');
  if (!img) return;

  img.src = images[index];
  const multi = images.length > 1;

  if (counter) { counter.textContent = `${index + 1} / ${images.length}`; counter.style.display = multi ? 'block' : 'none'; }
  if (prev)    { prev.style.display  = multi ? 'flex' : 'none'; }
  if (next)    { next.style.display  = multi ? 'flex' : 'none'; }

  if (thumbs) {
    if (multi) {
      thumbs.innerHTML = images.map((src, i) => `
        <img src="${_hesc(src)}" onclick="_hpmCarouselGoto(${i})"
             style="width:74px;height:46px;object-fit:cover;border-radius:6px;cursor:pointer;flex-shrink:0;
                    border:2px solid ${i === index ? 'var(--accent)' : 'rgba(255,255,255,.12)'};
                    opacity:${i === index ? '1' : '0.5'};transition:opacity .2s,border-color .2s;"
             onerror="this.style.display='none'">`).join('');
    } else {
      thumbs.innerHTML = '';
    }
  }
}

// ── "Read More" / Detail show ─────────────────────────────────────────────────
window.hpmStoreShowReadMe = async function (pkgId) {
  const pkg = STATE.catalog?.packages?.find(p => p.id === pkgId);
  if (!pkg) return;

  const meta   = TYPE_META[pkg.type] || { label: pkg.type, icon: 'fa-cube', color: '#6b7280' };
  const modal  = document.getElementById('hpm-store-detail-modal');
  const content = document.getElementById('hpm-store-detail-content');
  const headerEl = document.getElementById('hpm-detail-header');
  const band   = document.getElementById('hpm-detail-band');
  const carouselWrap = document.getElementById('hpm-detail-carousel-wrap');
  const installBtn = document.getElementById('hpm-detail-install-btn');

  if (band) band.style.background = `linear-gradient(90deg,${meta.color},${meta.color}88)`;

  const sizeFmt = pkg.size_bytes ? `${(pkg.size_bytes / 1024).toFixed(1)} KB` : '';
  const fallbackIcon = 'https://raw.githubusercontent.com/Hecos-Project/Hecos-Packages/main/Hecos_module_Image_preview_square.png';
  const iconUrl = pkg.icon_url || fallbackIcon;
  const icon = pkg.fa_icon || 'fa-cube';

  if (headerEl) headerEl.innerHTML = `
    <div style="display:flex;align-items:flex-start;gap:18px;">
      <div style="width:60px;height:60px;border-radius:16px;flex-shrink:0;background:${meta.color}18;
                  display:flex;align-items:center;justify-content:center;overflow:hidden;
                  border:1px solid ${meta.color}33;">
        <img src="${_hesc(iconUrl)}" style="width:100%;height:100%;object-fit:cover;"
             onerror="this.outerHTML='<i class=\\'fas ${icon}\\' style=\\'font-size:24px;color:${meta.color};\\'></i>'">
      </div>
      <div style="flex:1;min-width:0;">
        <div style="font-size:1.2em;font-weight:800;color:var(--text);line-height:1.2;">${_hesc(pkg.name)}</div>
        <div style="display:flex;align-items:center;gap:8px;margin-top:7px;flex-wrap:wrap;">
          <span style="font-size:0.7em;font-weight:700;letter-spacing:.6px;text-transform:uppercase;
                       color:${meta.color};background:${meta.color}18;padding:2px 8px;border-radius:5px;">
            <i class="fas ${meta.icon}" style="margin-right:4px;"></i>${meta.label}
          </span>
          <span style="font-size:0.75em;color:var(--muted);">v${_hesc(pkg.version)}</span>
          ${sizeFmt ? `<span style="font-size:0.72em;color:var(--muted);"><i class="fas fa-weight-hanging" style="margin-right:3px;opacity:.4;"></i>${sizeFmt}</span>` : ''}
          <span style="font-size:0.72em;color:var(--muted);"><i class="fas fa-user" style="margin-right:3px;opacity:.4;"></i>${_hesc(pkg.author || 'Unknown')}</span>
        </div>
        ${pkg.description ? `<div style="font-size:0.83em;color:var(--muted);margin-top:9px;line-height:1.55;">${_hesc(pkg.description)}</div>` : ''}
        ${pkg.tags && pkg.tags.length ? `
          <div style="display:flex;gap:5px;flex-wrap:wrap;margin-top:8px;">
            ${pkg.tags.map(t => `<span style="font-size:0.67em;background:rgba(255,255,255,.07);color:var(--muted);padding:2px 7px;border-radius:5px;">#${_hesc(t)}</span>`).join('')}
          </div>` : ''}
      </div>
    </div>`;

  if (installBtn) {
    installBtn.innerHTML = `
    <div style="display:flex;align-items:center;background:var(--bg);border:1px solid var(--border);border-radius:6px;padding:6px 10px;gap:8px;max-width:300px;">
      <div id="cmd-modal-${pkg.id}" style="font-family:var(--font-mono);font-size:0.75em;color:var(--accent2);flex-grow:1;user-select:all;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">/hpm install ${pkg.id}</div>
      <button onclick="copyCmd('cmd-modal-${pkg.id}')" style="background:transparent;border:none;color:var(--muted);cursor:pointer;padding:4px;display:flex;align-items:center;justify-content:center;transition:color 0.2s;" onmouseover="this.style.color='var(--text)'" onmouseout="this.style.color='var(--muted)'" title="Copy command">
        <i class="far fa-copy"></i>
      </button>
    </div>`;
  }

  const fallbackShot = 'https://raw.githubusercontent.com/Hecos-Project/Hecos-Packages/main/Hecos_module_Image_preview.png';
  const screenshots  = (pkg.screenshots && pkg.screenshots.length > 0) ? pkg.screenshots : [fallbackShot];
  _detailCarousel    = { images: screenshots, index: 0 };
  if (carouselWrap) {
    carouselWrap.style.display = 'block';
    _hpmCarouselRender();
  }

  modal.style.display = 'flex';
  content.innerHTML   = '<div style="text-align:center;padding:30px;"><i class="fas fa-spinner fa-spin fa-2x" style="opacity:.35;"></i></div>';

  let mdText = null;
  try {
    if (pkg.readme_url) {
      const res = await fetch(pkg.readme_url);
      if (res.ok) mdText = await res.text();
    }
    if (!mdText) {
      const fallbackReadme = `https://raw.githubusercontent.com/Hecos-Project/Hecos-Packages/main/${pkg.id}_src/README.md`;
      const res = await fetch(fallbackReadme);
      if (res.ok) mdText = await res.text();
    }
  } catch (e) {
    console.error('[HPM Store] Failed to fetch README', e);
  }

  if (mdText) {
    if (typeof marked !== 'undefined') {
      content.innerHTML = `
        <div class="hpm-readme-body" style="--hpm-c:${meta.color};">
          ${marked.parse(mdText)}
        </div>
        <style>
          .hpm-readme-body h1,.hpm-readme-body h2,.hpm-readme-body h3{color:var(--text);margin:1.1em 0 .4em;font-weight:700;}
          .hpm-readme-body h1{font-size:1.3em;}
          .hpm-readme-body h2{font-size:1.1em;border-bottom:1px solid var(--border);padding-bottom:.35em;}
          .hpm-readme-body h3{font-size:1em;}
          .hpm-readme-body a{color:var(--hpm-c);text-decoration:none;}
          .hpm-readme-body a:hover{text-decoration:underline;}
          .hpm-readme-body code{background:rgba(255,255,255,.09);padding:2px 6px;border-radius:4px;font-size:0.85em;font-family:monospace;}
          .hpm-readme-body pre{background:rgba(0,0,0,.4);border:1px solid var(--border);border-radius:10px;padding:16px;overflow-x:auto;margin:12px 0;}
          .hpm-readme-body pre code{background:none;padding:0;}
          .hpm-readme-body blockquote{border-left:3px solid var(--hpm-c);margin:0 0 0 4px;padding:4px 14px;color:var(--muted);font-style:italic;}
          .hpm-readme-body img{max-width:100%;border-radius:10px;margin:6px 0;}
          .hpm-readme-body table{width:100%;border-collapse:collapse;font-size:0.85em;margin:10px 0;}
          .hpm-readme-body th,.hpm-readme-body td{border:1px solid var(--border);padding:7px 10px;}
          .hpm-readme-body th{background:rgba(255,255,255,.06);font-weight:700;}
          .hpm-readme-body hr{border:none;border-top:1px solid var(--border);margin:16px 0;}
          .hpm-readme-body ul,.hpm-readme-body ol{padding-left:20px;margin:6px 0;}
          .hpm-readme-body li{margin:3px 0;}
        </style>`;
    } else {
      content.innerHTML = `<pre style="white-space:pre-wrap;font-family:inherit;font-size:0.87em;line-height:1.6;">${_hesc(mdText)}</pre>`;
    }
  } else {
    const noDocTitle = _t('No documentation available', 'Nessuna documentazione disponibile', 'Sin documentación disponible');
    const noDocSub   = _t(
      'You can still install this module via the command below and explore its features directly.',
      'Puoi comunque installare questo modulo col comando sottostante ed esplorarne le funzionalità.',
      'Aún puedes instalar este módulo con el comando a continuación y explorar sus funciones.'
    );
    const githubLabel = _t('View on GitHub', 'Vedi su GitHub', 'Ver en GitHub');
    content.innerHTML = `
      <div style="text-align:center;padding:36px 20px;">
        <div style="width:64px;height:64px;border-radius:50%;background:${meta.color}12;display:inline-flex;
                    align-items:center;justify-content:center;margin-bottom:16px;border:1px solid ${meta.color}25;">
          <i class="fas fa-file-alt" style="font-size:1.6em;color:${meta.color};opacity:.6;"></i>
        </div>
        <div style="font-weight:700;font-size:1.05em;color:var(--text);margin-bottom:8px;">${noDocTitle}</div>
        <div style="font-size:0.83em;color:var(--muted);line-height:1.6;max-width:380px;margin:0 auto;">${noDocSub}</div>
        ${pkg.homepage_url ? `
          <a href="${_hesc(pkg.homepage_url)}" target="_blank" rel="noopener"
             style="display:inline-flex;align-items:center;gap:7px;margin-top:20px;
                    color:${meta.color};font-size:0.83em;font-weight:600;text-decoration:none;
                    border:1px solid ${meta.color}44;padding:7px 16px;border-radius:8px;
                    transition:background .2s;" onmouseover="this.style.background='${meta.color}18'"
             onmouseout="this.style.background='transparent'">
            <i class="fas fa-external-link-alt"></i>${githubLabel}
          </a>` : ''}
      </div>`;
  }
};

// ── Boot ────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', initStore);
