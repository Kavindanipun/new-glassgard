/* Section 08: MOSSILY Premium Tempered Glass — 51 frames */
(() => {
  'use strict';
  if (!window.GlassGuard) return;
  window.GlassGuard.registerSection({
    id: 'mossily',
    sectionSelector: '.mossily-story#mossily',
    canvasId: 'mossily-animation',
    posterId: 'mossily-poster',
    total: 51,
    frameUrl: i => 'mossily-frames/' + String(i).padStart(3, '0') + '.jpg',
    progressBarId: 'mossily-progress',
    progressRailSelector: '#mossily-progress-rail',
    countId: 'mossily-count',
    detailSelector: '#mossily .mossily-detail',
    phaseAttr: 'data-mossily-phase',
    getPhase: p => Math.min(3, Math.floor(p * 4)),
    getCountText: (p, phase) => String(phase + 1).padStart(2, '0')
  });
})();
