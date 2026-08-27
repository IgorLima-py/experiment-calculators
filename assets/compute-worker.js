/*
 * compute-worker.js - runs a named task from tasks.js off the main thread.
 *
 * importScripts resolves relative to this file, so the bare names below work
 * wherever the page that started the worker happens to live.
 */
importScripts('stats.js', 'sequential.js', 'cuped.js', 'tasks.js');

self.onmessage = function (event) {
  var message = event.data;
  try {
    var run = self.Tasks[message.task];
    if (!run) throw new Error('unknown task: ' + message.task);
    self.postMessage({ id: message.id, result: run(message.payload) });
  } catch (err) {
    self.postMessage({ id: message.id, error: String(err && err.message || err) });
  }
};
