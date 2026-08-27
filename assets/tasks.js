/*
 * tasks.js - the computations that are too slow to run between keystrokes.
 *
 * Named here, in one file, so that the worker and the synchronous fallback run
 * literally the same code. A worker that drifts from its fallback is a bug that
 * only appears on the machines least able to report it.
 *
 * Each task takes a plain object and returns a plain object, because that is
 * what the structured clone algorithm can carry across the worker boundary.
 *
 * The bodies reference Sequential and Cuped, which a given page may not have
 * loaded. That is fine: a function that is never called never resolves its
 * globals, and no page invokes a task whose module it lacks.
 */
var Tasks = (function () {
  'use strict';

  /*
   * Group-sequential boundaries. This is the expensive one: the
   * Armitage-McPherson recursion is O(K n^2) per evaluation and the two
   * boundary searches call it a few dozen times each, which at 50 looks is
   * seconds of arithmetic - long enough to freeze a phone mid-keystroke.
   */
  function bounds(p) {
    var alpha = p.alpha;
    var pocockZ = Sequential.pocockBound(p.looks, alpha);
    var obf = Sequential.obrienFlemingBounds(p.looks, alpha);
    var obfP = [];
    for (var i = 0; i < obf.length; i++) {
      obfP.push(Sequential.nominalAlphaFor(obf[i]));
    }
    return {
      pocockZ: pocockZ,
      pocockP: Sequential.nominalAlphaFor(pocockZ),
      obf: obf,
      obfP: obfP
    };
  }

  /* Re-running a whole ratio-metric experiment a few hundred times. */
  function ratio(p) {
    return Cuped.ratioMetricComparison(p);
  }

  return { bounds: bounds, ratio: ratio };
})();

/* The worker loads this file with importScripts, where `var` at top level does
 * not attach to the global object the way it does in a document. */
if (typeof self !== 'undefined' && typeof window === 'undefined') {
  self.Tasks = Tasks;
}
