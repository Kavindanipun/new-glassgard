/* Section 07: Privacy Tempered Glass — 40 frames */
(() => {
  'use strict';
  if (!window.GlassGuard) return;
  window.GlassGuard.registerSection({
    id: 'privacy',
    sectionSelector: '.privacy-story#privacy',
    canvasId: 'privacy-animation',
    posterId: 'privacy-poster',
    total: 40,
    frameUrl: i => 'privacy-frames/' + String(i).padStart(3, '0') + '.jpg',
    progressBarId: 'privacy-progress',
    progressRailSelector: '#privacy-progress-rail',
    countId: 'privacy-count',
    loaderId: 'privacy-frame-loader',
    loaderCountId: 'privacy-frame-loader-count',
    detailSelector: '#privacy .privacy-detail',
    phaseAttr: 'data-privacy-phase',
    getPhase: p => p < .30 ? 0 : p < .61 ? 1 : p < .78 ? 2 : 3,
    getCountText: p => p < .30 ? '01' : p < .61 ? '02' : p < .78 ? '03' : '04'
  });
})();