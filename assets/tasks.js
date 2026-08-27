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

  /*
   * Lan-DeMets alpha spending for looks at arbitrary information fractions.
   *
   * Costlier than `bounds`: each look's critical value is solved against the
   * recursion over every look before it, so the work grows with the square of
   * the number of looks. The caller caps the schedule accordingly.
   *
   * The spending function is chosen here by name because a function cannot be
   * carried across the worker boundary by structured clone.
   */
  function spending(p) {
    var spend = p.shape === 'pocock' ? Sequential.spendPocock
                                     : Sequential.spendOBrienFleming;
    var bounds = Sequential.spendingBounds(p.fractions, p.alpha, spend);
    var nominal = [];
    var cumulative = [];
    for (var k = 1; k <= bounds.length; k++) {
      nominal.push(Sequential.nominalAlphaFor(bounds[k - 1]));
      cumulative.push(Sequential.overallAlphaUneven(bounds.slice(0, k),
                                                    p.fractions.slice(0, k)));
    }
    return {
      bounds: bounds,
      nominal: nominal,
      cumulative: cumulative,
      total: cumulative[cumulative.length - 1]
    };
  }

  /* Re-running a whole ratio-metric experiment a few hundred times. */
  function ratio(p) {
    return Cuped.ratioMetricComparison(p);
  }

  return { bounds: bounds, spending: spending, ratio: ratio };
})();

/* The worker loads this file with importScripts, where `var` at top level does
 * not attach to the global object the way it does in a document. */
if (typeof self !== 'undefined' && typeof window === 'undefined') {
  self.Tasks = Tasks;
}
