// modules are defined as an array
// [ module function, map of requires ]
//
// map of requires is short require name -> numeric require
//
// anything defined in a previous bundle is accessed via the
// orig method which is the require for previous bundles
parcelRequire = (function (modules, cache, entry, globalName) {
  // Save the require from previous bundle to this closure if any
  var previousRequire = typeof parcelRequire === 'function' && parcelRequire;
  var nodeRequire = typeof require === 'function' && require;

  function newRequire(name, jumped) {
    if (!cache[name]) {
      if (!modules[name]) {
        // if we cannot find the module within our internal map or
        // cache jump to the current global require ie. the last bundle
        // that was added to the page.
        var currentRequire = typeof parcelRequire === 'function' && parcelRequire;
        if (!jumped && currentRequire) {
          return currentRequire(name, true);
        }

        // If there are other bundles on this page the require from the
        // previous one is saved to 'previousRequire'. Repeat this as
        // many times as there are bundles until the module is found or
        // we exhaust the require chain.
        if (previousRequire) {
          return previousRequire(name, true);
        }

        // Try the node require function if it exists.
        if (nodeRequire && typeof name === 'string') {
          return nodeRequire(name);
        }

        var err = new Error('Cannot find module \'' + name + '\'');
        err.code = 'MODULE_NOT_FOUND';
        throw err;
      }

      localRequire.resolve = resolve;
      localRequire.cache = {};

      var module = cache[name] = new newRequire.Module(name);

      modules[name][0].call(module.exports, localRequire, module, module.exports, this);
    }

    return cache[name].exports;

    function localRequire(x){
      return newRequire(localRequire.resolve(x));
    }

    function resolve(x){
      return modules[name][1][x] || x;
    }
  }

  function Module(moduleName) {
    this.id = moduleName;
    this.bundle = newRequire;
    this.exports = {};
  }

  newRequire.isParcelRequire = true;
  newRequire.Module = Module;
  newRequire.modules = modules;
  newRequire.cache = cache;
  newRequire.parent = previousRequire;
  newRequire.register = function (id, exports) {
    modules[id] = [function (require, module) {
      module.exports = exports;
    }, {}];
  };

  var error;
  for (var i = 0; i < entry.length; i++) {
    try {
      newRequire(entry[i]);
    } catch (e) {
      // Save first error but execute all entries
      if (!error) {
        error = e;
      }
    }
  }

  if (entry.length) {
    // Expose entry point to Node, AMD or browser globals
    // Based on https://github.com/ForbesLindesay/umd/blob/master/template.js
    var mainExports = newRequire(entry[entry.length - 1]);

    // CommonJS
    if (typeof exports === "object" && typeof module !== "undefined") {
      module.exports = mainExports;

    // RequireJS
    } else if (typeof define === "function" && define.amd) {
     define(function () {
       return mainExports;
     });

    // <script>
    } else if (globalName) {
      this[globalName] = mainExports;
    }
  }

  // Override the current require with this new one
  parcelRequire = newRequire;

  if (error) {
    // throw error from earlier, _after updating parcelRequire_
    throw error;
  }

  return newRequire;
})({"../js/compiler.js":[function(require,module,exports) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.tokenizer = tokenizer;
exports.parser = parser;
exports.codeGen = codeGen;
exports.compile = compile;

/**
* A minimal compiler that interpret follow
* Inline Action Expression(IAE):
* 	 "add(1, 2);delay(100, fn: plus(3, 1))"
* to JavaScript runtime code:
*    add(1, 2)
*    delay(100, function() {
*        plus(3, 1)
*    })
*/
function tokenizer(input) {
  var current = 0;
  var tokens = [];

  while (current < input.length) {
    var char = input[current];

    if (char === "'") {
      var value = '';
      current++;
      char = input[current];

      while (char !== "'") {
        value += char;
        current++;
        char = input[current];
      }

      tokens.push({
        type: 'string',
        value: value
      });
      current++;
      continue;
    }

    if (char === '(') {
      tokens.push({
        type: 'paren',
        value: '('
      });
      current++;
      continue;
    }

    if (char === ')') {
      tokens.push({
        type: 'paren',
        value: ')'
      });
      current++;
      continue;
    }

    var WHITESPACE = /\s/;

    if (WHITESPACE.test(char)) {
      current++;
      continue;
    }

    if (char === ',' || char === ';' || char === ':') {
      current++;
      continue;
    }

    var NUMBERS = /[0-9]/;

    if (NUMBERS.test(char)) {
      var _value = '';

      while (NUMBERS.test(char)) {
        _value += char;
        current++;
        char = input[current];
      }

      tokens.push({
        type: 'number',
        value: _value
      });
      continue;
    }

    var LETTERS = /[a-z]|-|_|\$/i;

    if (LETTERS.test(char)) {
      var _value2 = '';

      while (LETTERS.test(char)) {
        _value2 += char;
        current++;
        char = input[current];
      }

      if (_value2 === 'fn') {
        tokens.push({
          type: 'lambda',
          value: _value2
        });
      } else if (_value2 === 'self') {
        tokens.push({
          type: 'keyword',
          value: _value2
        });
      } else {
        tokens.push({
          type: 'name',
          value: _value2
        });
      }

      continue;
    }

    throw new TypeError("Unexcepted charactor \"".concat(char, "\"."));
  }

  return tokens;
}

function parser(tokens) {
  var current = 0;
  var ast = {
    type: 'Program',
    body: []
  };

  function walk() {
    var token = tokens[current];

    if (token.type === 'string') {
      current++;
      return {
        type: 'RawString',
        value: token.value
      };
    }

    if (token.type === 'keyword') {
      current++;
      return {
        type: 'KeywordLiteral',
        value: token.value
      };
    }

    if (token.type === 'number') {
      current++;
      return {
        type: 'NumberLiteral',
        value: token.value
      };
    }

    if (token.type === 'lambda') {
      token = tokens[++current];
      var node = {
        type: 'LambdaExpression',
        name: token.value,
        params: []
      };
      token = tokens[++current]; // LambdaExpression 表达式

      if (token.type === 'paren' && token.value === '(') {
        // 跳过括号，方便取到函数名
        token = tokens[++current];

        while (token.type !== 'paren' || token.type === 'paren' && token.value !== ')') {
          node.params.push(walk());
          token = tokens[current];
        }

        current++;
        return node;
      } else {// // StringLiteral
        // return {
        // 	type: 'StringLiteral',
        // 	value: name
        // }
      }
    }

    if (token.type === 'name') {
      var name = token.value;
      token = tokens[++current]; // CallExpression 调用表达式   add  (  1  2  )

      if (token.type === 'paren' && token.value === '(') {
        // 跳过括号，方便取到函数名
        token = tokens[++current];
        var _node = {
          type: 'CallExpression',
          name: name,
          params: []
        };

        while (token.type !== 'paren' || token.type === 'paren' && token.value !== ')') {
          _node.params.push(walk());

          token = tokens[current];
        }

        current++;
        return _node;
      } else {
        // StringLiteral
        return {
          type: 'StringLiteral',
          value: name
        };
      }
    }
  }

  while (current < tokens.length) {
    ast.body.push(walk());
  }

  return ast;
}

function codeGen(ast) {
  function traverseArray(arr, parent) {
    var result = '';
    if (parent.type === 'LambdaExpression') result += 'function() {\n';

    if (parent.name) {
      result += "__.".concat(parent.name, "(");
    }

    arr.forEach(function (child, idx) {
      if (parent.name) {
        result += "".concat(idx === 0 ? '' : ', ').concat(traverseNode(child, parent));
      } else {
        result += "".concat(idx === 0 ? '' : '; ').concat(traverseNode(child, parent));
      }
    });
    if (parent.name) result += ")";
    if (parent.type === 'LambdaExpression') result += '\n}';
    return result;
  }

  function traverseNode(node, parent) {
    if (node.type === 'Program') {
      return traverseArray(node.body, node);
    }

    if (node.type === 'CallExpression') {
      return traverseArray(node.params, node);
    }

    if (node.type === 'LambdaExpression') {
      return traverseArray(node.params, node);
    }

    if (node.type === 'KeywordLiteral') {
      return node.value;
    }

    if (node.type === 'StringLiteral') {
      return node.value === 'INDEX' ? node.value : "\"".concat(node.value, "\"");
    }

    if (node.type === 'RawString') {
      return "\"".concat(node.value, "\"");
    }

    if (node.type === 'NumberLiteral') {
      return node.value;
    }

    throw new TypeError(node.type);
  }

  return traverseNode(ast, null);
}

function compile(input) {
  var tokens = tokenizer(input);
  var ast = parser(tokens);
  var out = codeGen(ast);
  return out;
}
},{}],"../joshua.js":[function(require,module,exports) {
"use strict";

var _compiler = require("./js/compiler.js");

function _toConsumableArray(arr) { return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _nonIterableSpread(); }

function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance"); }

function _iterableToArray(iter) { if (Symbol.iterator in Object(iter) || Object.prototype.toString.call(iter) === "[object Arguments]") return Array.from(iter); }

function _arrayWithoutHoles(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = new Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } }

(function (config, window, document) {
  var cfg = Object.assign({
    namespace: 'w'
  }, config);
  var ns = cfg.namespace;
  var w = window;
  var d = document;
  if (window[ns]) throw new Error("Global variable [".concat(ns, "] is already defined."));
  if (typeof ns === 'string') w = window[ns] = {};
  /* Lang */
  // w.isStr = o => typeof o === 'string'

  /* Utils */

  w.toArr = function (o) {
    return o.length ? o : [o];
  };

  w.isSel = function (str) {
    return /\s|:|\*|\[|\]|\^|~|\+|>/.test(str);
  };
  /* DOM */
  // Query


  w.id = function (id, ctx) {
    return (ctx || d).getElementById(id);
  };

  w.one = function (sel, ctx) {
    return (ctx || d).querySelector(sel);
  };

  w.all = function (sel, ctx) {
    return (ctx || d).querySelectorAll(sel);
  }; // Node


  w.rm = function (el) {
    return el.remove();
  };

  w.eq = function (sel, idx, ctx) {
    return w.all(sel, ctx)[idx];
  }; // Class


  w.hsClass = function (el, cName) {
    return el.classList && el.classList.contains(cName);
  };

  w.tgClass = function (el, cName, force) {
    return w.toArr(el).forEach(function (e) {
      return e.classList.toggle(cName, force);
    });
  };

  w.adClass = function (el) {
    for (var _len = arguments.length, cName = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
      cName[_key - 1] = arguments[_key];
    }

    return w.toArr(el).forEach(function (e) {
      var _e$classList;

      return (_e$classList = e.classList).add.apply(_e$classList, cName);
    });
  };

  w.rpClass = function (el) {
    for (var _len2 = arguments.length, args = new Array(_len2 > 1 ? _len2 - 1 : 0), _key2 = 1; _key2 < _len2; _key2++) {
      args[_key2 - 1] = arguments[_key2];
    }

    return w.toArr(el).forEach(function (e) {
      return e.replace.apply(e, args);
    });
  };

  w.rmClass = function (el) {
    for (var _len3 = arguments.length, cName = new Array(_len3 > 1 ? _len3 - 1 : 0), _key3 = 1; _key3 < _len3; _key3++) {
      cName[_key3 - 1] = arguments[_key3];
    }

    return w.toArr(el).forEach(function (e) {
      var _e$classList2;

      return (_e$classList2 = e.classList).remove.apply(_e$classList2, cName);
    });
  }; // Data


  w.data = function (el, key) {
    return el.dataset && el.dataset[key];
  };

  w.hsData = function (el, key) {
    return w.data(el, key) !== undefined;
  }; // Attribute


  w.attr = function (el, key) {
    return el.getAttribute(key);
  };

  w.hsAttr = function (el, key) {
    return el.hasAttribute(key);
  };

  w.stAttr = function (el, key, value) {
    return w.toArr(el).forEach(function (e) {
      return e.setAttribute(key, value);
    });
  };

  w.rmAttr = function (el, key) {
    return w.toArr(el).forEach(function (e) {
      return e.removeAttribute(key);
    });
  };

  w.tgAttr = function (el, key) {
    return w.hsAttr(el, key) ? w.rmAttr(el, key) : w.stAttr(el, key, true);
  };
  /* Event */


  w.adEvent = function (el) {
    for (var _len4 = arguments.length, args = new Array(_len4 > 1 ? _len4 - 1 : 0), _key4 = 1; _key4 < _len4; _key4++) {
      args[_key4 - 1] = arguments[_key4];
    }

    return el.addEventListener.apply(el, args);
  };

  w.rmEvent = function (el) {
    for (var _len5 = arguments.length, args = new Array(_len5 > 1 ? _len5 - 1 : 0), _key5 = 1; _key5 < _len5; _key5++) {
      args[_key5 - 1] = arguments[_key5];
    }

    return el.removeEventListener.apply(el, args);
  };
  /* Functions */


  w.delay = function (ms, fn) {
    for (var _len6 = arguments.length, args = new Array(_len6 > 2 ? _len6 - 2 : 0), _key6 = 2; _key6 < _len6; _key6++) {
      args[_key6 - 2] = arguments[_key6];
    }

    return setTimeout(function () {
      return fn.apply(void 0, args);
    }, ms);
  }; // UI Component init


  w.toast = function (content, pos) {
    var el = d.createElement('div');
    el.className = "toast ".concat(pos);
    el.innerHTML = "<span class=\"message\" data-trigger=\"close\">".concat(content, "</span>");
    d.body.appendChild(el);
    setTimeout(function () {
      adClass(el, 'show');
    }, 100);
  };

  w.dialog = function (el) {
    setAttr(el, 'open', true);
  };

  function getSelector(ns, type) {
    var key = ns ? 'from' : type;
    return "[data-".concat(key).concat(ns ? "=\"".concat(ns, "\"") : '', "]");
  }

  function getSameAncestor(node, namespace) {
    var parent = node.parentNode;
    if (!parent) return null;

    while (parent) {
      console.log(parent, getSelector(namespace, 'action'));
      var actions = w.hsData(parent, 'action') ? parent : w.one(getSelector(namespace, 'action'), parent);

      if (actions) {
        return parent;
      } else {
        return getSameAncestor(parent);
      }
    }
  }

  function findIndex(list, node) {
    var index = null;
    list.forEach(function (n, idx) {
      if (n.isEqualNode(node)) index = idx;
    });
    return index;
  }

  function clickAction(target) {
    // Event namespace
    var ns = w.data(target, 'click'); // Ancestor element

    var ancestor = getSameAncestor(target, ns);

    if (ancestor) {
      var triggers = w.all(getSelector(ns, 'click'), ancestor);
      var actions = w.hsData(ancestor, 'action') ? [ancestor] : w.all(getSelector(ns, 'action'), ancestor);

      if (triggers.length) {
        var INDEX = findIndex(triggers, target) + 1;
        var context = actions[0]; // External temp function mapping
        // example:
        // __rmClass("ul li", "active"); __adClass(w._eq("ul li", 2), "active")

        var __ = {}; // runtime selector or a string detection

        var get = function get(str) {
          var isSel = w.isSel(str);

          for (var _len7 = arguments.length, args = new Array(_len7 > 1 ? _len7 - 1 : 0), _key7 = 1; _key7 < _len7; _key7++) {
            args[_key7 - 1] = arguments[_key7];
          }

          var arg = isSel ? args : [str].concat(args);
          return [isSel ? w.all(str, context) : context].concat(_toConsumableArray(arg));
        };

        __.eq = function (sel, idx) {
          return w.eq(sel, idx, context);
        };

        __.rm = function (el) {
          return el ? w.rm(w.all(el, context)) : w.rm(context);
        };

        __.rmClass = function (sel) {
          var _w;

          for (var _len8 = arguments.length, args = new Array(_len8 > 1 ? _len8 - 1 : 0), _key8 = 1; _key8 < _len8; _key8++) {
            args[_key8 - 1] = arguments[_key8];
          }

          return (_w = w).rmClass.apply(_w, _toConsumableArray(get.apply(void 0, [sel].concat(args))));
        };

        __.adClass = function (sel) {
          var _w2;

          for (var _len9 = arguments.length, args = new Array(_len9 > 1 ? _len9 - 1 : 0), _key9 = 1; _key9 < _len9; _key9++) {
            args[_key9 - 1] = arguments[_key9];
          }

          return (_w2 = w).adClass.apply(_w2, _toConsumableArray(get.apply(void 0, [sel].concat(args))));
        };

        __.tgClass = function (t, force) {
          return w.tgClass(context, t, force);
        };

        __.rmAttr = function (sel) {
          var _w3;

          for (var _len10 = arguments.length, args = new Array(_len10 > 1 ? _len10 - 1 : 0), _key10 = 1; _key10 < _len10; _key10++) {
            args[_key10 - 1] = arguments[_key10];
          }

          return (_w3 = w).rmAttr.apply(_w3, _toConsumableArray(get.apply(void 0, [sel].concat(args))));
        };

        __.stAttr = function (sel) {
          var _w4;

          for (var _len11 = arguments.length, args = new Array(_len11 > 1 ? _len11 - 1 : 0), _key11 = 1; _key11 < _len11; _key11++) {
            args[_key11 - 1] = arguments[_key11];
          }

          return (_w4 = w).stAttr.apply(_w4, _toConsumableArray(get.apply(void 0, [sel].concat(args))));
        };

        __.tgAttr = function (t) {
          return w.tgAttr(context, t);
        };

        __.delay = w.delay;
        var actionInput = w.data(actions[0], 'action');
        var code = (0, _compiler.compile)(actionInput.replace(/INDEX/g, INDEX)); // for test

        if (/debug/.test(location.href)) {
          w.__ = __;
          console.log("INDEX: ".concat(INDEX, "\nAction: ").concat(code, "\nAncestor: %o\nContext: %o"), ancestor, context);
        }

        try {
          eval(code);
        } catch (e) {
          console.error('Execute code error.', e);
          console.log(code);
        }
      }
    } else {
      console.error('Can`t find action target.');
    }
  }

  function handleAction(type, target, fn) {
    if (w.hsData(target, type)) {
      fn(target);
    }
  }

  function domReady() {
    w.adEvent(document, 'click', function (_ref) {
      var target = _ref.target;
      return handleAction('click', target, clickAction);
    });
  } // When dom ready, bind default action to triggers.


  w.adEvent(window, 'DOMContentLoaded', domReady);
})(window.JOSHUA_CONFIG || {}, window, document);
},{"./js/compiler.js":"../js/compiler.js"}],"../../node_modules/parcel-bundler/src/builtins/hmr-runtime.js":[function(require,module,exports) {
var global = arguments[3];
var OVERLAY_ID = '__parcel__error__overlay__';
var OldModule = module.bundle.Module;

function Module(moduleName) {
  OldModule.call(this, moduleName);
  this.hot = {
    data: module.bundle.hotData,
    _acceptCallbacks: [],
    _disposeCallbacks: [],
    accept: function (fn) {
      this._acceptCallbacks.push(fn || function () {});
    },
    dispose: function (fn) {
      this._disposeCallbacks.push(fn);
    }
  };
  module.bundle.hotData = null;
}

module.bundle.Module = Module;
var checkedAssets, assetsToAccept;
var parent = module.bundle.parent;

if ((!parent || !parent.isParcelRequire) && typeof WebSocket !== 'undefined') {
  var hostname = "" || location.hostname;
  var protocol = location.protocol === 'https:' ? 'wss' : 'ws';
  var ws = new WebSocket(protocol + '://' + hostname + ':' + "62345" + '/');

  ws.onmessage = function (event) {
    checkedAssets = {};
    assetsToAccept = [];
    var data = JSON.parse(event.data);

    if (data.type === 'update') {
      var handled = false;
      data.assets.forEach(function (asset) {
        if (!asset.isNew) {
          var didAccept = hmrAcceptCheck(global.parcelRequire, asset.id);

          if (didAccept) {
            handled = true;
          }
        }
      }); // Enable HMR for CSS by default.

      handled = handled || data.assets.every(function (asset) {
        return asset.type === 'css' && asset.generated.js;
      });

      if (handled) {
        console.clear();
        data.assets.forEach(function (asset) {
          hmrApply(global.parcelRequire, asset);
        });
        assetsToAccept.forEach(function (v) {
          hmrAcceptRun(v[0], v[1]);
        });
      } else {
        window.location.reload();
      }
    }

    if (data.type === 'reload') {
      ws.close();

      ws.onclose = function () {
        location.reload();
      };
    }

    if (data.type === 'error-resolved') {
      console.log('[parcel] ✨ Error resolved');
      removeErrorOverlay();
    }

    if (data.type === 'error') {
      console.error('[parcel] 🚨  ' + data.error.message + '\n' + data.error.stack);
      removeErrorOverlay();
      var overlay = createErrorOverlay(data);
      document.body.appendChild(overlay);
    }
  };
}

function removeErrorOverlay() {
  var overlay = document.getElementById(OVERLAY_ID);

  if (overlay) {
    overlay.remove();
  }
}

function createErrorOverlay(data) {
  var overlay = document.createElement('div');
  overlay.id = OVERLAY_ID; // html encode message and stack trace

  var message = document.createElement('div');
  var stackTrace = document.createElement('pre');
  message.innerText = data.error.message;
  stackTrace.innerText = data.error.stack;
  overlay.innerHTML = '<div style="background: black; font-size: 16px; color: white; position: fixed; height: 100%; width: 100%; top: 0px; left: 0px; padding: 30px; opacity: 0.85; font-family: Menlo, Consolas, monospace; z-index: 9999;">' + '<span style="background: red; padding: 2px 4px; border-radius: 2px;">ERROR</span>' + '<span style="top: 2px; margin-left: 5px; position: relative;">🚨</span>' + '<div style="font-size: 18px; font-weight: bold; margin-top: 20px;">' + message.innerHTML + '</div>' + '<pre>' + stackTrace.innerHTML + '</pre>' + '</div>';
  return overlay;
}

function getParents(bundle, id) {
  var modules = bundle.modules;

  if (!modules) {
    return [];
  }

  var parents = [];
  var k, d, dep;

  for (k in modules) {
    for (d in modules[k][1]) {
      dep = modules[k][1][d];

      if (dep === id || Array.isArray(dep) && dep[dep.length - 1] === id) {
        parents.push(k);
      }
    }
  }

  if (bundle.parent) {
    parents = parents.concat(getParents(bundle.parent, id));
  }

  return parents;
}

function hmrApply(bundle, asset) {
  var modules = bundle.modules;

  if (!modules) {
    return;
  }

  if (modules[asset.id] || !bundle.parent) {
    var fn = new Function('require', 'module', 'exports', asset.generated.js);
    asset.isNew = !modules[asset.id];
    modules[asset.id] = [fn, asset.deps];
  } else if (bundle.parent) {
    hmrApply(bundle.parent, asset);
  }
}

function hmrAcceptCheck(bundle, id) {
  var modules = bundle.modules;

  if (!modules) {
    return;
  }

  if (!modules[id] && bundle.parent) {
    return hmrAcceptCheck(bundle.parent, id);
  }

  if (checkedAssets[id]) {
    return;
  }

  checkedAssets[id] = true;
  var cached = bundle.cache[id];
  assetsToAccept.push([bundle, id]);

  if (cached && cached.hot && cached.hot._acceptCallbacks.length) {
    return true;
  }

  return getParents(global.parcelRequire, id).some(function (id) {
    return hmrAcceptCheck(global.parcelRequire, id);
  });
}

function hmrAcceptRun(bundle, id) {
  var cached = bundle.cache[id];
  bundle.hotData = {};

  if (cached) {
    cached.hot.data = bundle.hotData;
  }

  if (cached && cached.hot && cached.hot._disposeCallbacks.length) {
    cached.hot._disposeCallbacks.forEach(function (cb) {
      cb(bundle.hotData);
    });
  }

  delete bundle.cache[id];
  bundle(id);
  cached = bundle.cache[id];

  if (cached && cached.hot && cached.hot._acceptCallbacks.length) {
    cached.hot._acceptCallbacks.forEach(function (cb) {
      cb();
    });

    return true;
  }
}
},{}]},{},["../../node_modules/parcel-bundler/src/builtins/hmr-runtime.js","../joshua.js"], null)
//# sourceMappingURL=/joshua.e62691fe.js.map