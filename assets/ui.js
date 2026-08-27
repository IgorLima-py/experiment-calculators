/*
 * ui.js - shared page plumbing: URL state, input binding, number formatting.
 *
 * The URL is the sharing mechanism for this suite, so it follows the pattern
 * that works best in the tools that already do this well: short named
 * parameters in human units, defaults left out entirely, the address bar kept
 * current with replaceState so it is always ready to copy, and strict parsing
 * on load so a mangled link degrades to defaults instead of to NaN.
 *
 * A page declares a spec keyed by parameter name; each key is also the id of
 * its input element.
 *
 *   var SPEC = {
 *     base:  { def: 20, min: 0.01, max: 99.99 },
 *     rel:   { def: 1, bool: true },
 *     tails: { def: 2, values: [1, 2] }
 *   };
 */
var UI = (function () {
  'use strict';

  function clamp(value, field) {
    if (field.min !== undefined && value < field.min) return field.min;
    if (field.max !== undefined && value > field.max) return field.max;
    return value;
  }

  /* Strict: anything that is not a finite number falls back to the default. */
  function parseField(raw, field) {
    if (raw === null || raw === undefined || raw === '') return field.def;
    if (field.bool) {
      if (raw === '1' || raw === 'true') return 1;
      if (raw === '0' || raw === 'false') return 0;
      return field.def;
    }
    var n = Number(raw);
    if (!isFinite(n)) return field.def;
    if (field.values && field.values.indexOf(n) === -1) return field.def;
    return clamp(n, field);
  }

  function read(spec) {
    var params = new URLSearchParams(window.location.search);
    var values = {};
    for (var key in spec) {
      if (Object.prototype.hasOwnProperty.call(spec, key)) {
        values[key] = parseField(params.get(key), spec[key]);
      }
    }
    return values;
  }

  /* Only non-default values reach the URL, so a shared link stays short and
   * readable and shows at a glance what was actually changed. */
  function buildQuery(spec, values) {
    var parts = [];
    for (var key in spec) {
      if (!Object.prototype.hasOwnProperty.call(spec, key)) continue;
      var value = values[key];
      if (value === undefined || value === null) continue;
      if (value === spec[key].def) continue;
      parts.push(encodeURIComponent(key) + '=' + encodeURIComponent(String(value)));
    }
    return parts.join('&');
  }

  function write(spec, values) {
    var query = buildQuery(spec, values);
    var url = window.location.pathname + (query ? '?' + query : '');
    window.history.replaceState(null, '', url);
  }

  function element(key) {
    return document.getElementById(key);
  }

  function syncInputs(spec, values) {
    for (var key in spec) {
      if (!Object.prototype.hasOwnProperty.call(spec, key)) continue;
      var el = element(key);
      if (!el) continue;
      if (el.type === 'checkbox') {
        el.checked = !!values[key];
      } else {
        el.value = String(values[key]);
      }
    }
  }

  function collect(spec, previous) {
    var values = {};
    for (var key in spec) {
      if (!Object.prototype.hasOwnProperty.call(spec, key)) continue;
      var el = element(key);
      var field = spec[key];
      if (!el) {
        values[key] = previous ? previous[key] : field.def;
        continue;
      }
      if (el.type === 'checkbox') {
        values[key] = el.checked ? 1 : 0;
      } else {
        values[key] = parseField(el.value, field);
      }
    }
    return values;
  }

  /*
   * Wire the page up: seed inputs from the URL, render once so a shared link
   * lands on a result rather than an empty form, then re-render and re-write
   * the URL on every edit.
   *
   * Clamping is deliberately not applied to the live input element while the
   * user types - rewriting the field mid-keystroke fights the person using it.
   * The value used for the calculation is clamped; the box is only corrected on
   * blur.
   */
  /*
   * `normalise` is for constraints between fields, which the per-field min and
   * max cannot express - a geo holdout can never exceed the markets available.
   * It runs on the collected values before anything is rendered or written, so
   * the result, the URL and the value corrected into the box on blur are all
   * the same number. Without it a field can sit there showing a figure the
   * calculation is not using.
   */
  function attach(spec, render, normalise) {
    var values = read(spec);
    if (normalise) normalise(values);
    syncInputs(spec, values);

    function update() {
      values = collect(spec, values);
      if (normalise) normalise(values);
      render(values);
      write(spec, values);
    }

    for (var key in spec) {
      if (!Object.prototype.hasOwnProperty.call(spec, key)) continue;
      var el = element(key);
      if (!el) continue;
      el.addEventListener('input', update);
      el.addEventListener('change', update);
      el.addEventListener('blur', function () {
        syncInputs(spec, values);
      });
    }

    render(values);
    write(spec, values);
    return function () { return values; };
  }

  /*
   * Copy the current URL. navigator.clipboard needs a secure context, which
   * rules it out when the page is opened straight off disk or served over plain
   * http from another machine - both normal ways to try this tool - so fall
   * back to a detached textarea.
   */
  function copyLink(button) {
    var href = window.location.href;
    var original = button.getAttribute('data-label') || button.textContent;
    button.setAttribute('data-label', original);

    function done(ok) {
      button.textContent = ok ? 'Copied' : 'Press Ctrl+C';
      button.classList.toggle('is-copied', ok);
      window.setTimeout(function () {
        button.textContent = original;
        button.classList.remove('is-copied');
      }, 1600);
    }

    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(href).then(function () { done(true); },
                                                function () { done(false); });
      return;
    }
    var scratch = document.createElement('textarea');
    scratch.value = href;
    scratch.setAttribute('readonly', '');
    scratch.style.position = 'fixed';
    scratch.style.opacity = '0';
    document.body.appendChild(scratch);
    scratch.select();
    var ok = false;
    try {
      ok = document.execCommand('copy');
    } catch (err) {
      ok = false;
    }
    document.body.removeChild(scratch);
    done(ok);
  }

  function initCopyButton(id) {
    var button = document.getElementById(id);
    if (!button) return;
    button.addEventListener('click', function () { copyLink(button); });
  }

  function integer(n) {
    if (!isFinite(n)) return '--';
    return Math.round(n).toLocaleString('en-US');
  }

  function decimal(n, digits) {
    if (!isFinite(n)) return '--';
    return n.toLocaleString('en-US', {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits
    });
  }

  function percent(n, digits) {
    return decimal(n, digits === undefined ? 2 : digits) + '%';
  }

  var SUPERSCRIPT = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
                      '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
                      '-': '⁻' };

  /* Early O'Brien-Fleming boundaries sit at p ~ 1e-6, where fixed decimals
   * would print a misleading 0.0000. */
  function pValue(p) {
    if (!isFinite(p)) return '--';
    if (p >= 0.0001) return decimal(p, 4);
    var parts = p.toExponential(1).split('e');
    var exponent = parts[1].replace(/[0-9-]/g, function (ch) {
      return SUPERSCRIPT[ch];
    }).replace('+', '');
    return parts[0] + ' × 10' + exponent;
  }

  return {
    read: read,
    write: write,
    collect: collect,
    syncInputs: syncInputs,
    attach: attach,
    initCopyButton: initCopyButton,
    integer: integer,
    decimal: decimal,
    percent: percent,
    pValue: pValue
  };
})();
