/* Section 03: The Perfect Finish — 40 frames */
(() => {
  'use strict';
  if (!window.GlassGuard) return;
  window.GlassGuard.registerSection({
    id: 'finish',
    sectionSelector: '.finish-story#finish',
    canvasId: 'finish-animation',
    posterId: 'finish-poster',
    total: 40,
    frameUrl: i => 'install-frames/' + String(i).padStart(3, '0') + '.jpg',
    progressBarId: 'finish-progress',
    progressRailSelector: '#finish-progress-rail',
    countId: 'finish-count',
    loaderId: 'finish-frame-loader',
    loaderCountId: 'finish-frame-loader-count',
    detailSelector: '#finish .finish-detail',
    phaseAttr: 'data-finish-phase',
    getPhase: p => p < .53 ? 0 : 1,
    getCountText: p => p < .53 ? '05' : '07'
  });
})();