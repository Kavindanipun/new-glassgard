/* Section 06: SUPER D — 60 frames */
(() => {
  'use strict';
  if (!window.GlassGuard) return;
  window.GlassGuard.registerSection({
    id: 'superd',
    sectionSelector: '.superd-story#superd',
    canvasId: 'superd-animation',
    posterId: 'superd-poster',
    total: 60,
    frameUrl: i => 'superd-frames/' + String(i).padStart(3, '0') + '.jpg',
    progressBarId: 'superd-progress',
    progressRailSelector: '#superd-progress-rail',
    countId: 'superd-count',
    loaderId: 'superd-frame-loader',
    loaderCountId: 'superd-frame-loader-count',
    detailSelector: '#superd .superd-detail',
    phaseAttr: 'data-superd-phase',
    getPhase: p => p < .40 ? 0 : p < .70 ? 1 : p < .84 ? 2 : 3,
    getCountText: p => p < .40 ? '01' : p < .70 ? '02' : p < .84 ? '03' : '04'
  });
})();