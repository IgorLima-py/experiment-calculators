/*
 * compute.js - run a task from tasks.js, off the main thread where possible.
 *
 * Why this exists: the sequential boundaries and the ratio-metric simulation
 * are hundreds of milliseconds to seconds of straight-line arithmetic. Run
 * inline they freeze the page, and the pages that need them are the ones most
 * likely to be open on a phone in a meeting.
 *
 * A worker is not always available. Opened from disk the page has a file://
 * origin, where Chrome refuses to construct one, and any other failure - a
 * blocked script, an origin the browser dislikes - should degrade rather than
 * leave the page stuck on "Computing". So every call falls back to running the
 * same function from tasks.js on this thread, which is slow but correct.
 *
 *   Compute.run('bounds', {looks: 5, alpha: 0.05}, function (err, result) {...});
 *
 * Calls are always asynchronous, worker or not, so callers have one shape to
 * handle. Only the newest call for a given key is delivered: while a boundary
 * search runs the user carries on typing, and every superseded answer would
 * otherwise arrive and overwrite the current one.
 */
var Compute = (function () {
  'use strict';

  var worker = null;
  var started = false;
  var pending = {};
  var latest = {};
  var nextId = 1;

  function scriptBase() {
    var scripts = document.getElementsByTagName('script');
    for (var i = 0; i < scripts.length; i++) {
      var src = scripts[i].getAttribute('src') || '';
      var at = src.indexOf('compute.js');
      if (at !== -1) return src.slice(0, at);
    }
    return '';
  }

  function start() {
    started = true;
    if (typeof Worker === 'undefined') return;
    try {
      worker = new Worker(scriptBase() + 'compute-worker.js');
    } catch (err) {
      worker = null;
      return;
    }
    worker.onmessage = function (event) {
      var message = event.data;
      var entry = pending[message.id];
      if (!entry) return;
      delete pending[message.id];
      if (latest[entry.key] !== message.id) return;
      entry.callback(message.error || null, message.result);
    };
    worker.onerror = function () {
      /* The worker failed after construction - a missing dependency, a syntax
       * error in a stale cached copy. Drop it and let everything queued, and
       * everything after, take the synchronous path. */
      worker = null;
      for (var id in pending) {
        if (!Object.prototype.hasOwnProperty.call(pending, id)) continue;
        var entry = pending[id];
        delete pending[id];
        runLocally(entry, Number(id));
      }
    };
  }

  function runLocally(entry, id) {
    window.setTimeout(function () {
      if (latest[entry.key] !== id) return;
      try {
        entry.callback(null, Tasks[entry.task](entry.payload));
      } catch (err) {
        entry.callback(String(err && err.message || err), null);
      }
    }, 0);
  }

  /*
   * key defaults to the task name, which is what a page wants when a control
   * is being dragged: one live request per kind of computation, earlier ones
   * abandoned rather than painted.
   */
  function run(task, payload, callback, key) {
    if (!started) start();
    var id = nextId++;
    var entry = { task: task, payload: payload, callback: callback,
                  key: key || task };
    latest[entry.key] = id;
    if (worker) {
      pending[id] = entry;
      worker.postMessage({ id: id, task: task, payload: payload });
    } else {
      runLocally(entry, id);
    }
    return id;
  }

  /* Whether work is happening off this thread, for pages that want to say so
   * rather than pretend. */
  function isThreaded() {
    if (!started) start();
    return !!worker;
  }

  /* Build the worker while the page is still laying itself out, rather than on
   * the first call. Spawning it and fetching its four scripts costs about as
   * much as the first computation does, and doing that lazily put a second of
   * "still working" in front of a result the page could otherwise have had
   * immediately. Only the two pages that need heavy work load this file. */
  start();

  return { run: run, isThreaded: isThreaded };
})();
