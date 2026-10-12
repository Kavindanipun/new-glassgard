/* Section 09: Easy DIY Installation — 60 frames */
(() => {
  'use strict';
  if (!window.GlassGuard) return;
  window.GlassGuard.registerSection({
    id: 'diy-installation',
    sectionSelector: '.diy-story#diy-installation',
    canvasId: 'diy-animation',
    posterId: 'diy-poster',
    total: 60,
    frameUrl: i => 'diy-frames/' + String(i).padStart(3, '0') + '.jpg',
    progressBarId: 'diy-progress',
    progressRailSelector: '#diy-progress-rail',
    countId: 'diy-count',
    detailSelector: '#diy-installation .diy-detail',
    phaseAttr: 'data-diy-phase',
    getPhase: p => Math.min(3, Math.floor(p * 4)),
    getCountText: (p, phase) => String(phase + 1).padStart(2, '0')
  });
})();
