/* ===========================================================================
   GLASSGUARD HIGH-PERFORMANCE CINEMATIC SCROLLED CANVAS ENGINE
   Optimized for premium scroll-driven frame animations with shared LRU frame cache,
   createImageBitmap decoding, and deduped network requests.
   ========================================================================== */
(() => {
  'use strict';

  // ----- Global Frame Cache -------------------------------------------------
  // LRU cache keyed by image URL, storing ImageBitmap objects. Limits total
  // decoded memory (bytes) to ~80 MB to stay within typical mobile GPU budgets.
  const MAX_CACHE_BYTES = 80 * 1024 * 1024; // 80 MB
  const cacheMap = new Map(); // insertion-ordered map for LRU
  let currentBytes = 0;

  // Tracks ongoing fetches to avoid duplicate network requests.
  const inFlight = new Map(); // url -> Promise<ImageBitmap>

  const FrameCache = {
    async requestBitmap(url, highPriority) {
      // Return cached bitmap if available
      if (cacheMap.has(url)) {
        // Move entry to the end to mark as recently used
        const entry = cacheMap.get(url);
        cacheMap.delete(url);
        cacheMap.set(url, entry);
        return entry.bitmap;
      }
      // Deduplicate in-flight requests
      if (inFlight.has(url)) {
        return await inFlight.get(url);
      }
      // Start fetch & decode
      const fetchPromise = fetch(url, { credentials: 'same-origin' })
        .then(resp => resp.blob())
        .then(blob => createImageBitmap(blob, { imageOrientation: 'none' }));
      inFlight.set(url, fetchPromise);
      try {
        const bitmap = await fetchPromise;
        // Estimate memory usage (width * height * 4 bytes per pixel)
        const byteSize = bitmap.width * bitmap.height * 4;
        // Evict LRU entries if exceeding limit
        while (currentBytes + byteSize > MAX_CACHE_BYTES && cacheMap.size > 0) {
          const [oldestUrl, oldestEntry] = cacheMap.entries().next().value;
          cacheMap.delete(oldestUrl);
          currentBytes -= oldestEntry.bytes;
          // Release GPU resources
          oldestEntry.bitmap.close();
        }
        cacheMap.set(url, { bitmap, bytes: byteSize });
        currentBytes += byteSize;
        return bitmap;
      } finally {
        inFlight.delete(url);
      }
    }
  };

  const sections = [];
  let rafId = 0;
  let winH = window.innerHeight || 800;
  let prefersReducedMotion = false;
  let geometryDirty = true;

  // Detect low-memory devices for adaptive concurrency
  const lowMemory = (navigator.deviceMemory || 4) < 2;
  const CONCURRENCY = lowMemory ? 2 : 3;

  try {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    prefersReducedMotion = mq.matches;
    mq.addEventListener?.('change', e => { prefersReducedMotion = e.matches; });
  } catch (_) {}

  const clamp = v => (Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 0);

  // Simple debounce utility
  function debounce(fn, ms) {
    let timer = 0;
    return function(...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), ms);
    };
  }

  function updateGeometries() {
    winH = window.innerHeight || 800;
    const scrollY = window.scrollY || window.pageYOffset || 0;
    for (let i = 0; i < sections.length; i++) {
      const sec = sections[i];
      if (!sec.story) continue;
      const rect = sec.story.getBoundingClientRect();
      sec.top = rect.top + scrollY;
      sec.height = rect.height || 1000;
      sec.maxScroll = Math.max(1, sec.height - winH);
    }
  }

  // IntersectionObserver to activate preloading and frame rendering for approaching sections
  // 50% rootMargin: start preloading when section is within half a viewport away
  const viewObserver = new IntersectionObserver((entries) => {
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      const sec = sections.find(s => s.story === entry.target);
      if (sec) {
        sec.isVisible = entry.isIntersecting;
        if (sec.isVisible) {
          sec.startPreload();
          scheduleTick();
        }
      }
    }
  }, { rootMargin: '50% 0px' });

  function tick() {
    rafId = 0;
    const scrollY = window.scrollY || window.pageYOffset || 0;

    for (let i = 0; i < sections.length; i++) {
      const sec = sections[i];
      if (!sec.isVisible && !sec.forceActive) continue;

      const p = clamp((scrollY - sec.top) / (sec.maxScroll || 1));
      sec.currentP = p;
      sec.syncUI(p);

      const wanted = Math.round(p * (sec.total - 1));
      sec.render(wanted);
    }
  }

  function scheduleTick() {
    if (!rafId) rafId = requestAnimationFrame(tick);
  }

  // Debounced resize: invalidate geometry cache, then recompute after 150ms idle
  const onResize = debounce(() => {
    geometryDirty = true;
    updateGeometries();
    scheduleTick();
  }, 150);

  window.addEventListener('scroll', scheduleTick, { passive: true });
  window.addEventListener('resize', onResize, { passive: true });
  window.addEventListener('orientationchange', () => {
    // orientationchange fires before the viewport settles; wait longer
    geometryDirty = true;
    setTimeout(() => { updateGeometries(); scheduleTick(); }, 250);
  }, { passive: true });
  window.addEventListener('pageshow', () => {
    geometryDirty = true;
    updateGeometries();
    scheduleTick();
  });

  // Sync canvas pixel size to its CSS display size to avoid blurry/scaled rendering
  function syncCanvasSize(canvas) {
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    const w = Math.round(rect.width * dpr);
    const h = Math.round(rect.height * dpr);
    // Ensure minimum dimensions to avoid zero-size canvas
    const minW = 320, minH = 180;
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = Math.max(w, minW);
      canvas.height = Math.max(h, minH);
    }
  }

  class GlassGuardSection {
    constructor(cfg) {
      this.id = cfg.id;
      this.story = document.querySelector(cfg.sectionSelector || '#' + cfg.id);
      this.canvas = document.getElementById(cfg.canvasId);
      this.poster = document.getElementById(cfg.posterId);
      if (!this.story || !this.canvas) return;

      // Sync canvas size before getting context for crisp pixel-perfect rendering
      syncCanvasSize(this.canvas);
      this.ctx = this.canvas.getContext('2d', { alpha: false, desynchronized: true }) || this.canvas.getContext('2d');
      this.total = cfg.total;
      this.frameUrl = cfg.frameUrl;
      this.getPhase = cfg.getPhase;
      this.getCountText = cfg.getCountText;
      this.phaseAttr = cfg.phaseAttr || 'data-phase';
      this.customDraw = cfg.customDraw || null;

      this.progressBar = cfg.progressBarId ? document.getElementById(cfg.progressBarId) : null;
      this.progressRail = cfg.progressRailSelector ? (document.querySelector(cfg.progressRailSelector) || document.getElementById(cfg.progressRailSelector.replace('#',''))) : null;
      this.countEl = cfg.countId ? document.getElementById(cfg.countId) : null;
      this.loader = cfg.loaderId ? document.getElementById(cfg.loaderId) : null;
      this.loaderCount = cfg.loaderCountId ? document.getElementById(cfg.loaderCountId) : null;
      this.details = [...this.story.querySelectorAll(cfg.detailSelector || '.gg-detail')];

      this.frames = Array(this.total).fill(null);
      this.loaded = Array(this.total).fill(false);
      this.pending = new Set();
      this.wanted = 0;
      this.shown = -1;
      this.lastPhase = -1;
      this.lastCountStr = '';
      this.lastPct = -1;
      this.completed = 0;
      this.preloadingStarted = false;
      this.isVisible = false;
      this.forceActive = Boolean(cfg.forceActive);

      // Initialize geometry immediately
      const rect = this.story.getBoundingClientRect();
      const scrollY = window.scrollY || window.pageYOffset || 0;
      this.top = rect.top + scrollY;
      this.height = rect.height || 1000;
      this.maxScroll = Math.max(1, this.height - (window.innerHeight || 800));

      this.initPoster();

      sections.push(this);
      viewObserver.observe(this.story);
    }

    initPoster() {
      const onReady = () => {
        if (this.shown < 0 && this.poster && this.poster.naturalWidth) {
          this.paint(this.poster);
          this.shown = 0;
          this.loaded[0] = true;
          this.frames[0] = this.poster;
          this.canvas.classList.add('has-frame');
        }
      };

      if (this.poster && this.poster.complete && this.poster.naturalWidth) {
        onReady();
      } else if (this.poster) {
        this.poster.addEventListener('load', onReady, { once: true });
      }
    }

    paint(frame) {
      if (!this.ctx || !frame) return;
      // ImageBitmap may not have naturalWidth; fallback to width check
      const ready = frame.naturalWidth || frame.width;
      if (!ready) return;
      if (this.customDraw) {
        this.customDraw(this.ctx, frame, this.canvas.width, this.canvas.height);
      } else {
        this.ctx.drawImage(frame, 0, 0, this.canvas.width, this.canvas.height);
      }
      this.canvas.classList.add('has-frame');
    }

    render(wanted) {
      if (!Number.isFinite(wanted)) wanted = 0;
      wanted = Math.max(0, Math.min(this.total - 1, wanted));
      this.wanted = wanted;
      if (wanted === this.shown) return;

      const frame = this.frames[wanted];
      const ready = frame && (frame.naturalWidth || frame.width);
      if (ready && this.loaded[wanted]) {
        this.paint(frame);
        this.shown = wanted;
      } else {
        this.loadFrame(wanted, true);
        if (wanted + 1 < this.total) this.loadFrame(wanted + 1, false);
        if (wanted - 1 >= 0) this.loadFrame(wanted - 1, false);
      }
    }

    syncUI(p) {
      if (!Number.isFinite(p)) p = 0;
      const pct = p * 100;
      if (Math.abs(pct - this.lastPct) >= 0.1) {
        this.lastPct = pct;
        if (this.progressBar) this.progressBar.style.width = pct.toFixed(2) + '%';
        if (this.progressRail) this.progressRail.setAttribute('aria-valuenow', String(Math.round(pct)));
      }

      const phase = this.getPhase(p);
      if (phase !== this.lastPhase) {
        this.lastPhase = phase;
        for (let i = 0; i < this.details.length; i++) {
          const el = this.details[i];
          const val = Number(el.getAttribute(this.phaseAttr) || el.dataset[this.phaseAttr.replace('data-','').replace(/-([a-z])/g, (_,c)=>c.toUpperCase())]);
          const on = (val === phase);
          if (on !== el.classList.contains('is-visible')) {
            el.classList.toggle('is-visible', on);
            el.setAttribute('aria-hidden', String(!on));
          }
        }
      }

      const countStr = this.getCountText(p, phase);
      if (countStr !== this.lastCountStr) {
        this.lastCountStr = countStr;
        if (this.countEl) this.countEl.textContent = countStr;
      }
    }

    async loadFrame(idx, highPriority = false) {
      if (!Number.isFinite(idx) || idx < 0 || idx >= this.total || this.loaded[idx] || this.pending.has(idx)) return;
      this.pending.add(idx);
      const url = this.frameUrl(idx);
      try {
        const bitmap = await FrameCache.requestBitmap(url, highPriority);
        this.frames[idx] = bitmap;
        this.loaded[idx] = true;
        if (idx === this.wanted) {
          this.paint(bitmap);
          this.shown = idx;
        }
      } catch (_) {
        // ignore load failures
      } finally {
        this.pending.delete(idx);
        this.completed++;
        this.updateLoader();
      }
    }

    updateLoader() {
      if (this.loaderCount) {
        this.loaderCount.textContent = this.completed + ' / ' + this.total;
      }
      if (this.completed >= this.total && this.loader) {
        this.loader.classList.remove('is-loading');
        this.loader.classList.add('is-complete');
        this.loader.setAttribute('aria-busy', 'false');
      }
    }

    startPreload() {
      if (this.preloadingStarted) return;
      this.preloadingStarted = true;

      this.loadFrame(this.wanted, true);
      this.loadFrame(0, true);
      for (let d = 1; d <= 3; d++) {
        if (this.wanted + d < this.total) this.loadFrame(this.wanted + d, true);
        if (this.wanted - d >= 0) this.loadFrame(this.wanted - d, true);
      }

      let nextIdx = 0;
      // Adaptive concurrency: fewer parallel fetches on low-memory devices
      const worker = async () => {
        while (nextIdx < this.total) {
          const i = nextIdx++;
          if (!this.loaded[i] && !this.pending.has(i)) {
            await new Promise(resolve => {
              const url = this.frameUrl(i);
              try {
                const bitmap = await FrameCache.requestBitmap(url, false);
                this.frames[i] = bitmap;
                this.loaded[i] = true;
                this.completed++;
                this.updateLoader();
                if (i === this.wanted) {
                  this.paint(bitmap);
                  this.shown = i;
                }
                resolve();
              } catch (_) {
                // ignore load failure
                this.completed++;
                this.updateLoader();
                resolve();
              }
            });
          }
        }
      };

      // Start limited concurrency workers for background preloading
      for (let c = 0; c < CONCURRENCY; c++) {
        worker();
      }
    }
  }

  function registerSection(config) {
    return new GlassGuardSection(config);
  }

  window.GlassGuard = {
    registerSection,
    updateGeometries,
    scheduleTick,
    sections
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      updateGeometries();
      scheduleTick();
    });
  } else {
    updateGeometries();
    scheduleTick();
  }

  // Register Section 01: Hero (GlassGuard Premium Protection)
  window.GlassGuard.registerSection({
    id: 'home',
    sectionSelector: '.gg-scroll-story#home',
    canvasId: 'gg-animation',
    posterId: 'gg-poster',
    total: 60,
    forceActive: true,
    frameUrl: i => 'frames/' + String(i).padStart(3, '0') + '.jpg',
    progressBarId: 'gg-progress',
    progressRailSelector: '.gg-progress-rail',
    countId: 'gg-count',
    loaderId: 'gg-frame-loader',
    loaderCountId: 'gg-frame-loader-count',
    detailSelector: '#home .gg-detail',
    phaseAttr: 'data-phase',
    getPhase: p => p < .52 ? 0 : 1,
    getCountText: p => p < .26 ? '01' : p < .52 ? '02' : p < .77 ? '03' : '04'
  });
})();