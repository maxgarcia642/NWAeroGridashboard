/* script.js - enhanced interactions for Frutiger Aero portfolio
   - smooth scroll with refined easing
   - enhanced reveal animations with stagger
   - terminal snippet fetch + improved feedback
   - posts carousel (smooth & responsive)
   - pixel art 16x16 editor with animation feedback
   - subtle background drift
   - interactive hover states
*/

/* ---------- Utilities ---------- */
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => Array.from((ctx || document).querySelectorAll(sel));

/* ---------- Easing functions for smooth animations ---------- */
const easing = {
  easeInOutCubic: (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
  easeOutQuad: (t) => 1 - (1 - t) * (1 - t),
  easeOutCubic: (t) => 1 - Math.pow(1 - t, 3),
};

/* ---------- Smooth scroll with refined timing ---------- */
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', (e) => {
    const href = a.getAttribute('href');
    if (!href || href === '#') return;
    const target = document.querySelector(href);
    if (!target) return;
    e.preventDefault();
    
    const start = window.scrollY;
    const end = target.getBoundingClientRect().top + window.scrollY;
    const distance = end - start;
    const duration = 800;
    let startTime = null;
    
    const scroll = (currentTime) => {
      if (startTime === null) startTime = currentTime;
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = easing.easeInOutCubic(progress);
      window.scrollTo(0, start + distance * ease);
      
      if (progress < 1) {
        requestAnimationFrame(scroll);
      } else {
        setTimeout(() => {
          target.querySelector('h1,h2,h3,p')?.focus?.();
        }, 100);
      }
    };
    
    requestAnimationFrame(scroll);
  });
});

/* ---------- Enhanced reveal with stagger ---------- */
const reveals = Array.from(document.querySelectorAll('.reveal'));
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('in-view');
      // subtle stagger for child elements
      const children = entry.target.querySelectorAll('.card > h1, .card > h2, .card > p:first-of-type');
      children.forEach((child, i) => {
        child.style.animation = `none`;
        setTimeout(() => {
          child.style.opacity = '0';
          child.style.transform = 'translateY(8px)';
          child.offsetHeight;
          child.style.transition = `opacity 0.5s ease ${i * 0.08}s, transform 0.5s ease ${i * 0.08}s`;
          child.style.opacity = '1';
          child.style.transform = 'translateY(0)';
        }, 0);
      });
    }
  });
}, { threshold: 0.12 });

reveals.forEach(r => revealObserver.observe(r));

/* ---------- Terminals: enhanced fetch with visual feedback ---------- */
const terminalCards = Array.from(document.querySelectorAll('.terminal-card'));
const FALLBACK = {
  python: `# Example Python (fallback)
def hello_world():
    print("Hello, World!")
hello_world()`,
  java: `// Example Java (fallback)
public class HelloWorld {
  public static void main(String[] args) {
    System.out.println("Hello, World!");
  }
}`,
  cpp: `// Example C++ (fallback)
#include <iostream>
int main(){
  std::cout << "Hello, world!" << std::endl;
  return 0;
}`,
  html: `<!-- Example HTML (fallback) -->
<section><h1>Welcome</h1><p>Example snippet.</p></section>`,
  js: `// Example JS (fallback)
console.log('Hello, world!');`,
  css: `/* Example CSS (fallback) */
body { font-family: sans-serif; }`
};

async function fetchWithTimeout(url, ms = 4000) {
  try {
    const ctrl = new AbortController();
    const id = setTimeout(() => ctrl.abort(), ms);
    const res = await fetch(url, { signal: ctrl.signal });
    clearTimeout(id);
    if (!res.ok) return null;
    const text = await res.text();
    return text;
  } catch (e) {
    return null;
  }
}

function tinyHighlight(code, lang) {
  if (!code) return '';
  const esc = code.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
  if (lang === 'python') return esc.replace(/\b(def|return|if|else|elif|for|while|import|from|class|print)\b/g, '<span class="kw">$1</span>');
  if (lang === 'java') return esc.replace(/\b(public|static|void|class|new|return|if|else|for|while|System\.out\.println)\b/g, '<span class="kw">$1</span>');
  if (lang === 'cpp') return esc.replace(/\b(int|return|#include|std::cout|using|namespace|class|for|while)\b/g, '<span class="kw">$1</span>');
  if (lang === 'html') return esc.replace(/(&lt;!--[\s\S]*?--&gt;)/g, '<span class="comm">$1</span>').replace(/(&lt;\/?[a-zA-Z0-9-:]+)(\s|&gt;)/g, '<span class="tag">$1</span>$2');
  if (lang === 'js') return esc.replace(/\b(function|return|var|let|const|if|else|for|while|console\.log)\b/g, '<span class="kw">$1</span>').replace(/(\/\/.+)/g, '<span class="comm">$1</span>');
  if (lang === 'css') return esc.replace(/([.#]?[a-zA-Z0-9\-_]+)(\s*\{)/g, '<span class="tag">$1</span>$2').replace(/(\/\*.+?\*\/)/g, '<span class="comm">$1</span>');
  if (lang === 'markdown') return esc.replace(/^(#+ .+)$/gm, '<span class="tag">$1</span>').replace(/(\*\*.+?\*\*)/g, '<span class="kw">$1</span>');
  return esc;
}

terminalCards.forEach(async card => {
  const codeEl = card.querySelector('code');
  const lang = codeEl.getAttribute('data-lang') || 'text';
  const raw = card.dataset.raw || '';
  let content = null;
  
  // show loading state
  codeEl.style.opacity = '0.6';
  
  if (raw) {
    content = await fetchWithTimeout(raw, 3500);
  }
  
  if (!content) {
    content = FALLBACK[lang] || FALLBACK['html'];
  }
  
  codeEl.innerHTML = tinyHighlight(content, lang);
  
  // fade in with smooth transition
  codeEl.style.transition = 'opacity 0.4s ease';
  codeEl.style.opacity = '1';
  
  // Add copy button if not present
  let copyBtn = card.querySelector('.copy-btn');
  if (!copyBtn) {
    copyBtn = document.createElement('button');
    copyBtn.className = 'copy-btn';
    copyBtn.textContent = 'Copy';
    card.querySelector('.term-header')?.appendChild(copyBtn);
  }
  
  copyBtn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(content);
      const originalText = copyBtn.textContent;
      copyBtn.textContent = '✓ Copied!';
      copyBtn.style.background = 'rgba(44, 230, 155, 0.15)';
      copyBtn.style.color = '#2CE69B';
      
      setTimeout(() => {
        copyBtn.textContent = originalText;
        copyBtn.style.background = '';
        copyBtn.style.color = '';
      }, 1600);
    } catch (e) {
      copyBtn.textContent = '✗ Failed';
      setTimeout(() => { copyBtn.textContent = 'Copy'; }, 1200);
    }
  });
});

/* ---------- Posts carousel (smooth & responsive) ---------- */
function initCarousel() {
  const prev = $('.carousel-btn.prev'),
        next = $('.carousel-btn.next'),
        track = $('.carousel-track');
  if (!track || !prev || !next) return;

  const items = Array.from(track.children);
  if (items.length === 0) return;
  
  let idx = 0;

  const getVisibleCount = () => {
    const trackW = track.clientWidth;
    const firstItem = items[0];
    if (!firstItem) return 1;
    const cardW = firstItem.getBoundingClientRect().width + 18;
    return Math.max(1, Math.floor(trackW / cardW));
  };

  const scrollToIndex = () => {
    if (items.length === 0) return;
    const firstItem = items[0];
    const cardW = firstItem.getBoundingClientRect().width + 18;
    track.scrollTo({
      left: idx * cardW,
      behavior: 'smooth'
    });
  };

  prev.addEventListener('click', () => {
    idx = Math.max(0, idx - 1);
    scrollToIndex();
  });
  
  next.addEventListener('click', () => {
    const maxIdx = Math.max(0, items.length - getVisibleCount());
    idx = Math.min(maxIdx, idx + 1);
    scrollToIndex();
  });

  const debounce = (fn, wait) => {
    let t; return () => { clearTimeout(t); t = setTimeout(fn, wait); };
  };
  
  window.addEventListener('resize', debounce(() => {
    const ratio = track.scrollWidth > 0 ? track.scrollLeft / track.scrollWidth : 0;
    scrollToIndex();
    track.scrollLeft = ratio * track.scrollWidth;
  }, 150));

  scrollToIndex();
}

// Initialize carousel on load and when projects are updated
initCarousel();

/* ---------- Pixel Art 16x16 with enhanced animations ---------- */
class PixelStudio {
  constructor() {
    this.GRID = 16;
    this.gridEl = document.getElementById('pixelCanvas');
    this.colorPicker = document.getElementById('colorPicker');
    this.eraserBtn = document.getElementById('eraser');
    this.clearBtn = document.getElementById('clearCanvas');
    this.undoBtn = document.getElementById('undo');
    this.saveBtn = document.getElementById('saveImage');
    this.currentColor = this.colorPicker?.value || '#000000';
    this.isEraser = false;
    this.isDown = false;
    this.history = [];
    this._createGrid();
    this._bind();
  }
  
  _createGrid() {
    this.gridEl.innerHTML = '';
    for (let i = 0; i < this.GRID * this.GRID; i++) {
      const cell = document.createElement('div');
      cell.className = 'pixel';
      cell.dataset.index = i;
      cell.style.background = '#ffffff';
      this.gridEl.appendChild(cell);
    }
  }
  
  _pushHistory() {
    const snap = Array.from(this.gridEl.children).map(c => c.style.background || '#ffffff');
    this.history.push(snap);
    if (this.history.length > 60) this.history.shift();
  }
  
  _undo() {
    if (!this.history.length) return;
    const arr = this.history.pop();
    Array.from(this.gridEl.children).forEach((c, i) => {
      c.style.transition = 'background 0.12s ease';
      c.style.background = arr[i] || '#ffffff';
    });
  }
  
  _bind() {
    const cells = this.gridEl;
    
    cells.addEventListener('pointerdown', (e) => {
      const t = e.target;
      if (!t.classList.contains('pixel')) return;
      this._pushHistory();
      this.isDown = true;
      this._paint(t);
    });
    
    window.addEventListener('pointerup', () => this.isDown = false);
    
    cells.addEventListener('pointermove', (e) => {
      if (!this.isDown) return;
      const el = document.elementFromPoint(e.clientX, e.clientY);
      if (el && el.classList.contains('pixel')) this._paint(el);
    });
    
    cells.addEventListener('click', (e) => {
      const t = e.target;
      if (!t.classList.contains('pixel')) return;
      this._pushHistory();
      this._paint(t);
    });
    
    this.colorPicker?.addEventListener('input', (e) => {
      this.currentColor = e.target.value;
      this.isEraser = false;
      this.eraserBtn.classList.remove('active');
    });
    
    this.eraserBtn?.addEventListener('click', () => {
      this.isEraser = !this.isEraser;
      this.eraserBtn.classList.toggle('active', this.isEraser);
    });
    
    this.clearBtn?.addEventListener('click', () => {
      this._pushHistory();
      Array.from(this.gridEl.children).forEach((c, i) => {
        c.style.transition = `background 0.08s ease ${i * 0.004}s`;
        c.style.background = '#ffffff';
      });
    });
    
    this.undoBtn?.addEventListener('click', () => this._undo());
    this.saveBtn?.addEventListener('click', () => this._savePNG());
    
    window.addEventListener('keydown', (e) => {
      if (e.key === 'c') {
        this._pushHistory();
        Array.from(this.gridEl.children).forEach((c, i) => {
          c.style.transition = `background 0.08s ease ${i * 0.004}s`;
          c.style.background = '#ffffff';
        });
      }
      if (e.key === 'z') this._undo();
      if (e.key === 's') this._savePNG();
    });
  }
  
  _paint(cell) {
    cell.style.background = this.isEraser ? '#ffffff' : this.currentColor;
  }
  
  _savePNG() {
    const off = document.createElement('canvas');
    off.width = this.GRID; off.height = this.GRID;
    const ctx = off.getContext('2d');
    const cells = Array.from(this.gridEl.children);
    
    cells.forEach((c, i) => {
      const x = i % this.GRID;
      const y = Math.floor(i / this.GRID);
      ctx.fillStyle = window.getComputedStyle(c).backgroundColor || '#ffffff';
      ctx.fillRect(x, y, 1, 1);
    });
    
    const scale = 16;
    const out = document.createElement('canvas');
    out.width = this.GRID * scale; out.height = this.GRID * scale;
    const octx = out.getContext('2d');
    octx.imageSmoothingEnabled = false;
    octx.drawImage(off, 0, 0, out.width, out.height);
    
    out.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'pixel-art.png';
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
      
      // visual feedback
      this.saveBtn.textContent = '✓ Saved!';
      this.saveBtn.style.background = 'linear-gradient(90deg, #308a11, #2CE69B)';
      this.saveBtn.style.color = 'white';
      setTimeout(() => {
        this.saveBtn.textContent = 'Save PNG';
        this.saveBtn.style.background = '';
        this.saveBtn.style.color = '';
      }, 1400);
    }, 'image/png');
  }
}

/* ---------- Gentle scroll-based drift ---------- */
function onScrollDrift() {
  const docH = document.documentElement.scrollHeight - window.innerHeight;
  const sc = docH > 0 ? window.scrollY / docH : 0;
  const drift1 = 30 + sc * 6;
  const drift2 = 70 - sc * 6;
  const drift3 = 40 + sc * 4;
  document.body.style.backgroundPosition = `${drift1}% ${15 + sc * 6}%, ${drift2}% ${80 - sc * 6}%, ${drift3}% ${65 - sc * 4}%`;
}

window.addEventListener('scroll', onScrollDrift, { passive: true });
onScrollDrift();

/* ---------- Init on DOMContentLoaded ---------- */
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.reveal').forEach(el => {
    if (el.getBoundingClientRect().top < window.innerHeight * 0.86) {
      el.classList.add('in-view');
    }
  });
  
  window.pixelStudio = new PixelStudio();
  
  // Dynamic GitHub Code Fetcher
  initGitHubCode();
});

async function initGitHubCode() {
  const repo = 'maxgarcia642/maxgarcia642.github.io';
  const grid = document.getElementById('github-terminals');
  if (!grid) return;

  try {
    const res = await fetch(`https://api.github.com/repos/${repo}/contents`);
    if (!res.ok) throw new Error('Failed to fetch repo contents');
    const files = await res.json();
    
    // Filter for code files and limit to prevent massive API usage if repo grows huge
    const allowedExts = ['.html', '.css', '.js', '.json', '.py', '.java', '.cpp', '.md', '.replit', '.gitignore'];
    const codeFiles = files.filter(f => f.type === 'file' && allowedExts.some(ext => f.name.endsWith(ext)));

    grid.innerHTML = '';
    
    for (const file of codeFiles) {
      const card = document.createElement('article');
      card.className = 'terminal-card floating';
      card.dataset.raw = file.download_url;
      
      const ext = file.name.split('.').pop();
      const langMap = { 'js': 'js', 'html': 'html', 'css': 'css', 'py': 'python', 'java': 'java', 'cpp': 'cpp', 'json': 'js', 'md': 'markdown', 'replit': 'text', 'gitignore': 'text' };
      const lang = langMap[ext] || 'text';

      card.innerHTML = `
        <header class="term-header">
          <div class="traffic"><span class="dot red"></span><span class="dot yellow"></span><span class="dot green"></span></div>
          <div class="term-title">${file.name}</div>
        </header>
        <pre class="terminal"><code data-lang="${lang}">// Loading...</code></pre>
        <a class="code-link" href="${file.html_url}" target="_blank" rel="noopener">Open on GitHub</a>
      `;
      
      grid.appendChild(card);
      fetchAndHighlight(card);
    }
  } catch (e) {
    console.error('GitHub fetch error:', e);
    grid.innerHTML = '<p class="muted">Failed to load live code from GitHub.</p>';
  }
}

async function fetchAndHighlight(card) {
  const codeEl = card.querySelector('code');
  const lang = codeEl.getAttribute('data-lang') || 'text';
  const raw = card.dataset.raw || '';
  
  const content = await fetchWithTimeout(raw, 5000);
  if (content) {
    codeEl.innerHTML = tinyHighlight(content, lang);
    
    const copyBtn = document.createElement('button');
    copyBtn.className = 'copy-btn';
    copyBtn.textContent = 'Copy';
    card.querySelector('.term-header')?.appendChild(copyBtn);
    
    copyBtn.addEventListener('click', async () => {
      await navigator.clipboard.writeText(content);
      copyBtn.textContent = '✓ Copied!';
      setTimeout(() => { copyBtn.textContent = 'Copy'; }, 1600);
    });
  } else {
    codeEl.textContent = '// Failed to load code.';
  }
}

/* ---------- Project viewer modal ---------- */
(function(){
  const modal = document.createElement('div');
  modal.className = 'viewer-modal';
  modal.innerHTML = `
    <div class="viewer-panel" role="dialog" aria-modal="true" tabindex="-1">
      <div class="viewer-header">
        <div class="viewer-title">Project Preview</div>
        <div>
          <button class="viewer-close" aria-label="Close preview">✕</button>
        </div>
      </div>
      <div class="viewer-body">
        <iframe src="" title="Project preview" allow="fullscreen; clipboard-read; clipboard-write"></iframe>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  const panel = modal.querySelector('.viewer-panel');
  const iframe = modal.querySelector('iframe');
  const closeBtn = modal.querySelector('.viewer-close');
  const titleEl = modal.querySelector('.viewer-title');
  let currentOriginalUrl = null;
  let currentIsGoogleDocs = false;

  function openViewer(src, title = 'Project Preview', originalUrl = null, isGoogleDocs = false) {
    iframe.src = src;
    currentOriginalUrl = originalUrl || src;
    currentIsGoogleDocs = isGoogleDocs;
    titleEl.textContent = title;
    
    // Update or create "Open in new tab" button
    let openBtn = panel.querySelector('.viewer-open-new');
    if (isGoogleDocs && originalUrl) {
      if (!openBtn) {
        openBtn = document.createElement('a');
        openBtn.className = 'viewer-open-new';
        openBtn.href = originalUrl;
        openBtn.target = '_blank';
        openBtn.rel = 'noopener';
        openBtn.textContent = 'Open in Google Docs';
        // Styles are handled by CSS class
        panel.querySelector('.viewer-header > div').insertBefore(openBtn, closeBtn);
      } else {
        openBtn.href = originalUrl;
        openBtn.style.display = 'block';
      }
    } else if (openBtn) {
      openBtn.style.display = 'none';
    }
    
    modal.classList.add('open');
    panel.focus();
    document.documentElement.style.overflow = 'hidden';
  }

  function closeViewer() {
    modal.classList.remove('open');
    iframe.src = '';
    document.documentElement.style.overflow = '';
  }

  closeBtn.addEventListener('click', closeViewer);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeViewer();
  });
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('open')) closeViewer();
  });

  document.addEventListener('click', (e) => {
    const exp = e.target.closest('.expand-btn');
    if (exp) {
      // Handle resume expand
      if (exp.id === 'resumeExpand') {
        const src = document.getElementById('resumeFrame').src;
        if (src && src !== 'about:blank') {
          openViewer(src, 'Resume Preview');
          e.preventDefault();
          return;
        }
      }
      // Handle project card expand
      const card = exp.closest('.post-card');
      if (!card) return;
      const src = card.dataset.src;
      const originalUrl = card.dataset.originalUrl || src;
      const isGoogleDocs = card.dataset.isGoogledocs === 'true';
      const title = card.querySelector('h3')?.innerText || 'Project Preview';
      if (src) openViewer(src, title, originalUrl, isGoogleDocs);
      e.preventDefault();
      return;
    }
    
    const post = e.target.closest('.post-card');
    if (post && !e.target.classList.contains('expand-btn') && !e.target.closest('.post-preview iframe') && !e.target.closest('a')) {
      const src = post.dataset.src;
      const originalUrl = post.dataset.originalUrl || src;
      const isGoogleDocs = post.dataset.isGoogledocs === 'true';
      const title = post.querySelector('h3')?.innerText || 'Project Preview';
      if (src) openViewer(src, title, originalUrl, isGoogleDocs);
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && document.activeElement && document.activeElement.classList.contains('post-card')) {
      const card = document.activeElement;
      const src = card.dataset.src;
      const originalUrl = card.dataset.originalUrl || src;
      const isGoogleDocs = card.dataset.isGoogledocs === 'true';
      const title = card.querySelector('h3')?.innerText || 'Project Preview';
      if (src) openViewer(src, title, originalUrl, isGoogleDocs);
    }
  });
})();
