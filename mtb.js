/* Section 05: MTB — 60 frames */
(() => {
  'use strict';
  if (!window.GlassGuard) return;
  window.GlassGuard.registerSection({
    id: 'mtb',
    sectionSelector: '.mtb-story#mtb',
    canvasId: 'mtb-animation',
    posterId: 'mtb-poster',
    total: 60,
    frameUrl: i => 'mtb-frames/' + String(i).padStart(3, '0') + '.jpg',
    progressBarId: 'mtb-progress',
    progressRailSelector: '#mtb-progress-rail',
    countId: 'mtb-count',
    loaderId: 'mtb-frame-loader',
    loaderCountId: 'mtb-frame-loader-count',
    detailSelector: '#mtb .mtb-detail',
    phaseAttr: 'data-mtb-phase',
    getPhase: p => p < .22 ? 0 : p < .65 ? 1 : p < .80 ? 2 : 3,
    getCountText: p => p < .22 ? '01' : p < .65 ? '02' : p < .80 ? '03' : '04'
  });
})();