/* Section 04: The GlassGuard Collection — 40 frames */
(() => {
  'use strict';
  if (!window.GlassGuard) return;
  window.GlassGuard.registerSection({
    id: 'collection',
    sectionSelector: '.collection-story#collection',
    canvasId: 'collection-animation',
    posterId: 'collection-poster',
    total: 40,
    frameUrl: i => 'collection-frames/' + String(i).padStart(3, '0') + '.jpg',
    progressBarId: 'collection-progress',
    progressRailSelector: '#collection-progress-rail',
    countId: 'collection-count',
    loaderId: 'collection-frame-loader',
    loaderCountId: 'collection-frame-loader-count',
    detailSelector: '#collection .collection-detail',
    phaseAttr: 'data-collection-phase',
    getPhase: p => p < .53 ? 0 : 1,
    getCountText: p => p < .53 ? '01' : '03'
  });
})();