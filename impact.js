/* Section 02: Editorial Impact Lab — 40 frames */
(() => {
  'use strict';
  if (!window.GlassGuard) return;
  window.GlassGuard.registerSection({
    id: 'impact',
    sectionSelector: '.impact-story#impact',
    canvasId: 'impact-animation',
    posterId: 'impact-poster',
    total: 40,
    frameUrl: i => 'impact-frames/' + String(i).padStart(3, '0') + '.jpg',
    progressBarId: 'impact-progress',
    progressRailSelector: '#impact-progress-rail',
    countId: 'impact-count',
    loaderId: 'impact-frame-loader',
    loaderCountId: 'impact-frame-loader-count',
    detailSelector: '#impact .impact-phase',
    phaseAttr: 'data-impact-phase',
    getPhase: p => p < .32 ? 0 : p < .70 ? 1 : 2,
    getCountText: p => p < .32 ? '01' : p < .70 ? '02' : '03'
  });
})();