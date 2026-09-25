(function (window, document) {
  'use strict';

  if (!Date.now) Date.now = function () { return new Date().getTime(); };
  if (!window.requestAnimationFrame) window.requestAnimationFrame = function (callback) { return window.setTimeout(function () { callback(Date.now()); }, 16); };
  if (!window.cancelAnimationFrame) window.cancelAnimationFrame = function (id) { window.clearTimeout(id); };
  if (!Object.keys) Object.keys = function (object) { var keys = [], key; for (key in Object(object)) if (Object.prototype.hasOwnProperty.call(object, key)) keys.push(key); return keys; };
  if (!Object.assign) Object.assign = function (target) { if (target == null) throw new TypeError('Cannot convert undefined or null to object'); target = Object(target); for (var i = 1; i < arguments.length; i += 1) { var source = arguments[i]; if (source == null) continue; for (var key in source) if (Object.prototype.hasOwnProperty.call(source, key)) target[key] = source[key]; } return target; };
  if (!Array.isArray) Array.isArray = function (value) { return Object.prototype.toString.call(value) === '[object Array]'; };
  if (!Array.prototype.indexOf) Array.prototype.indexOf = function (search, from) { var length = this.length >>> 0, i = Number(from) || 0; if (i < 0) i = Math.max(0, length + i); for (; i < length; i += 1) if (i in this && this[i] === search) return i; return -1; };
  if (!Array.prototype.forEach) Array.prototype.forEach = function (callback, scope) { for (var i = 0; i < this.length; i += 1) if (i in this) callback.call(scope, this[i], i, this); };
  if (!Array.prototype.map) Array.prototype.map = function (callback, scope) { var output = new Array(this.length); for (var i = 0; i < this.length; i += 1) if (i in this) output[i] = callback.call(scope, this[i], i, this); return output; };
  if (!Array.prototype.filter) Array.prototype.filter = function (callback, scope) { var output = []; for (var i = 0; i < this.length; i += 1) if (i in this && callback.call(scope, this[i], i, this)) output.push(this[i]); return output; };
  if (!Array.prototype.includes) Array.prototype.includes = function (value, from) { return this.indexOf(value, from) >= 0; };
  if (!Array.from) Array.from = function (value) { if (value == null) return []; if (Array.isArray(value)) return value.slice(); if (typeof value.length === 'number') return Array.prototype.slice.call(value); if (typeof value.toArray === 'function') return value.toArray(); var output = [], iterator = value.next ? value : null, step; if (iterator) while (!(step = iterator.next()).done) output.push(step.value); return output; };
  if (!String.prototype.trim) String.prototype.trim = function () { return String(this).replace(/^\s+|\s+$/g, ''); };
  if (!String.prototype.startsWith) String.prototype.startsWith = function (search, position) { position = position || 0; return String(this).substr(position, String(search).length) === String(search); };
  if (!String.prototype.endsWith) String.prototype.endsWith = function (search, length) { var value = String(this); length = length === undefined ? value.length : Math.min(Number(length), value.length); return value.substring(length - String(search).length, length) === String(search); };
  if (!String.prototype.padStart) String.prototype.padStart = function (length, fill) { var value = String(this), pad = String(fill === undefined ? ' ' : fill); if (value.length >= length || !pad) return value; while (pad.length < length - value.length) pad += pad; return pad.slice(0, length - value.length) + value; };
  if (!String.fromCodePoint) String.fromCodePoint = function () { var output = '', i, code; for (i = 0; i < arguments.length; i += 1) { code = Number(arguments[i]); if (code <= 65535) output += String.fromCharCode(code); else { code -= 65536; output += String.fromCharCode((code >> 10) + 55296, (code % 1024) + 56320); } } return output; };
  if (!Number.isFinite) Number.isFinite = function (value) { return typeof value === 'number' && isFinite(value); };

  if (!window.Map) {
    window.Map = function () { this._keys = []; this._values = []; this.size = 0; };
    window.Map.prototype.set = function (key, value) { var index = this._keys.indexOf(key); if (index < 0) { this._keys.push(key); this._values.push(value); this.size = this._keys.length; } else this._values[index] = value; return this; };
    window.Map.prototype.get = function (key) { var index = this._keys.indexOf(key); return index < 0 ? undefined : this._values[index]; };
    window.Map.prototype.has = function (key) { return this._keys.indexOf(key) >= 0; };
    window.Map.prototype.delete = function (key) { var index = this._keys.indexOf(key); if (index < 0) return false; this._keys.splice(index, 1); this._values.splice(index, 1); this.size = this._keys.length; return true; };
    window.Map.prototype.clear = function () { this._keys = []; this._values = []; this.size = 0; };
    window.Map.prototype.values = function () { return this._values.slice(); };
    window.Map.prototype.entries = function () { var output = []; for (var i = 0; i < this._keys.length; i += 1) output.push([this._keys[i], this._values[i]]); return output; };
  }

  if (!window.Promise) {
    var queue = function (callback) { window.setTimeout(callback, 0); };
    var resolvePromise = function (promise, value) {
      if (promise === value) return rejectPromise(promise, new TypeError('Promise cannot resolve itself'));
      if (value && (typeof value === 'object' || typeof value === 'function')) {
        var then;
        try { then = value.then; } catch (error) { rejectPromise(promise, error); return; }
        if (typeof then === 'function') {
          var called = false;
          try {
            then.call(value, function (next) { if (!called) { called = true; resolvePromise(promise, next); } }, function (reason) { if (!called) { called = true; rejectPromise(promise, reason); } });
          } catch (error2) { if (!called) rejectPromise(promise, error2); }
          return;
        }
      }
      promise._state = 1; promise._value = value; publish(promise);
    };
    var rejectPromise = function (promise, reason) { promise._state = 2; promise._value = reason; publish(promise); };
    var publish = function (promise) { if (!promise._handlers.length) return; queue(function () { var handlers = promise._handlers.slice(); promise._handlers = []; for (var i = 0; i < handlers.length; i += 1) handle(promise, handlers[i]); }); };
    var handle = function (promise, handler) {
      if (promise._state === 0) { promise._handlers.push(handler); return; }
      queue(function () {
        var callback = promise._state === 1 ? handler.onFulfilled : handler.onRejected;
        if (typeof callback !== 'function') { (promise._state === 1 ? resolvePromise : rejectPromise)(handler.promise, promise._value); return; }
        try { resolvePromise(handler.promise, callback(promise._value)); } catch (error) { rejectPromise(handler.promise, error); }
      });
    };
    window.Promise = function (executor) {
      if (!(this instanceof window.Promise)) throw new TypeError('Promises must be constructed');
      this._state = 0; this._value = undefined; this._handlers = [];
      var self = this, done = false;
      try { executor(function (value) { if (!done) { done = true; resolvePromise(self, value); } }, function (reason) { if (!done) { done = true; rejectPromise(self, reason); } }); } catch (error) { if (!done) { done = true; rejectPromise(self, error); } }
    };
    window.Promise.prototype.then = function (onFulfilled, onRejected) { var next = new window.Promise(function () {}); handle(this, {onFulfilled:onFulfilled, onRejected:onRejected, promise:next}); return next; };
    window.Promise.prototype.catch = function (onRejected) { return this.then(null, onRejected); };
    window.Promise.prototype.finally = function (callback) { var P = this.constructor; return this.then(function (value) { return P.resolve(callback()).then(function () { return value; }); }, function (reason) { return P.resolve(callback()).then(function () { throw reason; }); }); };
    window.Promise.resolve = function (value) { return value instanceof window.Promise ? value : new window.Promise(function (resolve) { resolve(value); }); };
    window.Promise.reject = function (reason) { return new window.Promise(function (_, reject) { reject(reason); }); };
    window.Promise.all = function (values) { return new window.Promise(function (resolve, reject) { values = Array.from(values); if (!values.length) { resolve([]); return; } var output = new Array(values.length), remaining = values.length; values.forEach(function (value, index) { window.Promise.resolve(value).then(function (result) { output[index] = result; remaining -= 1; if (!remaining) resolve(output); }, reject); }); }); };
  } else if (!window.Promise.prototype.finally) {
    window.Promise.prototype.finally = function (callback) { var P = this.constructor; return this.then(function (value) { return P.resolve(callback()).then(function () { return value; }); }, function (reason) { return P.resolve(callback()).then(function () { throw reason; }); }); };
  }

  function SearchParams(query, changed) {
    this._pairs = []; this._changed = changed || function () {};
    query = String(query || '').replace(/^\?/, '');
    if (!query) return;
    var parts = query.split('&');
    for (var i = 0; i < parts.length; i += 1) {
      if (!parts[i]) continue;
      var pair = parts[i].split('='), key = decodeURIComponent(pair.shift().replace(/\+/g, ' ')), value = decodeURIComponent(pair.join('=').replace(/\+/g, ' '));
      this._pairs.push([key, value]);
    }
  }
  SearchParams.prototype.append = function (key, value) { this._pairs.push([String(key), String(value)]); this._changed(this.toString()); };
  SearchParams.prototype.set = function (key, value) { this.delete(key, true); this._pairs.push([String(key), String(value)]); this._changed(this.toString()); };
  SearchParams.prototype.get = function (key) { key = String(key); for (var i = 0; i < this._pairs.length; i += 1) if (this._pairs[i][0] === key) return this._pairs[i][1]; return null; };
  SearchParams.prototype.getAll = function (key) { key = String(key); var output = []; for (var i = 0; i < this._pairs.length; i += 1) if (this._pairs[i][0] === key) output.push(this._pairs[i][1]); return output; };
  SearchParams.prototype.has = function (key) { return this.get(key) !== null; };
  SearchParams.prototype.delete = function (key, silent) { key = String(key); this._pairs = this._pairs.filter(function (pair) { return pair[0] !== key; }); if (!silent) this._changed(this.toString()); };
  SearchParams.prototype.toString = function () { return this._pairs.map(function (pair) { return encodeURIComponent(pair[0]).replace(/%20/g, '+') + '=' + encodeURIComponent(pair[1]).replace(/%20/g, '+'); }).join('&'); };
  if (!window.URLSearchParams) window.URLSearchParams = SearchParams;

  var nativeURL = window.URL, needsURLWrapper = !nativeURL;
  if (!needsURLWrapper) {
    try { needsURLWrapper = !(new nativeURL(window.location.href)).searchParams; } catch (_) { needsURLWrapper = true; }
  }
  if (needsURLWrapper) {
    var CompatURL = function (input, base) {
      var anchor = document.createElement('a');
      if (base) { var baseAnchor = document.createElement('a'); baseAnchor.href = base; anchor.href = baseAnchor.href; }
      anchor.href = input;
      if (base && !/^[a-z][a-z0-9+.-]*:/i.test(String(input))) { var resolver = document.createElement('a'); resolver.href = base; var path = String(input); if (path.charAt(0) === '/') resolver.href = resolver.protocol + '//' + resolver.host + path; else { var folder = resolver.pathname.replace(/[^/]*$/, ''); resolver.href = resolver.protocol + '//' + resolver.host + folder + path; } anchor.href = resolver.href; }
      this._anchor = anchor;
      var self = this;
      this.searchParams = new SearchParams(anchor.search, function (query) { self._anchor.search = query ? '?' + query : ''; });
    };
    CompatURL.prototype.toString = function () { return this._anchor.href; };
    CompatURL.prototype.valueOf = CompatURL.prototype.toString;
    ['href','protocol','host','hostname','port','pathname','search','hash','origin'].forEach(function (property) {
      try { Object.defineProperty(CompatURL.prototype, property, {get:function () { if (property === 'origin') return this._anchor.protocol + '//' + this._anchor.host; return this._anchor[property]; }, set:function (value) { this._anchor[property] = value; }}); } catch (_) {}
    });
    if (nativeURL) {
      if (nativeURL.createObjectURL) CompatURL.createObjectURL = function (object) { return nativeURL.createObjectURL(object); };
      if (nativeURL.revokeObjectURL) CompatURL.revokeObjectURL = function (url) { return nativeURL.revokeObjectURL(url); };
    }
    window.URL = CompatURL;
  }

  if (window.FormData) {
    var NativeFormData = window.FormData;
    var needsFormDataHelpers = false;
    try { needsFormDataHelpers = !NativeFormData.prototype.get || !NativeFormData.prototype.forEach; } catch (_) { needsFormDataHelpers = true; }
    if (needsFormDataHelpers) {
      window.FormData = function (form) {
        var data = new NativeFormData(form), controls = form && form.elements ? form.elements : [];
        if (!data.get) data.get = function (name) {
          for (var i = 0; i < controls.length; i += 1) {
            var control = controls[i];
            if (!control || control.name !== name || control.disabled) continue;
            var type = String(control.type || '').toLowerCase();
            if ((type === 'checkbox' || type === 'radio') && !control.checked) continue;
            if (type === 'file') return control.files && control.files[0] ? control.files[0] : null;
            return control.value;
          }
          return null;
        };
        if (!data.forEach) data.forEach = function (callback, scope) {
          for (var i = 0; i < controls.length; i += 1) {
            var control = controls[i];
            if (!control || !control.name || control.disabled) continue;
            var type = String(control.type || '').toLowerCase();
            if ((type === 'checkbox' || type === 'radio') && !control.checked) continue;
            if (type === 'file') {
              var files = control.files || [];
              for (var f = 0; f < files.length; f += 1) callback.call(scope, files[f], control.name, data);
            } else callback.call(scope, control.value, control.name, data);
          }
        };
        return data;
      };
      window.FormData.prototype = NativeFormData.prototype;
    }
  }

  if (!window.TextEncoder) {
    window.TextEncoder = function () {};
    window.TextEncoder.prototype.encode = function (text) { text = unescape(encodeURIComponent(String(text))); var output = new Uint8Array(text.length); for (var i = 0; i < text.length; i += 1) output[i] = text.charCodeAt(i); return output; };
  }

  if (window.Element) {
    var proto = window.Element.prototype;
    if (!proto.matches) proto.matches = proto.msMatchesSelector || proto.webkitMatchesSelector || function (selector) { var nodes = (this.parentNode || document).querySelectorAll(selector); for (var i = 0; i < nodes.length; i += 1) if (nodes[i] === this) return true; return false; };
    if (!proto.closest) proto.closest = function (selector) { var node = this; while (node && node.nodeType === 1) { if (node.matches(selector)) return node; node = node.parentElement || node.parentNode; } return null; };
    if (!proto.replaceChildren) proto.replaceChildren = function () { while (this.firstChild) this.removeChild(this.firstChild); for (var i = 0; i < arguments.length; i += 1) this.appendChild(arguments[i]); };
  }
  if (window.Node && !('isConnected' in window.Node.prototype)) {
    try { Object.defineProperty(window.Node.prototype, 'isConnected', {get:function () { return document.documentElement.contains(this); }}); } catch (_) {}
  }

  if (!window.fetch) {
    window.fetch = function (input, options) {
      options = options || {};
      return new window.Promise(function (resolve, reject) {
        var xhr = new XMLHttpRequest(), url = typeof input === 'string' ? input : input.url;
        xhr.open(options.method || 'GET', url, true);
        if (options.credentials === 'include') xhr.withCredentials = true;
        else if (options.credentials === 'same-origin') { var link = document.createElement('a'); link.href = url; xhr.withCredentials = link.host === window.location.host; }
        var headers = options.headers || {};
        Object.keys(headers).forEach(function (name) { try { xhr.setRequestHeader(name, headers[name]); } catch (_) {} });
        xhr.onload = function () {
          var raw = xhr.getAllResponseHeaders() || '', map = {};
          raw.replace(/\r?\n[\t ]+/g, ' ').split(/\r?\n/).forEach(function (line) { var parts = line.split(': '), key = parts.shift(); if (key) map[key.toLowerCase()] = parts.join(': '); });
          var response = {
            ok:xhr.status >= 200 && xhr.status < 300,
            status:xhr.status,
            statusText:xhr.statusText,
            url:xhr.responseURL || url,
            headers:{get:function (name) { return map[String(name).toLowerCase()] || null; }},
            text:function () { return window.Promise.resolve(xhr.responseText); },
            json:function () { return window.Promise.resolve().then(function () { return JSON.parse(xhr.responseText); }); },
            clone:function () { return this; }
          };
          resolve(response);
        };
        xhr.onerror = function () { reject(new TypeError('Network request failed')); };
        xhr.ontimeout = function () { reject(new TypeError('Network request timed out')); };
        if (options.signal) {
          if (options.signal.aborted) { xhr.abort(); reject(new Error('Aborted')); return; }
          if (typeof options.signal.addEventListener === 'function') options.signal.addEventListener('abort', function () { xhr.abort(); reject(new Error('Aborted')); });
        }
        xhr.send(options.body === undefined ? null : options.body);
      });
    };
  }

  var ua = String((window.navigator && window.navigator.userAgent) || '');
  var oldAndroid = /Android\s(?:4|5|6)(?:\.|\b)/i.test(ua) || /; wv\)/i.test(ua);
  if (oldAndroid) document.documentElement.className += (document.documentElement.className ? ' ' : '') + 'legacy-android';
}(window, document));
