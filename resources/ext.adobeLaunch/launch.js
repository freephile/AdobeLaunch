// Fromm `https://assets.adobedtm.com/05064fe6cab0/c247cd0acad1/launch-7e623b6eec86.js`.
(function() {
	window._satellite = window._satellite || {};
	window._satellite.container = {
	"buildInfo": {
	  "buildDate": "2020-10-13T22:40:03Z",
	  "environment": "production",
	  "turbineBuildDate": "2020-08-10T20:14:17Z",
	  "turbineVersion": "27.0.0"
	},
	"dataElements": {
	},
	"extensions": {
	  "core": {
		"displayName": "Core",
		"modules": {
		  "core/src/lib/events/directCall.js": {
			"name": "direct-call",
			"displayName": "Direct Call",
			"script": function(module, exports, require, turbine) {
  /***************************************************************************************
   * Copyright 2019 Adobe. All rights reserved.
   * This file is licensed to you under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License. You may obtain a copy
   * of the License at http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software distributed under
   * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
   * OF ANY KIND, either express or implied. See the License for the specific language
   * governing permissions and limitations under the License.
   ****************************************************************************************/
  
  'use strict';
  
  /**
   * Object where the key is the call name and the value is an array of all rule trigger functions
   * for that call name.
   * @type {Object}
   */
  var triggersByIdentifier = {};
  
  window._satellite = window._satellite || {};
  
  /**
   * Public function intended to be called by the user.
   * @param {string} identifier The identifier passed to _satellite.track().
   * @param {*} [detail] Any detail that should be passed along to conditions and actions.
   */
  window._satellite.track = function(identifier, detail) {
	identifier = identifier.trim();
	var triggers = triggersByIdentifier[identifier];
	if (triggers) {
	  var syntheticEvent = {
		identifier: identifier,
		detail: detail
	  };
  
	  triggers.forEach(function(trigger) {
		trigger(syntheticEvent);
	  });
  
	  var logMessage = 'Rules using the direct call event type with identifier "' + identifier +
		'" have been triggered' + (detail ? ' with additional detail:' : '.');
	  var logArgs = [logMessage];
  
	  if (detail) {
		logArgs.push(detail);
	  }
  
	  turbine.logger.log.apply(turbine.logger, logArgs);
	} else {
	  turbine.logger.log('"' + identifier + '" does not match any direct call identifiers.');
	}
  };
  
  /**
   * Direct call event. This event occurs as soon as the user calls _satellite.track().
   * @param {Object} settings The event settings object.
   * @param {string} settings.identifier The identifier passed to _satellite.track().
   * @param {ruleTrigger} trigger The trigger callback.
   */
  module.exports = function(settings, trigger) {
	var triggers = triggersByIdentifier[settings.identifier];
  
	if (!triggers) {
	  triggers = triggersByIdentifier[settings.identifier] = [];
	}
  
	triggers.push(trigger);
  };
  
			}
  
		  },
		  "core/src/lib/events/libraryLoaded.js": {
			"name": "library-loaded",
			"displayName": "Library Loaded (Page Top)",
			"script": function(module, exports, require, turbine) {
  /***************************************************************************************
   * Copyright 2019 Adobe. All rights reserved.
   * This file is licensed to you under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License. You may obtain a copy
   * of the License at http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software distributed under
   * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
   * OF ANY KIND, either express or implied. See the License for the specific language
   * governing permissions and limitations under the License.
   ****************************************************************************************/
  
  'use strict';
  
  var pageLifecycleEvents = require('./helpers/pageLifecycleEvents');
  
  /**
   * Library loaded event. This event occurs as soon as the runtime library is loaded.
   * @param {Object} settings The event settings object.
   * @param {ruleTrigger} trigger The trigger callback.
   */
  module.exports = function(settings, trigger) {
	pageLifecycleEvents.registerLibraryLoadedTrigger(trigger);
  };
  
			}
  
		  },
		  "core/src/lib/actions/customCode.js": {
			"name": "custom-code",
			"displayName": "Custom Code",
			"script": function(module, exports, require, turbine) {
  /***************************************************************************************
   * Copyright 2019 Adobe. All rights reserved.
   * This file is licensed to you under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License. You may obtain a copy
   * of the License at http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software distributed under
   * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
   * OF ANY KIND, either express or implied. See the License for the specific language
   * governing permissions and limitations under the License.
   ****************************************************************************************/
  
  'use strict';
  
  var document = require('@adobe/reactor-document');
  var Promise = require('@adobe/reactor-promise');
  var decorateCode = require('./helpers/decorateCode');
  var loadCodeSequentially = require('./helpers/loadCodeSequentially');
  var postscribe = require('../../../node_modules/postscribe/dist/postscribe');
  var unescapeHTMLEntities = require('./helpers/unescapeHtmlCode');
  
  var cspNonce;
  
  var postscribeWrite = (function() {
	var write = function(source) {
	  postscribe(document.body, source, {
		beforeWriteToken: function(token) {
		  var tagName = token.tagName && token.tagName.toLowerCase();
  
		  if (cspNonce && tagName === 'script') {
			token.attrs.nonce = cspNonce;
		  }
  
		  // There is an issue in Postscribe where script and style attributes
		  // are not unescaped. That causes problems when loading scripts from external
		  // sources. See https://jira.corp.adobe.com/browse/DTM-15058.
		  if (tagName === 'script' || tagName === 'style') {
			Object.keys(token.attrs || {}).forEach(function(key) {
			  token.attrs[key] = unescapeHTMLEntities(token.attrs[key]);
			});
  
			if (token.src) {
			  token.src = unescapeHTMLEntities(token.src);
			}
		  }
  
		  return token;
		},
		error: function(error) {
		  turbine.logger.error(error.msg);
		}
	  });
	};
  
	var queue = [];
  
	// If the Launch library is loaded asynchronously, it may finish loading before document.body
	// is available. This means the custom code action may be running before document.body is
	// available, in which case can't write the custom code to document.body. We could, in this
	// case, write it to document.head since it will for sure be available, but the user's custom
	// code may have something like an img tag for sending a beacon (this use case was seen in DTM).
	// Adding display elements like an img tag to document.head is against HTML spec, though it
	// does seem like an image request is still made. We opted instead to ensure we comply with
	// HTML spec and wait until we see that document.body is available before writing.
	var flushQueue = function() {
	  if (document.body) {
		while (queue.length) {
		  write(queue.shift());
		}
	  } else {
		// 20 is an arbitrarily small amount of time but not too aggressive.
		setTimeout(flushQueue, 20);
	  }
	};
  
	return function(source) {
	  queue.push(source);
	  flushQueue();
	};
  })();
  
  var libraryWasLoadedAsynchronously = (function() {
	// document.currentScript is not supported by IE
	if (document.currentScript) {
	  return document.currentScript.async;
	} else {
	  var scripts = document.querySelectorAll('script');
	  for (var i = 0; i < scripts.length; i++) {
		var script = scripts[i];
		// Find the script that loaded our library. Take into account embed scripts migrated
		// from DTM. We'll also consider that they may have added a querystring for cache-busting
		// or whatever.
		if (/(launch|satelliteLib)-[^\/]+.js(\?.*)?$/.test(script.src)) {
		  return script.async;
		}
	  }
	  // We couldn't find the Launch script, so we'll assume it was loaded asynchronously. This
	  // is the safer assumption.
	  return true;
	}
  })();
  
  /**
   * The custom code action. This loads and executes custom JavaScript or HTML provided by the user.
   * @param {Object} settings Action settings.
   * @params {boolean} settings.isExternal When true, <code>settings.source</code> contains the
   * code itself. When false, <code>settings.source</code> contains a relative path to the file
   * containing the user's code.
   * @param {string} settings.source If <code>settings.external</code> is <code>false</code>,
   * this will be the user's code. Otherwise, it will be a relative path to the file containing
   * the user's code.
   * @param {string} settings.language The language of the user's code. Must be either javascript or
   * html.
   * @param {Object} event The underlying event object that triggered the rule.
   * @param {Object} event.element The element that the rule was targeting.
   * @param {Object} event.target The element on which the event occurred.
   * <code>javascript</code> or <code>html</code>.
   */
  module.exports = function(settings, event) {
	// ensure the nonce is up-to-date when the function is used
	cspNonce = turbine.getExtensionSettings().cspNonce;
  
	var decoratedResult;
  
	var action = {
	  settings: settings,
	  event: event
	};
  
	var source = action.settings.source;
	if (!source) {
	  return;
	}
  
	if (action.settings.isExternal) {
	  return loadCodeSequentially(source).then(function(source) {
		if (source) {
		  decoratedResult = decorateCode(action, source);
		  postscribeWrite(decoratedResult.code);
		  return decoratedResult.promise;
		}
  
		return Promise.resolve();
	  });
	} else {
	  decoratedResult = decorateCode(action, source);
  
	  // This area has been modified several times, so here are some helpful details:
	  // 1. Custom code will be included into the main launch library if it's for a rule that uses the
	  //    Library Loaded or Page Bottom event. isExternal will be false. However, keep in mind that
	  //    the same rule may have other events that are not Library Loaded or Page Bottom. This means
	  //    we could see isExternal = false on the action when the event that fired the rule is
	  //    a click, for example.
	  // 2. When users load a library synchronously which has a rule using the Library Loaded
	  //    or Page Bottom event with a Custom Code action, they expect the custom code to be written
	  //    to the document in a blocking fashion (prevent the parser from continuing until their
	  //    custom code is executed). In other words, they expect document.write to be used. When
	  //    the library is loaded asynchronously, they do not have this expectation. However, note
	  //    that if the Library Loaded event is used and the website does not call
	  //    _satellite.pageBottom(), page bottom rules will be run when the DOMContentLoaded event
	  //    is fired (at which point we can't use document.write or it will wipe out website content).
	  // 3. Calls to document.write will be ignored by the browser if the Launch library is loaded
	  //    asynchronously, even if the calls are made before DOMContentLoaded.
	  // 4. There's a bug in IE 10 where readyState is sometimes set to "interactive" too
	  //    early (before DOMContentLoaded has fired). https://bugs.jquery.com/ticket/12282
	  //    This may cause Postscribe to be used sometimes when document.write() could have been
	  //    used instead, but we have concluded that IE 10 usage is low enough and the risk small
	  //    enough that this behavior is tolerable.
	  if (!libraryWasLoadedAsynchronously && document.readyState === 'loading') {
		// Document object in XML files is different from the ones in HTML files. Documents served
		// with the `application/xhtml+xml` MIME type don't have the `document.write` method.
		// More info:
		// https://www.w3.org/MarkUp/2004/xhtml-faq#docwrite
		// https://developer.mozilla.org/en-US/docs/Archive/Web/Writing_JavaScript_for_HTML
		// Also, when rule component sequencing is enabled, there is an issue in Edge Legacy
		// where the whole page gets erased: https://jira.corp.adobe.com/browse/DTM-13527.
		// We decided to not use document.write at all when rule component sequencing is enabled.
		if (
		  document.write &&
		  turbine.propertySettings.ruleComponentSequencingEnabled === false
		) {
		  document.write(decoratedResult.code);
		} else {
		  postscribeWrite(decoratedResult.code);
		}
	  } else {
		postscribeWrite(decoratedResult.code);
	  }
  
	  return decoratedResult.promise;
	}
  };
  
			}
  
		  },
		  "core/src/lib/events/helpers/pageLifecycleEvents.js": {
			"script": function(module, exports, require, turbine) {
  /***************************************************************************************
   * (c) 2018 Adobe. All rights reserved.
   * This file is licensed to you under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License. You may obtain a copy
   * of the License at http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software distributed under
   * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
   * OF ANY KIND, either express or implied. See the License for the specific language
   * governing permissions and limitations under the License.
   ****************************************************************************************/
  
  'use strict';
  
  // We need to be able to fire the rules in a specific order, no matter if the library is loaded
  // sync or async. The rules are fired in the following order:
  // Library loaded rules -> Page bottom rules -> Dom Ready rules -> Window load rules.
  
  var window = require('@adobe/reactor-window');
  var document = require('@adobe/reactor-document');
  
  var isIE10 = window.navigator.appVersion.indexOf('MSIE 10') !== -1;
  var WINDOW_LOADED = 'WINDOW_LOADED';
  var DOM_READY = 'DOM_READY';
  var PAGE_BOTTOM = 'PAGE_BOTTOM';
  
  var lifecycleEventsOrder = [PAGE_BOTTOM, DOM_READY, WINDOW_LOADED];
  
  var createSyntheticEvent = function(element, nativeEvent) {
	return {
	  element: element,
	  target: element,
	  nativeEvent: nativeEvent
	};
  };
  
  var registry = {};
  lifecycleEventsOrder.forEach(function(event) {
	registry[event] = [];
  });
  
  var processRegistry = function(lifecycleEvent, nativeEvent) {
	lifecycleEventsOrder
	  .slice(0, getLifecycleEventIndex(lifecycleEvent) + 1)
	  .forEach(function(lifecycleEvent) {
		processTriggers(nativeEvent, lifecycleEvent);
	  });
  };
  
  var detectLifecycleEvent = function() {
	if (document.readyState === 'complete') {
	  return WINDOW_LOADED;
	} else if (document.readyState === 'interactive') {
	  return !isIE10 ? DOM_READY : null;
	}
  };
  
  var getLifecycleEventIndex = function(event) {
	return lifecycleEventsOrder.indexOf(event);
  };
  
  var processTriggers = function(nativeEvent, lifecycleEvent) {
	registry[lifecycleEvent].forEach(function(triggerData) {
	  processTrigger(nativeEvent, triggerData);
	});
	registry[lifecycleEvent] = [];
  };
  
  var processTrigger = function(nativeEvent, triggerData) {
	var trigger = triggerData.trigger;
	var syntheticEventFn = triggerData.syntheticEventFn;
  
	trigger(syntheticEventFn ? syntheticEventFn(nativeEvent) : null);
  };
  
  window._satellite = window._satellite || {};
  window._satellite.pageBottom = processRegistry.bind(null, PAGE_BOTTOM);
  
  document.addEventListener(
	'DOMContentLoaded',
	processRegistry.bind(null, DOM_READY),
	true
  );
  window.addEventListener(
	'load',
	processRegistry.bind(null, WINDOW_LOADED),
	true
  );
  
  // Depending on the way the Launch library was loaded, none of the registered listeners that
  // execute `processRegistry` may fire . We need to execute the `processRegistry` method at
  // least once. If this timeout fires before any of the registered listeners, we auto-detect the
  // current lifecycle event and fire all the registered triggers in order. We don't care if the
  // `processRegistry` is called multiple times for the same lifecycle event. We fire the registered
  // triggers for a lifecycle event only once. We used a `setTimeout` here to make sure all the rules
  // using Library Loaded are registered and executed synchronously and before rules using any of the
  // other lifecycle event types.
  window.setTimeout(function() {
	var lifecycleEvent = detectLifecycleEvent();
	if (lifecycleEvent) {
	  processRegistry(lifecycleEvent);
	}
  }, 0);
  
  module.exports = {
	registerLibraryLoadedTrigger: function(trigger) {
	  trigger();
	},
	registerPageBottomTrigger: function(trigger) {
	  registry[PAGE_BOTTOM].push({
		trigger: trigger
	  });
	},
	registerDomReadyTrigger: function(trigger) {
	  registry[DOM_READY].push({
		trigger: trigger,
		syntheticEventFn: createSyntheticEvent.bind(null, document)
	  });
	},
	registerWindowLoadedTrigger: function(trigger) {
	  registry[WINDOW_LOADED].push({
		trigger: trigger,
		syntheticEventFn: createSyntheticEvent.bind(null, window)
	  });
	}
  };
  
			}
  
		  },
		  "core/src/lib/actions/helpers/decorateCode.js": {
			"script": function(module, exports, require, turbine) {
  /*
  Copyright 2020 Adobe. All rights reserved.
  This file is licensed to you under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License. You may obtain a copy
  of the License at http://www.apache.org/licenses/LICENSE-2.0
  Unless required by applicable law or agreed to in writing, software distributed under
  the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
  OF ANY KIND, either express or implied. See the License for the specific language
  governing permissions and limitations under the License.
  */
  
  'use strict';
  
  var decorateGlobalJavaScriptCode = require('./decorators/decorateGlobalJavaScriptCode');
  var decorateNonGlobalJavaScriptCode = require('./decorators/decorateNonGlobalJavaScriptCode');
  var decorateHtmlCode = require('./decorators/decorateHtmlCode');
  
  var decorators = {
	javascript: function(action, source) {
	  return action.settings.global
		? decorateGlobalJavaScriptCode(action, source)
		: decorateNonGlobalJavaScriptCode(action, source);
	},
	html: decorateHtmlCode
  };
  
  module.exports = function(action, source) {
	return decorators[action.settings.language](action, source);
  };
  
			}
  
		  },
		  "core/src/lib/actions/helpers/loadCodeSequentially.js": {
			"script": function(module, exports, require, turbine) {
  /***************************************************************************************
   * Copyright 2019 Adobe. All rights reserved.
   * This file is licensed to you under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License. You may obtain a copy
   * of the License at http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software distributed under
   * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
   * OF ANY KIND, either express or implied. See the License for the specific language
   * governing permissions and limitations under the License.
   ****************************************************************************************/
  
  'use strict';
  
  var Promise = require('@adobe/reactor-promise');
  var getSourceByUrl = require('./getSourceByUrl');
  
  var previousExecuteCodePromise = Promise.resolve();
  
  module.exports = function(sourceUrl) {
	var sequentiallyLoadCodePromise = new Promise(function(resolve) {
	  var loadCodePromise = getSourceByUrl(sourceUrl);
  
	  Promise.all([
		loadCodePromise,
		previousExecuteCodePromise
	  ]).then(function(values) {
		var source = values[0];
		resolve(source);
	  });
	});
  
	previousExecuteCodePromise = sequentiallyLoadCodePromise;
	return sequentiallyLoadCodePromise;
  };
  
			}
  
		  },
		  "core/node_modules/postscribe/dist/postscribe.js": {
			"script": function(module, exports, require, turbine) {
  /**
   * @file postscribe
   * @description Asynchronously write javascript, even with document.write.
   * @version v2.0.8
   * @see {@link https://krux.github.io/postscribe}
   * @license MIT
   * @author Derek Brans
   * @copyright 2016 Krux Digital, Inc
   */
  (function webpackUniversalModuleDefinition(root, factory) {
	  if(typeof exports === 'object' && typeof module === 'object')
		  module.exports = factory();
	  else if(typeof define === 'function' && define.amd)
		  define([], factory);
	  else if(typeof exports === 'object')
		  exports["postscribe"] = factory();
	  else
		  root["postscribe"] = factory();
  })(this, function() {
  return /******/ (function(modules) { // webpackBootstrap
  /******/ 	// The module cache
  /******/ 	var installedModules = {};
  /******/
  /******/ 	// The require function
  /******/ 	function __webpack_require__(moduleId) {
  /******/
  /******/ 		// Check if module is in cache
  /******/ 		if(installedModules[moduleId])
  /******/ 			return installedModules[moduleId].exports;
  /******/
  /******/ 		// Create a new module (and put it into the cache)
  /******/ 		var module = installedModules[moduleId] = {
  /******/ 			exports: {},
  /******/ 			id: moduleId,
  /******/ 			loaded: false
  /******/ 		};
  /******/
  /******/ 		// Execute the module function
  /******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
  /******/
  /******/ 		// Flag the module as loaded
  /******/ 		module.loaded = true;
  /******/
  /******/ 		// Return the exports of the module
  /******/ 		return module.exports;
  /******/ 	}
  /******/
  /******/
  /******/ 	// expose the modules object (__webpack_modules__)
  /******/ 	__webpack_require__.m = modules;
  /******/
  /******/ 	// expose the module cache
  /******/ 	__webpack_require__.c = installedModules;
  /******/
  /******/ 	// __webpack_public_path__
  /******/ 	__webpack_require__.p = "";
  /******/
  /******/ 	// Load entry module and return exports
  /******/ 	return __webpack_require__(0);
  /******/ })
  /************************************************************************/
  /******/ ([
  /* 0 */
  /***/ function(module, exports, __webpack_require__) {
  
	  'use strict';
	  
	  var _postscribe = __webpack_require__(1);
	  
	  var _postscribe2 = _interopRequireDefault(_postscribe);
	  
	  function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }
	  
	  module.exports = _postscribe2['default'];
  
  /***/ },
  /* 1 */
  /***/ function(module, exports, __webpack_require__) {
  
	  'use strict';
	  
	  exports.__esModule = true;
	  
	  var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };
	  
	  exports['default'] = postscribe;
	  
	  var _writeStream = __webpack_require__(2);
	  
	  var _writeStream2 = _interopRequireDefault(_writeStream);
	  
	  var _utils = __webpack_require__(4);
	  
	  var utils = _interopRequireWildcard(_utils);
	  
	  function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj['default'] = obj; return newObj; } }
	  
	  function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }
	  
	  /**
	   * A function that intentionally does nothing.
	   */
	  function doNothing() {}
	  
	  /**
	   * Available options and defaults.
	   *
	   * @type {Object}
	   */
	  var OPTIONS = {
		/**
		 * Called when an async script has loaded.
		 */
		afterAsync: doNothing,
	  
		/**
		 * Called immediately before removing from the write queue.
		 */
		afterDequeue: doNothing,
	  
		/**
		 * Called sync after a stream's first thread release.
		 */
		afterStreamStart: doNothing,
	  
		/**
		 * Called after writing buffered document.write calls.
		 */
		afterWrite: doNothing,
	  
		/**
		 * Allows disabling the autoFix feature of prescribe
		 */
		autoFix: true,
	  
		/**
		 * Called immediately before adding to the write queue.
		 */
		beforeEnqueue: doNothing,
	  
		/**
		 * Called before writing a token.
		 *
		 * @param {Object} tok The token
		 */
		beforeWriteToken: function beforeWriteToken(tok) {
		  return tok;
		},
	  
		/**
		 * Called before writing buffered document.write calls.
		 *
		 * @param {String} str The string
		 */
		beforeWrite: function beforeWrite(str) {
		  return str;
		},
	  
		/**
		 * Called when evaluation is finished.
		 */
		done: doNothing,
	  
		/**
		 * Called when a write results in an error.
		 *
		 * @param {Error} e The error
		 */
		error: function error(e) {
		  throw new Error(e.msg);
		},
	  
	  
		/**
		 * Whether to let scripts w/ async attribute set fall out of the queue.
		 */
		releaseAsync: false
	  };
	  
	  var nextId = 0;
	  var queue = [];
	  var active = null;
	  
	  function nextStream() {
		var args = queue.shift();
		if (args) {
		  var options = utils.last(args);
	  
		  options.afterDequeue();
		  args.stream = runStream.apply(undefined, args);
		  options.afterStreamStart();
		}
	  }
	  
	  function runStream(el, html, options) {
		active = new _writeStream2['default'](el, options);
	  
		// Identify this stream.
		active.id = nextId++;
		active.name = options.name || active.id;
		postscribe.streams[active.name] = active;
	  
		// Override document.write.
		var doc = el.ownerDocument;
	  
		var stash = {
		  close: doc.close,
		  open: doc.open,
		  write: doc.write,
		  writeln: doc.writeln
		};
	  
		function _write(str) {
		  str = options.beforeWrite(str);
		  active.write(str);
		  options.afterWrite(str);
		}
	  
		_extends(doc, {
		  close: doNothing,
		  open: doNothing,
		  write: function write() {
			for (var _len = arguments.length, str = Array(_len), _key = 0; _key < _len; _key++) {
			  str[_key] = arguments[_key];
			}
	  
			return _write(str.join(''));
		  },
		  writeln: function writeln() {
			for (var _len2 = arguments.length, str = Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
			  str[_key2] = arguments[_key2];
			}
	  
			return _write(str.join('') + '\n');
		  }
		});
	  
		// Override window.onerror
		var oldOnError = active.win.onerror || doNothing;
	  
		// This works together with the try/catch around WriteStream::insertScript
		// In modern browsers, exceptions in tag scripts go directly to top level
		active.win.onerror = function (msg, url, line) {
		  options.error({ msg: msg + ' - ' + url + ': ' + line });
		  oldOnError.apply(active.win, [msg, url, line]);
		};
	  
		// Write to the stream
		active.write(html, function () {
		  // restore document.write
		  _extends(doc, stash);
	  
		  // restore window.onerror
		  active.win.onerror = oldOnError;
	  
		  options.done();
		  active = null;
		  nextStream();
		});
	  
		return active;
	  }
	  
	  function postscribe(el, html, options) {
		if (utils.isFunction(options)) {
		  options = { done: options };
		} else if (options === 'clear') {
		  queue = [];
		  active = null;
		  nextId = 0;
		  return;
		}
	  
		options = utils.defaults(options, OPTIONS);
	  
		// id selector
		if (/^#/.test(el)) {
		  el = window.document.getElementById(el.substr(1));
		} else {
		  el = el.jquery ? el[0] : el;
		}
	  
		var args = [el, html, options];
	  
		el.postscribe = {
		  cancel: function cancel() {
			if (args.stream) {
			  args.stream.abort();
			} else {
			  args[1] = doNothing;
			}
		  }
		};
	  
		options.beforeEnqueue(args);
		queue.push(args);
	  
		if (!active) {
		  nextStream();
		}
	  
		return el.postscribe;
	  }
	  
	  _extends(postscribe, {
		// Streams by name.
		streams: {},
		// Queue of streams.
		queue: queue,
		// Expose internal classes.
		WriteStream: _writeStream2['default']
	  });
  
  /***/ },
  /* 2 */
  /***/ function(module, exports, __webpack_require__) {
  
	  'use strict';
	  
	  exports.__esModule = true;
	  
	  var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };
	  
	  var _prescribe = __webpack_require__(3);
	  
	  var _prescribe2 = _interopRequireDefault(_prescribe);
	  
	  var _utils = __webpack_require__(4);
	  
	  var utils = _interopRequireWildcard(_utils);
	  
	  function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj['default'] = obj; return newObj; } }
	  
	  function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }
	  
	  function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }
	  
	  /**
	   * Turn on to debug how each chunk affected the DOM.
	   * @type {boolean}
	   */
	  var DEBUG_CHUNK = false;
	  
	  /**
	   * Prefix for data attributes on DOM elements.
	   * @type {string}
	   */
	  var BASEATTR = 'data-ps-';
	  
	  /**
	   * ID for the style proxy
	   * @type {string}
	   */
	  var PROXY_STYLE = 'ps-style';
	  
	  /**
	   * ID for the script proxy
	   * @type {string}
	   */
	  var PROXY_SCRIPT = 'ps-script';
	  
	  /**
	   * Get data attributes
	   *
	   * @param {Object} el The DOM element.
	   * @param {String} name The attribute name.
	   * @returns {String}
	   */
	  function getData(el, name) {
		var attr = BASEATTR + name;
	  
		var val = el.getAttribute(attr);
	  
		// IE 8 returns a number if it's a number
		return !utils.existy(val) ? val : String(val);
	  }
	  
	  /**
	   * Set data attributes
	   *
	   * @param {Object} el The DOM element.
	   * @param {String} name The attribute name.
	   * @param {null|*} value The attribute value.
	   */
	  function setData(el, name) {
		var value = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : null;
	  
		var attr = BASEATTR + name;
	  
		if (utils.existy(value) && value !== '') {
		  el.setAttribute(attr, value);
		} else {
		  el.removeAttribute(attr);
		}
	  }
	  
	  /**
	   * Stream static html to an element, where "static html" denotes "html
	   * without scripts".
	   *
	   * This class maintains a *history of writes devoid of any attributes* or
	   * "proxy history".
	   *
	   * Injecting the proxy history into a temporary div has no side-effects,
	   * other than to create proxy elements for previously written elements.
	   *
	   * Given the `staticHtml` of a new write, a `tempDiv`'s innerHTML is set to
	   * `proxy_history + staticHtml`.
	   * The *structure* of `tempDiv`'s contents, (i.e., the placement of new nodes
	   * beside or inside of proxy elements), reflects the DOM structure that would
	   * have resulted if all writes had been squashed into a single write.
	   *
	   * For each descendent `node` of `tempDiv` whose parentNode is a *proxy*,
	   * `node` is appended to the corresponding *real* element within the DOM.
	   *
	   * Proxy elements are mapped to *actual* elements in the DOM by injecting a
	   * `data-id` attribute into each start tag in `staticHtml`.
	   *
	   */
	  
	  var WriteStream = function () {
		/**
		 * Constructor.
		 *
		 * @param {Object} root The root element
		 * @param {?Object} options The options
		 */
		function WriteStream(root) {
		  var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
	  
		  _classCallCheck(this, WriteStream);
	  
		  this.root = root;
		  this.options = options;
		  this.doc = root.ownerDocument;
		  this.win = this.doc.defaultView || this.doc.parentWindow;
		  this.parser = new _prescribe2['default']('', { autoFix: options.autoFix });
	  
		  // Actual elements by id.
		  this.actuals = [root];
	  
		  // Embodies the "structure" of what's been written so far,
		  // devoid of attributes.
		  this.proxyHistory = '';
	  
		  // Create a proxy of the root element.
		  this.proxyRoot = this.doc.createElement(root.nodeName);
	  
		  this.scriptStack = [];
		  this.writeQueue = [];
	  
		  setData(this.proxyRoot, 'proxyof', 0);
		}
	  
		/**
		 * Writes the given strings.
		 *
		 * @param {...String} str The strings to write
		 */
	  
	  
		WriteStream.prototype.write = function write() {
		  var _writeQueue;
	  
		  (_writeQueue = this.writeQueue).push.apply(_writeQueue, arguments);
	  
		  // Process writes
		  // When new script gets pushed or pending this will stop
		  // because new writeQueue gets pushed
		  while (!this.deferredRemote && this.writeQueue.length) {
			var arg = this.writeQueue.shift();
	  
			if (utils.isFunction(arg)) {
			  this._callFunction(arg);
			} else {
			  this._writeImpl(arg);
			}
		  }
		};
	  
		/**
		 * Calls the given function.
		 *
		 * @param {Function} fn The function to call
		 * @private
		 */
	  
	  
		WriteStream.prototype._callFunction = function _callFunction(fn) {
		  var tok = { type: 'function', value: fn.name || fn.toString() };
		  this._onScriptStart(tok);
		  fn.call(this.win, this.doc);
		  this._onScriptDone(tok);
		};
	  
		/**
		 * The write implementation
		 *
		 * @param {String} html The HTML to write.
		 * @private
		 */
	  
	  
		WriteStream.prototype._writeImpl = function _writeImpl(html) {
		  this.parser.append(html);
	  
		  var tok = void 0;
		  var script = void 0;
		  var style = void 0;
		  var tokens = [];
	  
		  // stop if we see a script token
		  while ((tok = this.parser.readToken()) && !(script = utils.isScript(tok)) && !(style = utils.isStyle(tok))) {
			tok = this.options.beforeWriteToken(tok);
	  
			if (tok) {
			  tokens.push(tok);
			}
		  }
	  
		  if (tokens.length > 0) {
			this._writeStaticTokens(tokens);
		  }
	  
		  if (script) {
			this._handleScriptToken(tok);
		  }
	  
		  if (style) {
			this._handleStyleToken(tok);
		  }
		};
	  
		/**
		 * Write contiguous non-script tokens (a chunk)
		 *
		 * @param {Array<Object>} tokens The tokens
		 * @returns {{tokens, raw, actual, proxy}|null}
		 * @private
		 */
	  
	  
		WriteStream.prototype._writeStaticTokens = function _writeStaticTokens(tokens) {
		  var chunk = this._buildChunk(tokens);
	  
		  if (!chunk.actual) {
			// e.g., no tokens, or a noscript that got ignored
			return null;
		  }
	  
		  chunk.html = this.proxyHistory + chunk.actual;
		  this.proxyHistory += chunk.proxy;
		  this.proxyRoot.innerHTML = chunk.html;
	  
		  if (DEBUG_CHUNK) {
			chunk.proxyInnerHTML = this.proxyRoot.innerHTML;
		  }
	  
		  this._walkChunk();
	  
		  if (DEBUG_CHUNK) {
			chunk.actualInnerHTML = this.root.innerHTML;
		  }
	  
		  return chunk;
		};
	  
		/**
		 * Build a chunk.
		 *
		 * @param {Array<Object>} tokens The tokens to use.
		 * @returns {{tokens: *, raw: string, actual: string, proxy: string}}
		 * @private
		 */
	  
	  
		WriteStream.prototype._buildChunk = function _buildChunk(tokens) {
		  var nextId = this.actuals.length;
	  
		  // The raw html of this chunk.
		  var raw = [];
	  
		  // The html to create the nodes in the tokens (with id's injected).
		  var actual = [];
	  
		  // Html that can later be used to proxy the nodes in the tokens.
		  var proxy = [];
	  
		  var len = tokens.length;
		  for (var i = 0; i < len; i++) {
			var tok = tokens[i];
			var tokenRaw = tok.toString();
	  
			raw.push(tokenRaw);
	  
			if (tok.attrs) {
			  // tok.attrs <==> startTag or atomicTag or cursor
			  // Ignore noscript tags. They are atomic, so we don't have to worry about children.
			  if (!/^noscript$/i.test(tok.tagName)) {
				var id = nextId++;
	  
				// Actual: inject id attribute: replace '>' at end of start tag with id attribute + '>'
				actual.push(tokenRaw.replace(/(\/?>)/, ' ' + BASEATTR + 'id=' + id + ' $1'));
	  
				// Don't proxy scripts: they have no bearing on DOM structure.
				if (tok.attrs.id !== PROXY_SCRIPT && tok.attrs.id !== PROXY_STYLE) {
				  // Proxy: strip all attributes and inject proxyof attribute
				  proxy.push(
				  // ignore atomic tags (e.g., style): they have no "structural" effect
				  tok.type === 'atomicTag' ? '' : '<' + tok.tagName + ' ' + BASEATTR + 'proxyof=' + id + (tok.unary ? ' />' : '>'));
				}
			  }
			} else {
			  // Visit any other type of token
			  // Actual: append.
			  actual.push(tokenRaw);
	  
			  // Proxy: append endTags. Ignore everything else.
			  proxy.push(tok.type === 'endTag' ? tokenRaw : '');
			}
		  }
	  
		  return {
			tokens: tokens,
			raw: raw.join(''),
			actual: actual.join(''),
			proxy: proxy.join('')
		  };
		};
	  
		/**
		 * Walk the chunks.
		 *
		 * @private
		 */
	  
	  
		WriteStream.prototype._walkChunk = function _walkChunk() {
		  var node = void 0;
		  var stack = [this.proxyRoot];
	  
		  // use shift/unshift so that children are walked in document order
		  while (utils.existy(node = stack.shift())) {
			var isElement = node.nodeType === 1;
			var isProxy = isElement && getData(node, 'proxyof');
	  
			// Ignore proxies
			if (!isProxy) {
			  if (isElement) {
				// New actual element: register it and remove the the id attr.
				this.actuals[getData(node, 'id')] = node;
				setData(node, 'id');
			  }
	  
			  // Is node's parent a proxy?
			  var parentIsProxyOf = node.parentNode && getData(node.parentNode, 'proxyof');
			  if (parentIsProxyOf) {
				// Move node under actual parent.
				this.actuals[parentIsProxyOf].appendChild(node);
			  }
			}
	  
			// prepend childNodes to stack
			stack.unshift.apply(stack, utils.toArray(node.childNodes));
		  }
		};
	  
		/**
		 * Handles Script tokens
		 *
		 * @param {Object} tok The token
		 */
	  
	  
		WriteStream.prototype._handleScriptToken = function _handleScriptToken(tok) {
		  var _this = this;
	  
		  var remainder = this.parser.clear();
	  
		  if (remainder) {
			// Write remainder immediately behind this script.
			this.writeQueue.unshift(remainder);
		  }
	  
		  tok.src = tok.attrs.src || tok.attrs.SRC;
	  
		  tok = this.options.beforeWriteToken(tok);
		  if (!tok) {
			// User has removed this token
			return;
		  }
	  
		  if (tok.src && this.scriptStack.length) {
			// Defer this script until scriptStack is empty.
			// Assumption 1: This script will not start executing until
			// scriptStack is empty.
			this.deferredRemote = tok;
		  } else {
			this._onScriptStart(tok);
		  }
	  
		  // Put the script node in the DOM.
		  this._writeScriptToken(tok, function () {
			_this._onScriptDone(tok);
		  });
		};
	  
		/**
		 * Handles style tokens
		 *
		 * @param {Object} tok The token
		 */
	  
	  
		WriteStream.prototype._handleStyleToken = function _handleStyleToken(tok) {
		  var remainder = this.parser.clear();
	  
		  if (remainder) {
			// Write remainder immediately behind this style.
			this.writeQueue.unshift(remainder);
		  }
	  
		  tok.type = tok.attrs.type || tok.attrs.TYPE || 'text/css';
	  
		  tok = this.options.beforeWriteToken(tok);
	  
		  if (tok) {
			// Put the style node in the DOM.
			this._writeStyleToken(tok);
		  }
	  
		  if (remainder) {
			this.write();
		  }
		};
	  
		/**
		 * Build a style and insert it into the DOM.
		 *
		 * @param {Object} tok The token
		 */
	  
	  
		WriteStream.prototype._writeStyleToken = function _writeStyleToken(tok) {
		  var el = this._buildStyle(tok);
	  
		  this._insertCursor(el, PROXY_STYLE);
	  
		  // Set content
		  if (tok.content) {
			if (el.styleSheet && !el.sheet) {
			  el.styleSheet.cssText = tok.content;
			} else {
			  el.appendChild(this.doc.createTextNode(tok.content));
			}
		  }
		};
	  
		/**
		 * Build a style element from an atomic style token.
		 *
		 * @param {Object} tok The token
		 * @returns {Element}
		 */
	  
	  
		WriteStream.prototype._buildStyle = function _buildStyle(tok) {
		  var el = this.doc.createElement(tok.tagName);
	  
		  el.setAttribute('type', tok.type);
	  
		  // Set attributes
		  utils.eachKey(tok.attrs, function (name, value) {
			el.setAttribute(name, value);
		  });
	  
		  return el;
		};
	  
		/**
		 * Append a span to the stream. That span will act as a cursor
		 * (i.e. insertion point) for the element.
		 *
		 * @param {Object} el The element
		 * @param {string} which The type of proxy element
		 */
	  
	  
		WriteStream.prototype._insertCursor = function _insertCursor(el, which) {
		  this._writeImpl('<span id="' + which + '"/>');
	  
		  var cursor = this.doc.getElementById(which);
	  
		  if (cursor) {
			cursor.parentNode.replaceChild(el, cursor);
		  }
		};
	  
		/**
		 * Called when a script is started.
		 *
		 * @param {Object} tok The token
		 * @private
		 */
	  
	  
		WriteStream.prototype._onScriptStart = function _onScriptStart(tok) {
		  tok.outerWrites = this.writeQueue;
		  this.writeQueue = [];
		  this.scriptStack.unshift(tok);
		};
	  
		/**
		 * Called when a script is done.
		 *
		 * @param {Object} tok The token
		 * @private
		 */
	  
	  
		WriteStream.prototype._onScriptDone = function _onScriptDone(tok) {
		  // Pop script and check nesting.
		  if (tok !== this.scriptStack[0]) {
			this.options.error({ msg: 'Bad script nesting or script finished twice' });
			return;
		  }
	  
		  this.scriptStack.shift();
	  
		  // Append outer writes to queue and process them.
		  this.write.apply(this, tok.outerWrites);
	  
		  // Check for pending remote
	  
		  // Assumption 2: if remote_script1 writes remote_script2 then
		  // the we notice remote_script1 finishes before remote_script2 starts.
		  // I think this is equivalent to assumption 1
		  if (!this.scriptStack.length && this.deferredRemote) {
			this._onScriptStart(this.deferredRemote);
			this.deferredRemote = null;
		  }
		};
	  
		/**
		 * Build a script and insert it into the DOM.
		 * Done is called once script has executed.
		 *
		 * @param {Object} tok The token
		 * @param {Function} done The callback when complete
		 */
	  
	  
		WriteStream.prototype._writeScriptToken = function _writeScriptToken(tok, done) {
		  var el = this._buildScript(tok);
		  var asyncRelease = this._shouldRelease(el);
		  var afterAsync = this.options.afterAsync;
	  
		  if (tok.src) {
			// Fix for attribute "SRC" (capitalized). IE does not recognize it.
			el.src = tok.src;
			this._scriptLoadHandler(el, !asyncRelease ? function () {
			  done();
			  afterAsync();
			} : afterAsync);
		  }
	  
		  try {
			this._insertCursor(el, PROXY_SCRIPT);
			if (!el.src || asyncRelease) {
			  done();
			}
		  } catch (e) {
			this.options.error(e);
			done();
		  }
		};
	  
		/**
		 * Build a script element from an atomic script token.
		 *
		 * @param {Object} tok The token
		 * @returns {Element}
		 */
	  
	  
		WriteStream.prototype._buildScript = function _buildScript(tok) {
		  var el = this.doc.createElement(tok.tagName);
	  
		  // Set attributes
		  utils.eachKey(tok.attrs, function (name, value) {
			el.setAttribute(name, value);
		  });
	  
		  // Set content
		  if (tok.content) {
			el.text = tok.content;
		  }
	  
		  return el;
		};
	  
		/**
		 * Setup the script load handler on an element.
		 *
		 * @param {Object} el The element
		 * @param {Function} done The callback
		 * @private
		 */
	  
	  
		WriteStream.prototype._scriptLoadHandler = function _scriptLoadHandler(el, done) {
		  function cleanup() {
			el = el.onload = el.onreadystatechange = el.onerror = null;
		  }
	  
		  var error = this.options.error;
	  
		  function success() {
			cleanup();
			if (done != null) {
			  done();
			}
			done = null;
		  }
	  
		  function failure(err) {
			cleanup();
			error(err);
			if (done != null) {
			  done();
			}
			done = null;
		  }
	  
		  function reattachEventListener(el, evt) {
			var handler = el['on' + evt];
			if (handler != null) {
			  el['_on' + evt] = handler;
			}
		  }
	  
		  reattachEventListener(el, 'load');
		  reattachEventListener(el, 'error');
	  
		  _extends(el, {
			onload: function onload() {
			  if (el._onload) {
				try {
				  el._onload.apply(this, Array.prototype.slice.call(arguments, 0));
				} catch (err) {
				  failure({ msg: 'onload handler failed ' + err + ' @ ' + el.src });
				}
			  }
			  success();
			},
			onerror: function onerror() {
			  if (el._onerror) {
				try {
				  el._onerror.apply(this, Array.prototype.slice.call(arguments, 0));
				} catch (err) {
				  failure({ msg: 'onerror handler failed ' + err + ' @ ' + el.src });
				  return;
				}
			  }
			  failure({ msg: 'remote script failed ' + el.src });
			},
			onreadystatechange: function onreadystatechange() {
			  if (/^(loaded|complete)$/.test(el.readyState)) {
				success();
			  }
			}
		  });
		};
	  
		/**
		 * Determines whether to release.
		 *
		 * @param {Object} el The element
		 * @returns {boolean}
		 * @private
		 */
	  
	  
		WriteStream.prototype._shouldRelease = function _shouldRelease(el) {
		  var isScript = /^script$/i.test(el.nodeName);
		  return !isScript || !!(this.options.releaseAsync && el.src && el.hasAttribute('async'));
		};
	  
		return WriteStream;
	  }();
	  
	  exports['default'] = WriteStream;
  
  /***/ },
  /* 3 */
  /***/ function(module, exports, __webpack_require__) {
  
	  /**
	   * @file prescribe
	   * @description Tiny, forgiving HTML parser
	   * @version vundefined
	   * @see {@link https://github.com/krux/prescribe/}
	   * @license MIT
	   * @author Derek Brans
	   * @copyright 2016 Krux Digital, Inc
	   */
	  (function webpackUniversalModuleDefinition(root, factory) {
		  if(true)
			  module.exports = factory();
		  else if(typeof define === 'function' && define.amd)
			  define([], factory);
		  else if(typeof exports === 'object')
			  exports["Prescribe"] = factory();
		  else
			  root["Prescribe"] = factory();
	  })(this, function() {
	  return /******/ (function(modules) { // webpackBootstrap
	  /******/ 	// The module cache
	  /******/ 	var installedModules = {};
	  
	  /******/ 	// The require function
	  /******/ 	function __webpack_require__(moduleId) {
	  
	  /******/ 		// Check if module is in cache
	  /******/ 		if(installedModules[moduleId])
	  /******/ 			return installedModules[moduleId].exports;
	  
	  /******/ 		// Create a new module (and put it into the cache)
	  /******/ 		var module = installedModules[moduleId] = {
	  /******/ 			exports: {},
	  /******/ 			id: moduleId,
	  /******/ 			loaded: false
	  /******/ 		};
	  
	  /******/ 		// Execute the module function
	  /******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
	  
	  /******/ 		// Flag the module as loaded
	  /******/ 		module.loaded = true;
	  
	  /******/ 		// Return the exports of the module
	  /******/ 		return module.exports;
	  /******/ 	}
	  
	  
	  /******/ 	// expose the modules object (__webpack_modules__)
	  /******/ 	__webpack_require__.m = modules;
	  
	  /******/ 	// expose the module cache
	  /******/ 	__webpack_require__.c = installedModules;
	  
	  /******/ 	// __webpack_public_path__
	  /******/ 	__webpack_require__.p = "";
	  
	  /******/ 	// Load entry module and return exports
	  /******/ 	return __webpack_require__(0);
	  /******/ })
	  /************************************************************************/
	  /******/ ([
	  /* 0 */
	  /***/ function(module, exports, __webpack_require__) {
	  
		  'use strict';
	  
		  var _HtmlParser = __webpack_require__(1);
	  
		  var _HtmlParser2 = _interopRequireDefault(_HtmlParser);
	  
		  function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }
	  
		  module.exports = _HtmlParser2['default'];
	  
	  /***/ },
	  /* 1 */
	  /***/ function(module, exports, __webpack_require__) {
	  
		  'use strict';
	  
		  exports.__esModule = true;
	  
		  var _supports = __webpack_require__(2);
	  
		  var supports = _interopRequireWildcard(_supports);
	  
		  var _streamReaders = __webpack_require__(3);
	  
		  var streamReaders = _interopRequireWildcard(_streamReaders);
	  
		  var _fixedReadTokenFactory = __webpack_require__(6);
	  
		  var _fixedReadTokenFactory2 = _interopRequireDefault(_fixedReadTokenFactory);
	  
		  var _utils = __webpack_require__(5);
	  
		  function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }
	  
		  function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj['default'] = obj; return newObj; } }
	  
		  function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }
	  
		  /**
		   * Detection regular expressions.
		   *
		   * Order of detection matters: detection of one can only
		   * succeed if detection of previous didn't
	  
		   * @type {Object}
		   */
		  var detect = {
			comment: /^<!--/,
			endTag: /^<\//,
			atomicTag: /^<\s*(script|style|noscript|iframe|textarea)[\s\/>]/i,
			startTag: /^</,
			chars: /^[^<]/
		  };
	  
		  /**
		   * HtmlParser provides the capability to parse HTML and return tokens
		   * representing the tags and content.
		   */
	  
		  var HtmlParser = function () {
			/**
			 * Constructor.
			 *
			 * @param {string} stream The initial parse stream contents.
			 * @param {Object} options The options
			 * @param {boolean} options.autoFix Set to true to automatically fix errors
			 */
			function HtmlParser() {
			  var _this = this;
	  
			  var stream = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '';
			  var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
	  
			  _classCallCheck(this, HtmlParser);
	  
			  this.stream = stream;
	  
			  var fix = false;
			  var fixedTokenOptions = {};
	  
			  for (var key in supports) {
				if (supports.hasOwnProperty(key)) {
				  if (options.autoFix) {
					fixedTokenOptions[key + 'Fix'] = true; // !supports[key];
				  }
				  fix = fix || fixedTokenOptions[key + 'Fix'];
				}
			  }
	  
			  if (fix) {
				this._readToken = (0, _fixedReadTokenFactory2['default'])(this, fixedTokenOptions, function () {
				  return _this._readTokenImpl();
				});
				this._peekToken = (0, _fixedReadTokenFactory2['default'])(this, fixedTokenOptions, function () {
				  return _this._peekTokenImpl();
				});
			  } else {
				this._readToken = this._readTokenImpl;
				this._peekToken = this._peekTokenImpl;
			  }
			}
	  
			/**
			 * Appends the given string to the parse stream.
			 *
			 * @param {string} str The string to append
			 */
	  
	  
			HtmlParser.prototype.append = function append(str) {
			  this.stream += str;
			};
	  
			/**
			 * Prepends the given string to the parse stream.
			 *
			 * @param {string} str The string to prepend
			 */
	  
	  
			HtmlParser.prototype.prepend = function prepend(str) {
			  this.stream = str + this.stream;
			};
	  
			/**
			 * The implementation of the token reading.
			 *
			 * @private
			 * @returns {?Token}
			 */
	  
	  
			HtmlParser.prototype._readTokenImpl = function _readTokenImpl() {
			  var token = this._peekTokenImpl();
			  if (token) {
				this.stream = this.stream.slice(token.length);
				return token;
			  }
			};
	  
			/**
			 * The implementation of token peeking.
			 *
			 * @returns {?Token}
			 */
	  
	  
			HtmlParser.prototype._peekTokenImpl = function _peekTokenImpl() {
			  for (var type in detect) {
				if (detect.hasOwnProperty(type)) {
				  if (detect[type].test(this.stream)) {
					var token = streamReaders[type](this.stream);
	  
					if (token) {
					  if (token.type === 'startTag' && /script|style/i.test(token.tagName)) {
						return null;
					  } else {
						token.text = this.stream.substr(0, token.length);
						return token;
					  }
					}
				  }
				}
			  }
			};
	  
			/**
			 * The public token peeking interface.  Delegates to the basic token peeking
			 * or a version that performs fixups depending on the `autoFix` setting in
			 * options.
			 *
			 * @returns {object}
			 */
	  
	  
			HtmlParser.prototype.peekToken = function peekToken() {
			  return this._peekToken();
			};
	  
			/**
			 * The public token reading interface.  Delegates to the basic token reading
			 * or a version that performs fixups depending on the `autoFix` setting in
			 * options.
			 *
			 * @returns {object}
			 */
	  
	  
			HtmlParser.prototype.readToken = function readToken() {
			  return this._readToken();
			};
	  
			/**
			 * Read tokens and hand to the given handlers.
			 *
			 * @param {Object} handlers The handlers to use for the different tokens.
			 */
	  
	  
			HtmlParser.prototype.readTokens = function readTokens(handlers) {
			  var tok = void 0;
			  while (tok = this.readToken()) {
				// continue until we get an explicit "false" return
				if (handlers[tok.type] && handlers[tok.type](tok) === false) {
				  return;
				}
			  }
			};
	  
			/**
			 * Clears the parse stream.
			 *
			 * @returns {string} The contents of the parse stream before clearing.
			 */
	  
	  
			HtmlParser.prototype.clear = function clear() {
			  var rest = this.stream;
			  this.stream = '';
			  return rest;
			};
	  
			/**
			 * Returns the rest of the parse stream.
			 *
			 * @returns {string} The contents of the parse stream.
			 */
	  
	  
			HtmlParser.prototype.rest = function rest() {
			  return this.stream;
			};
	  
			return HtmlParser;
		  }();
	  
		  exports['default'] = HtmlParser;
	  
	  
		  HtmlParser.tokenToString = function (tok) {
			return tok.toString();
		  };
	  
		  HtmlParser.escapeAttributes = function (attrs) {
			var escapedAttrs = {};
	  
			for (var name in attrs) {
			  if (attrs.hasOwnProperty(name)) {
				escapedAttrs[name] = (0, _utils.escapeQuotes)(attrs[name], null);
			  }
			}
	  
			return escapedAttrs;
		  };
	  
		  HtmlParser.supports = supports;
	  
		  for (var key in supports) {
			if (supports.hasOwnProperty(key)) {
			  HtmlParser.browserHasFlaw = HtmlParser.browserHasFlaw || !supports[key] && key;
			}
		  }
	  
	  /***/ },
	  /* 2 */
	  /***/ function(module, exports) {
	  
		  'use strict';
	  
		  exports.__esModule = true;
		  var tagSoup = false;
		  var selfClose = false;
	  
		  var work = window.document.createElement('div');
	  
		  try {
			var html = '<P><I></P></I>';
			work.innerHTML = html;
			exports.tagSoup = tagSoup = work.innerHTML !== html;
		  } catch (e) {
			exports.tagSoup = tagSoup = false;
		  }
	  
		  try {
			work.innerHTML = '<P><i><P></P></i></P>';
			exports.selfClose = selfClose = work.childNodes.length === 2;
		  } catch (e) {
			exports.selfClose = selfClose = false;
		  }
	  
		  work = null;
	  
		  exports.tagSoup = tagSoup;
		  exports.selfClose = selfClose;
	  
	  /***/ },
	  /* 3 */
	  /***/ function(module, exports, __webpack_require__) {
	  
		  'use strict';
	  
		  exports.__esModule = true;
	  
		  var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };
	  
		  exports.comment = comment;
		  exports.chars = chars;
		  exports.startTag = startTag;
		  exports.atomicTag = atomicTag;
		  exports.endTag = endTag;
	  
		  var _tokens = __webpack_require__(4);
	  
		  /**
		   * Regular Expressions for parsing tags and attributes
		   *
		   * @type {Object}
		   */
		  var REGEXES = {
			startTag: /^<([\-A-Za-z0-9_]+)((?:\s+[\w\-]+(?:\s*=?\s*(?:(?:"[^"]*")|(?:'[^']*')|[^>\s]+))?)*)\s*(\/?)>/,
			endTag: /^<\/([\-A-Za-z0-9_]+)[^>]*>/,
			attr: /(?:([\-A-Za-z0-9_]+)\s*=\s*(?:(?:"((?:\\.|[^"])*)")|(?:'((?:\\.|[^'])*)')|([^>\s]+)))|(?:([\-A-Za-z0-9_]+)(\s|$)+)/g,
			fillAttr: /^(checked|compact|declare|defer|disabled|ismap|multiple|nohref|noresize|noshade|nowrap|readonly|selected)$/i
		  };
	  
		  /**
		   * Reads a comment token
		   *
		   * @param {string} stream The input stream
		   * @returns {CommentToken}
		   */
		  function comment(stream) {
			var index = stream.indexOf('-->');
			if (index >= 0) {
			  return new _tokens.CommentToken(stream.substr(4, index - 1), index + 3);
			}
		  }
	  
		  /**
		   * Reads non-tag characters.
		   *
		   * @param {string} stream The input stream
		   * @returns {CharsToken}
		   */
		  function chars(stream) {
			var index = stream.indexOf('<');
			return new _tokens.CharsToken(index >= 0 ? index : stream.length);
		  }
	  
		  /**
		   * Reads start tag token.
		   *
		   * @param {string} stream The input stream
		   * @returns {StartTagToken}
		   */
		  function startTag(stream) {
			var endTagIndex = stream.indexOf('>');
			if (endTagIndex !== -1) {
			  var match = stream.match(REGEXES.startTag);
			  if (match) {
				var _ret = function () {
				  var attrs = {};
				  var booleanAttrs = {};
				  var rest = match[2];
	  
				  match[2].replace(REGEXES.attr, function (match, name) {
					if (!(arguments[2] || arguments[3] || arguments[4] || arguments[5])) {
					  attrs[name] = '';
					} else if (arguments[5]) {
					  attrs[arguments[5]] = '';
					  booleanAttrs[arguments[5]] = true;
					} else {
					  attrs[name] = arguments[2] || arguments[3] || arguments[4] || REGEXES.fillAttr.test(name) && name || '';
					}
	  
					rest = rest.replace(match, '');
				  });
	  
				  return {
					v: new _tokens.StartTagToken(match[1], match[0].length, attrs, booleanAttrs, !!match[3], rest.replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, ''))
				  };
				}();
	  
				if ((typeof _ret === 'undefined' ? 'undefined' : _typeof(_ret)) === "object") return _ret.v;
			  }
			}
		  }
	  
		  /**
		   * Reads atomic tag token.
		   *
		   * @param {string} stream The input stream
		   * @returns {AtomicTagToken}
		   */
		  function atomicTag(stream) {
			var start = startTag(stream);
			if (start) {
			  var rest = stream.slice(start.length);
			  // for optimization, we check first just for the end tag
			  if (rest.match(new RegExp('<\/\\s*' + start.tagName + '\\s*>', 'i'))) {
				// capturing the content is inefficient, so we do it inside the if
				var match = rest.match(new RegExp('([\\s\\S]*?)<\/\\s*' + start.tagName + '\\s*>', 'i'));
				if (match) {
				  return new _tokens.AtomicTagToken(start.tagName, match[0].length + start.length, start.attrs, start.booleanAttrs, match[1]);
				}
			  }
			}
		  }
	  
		  /**
		   * Reads an end tag token.
		   *
		   * @param {string} stream The input stream
		   * @returns {EndTagToken}
		   */
		  function endTag(stream) {
			var match = stream.match(REGEXES.endTag);
			if (match) {
			  return new _tokens.EndTagToken(match[1], match[0].length);
			}
		  }
	  
	  /***/ },
	  /* 4 */
	  /***/ function(module, exports, __webpack_require__) {
	  
		  'use strict';
	  
		  exports.__esModule = true;
		  exports.EndTagToken = exports.AtomicTagToken = exports.StartTagToken = exports.TagToken = exports.CharsToken = exports.CommentToken = exports.Token = undefined;
	  
		  var _utils = __webpack_require__(5);
	  
		  function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }
	  
		  /**
		   * Token is a base class for all token types parsed.  Note we don't actually
		   * use intheritance due to IE8's non-existent ES5 support.
		   */
		  var Token =
		  /**
		   * Constructor.
		   *
		   * @param {string} type The type of the Token.
		   * @param {Number} length The length of the Token text.
		   */
		  exports.Token = function Token(type, length) {
			_classCallCheck(this, Token);
	  
			this.type = type;
			this.length = length;
			this.text = '';
		  };
	  
		  /**
		   * CommentToken represents comment tags.
		   */
	  
	  
		  var CommentToken = exports.CommentToken = function () {
			/**
			 * Constructor.
			 *
			 * @param {string} content The content of the comment
			 * @param {Number} length The length of the Token text.
			 */
			function CommentToken(content, length) {
			  _classCallCheck(this, CommentToken);
	  
			  this.type = 'comment';
			  this.length = length || (content ? content.length : 0);
			  this.text = '';
			  this.content = content;
			}
	  
			CommentToken.prototype.toString = function toString() {
			  return '<!--' + this.content;
			};
	  
			return CommentToken;
		  }();
	  
		  /**
		   * CharsToken represents non-tag characters.
		   */
	  
	  
		  var CharsToken = exports.CharsToken = function () {
			/**
			 * Constructor.
			 *
			 * @param {Number} length The length of the Token text.
			 */
			function CharsToken(length) {
			  _classCallCheck(this, CharsToken);
	  
			  this.type = 'chars';
			  this.length = length;
			  this.text = '';
			}
	  
			CharsToken.prototype.toString = function toString() {
			  return this.text;
			};
	  
			return CharsToken;
		  }();
	  
		  /**
		   * TagToken is a base class for all tag-based Tokens.
		   */
	  
	  
		  var TagToken = exports.TagToken = function () {
			/**
			 * Constructor.
			 *
			 * @param {string} type The type of the token.
			 * @param {string} tagName The tag name.
			 * @param {Number} length The length of the Token text.
			 * @param {Object} attrs The dictionary of attributes and values
			 * @param {Object} booleanAttrs If an entry has 'true' then the attribute
			 *                              is a boolean attribute
			 */
			function TagToken(type, tagName, length, attrs, booleanAttrs) {
			  _classCallCheck(this, TagToken);
	  
			  this.type = type;
			  this.length = length;
			  this.text = '';
			  this.tagName = tagName;
			  this.attrs = attrs;
			  this.booleanAttrs = booleanAttrs;
			  this.unary = false;
			  this.html5Unary = false;
			}
	  
			/**
			 * Formats the given token tag.
			 *
			 * @param {TagToken} tok The TagToken to format.
			 * @param {?string} [content=null] The content of the token.
			 * @returns {string} The formatted tag.
			 */
	  
	  
			TagToken.formatTag = function formatTag(tok) {
			  var content = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
	  
			  var str = '<' + tok.tagName;
			  for (var key in tok.attrs) {
				if (tok.attrs.hasOwnProperty(key)) {
				  str += ' ' + key;
	  
				  var val = tok.attrs[key];
				  if (typeof tok.booleanAttrs === 'undefined' || typeof tok.booleanAttrs[key] === 'undefined') {
					str += '="' + (0, _utils.escapeQuotes)(val) + '"';
				  }
				}
			  }
	  
			  if (tok.rest) {
				str += ' ' + tok.rest;
			  }
	  
			  if (tok.unary && !tok.html5Unary) {
				str += '/>';
			  } else {
				str += '>';
			  }
	  
			  if (content !== undefined && content !== null) {
				str += content + '</' + tok.tagName + '>';
			  }
	  
			  return str;
			};
	  
			return TagToken;
		  }();
	  
		  /**
		   * StartTagToken represents a start token.
		   */
	  
	  
		  var StartTagToken = exports.StartTagToken = function () {
			/**
			 * Constructor.
			 *
			 * @param {string} tagName The tag name.
			 * @param {Number} length The length of the Token text
			 * @param {Object} attrs The dictionary of attributes and values
			 * @param {Object} booleanAttrs If an entry has 'true' then the attribute
			 *                              is a boolean attribute
			 * @param {boolean} unary True if the tag is a unary tag
			 * @param {string} rest The rest of the content.
			 */
			function StartTagToken(tagName, length, attrs, booleanAttrs, unary, rest) {
			  _classCallCheck(this, StartTagToken);
	  
			  this.type = 'startTag';
			  this.length = length;
			  this.text = '';
			  this.tagName = tagName;
			  this.attrs = attrs;
			  this.booleanAttrs = booleanAttrs;
			  this.html5Unary = false;
			  this.unary = unary;
			  this.rest = rest;
			}
	  
			StartTagToken.prototype.toString = function toString() {
			  return TagToken.formatTag(this);
			};
	  
			return StartTagToken;
		  }();
	  
		  /**
		   * AtomicTagToken represents an atomic tag.
		   */
	  
	  
		  var AtomicTagToken = exports.AtomicTagToken = function () {
			/**
			 * Constructor.
			 *
			 * @param {string} tagName The name of the tag.
			 * @param {Number} length The length of the tag text.
			 * @param {Object} attrs The attributes.
			 * @param {Object} booleanAttrs If an entry has 'true' then the attribute
			 *                              is a boolean attribute
			 * @param {string} content The content of the tag.
			 */
			function AtomicTagToken(tagName, length, attrs, booleanAttrs, content) {
			  _classCallCheck(this, AtomicTagToken);
	  
			  this.type = 'atomicTag';
			  this.length = length;
			  this.text = '';
			  this.tagName = tagName;
			  this.attrs = attrs;
			  this.booleanAttrs = booleanAttrs;
			  this.unary = false;
			  this.html5Unary = false;
			  this.content = content;
			}
	  
			AtomicTagToken.prototype.toString = function toString() {
			  return TagToken.formatTag(this, this.content);
			};
	  
			return AtomicTagToken;
		  }();
	  
		  /**
		   * EndTagToken represents an end tag.
		   */
	  
	  
		  var EndTagToken = exports.EndTagToken = function () {
			/**
			 * Constructor.
			 *
			 * @param {string} tagName The name of the tag.
			 * @param {Number} length The length of the tag text.
			 */
			function EndTagToken(tagName, length) {
			  _classCallCheck(this, EndTagToken);
	  
			  this.type = 'endTag';
			  this.length = length;
			  this.text = '';
			  this.tagName = tagName;
			}
	  
			EndTagToken.prototype.toString = function toString() {
			  return '</' + this.tagName + '>';
			};
	  
			return EndTagToken;
		  }();
	  
	  /***/ },
	  /* 5 */
	  /***/ function(module, exports) {
	  
		  'use strict';
	  
		  exports.__esModule = true;
		  exports.escapeQuotes = escapeQuotes;
	  
		  /**
		   * Escape quotes in the given value.
		   *
		   * @param {string} value The value to escape.
		   * @param {string} [defaultValue=''] The default value to return if value is falsy.
		   * @returns {string}
		   */
		  function escapeQuotes(value) {
			var defaultValue = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : '';
	  
			// There's no lookback in JS, so /(^|[^\\])"/ only matches the first of two `"`s.
			// Instead, just match anything before a double-quote and escape if it's not already escaped.
			return !value ? defaultValue : value.replace(/([^"]*)"/g, function (_, prefix) {
			  return (/\\/.test(prefix) ? prefix + '"' : prefix + '\\"'
			  );
			});
		  }
	  
	  /***/ },
	  /* 6 */
	  /***/ function(module, exports) {
	  
		  'use strict';
	  
		  exports.__esModule = true;
		  exports['default'] = fixedReadTokenFactory;
		  /**
		   * Empty Elements - HTML 4.01
		   *
		   * @type {RegExp}
		   */
		  var EMPTY = /^(AREA|BASE|BASEFONT|BR|COL|FRAME|HR|IMG|INPUT|ISINDEX|LINK|META|PARAM|EMBED)$/i;
	  
		  /**
		   * Elements that you can intentionally leave open (and which close themselves)
		   *
		   * @type {RegExp}
		   */
		  var CLOSESELF = /^(COLGROUP|DD|DT|LI|OPTIONS|P|TD|TFOOT|TH|THEAD|TR)$/i;
	  
		  /**
		   * Corrects a token.
		   *
		   * @param {Token} tok The token to correct
		   * @returns {Token} The corrected token
		   */
		  function correct(tok) {
			if (tok && tok.type === 'startTag') {
			  tok.unary = EMPTY.test(tok.tagName) || tok.unary;
			  tok.html5Unary = !/\/>$/.test(tok.text);
			}
			return tok;
		  }
	  
		  /**
		   * Peeks at the next token in the parser.
		   *
		   * @param {HtmlParser} parser The parser
		   * @param {Function} readTokenImpl The underlying readToken implementation
		   * @returns {Token} The next token
		   */
		  function peekToken(parser, readTokenImpl) {
			var tmp = parser.stream;
			var tok = correct(readTokenImpl());
			parser.stream = tmp;
			return tok;
		  }
	  
		  /**
		   * Closes the last token.
		   *
		   * @param {HtmlParser} parser The parser
		   * @param {Array<Token>} stack The stack
		   */
		  function closeLast(parser, stack) {
			var tok = stack.pop();
	  
			// prepend close tag to stream.
			parser.prepend('</' + tok.tagName + '>');
		  }
	  
		  /**
		   * Create a new token stack.
		   *
		   * @returns {Array<Token>}
		   */
		  function newStack() {
			var stack = [];
	  
			stack.last = function () {
			  return this[this.length - 1];
			};
	  
			stack.lastTagNameEq = function (tagName) {
			  var last = this.last();
			  return last && last.tagName && last.tagName.toUpperCase() === tagName.toUpperCase();
			};
	  
			stack.containsTagName = function (tagName) {
			  for (var i = 0, tok; tok = this[i]; i++) {
				if (tok.tagName === tagName) {
				  return true;
				}
			  }
			  return false;
			};
	  
			return stack;
		  }
	  
		  /**
		   * Return a readToken implementation that fixes input.
		   *
		   * @param {HtmlParser} parser The parser
		   * @param {Object} options Options for fixing
		   * @param {boolean} options.tagSoupFix True to fix tag soup scenarios
		   * @param {boolean} options.selfCloseFix True to fix self-closing tags
		   * @param {Function} readTokenImpl The underlying readToken implementation
		   * @returns {Function}
		   */
		  function fixedReadTokenFactory(parser, options, readTokenImpl) {
			var stack = newStack();
	  
			var handlers = {
			  startTag: function startTag(tok) {
				var tagName = tok.tagName;
	  
				if (tagName.toUpperCase() === 'TR' && stack.lastTagNameEq('TABLE')) {
				  parser.prepend('<TBODY>');
				  prepareNextToken();
				} else if (options.selfCloseFix && CLOSESELF.test(tagName) && stack.containsTagName(tagName)) {
				  if (stack.lastTagNameEq(tagName)) {
					closeLast(parser, stack);
				  } else {
					parser.prepend('</' + tok.tagName + '>');
					prepareNextToken();
				  }
				} else if (!tok.unary) {
				  stack.push(tok);
				}
			  },
			  endTag: function endTag(tok) {
				var last = stack.last();
				if (last) {
				  if (options.tagSoupFix && !stack.lastTagNameEq(tok.tagName)) {
					// cleanup tag soup
					closeLast(parser, stack);
				  } else {
					stack.pop();
				  }
				} else if (options.tagSoupFix) {
				  // cleanup tag soup part 2: skip this token
				  readTokenImpl();
				  prepareNextToken();
				}
			  }
			};
	  
			function prepareNextToken() {
			  var tok = peekToken(parser, readTokenImpl);
			  if (tok && handlers[tok.type]) {
				handlers[tok.type](tok);
			  }
			}
	  
			return function fixedReadToken() {
			  prepareNextToken();
			  return correct(readTokenImpl());
			};
		  }
	  
	  /***/ }
	  /******/ ])
	  });
	  ;
  
  /***/ },
  /* 4 */
  /***/ function(module, exports) {
  
	  'use strict';
	  
	  exports.__esModule = true;
	  
	  var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };
	  
	  exports.existy = existy;
	  exports.isFunction = isFunction;
	  exports.each = each;
	  exports.eachKey = eachKey;
	  exports.defaults = defaults;
	  exports.toArray = toArray;
	  exports.last = last;
	  exports.isTag = isTag;
	  exports.isScript = isScript;
	  exports.isStyle = isStyle;
	  /**
	   * Determine if the thing is not undefined and not null.
	   *
	   * @param {*} thing The thing to test
	   * @returns {boolean} True if the thing is not undefined and not null.
	   */
	  function existy(thing) {
		return thing !== void 0 && thing !== null;
	  }
	  
	  /**
	   * Is this a function?
	   *
	   * @param {*} x The variable to test
	   * @returns {boolean} True if the variable is a function
	   */
	  function isFunction(x) {
		return 'function' === typeof x;
	  }
	  
	  /**
	   * Loop over each item in an array-like value.
	   *
	   * @param {Array<*>} arr The array to loop over
	   * @param {Function} fn The function to call
	   * @param {?Object} target The object to bind to the function
	   */
	  function each(arr, fn, target) {
		var i = void 0;
		var len = arr && arr.length || 0;
		for (i = 0; i < len; i++) {
		  fn.call(target, arr[i], i);
		}
	  }
	  
	  /**
	   * Loop over each key/value pair in a hash.
	   *
	   * @param {Object} obj The object
	   * @param {Function} fn The function to call
	   * @param {?Object} target The object to bind to the function
	   */
	  function eachKey(obj, fn, target) {
		for (var key in obj) {
		  if (obj.hasOwnProperty(key)) {
			fn.call(target, key, obj[key]);
		  }
		}
	  }
	  
	  /**
	   * Set default options where some option was not specified.
	   *
	   * @param {Object} options The destination
	   * @param {Object} _defaults The defaults
	   * @returns {Object}
	   */
	  function defaults(options, _defaults) {
		options = options || {};
		eachKey(_defaults, function (key, val) {
		  if (!existy(options[key])) {
			options[key] = val;
		  }
		});
		return options;
	  }
	  
	  /**
	   * Convert value (e.g., a NodeList) to an array.
	   *
	   * @param {*} obj The object
	   * @returns {Array<*>}
	   */
	  function toArray(obj) {
		try {
		  return Array.prototype.slice.call(obj);
		} catch (e) {
		  var _ret = function () {
			var ret = [];
			each(obj, function (val) {
			  ret.push(val);
			});
			return {
			  v: ret
			};
		  }();
	  
		  if ((typeof _ret === 'undefined' ? 'undefined' : _typeof(_ret)) === "object") return _ret.v;
		}
	  }
	  
	  /**
	   * Get the last item in an array
	   *
	   * @param {Array<*>} array The array
	   * @returns {*} The last item in the array
	   */
	  function last(array) {
		return array[array.length - 1];
	  }
	  
	  /**
	   * Test if token is a script tag.
	   *
	   * @param {Object} tok The token
	   * @param {String} tag The tag name
	   * @returns {boolean} True if the token is a script tag
	   */
	  function isTag(tok, tag) {
		return !tok || !(tok.type === 'startTag' || tok.type === 'atomicTag') || !('tagName' in tok) ? !1 : !!~tok.tagName.toLowerCase().indexOf(tag);
	  }
	  
	  /**
	   * Test if token is a script tag.
	   *
	   * @param {Object} tok The token
	   * @returns {boolean} True if the token is a script tag
	   */
	  function isScript(tok) {
		return isTag(tok, 'script');
	  }
	  
	  /**
	   * Test if token is a style tag.
	   *
	   * @param {Object} tok The token
	   * @returns {boolean} True if the token is a style tag
	   */
	  function isStyle(tok) {
		return isTag(tok, 'style');
	  }
  
  /***/ }
  /******/ ])
  });
  ;
  //# sourceMappingURL=postscribe.js.map
			}
  
		  },
		  "core/src/lib/actions/helpers/unescapeHtmlCode.js": {
			"script": function(module, exports, require, turbine) {
  /*
  Copyright 2020 Adobe. All rights reserved.
  This file is licensed to you under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License. You may obtain a copy
  of the License at http://www.apache.org/licenses/LICENSE-2.0
  Unless required by applicable law or agreed to in writing, software distributed under
  the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
  OF ANY KIND, either express or implied. See the License for the specific language
  governing permissions and limitations under the License.
  */
  
  'use strict';
  
  var document = require('@adobe/reactor-document');
  var el = document.createElement('div');
  
  module.exports = function(html) {
	el.innerHTML = html;
  
	// IE and Firefox differ.
	return el.textContent || el.innerText || html;
  };
  
			}
  
		  },
		  "core/src/lib/actions/helpers/decorators/decorateGlobalJavaScriptCode.js": {
			"script": function(module, exports, require, turbine) {
  /*
  Copyright 2020 Adobe. All rights reserved.
  This file is licensed to you under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License. You may obtain a copy
  of the License at http://www.apache.org/licenses/LICENSE-2.0
  Unless required by applicable law or agreed to in writing, software distributed under
  the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
  OF ANY KIND, either express or implied. See the License for the specific language
  governing permissions and limitations under the License.
  */
  'use strict';
  
  var Promise = require('@adobe/reactor-promise');
  
  module.exports = function(_, source) {
	// The line break after the source is important in case their last line of code is a comment.
	return {
	  code: '<scr' + 'ipt>\n' + source + '\n</scr' + 'ipt>',
	  promise: Promise.resolve()
	};
  };
			}
  
		  },
		  "core/src/lib/actions/helpers/decorators/decorateNonGlobalJavaScriptCode.js": {
			"script": function(module, exports, require, turbine) {
  /*
  Copyright 2020 Adobe. All rights reserved.
  This file is licensed to you under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License. You may obtain a copy
  of the License at http://www.apache.org/licenses/LICENSE-2.0
  Unless required by applicable law or agreed to in writing, software distributed under
  the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
  OF ANY KIND, either express or implied. See the License for the specific language
  governing permissions and limitations under the License.
  */
  'use strict';
  
  var Promise = require('@adobe/reactor-promise');
  var id = 0;
  
  module.exports = function(action, source) {
	var runScriptFnName = '_runScript' + ++id;
  
	var promise = new Promise(function(resolve, reject) {
	  _satellite[runScriptFnName] = function(fn) {
		delete _satellite[runScriptFnName];
  
		// Use Promise constructor instead of Promise.resolve() so we can
		// catch errors from custom code.
		new Promise(function(_resolve) {
		  _resolve(
			fn.call(action.event.element, action.event, action.event.target, Promise)
		  );
		}).then(resolve, reject);
	  };
	});
  
	// The line break after the source is important in case their last line of code is a comment.
	var code =
	  '<scr' +
	  'ipt>_satellite["' +
	  runScriptFnName +
	  '"](function(event, target, Promise) {\n' +
	  source +
	  '\n});</scr' +
	  'ipt>';
  
	return {
	  code: code,
	  promise: promise
	};
  };
  
			}
  
		  },
		  "core/src/lib/actions/helpers/decorators/decorateHtmlCode.js": {
			"script": function(module, exports, require, turbine) {
  /***************************************************************************************
   * Copyright 2019 Adobe. All rights reserved.
   * This file is licensed to you under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License. You may obtain a copy
   * of the License at http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software distributed under
   * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
   * OF ANY KIND, either express or implied. See the License for the specific language
   * governing permissions and limitations under the License.
   ****************************************************************************************/
  
  'use strict';
  
  var Promise = require('@adobe/reactor-promise');
  
  var callbackId = 0;
  var htmlCodePromises = {};
  
  window._satellite = window._satellite || {};
  
  /**
   * Public function intended to be called by the user.
   * @param {number} callbackId The identifier passed to _satellite._onCustomCodeSuccess().
   */
  window._satellite._onCustomCodeSuccess = function(callbackId) {
	var promiseHandlers = htmlCodePromises[callbackId];
	if (!promiseHandlers) {
	  return;
	}
  
	delete htmlCodePromises[callbackId];
	promiseHandlers.resolve();
  };
  
  /**
   * Public function intended to be called by the user.
   * @param {number} callbackId The identifier passed to _satellite._onCustomCodeSuccess().
   */
  window._satellite._onCustomCodeFailure = function(callbackId) {
	var promiseHandlers = htmlCodePromises[callbackId];
	if (!promiseHandlers) {
	  return;
	}
  
	delete htmlCodePromises[callbackId];
	promiseHandlers.reject();
  };
  
  var reactorCallbackIdShouldBeReplaced = function(source) {
	return source.indexOf('${reactorCallbackId}') !== -1;
  };
  
  var replaceCallbacksIds = function(source, callbackId) {
	return source.replace(/\${reactorCallbackId}/g, callbackId);
  };
  
  var isSourceLoadedFromFile = function(action) {
	return action.settings.isExternal;
  };
  
  module.exports = function(action, source) {
	// We need to replace tokens only for sources loaded from external files. The sources from
	// inside the container are automatically taken care by Turbine.
	if (isSourceLoadedFromFile(action)) {
	  source = turbine.replaceTokens(source, action.event);
	}
  
	var promise;
  
	if (reactorCallbackIdShouldBeReplaced(source)) {
	  promise = new Promise(function(resolve, reject) {
		htmlCodePromises[String(callbackId)] = {
		  resolve: resolve,
		  reject: reject
		};
	  });
  
	  source = replaceCallbacksIds(source, callbackId);
	  callbackId += 1;
	} else {
	  promise = Promise.resolve();
	}
  
	return {
	  code: source,
	  promise: promise
	};
  };
  
			}
  
		  },
		  "core/src/lib/actions/helpers/getSourceByUrl.js": {
			"script": function(module, exports, require, turbine) {
  /***************************************************************************************
   * Copyright 2019 Adobe. All rights reserved.
   * This file is licensed to you under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License. You may obtain a copy
   * of the License at http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software distributed under
   * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
   * OF ANY KIND, either express or implied. See the License for the specific language
   * governing permissions and limitations under the License.
   ****************************************************************************************/
  
  'use strict';
  var loadScript = require('@adobe/reactor-load-script');
  var Promise = require('@adobe/reactor-promise');
  
  var codeBySourceUrl = {};
  var scriptStore = {};
  
  var loadScriptOnlyOnce = function(url) {
	if (!scriptStore[url]) {
	  scriptStore[url] = loadScript(url);
	}
  
	return scriptStore[url];
  };
  
  _satellite.__registerScript = function(sourceUrl, code) {
	codeBySourceUrl[sourceUrl] = code;
  };
  
  module.exports = function(sourceUrl) {
	if (codeBySourceUrl[sourceUrl]) {
	  return Promise.resolve(codeBySourceUrl[sourceUrl]);
	} else {
	  return new Promise(function(resolve) {
		loadScriptOnlyOnce(sourceUrl).then(function() {
		  resolve(codeBySourceUrl[sourceUrl]);
		}, function() {
		  resolve();
		});
	  });
	}
  };
  
			}
  
		  }
		},
		"hostedLibFilesBaseUrl": "https://assets.adobedtm.com/extensions/EP2e2f86ba46954a2b8a2b3bb72276b9f8/"
	  },
	  "adobe-analytics": {
		"displayName": "Adobe Analytics",
		"modules": {
		  "adobe-analytics/src/lib/actions/setVariables.js": {
			"name": "set-variables",
			"displayName": "Set Variables",
			"script": function(module, exports, require, turbine) {
  /*************************************************************************
  * ADOBE CONFIDENTIAL
  * ___________________
  *
  *  Copyright 2016 Adobe Systems Incorporated
  *  All Rights Reserved.
  *
  * NOTICE:  All information contained herein is, and remains
  * the property of Adobe Systems Incorporated and its suppliers,
  * if any.  The intellectual and technical concepts contained
  * herein are proprietary to Adobe Systems Incorporated and its
  * suppliers and are protected by all applicable intellectual property
  * laws, including trade secret and copyright laws.
  * Dissemination of this information or reproduction of this material
  * is strictly forbidden unless prior written permission is obtained
  * from Adobe Systems Incorporated.
  **************************************************************************/
  
  'use strict';
  
  var getTracker = require('../sharedModules/getTracker');
  var applyTrackerVariables = require('../helpers/applyTrackerVariables');
  
  module.exports = function(settings, event) {
	return getTracker().then(function(tracker) {
	  turbine.logger.info('Set variables on the tracker.');
	  applyTrackerVariables(tracker, settings.trackerProperties);
	  if (settings.customSetup && settings.customSetup.source) {
		settings.customSetup.source.call(event.element, event, tracker);
	  }
	}, function(errorMessage) {
	  turbine.logger.error(
		'Cannot set variables: ' +
		errorMessage
	  );
	});
  };
  
			}
  
		  },
		  "adobe-analytics/src/lib/actions/sendBeacon.js": {
			"name": "send-beacon",
			"displayName": "Send Beacon",
			"script": function(module, exports, require, turbine) {
  /*************************************************************************
  * ADOBE CONFIDENTIAL
  * ___________________
  *
  *  Copyright 2016 Adobe Systems Incorporated
  *  All Rights Reserved.
  *
  * NOTICE:  All information contained herein is, and remains
  * the property of Adobe Systems Incorporated and its suppliers,
  * if any.  The intellectual and technical concepts contained
  * herein are proprietary to Adobe Systems Incorporated and its
  * suppliers and are protected by all applicable intellectual property
  * laws, including trade secret and copyright laws.
  * Dissemination of this information or reproduction of this material
  * is strictly forbidden unless prior written permission is obtained
  * from Adobe Systems Incorporated.
  **************************************************************************/
  
  'use strict';
  
  var getTracker = require('../sharedModules/getTracker');
  
  var isLink = function(element) {
	return element && element.nodeName && element.nodeName.toLowerCase() === 'a';
  };
  
  var getLinkName = function(element) {
	if (isLink(element)) {
	  return element.innerHTML;
	} else {
	  return 'link clicked';
	}
  };
  
  var sendBeacon = function(tracker, settings, targetElement) {
	if (settings.type === 'page') {
	  turbine.logger.info('Firing page view beacon.');
	  tracker.t();
	} else {
	  var linkSettings = {
		linkType: settings.linkType || 'o',
		linkName: settings.linkName || getLinkName(targetElement)
	  };
  
	  turbine.logger.info(
		'Firing link track beacon using the values: ' +
		JSON.stringify(linkSettings) + '.'
	  );
  
	  tracker.tl(
		isLink(targetElement) ? targetElement : 'true',
		linkSettings.linkType,
		linkSettings.linkName
	  );
	}
  };
  
  module.exports = function(settings, event) {
	return getTracker().then(function(tracker) {
	  sendBeacon(tracker, settings, event.element);
	}, function(errorMessage) {
	  turbine.logger.error(
		'Cannot send beacon: ' +
		errorMessage
	  );
	});
  };
  
			}
  
		  },
		  "adobe-analytics/src/lib/sharedModules/getTracker.js": {
			"script": function(module, exports, require, turbine) {
  /*************************************************************************
  * ADOBE CONFIDENTIAL
  * ___________________
  *
  *  Copyright 2016 Adobe Systems Incorporated
  *  All Rights Reserved.
  *
  * NOTICE:  All information contained herein is, and remains
  * the property of Adobe Systems Incorporated and its suppliers,
  * if any.  The intellectual and technical concepts contained
  * herein are proprietary to Adobe Systems Incorporated and its
  * suppliers and are protected by all applicable intellectual property
  * laws, including trade secret and copyright laws.
  * Dissemination of this information or reproduction of this material
  * is strictly forbidden unless prior written permission is obtained
  * from Adobe Systems Incorporated.
  **************************************************************************/
  
  'use strict';
  
  var cookie = require('@adobe/reactor-cookie');
  var Promise = require('@adobe/reactor-promise');
  var window = require('@adobe/reactor-window');
  var settingsHelper = require('../helpers/settingsHelper');
  var augmenters = require('../helpers/augmenters');
  
  var applyTrackerVariables = require('../helpers/applyTrackerVariables');
  var loadLibrary = require('../helpers/loadLibrary');
  var generateVersion = require('../helpers/generateVersion');
  
  var version = generateVersion(turbine.buildInfo.turbineBuildDate);
  var BEFORE_SETTINGS_LOAD_PHASE = 'beforeSettings';
  
  var mcidInstance = turbine.getSharedModule('adobe-mcid', 'mcid-instance');
  
  var checkEuCompliance = function(trackingCoookieName) {
	if (!trackingCoookieName) {
	  return true;
	}
  
	var euCookieValue = cookie.get(trackingCoookieName);
	return euCookieValue === 'true';
  };
  
  var augmentTracker = function(tracker) {
	return Promise.all(augmenters.map(function(augmenterFn) {
	  var result;
  
	  // If a tracker augmenter fails, we don't want to fail too. We'll re-throw the error in a
	  // timeout so it still hits the console but doesn't reject our promise.
	  try {
		result = augmenterFn(tracker);
	  } catch (e) {
		setTimeout(function() {
		  throw e;
		});
	  }
  
	  return Promise.resolve(result);
	})).then(function() {
	  return tracker;
	});
  };
  
  var linkVisitorId = function(tracker) {
	if (mcidInstance) {
	  turbine.logger.info('Setting MCID instance on the tracker.');
	  tracker.visitor = mcidInstance;
	}
  
	return tracker;
  };
  
  var updateTrackerVersion = function(tracker) {
	turbine.logger.info('Setting version on tracker: "' + version + '".');
  
	if (typeof tracker.tagContainerMarker !== 'undefined') {
	  tracker.tagContainerMarker = version;
	} else if (typeof tracker.version === 'string'
	  && tracker.version.substring(tracker.version.length - 5) !== ('-' + version)) {
	  tracker.version += '-' + version;
	}
  
	return tracker;
  };
  
  var updateTrackerVariables = function(trackerProperties, customSetup, tracker) {
	if (customSetup.loadPhase === BEFORE_SETTINGS_LOAD_PHASE && customSetup.source) {
	  turbine.logger.info('Calling custom script before settings.');
	  customSetup.source.call(window, tracker);
	}
  
	applyTrackerVariables(tracker, trackerProperties || {});
  
	if (customSetup.loadPhase !== BEFORE_SETTINGS_LOAD_PHASE && customSetup.source) {
	  turbine.logger.info('Calling custom script after settings.');
	  customSetup.source.call(window, tracker);
	}
  
	return tracker;
  };
  
  var initializeAudienceManagement = function(settings, tracker) {
	if (settingsHelper.isAudienceManagementEnabled(settings)) {
	  tracker.loadModule('AudienceManagement');
	  turbine.logger.info('Initializing AudienceManagement module');
	  tracker.AudienceManagement.setup(settings.moduleProperties.audienceManager.config);
	}
	return tracker;
  };
  
  var initialize = function(settings) {
	if (checkEuCompliance(settings.trackingCookieName)) {
	  return loadLibrary(settings)
		.then(augmentTracker)
		.then(linkVisitorId)
		.then(updateTrackerVersion)
		.then(updateTrackerVariables.bind(
		  null,
		  settings.trackerProperties,
		  settings.customSetup || {}
		))
		.then(initializeAudienceManagement.bind(null, settings));
	} else {
	  return Promise.reject('EU compliance was not acknowledged by the user.');
	}
  };
  
  var promise = initialize(turbine.getExtensionSettings());
  module.exports = function() {
	return promise;
  };
  
			}
  ,
			"name": "get-tracker",
			"shared": true
		  },
		  "adobe-analytics/src/lib/sharedModules/augmentTracker.js": {
			"name": "augment-tracker",
			"shared": true,
			"script": function(module, exports, require, turbine) {
  /*************************************************************************
   * ADOBE CONFIDENTIAL
   * ___________________
   *
   *  Copyright 2017 Adobe Systems Incorporated
   *  All Rights Reserved.
   *
   * NOTICE:  All information contained herein is, and remains
   * the property of Adobe Systems Incorporated and its suppliers,
   * if any.  The intellectual and technical concepts contained
   * herein are proprietary to Adobe Systems Incorporated and its
   * suppliers and are protected by all applicable intellectual property
   * laws, including trade secret and copyright laws.
   * Dissemination of this information or reproduction of this material
   * is strictly forbidden unless prior written permission is obtained
   * from Adobe Systems Incorporated.
   **************************************************************************/
  
  'use strict';
  
  var augmenters = require('../helpers/augmenters');
  
  module.exports = function(fn) {
	augmenters.push(fn);
  };
  
			}
  
		  },
		  "adobe-analytics/src/lib/helpers/applyTrackerVariables.js": {
			"script": function(module, exports, require, turbine) {
  /*************************************************************************
  * ADOBE CONFIDENTIAL
  * ___________________
  *
  *  Copyright 2016 Adobe Systems Incorporated
  *  All Rights Reserved.
  *
  * NOTICE:  All information contained herein is, and remains
  * the property of Adobe Systems Incorporated and its suppliers,
  * if any.  The intellectual and technical concepts contained
  * herein are proprietary to Adobe Systems Incorporated and its
  * suppliers and are protected by all applicable intellectual property
  * laws, including trade secret and copyright laws.
  * Dissemination of this information or reproduction of this material
  * is strictly forbidden unless prior written permission is obtained
  * from Adobe Systems Incorporated.
  **************************************************************************/
  
  'use strict';
  
  var queryString = require('@adobe/reactor-query-string');
  var window = require('@adobe/reactor-window');
  
  var eVarRegExp = /eVar([0-9]+)/;
  var propRegExp = /prop([0-9]+)/;
  var linkTrackVarsKeys = new RegExp('^(eVar[0-9]+)|(prop[0-9]+)|(hier[0-9]+)|campaign|purchaseID|' +
	'channel|server|state|zip|pageType$');
  
  var onlyUnique = function(value, index, self) {
	return self.indexOf(value) === index;
  };
  
  var buildLinkTrackVars = function(tracker, newTrackerProperties, addEvents) {
	var linkTrackVarsValues = Object.keys(newTrackerProperties)
	  .filter(linkTrackVarsKeys.test.bind(linkTrackVarsKeys));
  
	if (addEvents) {
	  linkTrackVarsValues.push('events');
	}
  
	// Merge with the values already set on tracker.
	linkTrackVarsValues = linkTrackVarsValues.concat((tracker.linkTrackVars || '').split(','));
  
	return linkTrackVarsValues.filter(function(value, index) {
	  return value !== 'None' && value && onlyUnique(value, index, linkTrackVarsValues);
	}).join(',');
  };
  
  var buildLinkTrackEvents = function(tracker, eventsData) {
	var linkTrackEventsValues = eventsData.map(function(event) {
	  return event.name;
	});
  
	// Merge with the values already set on tracker.
	linkTrackEventsValues = linkTrackEventsValues.concat((tracker.linkTrackEvents || '').split(','));
  
	return linkTrackEventsValues.filter(function(value, index) {
	  return value !== 'None'  && onlyUnique(value, index, linkTrackEventsValues);
	}).join(',');
  };
  
  var commaJoin = function(store, keyName, trackerProperties) {
	store[keyName] = trackerProperties[keyName].join(',');
  };
  
  var variablesTransform = function(store, keyName, trackerProperties) {
	var dynamicVariablePrefix = trackerProperties.dynamicVariablePrefix || 'D=';
  
	trackerProperties[keyName].forEach(function(variableData) {
	  var value;
	  if (variableData.type === 'value') {
		value = variableData.value;
	  } else {
		var eVarData = eVarRegExp.exec(variableData.value);
  
		if (eVarData) {
		  value = dynamicVariablePrefix + 'v' + eVarData[1];
		} else {
		  var propData = propRegExp.exec(variableData.value);
  
		  if (propData) {
			value = dynamicVariablePrefix + 'c' + propData[1];
		  }
		}
	  }
  
	  store[variableData.name] = value;
	});
  };
  
  var transformers = {
	linkDownloadFileTypes: commaJoin,
	linkExternalFilters: commaJoin,
	linkInternalFilters: commaJoin,
	hierarchies: function(store, keyName, trackerProperties) {
	  trackerProperties[keyName].forEach(function(hierarchyData) {
		store[hierarchyData.name] = hierarchyData.sections.join(hierarchyData.delimiter);
	  });
	},
	props: variablesTransform,
	eVars: variablesTransform,
	campaign: function(store, keyName, trackerProperties) {
	  if (trackerProperties[keyName].type === 'queryParam') {
		var queryParams = queryString.parse(window.location.search);
		store[keyName] = queryParams[trackerProperties[keyName].value];
	  } else {
		store[keyName] = trackerProperties[keyName].value;
	  }
	},
	events: function(store, keyName, trackerProperties) {
	  var events = trackerProperties[keyName].map(function(data) {
		var entry = data.name;
		if (data.id) {
		  entry = [entry, data.id].join(':');
		}
		if (data.value) {
		  entry = [entry, data.value].join('=');
		}
		return entry;
	  });
	  store[keyName] = events.join(',');
	}
  };
  
  module.exports = function(tracker, trackerProperties) {
	var newProperties = {};
	trackerProperties = trackerProperties || {};
  
	Object.keys(trackerProperties).forEach(function(propertyName) {
	  var transform = transformers[propertyName];
	  var value = trackerProperties[propertyName];
  
	  if (transform) {
		transform(newProperties, propertyName, trackerProperties);
	  } else {
		newProperties[propertyName] = value;
	  }
	});
  
	// New events are added to existing tracker events
	if (newProperties.events) {
	  if (tracker.events && tracker.events.length > 0) {
		newProperties.events = tracker.events + ',' + newProperties.events;
	  }
	}
  
	var hasEvents =
	  trackerProperties && trackerProperties.events && trackerProperties.events.length > 0;
	var linkTrackVars = buildLinkTrackVars(tracker, newProperties, hasEvents);
	if (linkTrackVars) {
	  newProperties.linkTrackVars = linkTrackVars;
	}
  
	var linkTrackEvents = buildLinkTrackEvents(tracker, trackerProperties.events || []);
	if (linkTrackEvents) {
	  newProperties.linkTrackEvents = linkTrackEvents;
	}
  
	turbine.logger.info(
	  'Applying the following properties on tracker: "' +
	  JSON.stringify(newProperties) +
	  '".'
	);
  
	Object.keys(newProperties).forEach(function(propertyName) {
	  tracker[propertyName] = newProperties[propertyName];
	});
  };
  
			}
  
		  },
		  "adobe-analytics/src/lib/helpers/settingsHelper.js": {
			"script": function(module, exports, require, turbine) {
  /*************************************************************************
   * ADOBE CONFIDENTIAL
   * ___________________
   *
   *  Copyright 2020 Adobe Systems Incorporated
   *  All Rights Reserved.
   *
   * NOTICE:  All information contained herein is, and remains
   * the property of Adobe Systems Incorporated and its suppliers,
   * if any.  The intellectual and technical concepts contained
   * herein are proprietary to Adobe Systems Incorporated and its
   * suppliers and are protected by all applicable intellectual property
   * laws, including trade secret and copyright laws.
   * Dissemination of this information or reproduction of this material
   * is strictly forbidden unless prior written permission is obtained
   * from Adobe Systems Incorporated.
   **************************************************************************/
  
  'use strict';
  
  var window = require('@adobe/reactor-window');
  
  var settingsHelper = {
	LIB_TYPES: {
	  MANAGED: 'managed',
	  PREINSTALLED: 'preinstalled',
	  REMOTE: 'remote',
	  CUSTOM: 'custom'
	},
  
	MANAGED_LIB_PATHS: {
	  APP_MEASUREMENT: 'AppMeasurement.js',
	  ACTIVITY_MAP: 'AppMeasurement_Module_ActivityMap.js',
	  AUDIENCE_MANAGEMENT: 'AppMeasurement_Module_AudienceManagement.js',
	},
  
	getReportSuites: function(reportSuitesData) {
	  var reportSuiteValues = reportSuitesData.production;
	  if (reportSuitesData[turbine.buildInfo.environment]) {
		reportSuiteValues = reportSuitesData[turbine.buildInfo.environment];
	  }
  
	  return reportSuiteValues.join(',');
	},
  
	isActivityMapEnabled: function(settings) {
	  return !(settings.libraryCode &&
		!settings.libraryCode.useActivityMap &&
		settings.libraryCode.useActivityMap === false);
	},
  
	isAudienceManagementEnabled: function(settings) {
	  var isEnabled = false;
	  // check if audience management module should be enabled
	  if (settings &&
		settings.moduleProperties &&
		settings.moduleProperties.audienceManager &&
		settings.moduleProperties.audienceManager.config &&
		window &&
		window._satellite &&
		window._satellite.company &&
		window._satellite.company.orgId) {
		isEnabled = true;
	  }
  
	  return isEnabled;
	}
  };
  
  module.exports = settingsHelper;
  
			}
  
		  },
		  "adobe-analytics/src/lib/helpers/augmenters.js": {
			"script": function(module, exports, require, turbine) {
  /*************************************************************************
   * ADOBE CONFIDENTIAL
   * ___________________
   *
   *  Copyright 2017 Adobe Systems Incorporated
   *  All Rights Reserved.
   *
   * NOTICE:  All information contained herein is, and remains
   * the property of Adobe Systems Incorporated and its suppliers,
   * if any.  The intellectual and technical concepts contained
   * herein are proprietary to Adobe Systems Incorporated and its
   * suppliers and are protected by all applicable intellectual property
   * laws, including trade secret and copyright laws.
   * Dissemination of this information or reproduction of this material
   * is strictly forbidden unless prior written permission is obtained
   * from Adobe Systems Incorporated.
   **************************************************************************/
  
  'use strict';
  
  module.exports = [];
  
			}
  
		  },
		  "adobe-analytics/src/lib/helpers/loadLibrary.js": {
			"script": function(module, exports, require, turbine) {
  /*************************************************************************
  * ADOBE CONFIDENTIAL
  * ___________________
  *
  *  Copyright 2016 Adobe Systems Incorporated
  *  All Rights Reserved.
  *
  * NOTICE:  All information contained herein is, and remains
  * the property of Adobe Systems Incorporated and its suppliers,
  * if any.  The intellectual and technical concepts contained
  * herein are proprietary to Adobe Systems Incorporated and its
  * suppliers and are protected by all applicable intellectual property
  * laws, including trade secret and copyright laws.
  * Dissemination of this information or reproduction of this material
  * is strictly forbidden unless prior written permission is obtained
  * from Adobe Systems Incorporated.
  **************************************************************************/
  
  'use strict';
  
  var loadScript = require('@adobe/reactor-load-script');
  var window = require('@adobe/reactor-window');
  var Promise = require('@adobe/reactor-promise');
  var settingsHelper = require('./settingsHelper');
  var pollHelper = require('./pollHelper');
  
  var createTracker = function(settings, reportSuites) {
	if (!window.s_gi) {
	  throw new Error(
		'Unable to create AppMeasurement tracker, `s_gi` function not found.' + window.AppMeasurement
	  );
	}
	turbine.logger.info('Creating AppMeasurement tracker with these report suites: "' +
	  reportSuites + '"');
	var tracker = window.s_gi(reportSuites);
	if (settings.libraryCode.scopeTrackerGlobally) {
	  turbine.logger.info('Setting the tracker as window.s');
	  window.s = tracker;
	}
	return tracker;
  };
  
  /**
   * @param settings
   *
   * @return array
   */
  var getUrlsToLoad = function(settings) {
	var urls = [];
	switch (settings.libraryCode.type) {
	  case settingsHelper.LIB_TYPES.MANAGED:
		// load app measurement
		urls.push(turbine.getHostedLibFileUrl(settingsHelper.MANAGED_LIB_PATHS.APP_MEASUREMENT));
		// check if activity map should be loaded
		if (settingsHelper.isActivityMapEnabled(settings)) {
		  urls.push(turbine.getHostedLibFileUrl(settingsHelper.MANAGED_LIB_PATHS.ACTIVITY_MAP));
		}
		break;
	  case settingsHelper.LIB_TYPES.CUSTOM:
		urls.push(settings.libraryCode.source);
		break;
	  case settingsHelper.LIB_TYPES.REMOTE:
		urls.push(window.location.protocol === 'https:' ?
		  settings.libraryCode.httpsUrl : settings.libraryCode.httpUrl);
		break;
	}
	// check if audience management should be loaded
	if (settingsHelper.isAudienceManagementEnabled(settings)) {
	  var visitorServiceConfig = {
		namespace: window._satellite.company.orgId
	  };
	  settings.moduleProperties.audienceManager.config.visitorService = visitorServiceConfig;
	  urls.push(turbine.getHostedLibFileUrl(settingsHelper.MANAGED_LIB_PATHS.AUDIENCE_MANAGEMENT));
	}
	return urls;
  };
  
  var loadLibraryScripts = function(settings) {
	return Promise.all(getUrlsToLoad(settings).map(function(url) {
	  turbine.logger.info("Loading script: " + url);
	  return loadScript(url);
	}));
  };
  
  var setReportSuitesOnTracker = function(settings, tracker) {
	if (settings.libraryCode.accounts) {
	  if (!tracker.sa) {
		turbine.logger.warn('Cannot set report suites on tracker. `sa` method not available.');
	  } else {
		var reportSuites = settingsHelper.getReportSuites(settings.libraryCode.accounts);
		turbine.logger.info('Setting the following report suites on the tracker: "' +
		  reportSuites + '"');
		tracker.sa(reportSuites);
	  }
	}
  
	return tracker;
  };
  
  var getTrackerFromVariable = function(trackerVariableName) {
	if (window[trackerVariableName]) {
	  turbine.logger.info('Found tracker located at: "' + trackerVariableName + '".');
	  return window[trackerVariableName];
	} else {
	  throw new Error('Cannot find the global variable name: "' + trackerVariableName + '".');
	}
  };
  
  // returns a promise that resolves with the tracker
  module.exports = function(settings) {
	// loads all libraries from urls in parallel
	var loadLibraries = loadLibraryScripts(settings);
  
	// now setup the tracker
	switch (settings.libraryCode.type) {
	  case settingsHelper.LIB_TYPES.MANAGED:
		var reportSuites = settingsHelper.getReportSuites(settings.libraryCode.accounts);
		return loadLibraries
		  .then(createTracker.bind(null, settings, reportSuites));
  
	  case settingsHelper.LIB_TYPES.PREINSTALLED:
		return loadLibraries
		  .then(pollHelper.poll.bind(null, window, settings.libraryCode.trackerVariableName))
		  .then(setReportSuitesOnTracker.bind(null, settings));
  
	  case settingsHelper.LIB_TYPES.CUSTOM:
	  case settingsHelper.LIB_TYPES.REMOTE:
		return loadLibraries
		  .then(getTrackerFromVariable.bind(null, settings.libraryCode.trackerVariableName))
		  .then(setReportSuitesOnTracker.bind(null, settings));
  
	  default:
		throw new Error('Cannot load library. Type not supported.');
  
	}
  };
  
			}
  
		  },
		  "adobe-analytics/src/lib/helpers/generateVersion.js": {
			"script": function(module, exports, require, turbine) {
  /*************************************************************************
  * ADOBE CONFIDENTIAL
  * ___________________
  *
  *  Copyright 2016 Adobe Systems Incorporated
  *  All Rights Reserved.
  *
  * NOTICE:  All information contained herein is, and remains
  * the property of Adobe Systems Incorporated and its suppliers,
  * if any.  The intellectual and technical concepts contained
  * herein are proprietary to Adobe Systems Incorporated and its
  * suppliers and are protected by all applicable intellectual property
  * laws, including trade secret and copyright laws.
  * Dissemination of this information or reproduction of this material
  * is strictly forbidden unless prior written permission is obtained
  * from Adobe Systems Incorporated.
  **************************************************************************/
  
  // The Launch code version is a 4 characters string.  The first character will always be L
  // followed by year, month, and day codes.
  // For example: JS-1.4.3-L53O = JS 1.4.3 code, Launch 2015 March 24th release (revision 1)
  // More info: https://wiki.corp.adobe.com/pages/viewpage.action?spaceKey=tagmanager&title=DTM+Analytics+Code+Versions
  
  'use strict';
  
  var THIRD_OF_DAY = 8; //hours
  
  var getDayField = function(date) {
	return date.getUTCDate().toString(36);
  };
  
  var getLastChar = function(str) {
	return str.substr(str.length - 1);
  };
  
  var getRevision = function(date) {
	// We are under the assumption that a Turbine version will be release at least 8h apart (max 3
	// releases per day).
	return Math.floor(date.getUTCHours() / THIRD_OF_DAY);
  };
  
  var getMonthField = function(date) {
	var monthNumber = date.getUTCMonth() + 1;
	var revision = getRevision(date);
  
	var monthField = (monthNumber + revision * 12).toString(36);
  
	return getLastChar(monthField);
  };
  
  var getYearField = function(date) {
	return (date.getUTCFullYear() - 2010).toString(36);
  };
  
  module.exports = function(dateString) {
	var date = new Date(dateString);
  
	if (isNaN(date)) {
	  throw new Error('Invalid date provided');
	}
  
	return ('L' + getYearField(date) + getMonthField(date) + getDayField(date)).toUpperCase();
  };
  
			}
  
		  },
		  "adobe-analytics/src/lib/helpers/pollHelper.js": {
			"script": function(module, exports, require, turbine) {
  /*************************************************************************
   * ADOBE CONFIDENTIAL
   * ___________________
   *
   *  Copyright 2020 Adobe Systems Incorporated
   *  All Rights Reserved.
   *
   * NOTICE:  All information contained herein is, and remains
   * the property of Adobe Systems Incorporated and its suppliers,
   * if any.  The intellectual and technical concepts contained
   * herein are proprietary to Adobe Systems Incorporated and its
   * suppliers and are protected by all applicable intellectual property
   * laws, including trade secret and copyright laws.
   * Dissemination of this information or reproduction of this material
   * is strictly forbidden unless prior written permission is obtained
   * from Adobe Systems Incorporated.
   **************************************************************************/
  
  'use strict';
  
  var Promise = require('@adobe/reactor-promise');
  
  var MAX_ITERATIONS = 40;
  var INTERVAL = 250;
  
  var found = function(resolve, variableName, result) {
	turbine.logger.info('Found property located at: "' + variableName + '"].');
	resolve(result);
  };
  
  var getPromise = function(object, variableName) {
	return new Promise(function(resolve, reject) {
	  if (object[variableName]) {
		return found(resolve, variableName, object[variableName]);
	  }
	  var i = 1;
	  var intervalId = setInterval(function() {
		if (object[variableName]) {
		  found(resolve, variableName, object[variableName]);
		  clearInterval(intervalId);
		}
		// give up after 10 seconds
		if (i >= MAX_ITERATIONS) {
		  clearInterval(intervalId);
		  reject(new Error(
			'Bailing out. Cannot find the variable name: "' + variableName + '"].'));
		}
		i++;
	  }, INTERVAL); // every 1/4th second
	});
  };
  
  module.exports = {
	poll: function(object, variableName) {
	  turbine.logger.info('Waiting for the property to become accessible at: "'
		+ variableName + '"].');
	  return getPromise(object, variableName);
	}
  };
  
			}
  
		  }
		},
		"settings": {
		  "orgId": "66C5485451E56AAE0A490D45@AdobeOrg",
		  "customSetup": {
			"source": function(s) {
	var curURL=''+window.location.href;
  var testVar1 = "";
  var internalFilters="familysearch.org,";
  
  /************************** CONFIG SECTION **************************/
  s.currencyCode="USD"
  /* Link Tracking Config */
  s.trackDownloadLinks=true
  s.trackExternalLinks=true
  s.trackInlineStats=true
  s.linkDownloadFileTypes="exe,zip,wav,mp3,mov,mpg,avi,wmv,pdf,doc,docx,xls,xlsx,ppt,pptx,mp4,brf,txt,jpg"
  s.linkLeaveQueryString=true
  s.linkTrackVars="eVar32,prop32,contextData.ln"
  s.linkTrackEvents="None"
  
  /* Plugin Config */
  s.usePlugins=true
  function s_doPlugins(s) {
	s.linkName=s.linkNameBackup||s.linkName
	
	if((s.pageName && s.pageName.indexOf('Frontier-Tree: Homepage')>=0) || (s.eVar1 && (s.eVar1.indexOf('cis.user.MM97-H3GC')>=0 || s.eVar1.indexOf('cis.user.MMMM-VHY1')>=0 || s.eVar1.indexOf('cis.user.MM94-TZM3')>=0))){
	  s.abort=true;
	  return;
	  //fsClearVars will take care os switching s.abort back to false
	}
	
	/*Set charSet if it's not set*/
	if(!s.charSet){s.charSet=s.getCharSet('UTF-8');}
  
	/** SET GLOBAL VARIABLES **/
	/* SET CUSTOM PAGE VIEW */
	s.events=s.apl(s.events,'event18',',',2);
  
	/* SET CUSTOM PAGE VIEW */
	s.eVar32=curURL.toLowerCase();
	s.prop32="D=v32";
  
	//Capture internal search term
	if (!s.prop36)
	s.prop36=s.Util.getQueryParam('query') || s.Util.getQueryParam('search') || s.Util.getQueryParam('all') || s.Util.getQueryParam('searchword') || s.Util.getQueryParam('q') || s.Util.getQueryParam('searchterm');
  
	//Capture campaign
	if (!s.campaign)
	s.campaign=s.Util.getQueryParam('cid');
  
	//Set ExactTarget Message ID into s.campaign (in addition to eVar22 below)
	if (!s.campaign)
	s.campaign=s.Util.getQueryParam('ET_CID');
  
	//s.campaign=s.getValOnce(s.campaign,'s_campaign',30);
  
	/* Copy Collection ID from eVar11 to prop11 */
	if(s.eVar11) s.prop11 = "D=v11";
  
  
	/*Exact Target Message ID*/
	if (!s.eVar22)
	  s.eVar22 = s.Util.getQueryParam('ET_CID'); //Set eVar22 with ET Mailing ID
	  //s.eVar22 = s.getValOnce(s.eVar22,'s_var_22',0);
	/* Exact Target Recipient ID */
	if (!s.eVar23)
	  s.eVar23 = s.Util.getQueryParam('ET_RID'); //Set eVar23 with ET Recipient ID
	  //s.eVar23 = s.getValOnce(s.eVar23,'s_var_23',0);
  
	//ClickTale Integration Start
  function clickTaleGetUID_PID() {
	  if (document.cookie.indexOf("WRUID") > -1 && document.cookie.indexOf("WRIgnore=true") == -1) {
		  var ca = document.cookie.split(';');
		  var PID = 0, UID = 0;
		  for (var i = 0; i < ca.length; i++) {
			  var c = ca[i];
			  while (c.charAt(0) == ' ') c = c.substring(1, c.length);
			  if (c.indexOf("CT_Data") > -1) PID = c.substring(c.indexOf("apv_")).split("_")[1];
			  if (
				((document.cookie.match(/WRUID/g) || []).length == 1 && c.indexOf("WRUID") > -1) ||
				(c.indexOf("WRUID") > -1 && (document.cookie.match(/WRUID/g) || []).length > 1 && c.indexOf("WRUID=") == -1)
			  )
				  UID = c.split("=")[1];
		  }
		  return (UID == 0 || PID == 0) ? null : (UID + "." + PID);
	  }
	  else
		  return null;
  }
  var clickTaleValues = clickTaleGetUID_PID();
  if (clickTaleValues != null) {
	  s.eVar26 = clickTaleValues;
  }
  //ClickTale Integration End
  
	/*Internal Promotion variable setting - set this to the query parameter you use for internal promotion traffic*/
	if(!s.eVar47)s.eVar47=s.Util.getQueryParam('icid');
	//if(s.eVar47)s.eVar47=s.getValOnce(s.eVar47,'v47',0);
  
	if(s.prop36) s.prop36=s.prop36.toLowerCase();
	s.eVar36="D=c36";
  
	/* Captures previous page and percent of that page viewed*/
	try {
	  var ppvArray = s.getPercentPageViewed(s.pageName);
	  s.prop47 = ppvArray[0] //contains the previous page name
	  s.prop48=ppvArray[1] //contains the total percent viewed
	  s.prop49=ppvArray[2] //contains the percent viewed on initial load
	  s.prop50=ppvArray[3] //contains the total number of vertical pixels
	} catch(err) {
	}
  
	s.URL=s.linkHandler('add this~addthis|blogger~blogger.com/blog_this|twitter~twitter.com|facebook~facebook.com/share|google plus~plus.google.com/share|pinterest~pinterest.com/pin/create|digg~digg.com/submit|delicous~delicious.com|del.icio.us~del.icio.us|stumbleupon~stumbleupon.com');
	if(s.URL) {
	  s.linkTrackVars=s.linkTrackVars+",events,prop43,eVar43"
	  s.linkTrackEvents=s.events='event19';
	  s.eVar43=s.linkName;
	  s.prop43="D=v43";
	}
  
	s.clickedURL=s.linkHandler('print click~javascript:window.print();|print click~/print/|email click~javascript:document.email();|email click~/email|email click~mailto|download click~static%20files/pdf/|download click~download');
	  if(s.clickedURL){
		if(s.linkName=='print click'){
		  s.events=s.linkTrackEvents='event15';
		}else if(s.linkName=='email click'){
		  s.events=s.linkTrackEvents='event16';
		  s.linkTrackVars=s.linkTrackVars+',eVar43,prop43';
		  s.eVar43='email';
		  s.prop43="D=v43";
		}else if(s.linkName=='download click'){
			s.linkTrackVars=s.linkTrackVars+",eVar70";
				var url = s.clickedURL;
				var filename = url.substr(url.lastIndexOf('/')+1).split('?')[0];
				s.linkName = filename;
				s.linkType = "d";
				  s.eVar70 = filename;
		  s.events=s.linkTrackEvents='event17';
		}
		s.linkTrackVars=s.linkTrackVars+",events"
	  }
  
	  /* SocialPlatforms v1.0 - SocialAnalytics */
	 s.socialPlatforms('eVar72');
  
  //  s.tnt=s.trackTNT();
  // if(typeof mboxLoadSCPlugin =='function'){mboxLoadSCPlugin(s)}
  
  /*
  //turned off PID RSID reporting
	if(s.events.indexOf('event42')>=0 && s.contextData.pid){
	  if(!s.isPidEvets){
		//set vars
		var pids=s.contextData.pid;
		s.pidsArray=pids.split(',');
		s.events=s.apl(s.events,'event98='+s.pidsArray.length,',',1);
		s.events=s.apl(s.events,'event99',',',1);
		s.events=s.apl(s.events,'event100',',',1);
		s.products=';'+pids.replace(',',';;;event100=1,;').toLowerCase()+';;;event100=1';
  
		//add to link tracking
		s.linkTrackEvents=s.apl(s.linkTrackEvents,'event98',',',1);
		s.linkTrackEvents=s.apl(s.linkTrackEvents,'event99',',',1);
		s.linkTrackEvents=s.apl(s.linkTrackEvents,'event100',',',1);
		s.linkTrackVars=s.apl(s.linkTrackVars,'products',',',1);
	  }
	  s.pidEvents('print',['event42=1']);
	}
  
	if(s.events.indexOf('event70')>=0){
	  s.pidEvents('share with family',['event70=1']);
	}else if(s.events.match(/event9($|,|=)/)){
	  s.pidEvents('attach photo to tree',['event9=1']);
	}else if(s.events.indexOf('event12')>=0){
	  s.pidEvents('attach record to tree',['event12=1']);
	}else if(s.events.indexOf('event41')>=0){
	  s.pidEvents('reserve name',['event41=1']);
	}else if(s.events.indexOf('event43')>=0){
	  s.pidEvents('share with temple',['event43=1']);
	}else if(s.events.indexOf('event44')>=0){
	  s.pidEvents('unreserve name',['event44=1']);
	}else if(s.events.indexOf('event45')>=0){
	  s.pidEvents('unshare name',['event45=1']);
	}else if(s.events.indexOf('event46')>=0){
	  s.pidEvents('add name to tree',['event46=1']);
	}
  */
	//copy link name to a context var so it can be used in processing rules
	s.contextData['ln']='D=pev2';
	s.linkTrackVars=s.apl(s.linkTrackVars,'contextData.ln',',',1);
	//include cis on all hits where possible
	s.linkTrackVars=s.apl(s.linkTrackVars,'eVar1',',',1);
  
	//VISTA Flag
	if(s.eVar1){
	  s.prop4='cis';
	  //eVar1 is getting blanked out at times so this is just a backup
	  s.eVar1Backup=s.eVar1;
	  s.linkTrackVars=s.apl(s.linkTrackVars,'prop4',',',1);
	}
	
  }
  s.doPlugins=s_doPlugins
  
  /************************** PLUGINS SECTION *************************/
  
  s.pidEvents=function(ln,ea){
  //ln=link name
  //ea=event array to add (everything for that product after the product ID, no comma)
	s.pidInfo={linkName:ln,eventArray:ea};
	s.pidBackup=s.contextData.pid||s.pidBackup;
	if(ln && ea && s.pidBackup && (s.pidBackup!=s.pidListDedup || JSON.stringify(ea)!=JSON.stringify(s.pidEventDedup))){
	  setTimeout(function(){
		//backup original values
		s.linkTrackVarsBackup==s.linkTrackVars;
		s.linkTrackEventsBackup==s.linkTrackEvents;
		s.eventsBackup=s.events;
		s.productsBackup=s.products;
		s.list1Backup=s.list1;
		//flag that this is as special and prevent some events in doPlugins from setting again with these types of hits
		s.isPidEvets=true;
  
		var pids=s.pidBackup;
		s.pidsArray=pids.split(',');
		var _acc='';
		if(document.location.hostname.indexOf('www.familysearch')>=0){
		  s.sa('ldsfchpids');
		  _acc='ldsfchglobal';
		}else{
		  s.sa('ldsfchpidsdev');
		  _acc='ldsfchdev';
		}
		for(s.pidi=0;s.pidi<s.pidsArray.length;s.pidi++){
		  s.list1=s.pidsArray[s.pidi];
		  s.eVar1=s.eVar1||s.eVar1Backup;
		  s.prop4=' ';
		  s.prop5=' ';
		  s.events=s.pidInfo.eventArray[0].substring(0,s.pidInfo.eventArray[0].indexOf('='));
		  s.products=';'+s.list1+';;;'+s.pidInfo.eventArray[0];
		  s.linkTrackVars='products,list1,events,eVar1';
		  s.linkTrackEvents=s.events;
		  s.tl('-','o',s.pidInfo.linkName);
		}
  
		//reset original values
		s.sa(_acc);
		s.linkTrackVars==s.linkTrackVarsBackup;
		s.linkTrackEvents==s.linkTrackEventsBackup;
		s.events=s.eventsBackup;
		s.products=s.productsBackup;
		s.list1=s.list1Backup;
  
		s.isPidEvets=false;
	  }, 0);
	  s.pidListDedup=s.pidBackup;
	  s.pidEventDedup=ea;
	}
  }
  /*
  * TNT Integration Plugin v1.0
  */
  s.trackTNT =new Function("v","p","b",""
  +"var s=this,n='s_tnt',p=p?p:n,v=v?v:n,r='',pm=false,b=b?b:true;if(s."
  +"getQueryParam){pm=s.getQueryParam(p);}if(pm){r+=(pm+',');}if(s.wd[v"
  +"]!=undefined){r+=s.wd[v];}if(b){s.wd[v]='';}return r;");
  
  /*
   * Plugin: getQueryParam 2.4
   */
  s.getQueryParam=new Function("p","d","u","h",""
  +"var s=this,v='',i,j,t;d=d?d:'';u=u?u:(s.pageURL?s.pageURL:s.wd.loca"
  +"tion);if(u=='f')u=s.gtfs().location;while(p){i=p.indexOf(',');i=i<0"
  +"?p.length:i;t=s.p_gpv(p.substring(0,i),u+'',h);if(t){t=t.indexOf('#"
  +"')>-1?t.substring(0,t.indexOf('#')):t;}if(t)v+=v?d+t:t;p=p.substrin"
  +"g(i==p.length?i:i+1)}return v");
  s.p_gpv=new Function("k","u","h",""
  +"var s=this,v='',q;j=h==1?'#':'?';i=u.indexOf(j);if(k&&i>-1){q=u.sub"
  +"string(i+1);v=s.pt(q,'&','p_gvf',k)}return v");
  s.p_gvf=new Function("t","k",""
  +"if(t){var s=this,i=t.indexOf('='),p=i<0?t:t.substring(0,i),v=i<0?'T"
  +"rue':t.substring(i+1);if(p.toLowerCase()==k.toLowerCase())return s."
  +"epa(v)}return''");
  /*
   * Plugin: getValOnce_v1.11
   */
  s.getValOnce=new Function("v","c","e","t",""
  +"var s=this,a=new Date,v=v?v:'',c=c?c:'s_gvo',e=e?e:0,i=t=='m'?6000"
  +"0:86400000,k=s.c_r(c);if(v){a.setTime(a.getTime()+e*i);s.c_w(c,v,e"
  +"==0?0:a);}return v==k?'':v");
  
  /*
   * Utility manageVars v1.4 - clear variable values (requires split 1.5)
   */
  s.manageVars=new Function("c","l","f",""
  +"var s=this,vl,la,vla;l=l?l:'';f=f?f:1 ;if(!s[c])return false;vl='pa"
  +"geName,purchaseID,channel,server,pageType,campaign,state,zip,events"
  +",products,transactionID';for(var n=1;n<76;n++){vl+=',prop'+n+',eVar"
  +"'+n+',hier'+n;}if(l&&(f==1||f==2)){if(f==1){vl=l;}if(f==2){la=s.spl"
  +"it(l,',');vla=s.split(vl,',');vl='';for(x in la){for(y in vla){if(l"
  +"a[x]==vla[y]){vla[y]='';}}}for(y in vla){vl+=vla[y]?','+vla[y]:'';}"
  +"}s.pt(vl,',',c,0);return true;}else if(l==''&&f==1){s.pt(vl,',',c,0"
  +");return true;}else{return false;}");
  s.clearVars=new Function("t","var s=this;s[t]='';");
  s.lowercaseVars=new Function("t",""
  +"var s=this;if(s[t]&&t!='events'){s[t]=s[t].toString();if(s[t].index"
  +"Of('D=')!=0){s[t]=s[t].toLowerCase();}}");
  
  
  /*
   * Plugin: linkHandler 0.8 - identify and report custom links
   */
  s.linkHandler=new Function("p","t","e",""
  +"var s=this,o=s.p_gh(),h=o.href,i,l;t=t?t:'o';if(!h||(s.linkType&&(h"
  +"||s.linkName)))return'';i=h.indexOf('?');h=s.linkLeaveQueryString||"
  +"i<0?h:h.substring(0,i);l=s.pt(p,'|','p_gn',h.toLowerCase());if(l){s"
  +".linkName=l=='[['?'':l;s.linkType=t;return e?o:h;}return'';");
  s.p_gh=new Function("",""
  +"var s=this;if(!s.eo&&!s.lnk)return'';var o=s.eo?s.eo:s.lnk,y=s.ot(o"
  +"),n=s.oid(o),x=o.s_oidt;if(s.eo&&o==s.eo){while(o&&!n&&y!='BODY'){o"
  +"=o.parentElement?o.parentElement:o.parentNode;if(!o)return'';y=s.ot"
  +"(o);n=s.oid(o);x=o.s_oidt;}}return o?o:'';");
  s.p_gn=new Function("t","h",""
  +"var i=t?t.indexOf('~'):-1,n,x;if(t&&h){n=i<0?'':t.substring(0,i);x="
  +"t.substring(i+1);if(h.indexOf(x.toLowerCase())>-1)return n?n:'[[';}"
  +"return 0;");
  
  
  /*
   * Plugin: Dynamically Get CharSet
   */
  s.getCharSet=new Function("x",""
  +"var s=this,a,i,v,d;a=document.getElementsByTagName('meta');for(i=0;"
  +"i<a.length;i++){if(a[i].content.indexOf('charset=')>-1){v=a[i].cont"
  +"ent;break;}}if(v){v=v.substring(v.indexOf('charset=')+8);return v;}"
  +"else if(document.characterSet){v=document.characterSet;return v;}el"
  +"se{v=x?x:'ISO-8859-1';return v;}");
  
  
  /* Plugin: apl (appendToList) v3.2 (Requires inList v2.0 or higher) */
  s.apl=function(lv,vta,d1,d2,cc){if(!lv||"string"===typeof lv){if("undefined"===typeof this.inList||"string"!==typeof vta||""===vta)return lv;d1=d1||",";d2=d2||d1;1==d2&&(d2=d1,cc||(cc=1));2==d2&&1!=cc&&(d2=d1);vta=vta.split(",");for(var g=vta.length,e=0;e<g;e++)this.inList(lv,vta[e],d1,cc)||(lv=lv?lv+d2+vta[e]:vta[e])}return lv};
  
  /* Plugin: inList v2.1 */
  s.inList=function(lv,vtc,d,cc){if("string"!==typeof vtc)return!1;if("string"===typeof lv)lv=lv.split(d||",");else if("object"!== typeof lv)return!1;d=0;for(var e=lv.length;d<e;d++)if(1==cc&&vtc===lv[d]||vtc.toLowerCase()===lv[d].toLowerCase())return!0;return!1};
  
  
  /*
   * Utility Function: split v1.5 (JS 1.0 compatible)
   */
  s.split=new Function("l","d",""
  +"var i,x=0,a=new Array;while(l){i=l.indexOf(d);i=i>-1?i:l.length;a[x"
  +"++]=l.substring(0,i);l=l.substring(i+d.length);}return a");
  /*
   * Plugin: getPercentPageViewed v1.74
   */
  s.getPercentPageViewed=new Function("n",""
  +"var s=this,W=window,EL=W.addEventListener,AE=W.attachEvent,E=['load"
  +"','unload','scroll','resize','zoom','keyup','mouseup','touchend','o"
  +"rientationchange','pan'],K='s_ppv',P=K+'l',I=n||s.pageName||documen"
  +"t.location.href;W.s_Obj=s;if(!W.s_PPVevent){s.s_PPVg=function(n,o){"
  +"var c=s.c_r(o?P:K)||'',a=c.indexOf(',')>-1?c.split(',',10):[''],i;a"
  +"[0]=o?unescape(a[0]||''):I;for(i=1;i<9&&(i<a.length||!o);i++)a[i]=a"
  +"[i]?parseInt(a[i])||0:0;if(a.length>9||!o)a[9]=a[9]&&a[9]!='L'&&a[9"
  +"]!='LP'&&a[9]!='PL'?'P':a[9];return a};s.c_w(P,s.c_r(K)||'');s.c_w("
  +"K,escape(I)+',0,0,0,0,0,0,0,0');W.s_PPVevent=function(e){var W=wind"
  +"ow,D=document||{},B=D.body,E=D.documentElement||{},S=window.screen|"
  +"|{},Ho='offsetHeight',Hs='scrollHeight',Ts='scrollTop',Wc='clientWi"
  +"dth',Hc='clientHeight',M=Math,C=100,J='object',N='number',Z=',',s=W"
  +".s_Obj||W.s||0;e=e&&typeof e==J?e.type||'':'';if(!e.indexOf('on'))e"
  +"=e.substring(2);if(W.s_PPVt&&!e){clearTimeout(s_PPVt);s_PPVt=0}if(s"
  +"&&typeof s==J&&B&&typeof B==J){var h=M.max(B[Hs]||E[Hs],B[Ho]||E[Ho"
  +"],B[Hc]||E[Hc]||1),X=W.innerWidth||E[Wc]||B[Wc]||1,Y=W.innerHeight|"
  +"|E[Hc]||B[Hc]||1,x=S.width||1,y=S.height||1,r=M.round(C*(W.devicePi"
  +"xelRatio||1))/C,b=(D.pageYOffset||E[Ts]||B[Ts]||0)+Y,p=h>0&&b>0?M.r"
  +"ound(C*b/h):1,O=W.orientation,o=!isNaN(O)?M.abs(O)%180:Y>X?0:90,a=s"
  +".s_PPVg(n),L=(e=='load')||(a[1]<1),t,V=function(u,v,f,n){v=typeof v"
  +"!=N?u:v;v=f||(u>v)?u:v;return n?v:v>C?C:v<0?0:v};if(new RegExp('(iP"
  +"od|iPad|iPhone)').exec((window.navigator&&navigator.userAgent)||'')"
  +"&&o){t=x;x=y;y=t}o=o?'L':'P';a[9]=L||!a[9]?o:a[9].substring(0,1);if"
  +"(a[9]!='L'&&a[9]!='P')a[9]=o;s.c_w(K,escape(a[0])+Z+V(a[1],p,!L)+Z+"
  +"V(a[2],p,L)+Z+V(a[3],b,L,1)+Z+X+Z+Y+Z+x+Z+y+Z+r+Z+a[9]+(a[9]==o?'':"
  +"o))}if(!W.s_PPVt&&e!='unload')W.s_PPVt=setTimeout(W.s_PPVevent,333)"
  +"};for(var f=W.s_PPVevent,i=0;i<E.length;i++)if(EL)EL(E[i],f,false);"
  +"else if(AE)AE('on'+E[i],f);f()};var a=s.s_PPVg(n,1);return!argument"
  +"s.length||n=='-'?a[1]:a");
  /*
   * Plugin: getPreviousValue_v1.0 - return previous value of designated
   *   variable (requires split utility)
   */
  s.getPreviousValue=new Function("v","c","el",""
  +"var s=this,t=new Date,i,j,r='';t.setTime(t.getTime()+1800000);if(el"
  +"){if(s.events){i=s.split(el,',');j=s.split(s.events,',');for(x in i"
  +"){for(y in j){if(i[x]==j[y]){if(s.c_r(c)) r=s.c_r(c);v?s.c_w(c,v,t)"
  +":s.c_w(c,'no value',t);return r}}}}}else{if(s.c_r(c)) r=s.c_r(c);v?"
  +"s.c_w(c,v,t):s.c_w(c,'no value',t);return r}");
  /*
   * Plugin: socialPlatforms v1.1
   */
  s.socialPlatforms=new Function("a",""
  +"var s=this,g,K,D,E,F,i;g=s.referrer?s.referrer:document.referrer;g=g."
  +"toLowerCase();K=s.split(s.socPlatList,'|');for(i=0;i<K.length;i++){"
  +"D=s.split(K[i],'>');if(g.indexOf(D[0])!=-1){if(a){s[a]=D[1];}}}");
  
  s.socPlatList="facebook.com>Facebook|twitter.com>Twitter|t.co/>Twitter|youtube.com>Youtube|clipmarks.com>Clipmarks|dailymotion.com>Dailymotion|delicious.com>Delicious|digg.com>Digg|diigo.com>Diigo|flickr.com>Flickr|flixster.com>Flixster|fotolog.com>Fotolog|friendfeed.com>FriendFeed|google.com/buzz>Google Buzz|buzz.googleapis.com>Google Buzz|plus.google.com>Google+|hulu.com>Hulu|identi.ca>identi.ca|ilike.com>iLike|intensedebate.com>IntenseDebate|myspace.com>MySpace|newsgator.com>Newsgator|photobucket.com>Photobucket|plurk.com>Plurk|slideshare.net>SlideShare|smugmug.com>SmugMug|stumbleupon.com>StumbleUpon|tumblr.com>Tumblr|vimeo.com>Vimeo|wordpress.com>WordPress|xanga.com>Xanga|metacafe.com>Metacafe";
  
  
  
  // event={detail:{
  //     'site_id': 'FamilySearch',
  //     'site_language': 'en',
  //     'page_channel': 'Home',
  //     'page_detail': 'Homepage',
  //     'page_type': 'home',
  //     'visitor_state': 'lo',
  //     'visitor_cis':'123',
  //     'event_name': ['indexing_client_download','memories_upload_document'],
  //     'indexing_index_batches_quantity':32
  
  // }}
  
  
  // event_name: "click_action"
  // link_app: "Hf-Test-App"
  // link_componentIds: "na"
  // link_concat: "Hf-Test-App|hf-test|lo_hdr9_tree"
  // link_name: "Hf-Test-App: hf-test: lo_hdr9_tree"
  // link_name_orig: "lo_hdr9_tree"
  // link_obj: true
  // link_page: "hf-test"
  
  //event.identifier: "page_view"
  //_satellite.fsConfig(a,b)
  //_satellite.fsConfig(event.identifier,event.detail)
  //43.2kB (code in PV and Utility), 41.9 (code just in Utility, diff 1.3) 39.3 (neither, diff 2.6), 41.1kb (added to extension, diff 1.8)
  
  
  
  
	  // var b = event.detail; 
  
  _satellite.fsConfig=function(a,b){ //"b", cuz that's what Tealium used
	  var isEvent=a=='event';
  
  //****************** START - Global - Cleanup *****************//
  //*************************************************************//
		  
	  //Remove visitor_contactId from all tags
	  if(b.visitor_contactId){
		  b.visitor_contactId='';
	  }
  
	  //Manage search
	  b.search_results=b.search_results==='0'?'zero':b.search_results;
	  //if a keyword is set but no onsite_search event then we go ahead and add onsite_search
	  if(b.search_keyword && (!b.event_name || b.event_name.indexOf('onsite_search')==-1)){
		  b.event_name=(b.event_name?b.event_name+',':'')+'onsite_search';
	  }
  
	  //check if a value is an array
	  isArray=function(e){
		  if(e.constructor === Array){
			  return true
		  }else{
			  return false
		  }
	  }
  
	  //lowercase variables
	  //a=array of strings/arrays for UDO names to update
	  var lc=function(a){
		  for(i=0;i<a.length;i++){
			  if(typeof b[a[i]] != 'undefined'){
				  if(typeof b[a[i]] == 'string'){
					  b[a[i]]=b[a[i]].toLowerCase();
				  }else if(isArray(b[a[i]])){
					  for(ii=0;ii<b[a[i]].length;ii++){
						  b[a[i]][ii]=b[a[i]][ii].toLowerCase();
					  }
				  }
			  }
		  }   
	  }
  
	  lc([
		  'site_type',
		  'site_currencyCode',
		  'search_keyword',
		  'filter_type',
		  'filter_value'
	  ])
  
  
	  //simple trim
	  var trimmer=function(e){return null==e?null:e.trim?e.trim():e.replace(/^ */g,"").replace(/ *$/,"")}
  
	  //clean page variables
	  //a=array of values to do some clean up on such as replace spaces with dashes and remove special characters
	  var cleanPageVals=function(a){
		  for(i=0;i<a.length;i++){
			  if(typeof b[a[i]] == "string"){
				  //b[a[i]]=trimmer(b[a[i]]).replace(/ /g,'-').replace(/[Â®â„¢Â©]*/g,'');
				  //no longer remove dashes 
				  b[a[i]]=trimmer(b[a[i]]).replace(/[Â®â„¢Â©]*/g,'');
			  }
		  }   
	  }
  
	  cleanPageVals([
		  'page_detail',
		  'page_channel',
		  'page_subChannel'
	  ])
  
  //************************************************************//
  //****************** END - Global - Cleanup ******************//
  
  //****************** START - page and channel ******************//
  //**************************************************************//
	  s.pageName = !b.site_id?s.pageName:(b.site_id + (b.page_channel ? ': ' + b.page_channel : '') + (b.page_subChannel ? ': ' + b.page_subChannel : '') + (b.page_detail ? ': ' + b.page_detail : ''));
	  s.channel = b.page_channel || s.channel;
  
  //****************** START - link name ******************//
  //*******************************************************//
	  b.link_name = b.link_name||b.event_name;
  
  //****************** START - Click Action Attributes ******************//
  //*********************************************************************//
	  //if using link_name or link_page assume that link_name needs to be updated to be a concatenation of all those (to match historical Custom Link names)
	  b.link_name_orig=b.link_name;
	  if(b.link_page || b.link_app){
		  //b.link_name = (b.link_app||'').replace(/\: ?/g,'') + ': ' + (b.link_page||'').replace(/\: ?/g,'') + ': ' + (b.link_name||'').replace(/\: ?/g,'');
		  b.link_name = b.link_app + ': ' + b.link_page + ': ' + b.link_name;
	  }
  
	  //For every event set link_concat and link_componentIds
	  if(a==='event'){
		  b.link_concat = (b.link_app||'na').replace(/\|?/g,'') + '|' + (b.link_page||'na').replace(/\|?/g,'') + '|' + (b.link_name_orig||'').replace(/\|?/g,'');
		  b.link_componentIds=b.link_componentIds||'na';
	  }
  
	  s.linkNameBackup=b.link_name //to get called again in doPlugins
  
  
  
  //****************** START - Map Simple eVars & Props ******************//
  //**********************************************************************//
  
	  var map = {
		  "aa_page_name": "pageName",
		  "link_concat": "eVar73",
		  "link_componentIds": "list3,eVar74",
		  "pid_ids": "list1,prop3",
		  "visitor_cis": "eVar1",
		  "pid_110YearRule": "eVar2",
		  "consultantPlanner_clientWard": "eVar6",
		  "consultantPlanner_clientCIS": "eVar7",
		  "fhc_location": "eVar12",
		  "visitor_treeCompleteness": "eVar25",
		  "visitor_contributionLevel": "eVar27",
		  "visitor_taskState": "eVar28",
		  "site_language": "eVar35",
		  "visitor_accountType": "eVar40,prop40",
		  "video_name": "eVar44,prop51",
		  "visitor_loginType": "eVar46",
		  "video_player": "eVar52",
		  "visitor_age": "eVar65",
		  "visitor_gender": "eVar66",
		  "page_channel": "channel",
		  "page_server": "server",
		  "visitor_visitationState": "prop10,eVar10",
		  "record_collectionIds": "prop11,eVar11",
		  "registration_mrnFlag": "prop16",
		  "form_interactionName": "prop19,eVar19",
		  "error_names": "prop20,eVar20",
		  "form_interactionName": "prop14,eVar14",
		  "registration_memberType": "prop15,eVar15",
		  "skipped": "prop16,eVar16",
		  "registration_parentalConsent": "prop17,eVar17",
		  "registration_gender": "prop18,eVar18",
		  "registration_recoverytype": "eVar64",
		  "registration_country": "eVar87",
		  "account_recoveryMessage": "eVar63",
		  "communityTree_id": "eVar17",
		  "oralGenealogies_id": "eVar18",
		  "environment_version": "prop58",
		  "indexing_projectName": "eVar77",
		  "indexing_projectDifficulty": "eVar78",
		  "indexing_recordsSubmitted": "eVar79",
		  "indexing_returnActionType": "eVar81",
		  "list_final": "list2",
		  "limb_bookId": "eVar71",
		  "image_rmsId": "eVar82",
		  "image_dgsId": "eVar83",
		  "question_name": "eVar84",
		  "help_center_search_term": "eVar88",
		  "indexing_open_message_subject": "eVar89",
		  "search_genealogiesFlags": "eVar59"
	  }
	  //to help with the eVar14 conflict which search_results and form_interactionName both point to
	  if(b.search_results){
		  map.search_results='eVar14';
	  }
  
	  if(b.search_attribute && b.search_attribute.length && b.search_value && b.search_value.length){
		  for(i=0;i<b.search_attribute.length;i++){
			  var potentialNewVal=(!b.search_attributesValues?'':b.search_attributesValues+',')+b.search_attribute[i]+':'+b.search_value[i]||'';
			  if(potentialNewVal.length<=100){
				  //limit to 100 characters so we don't get truncated values
				  b.search_attributesValues=potentialNewVal
			  }
		  }
		  
		  //dedup search attributes. e.g. someone can search for multiple record types and we just need to know that they used it
		  b.search_attributesDedup=[];
		  for(i=0;i<b.search_attribute.length;i++){
			  if(b.search_attributesDedup.indexOf(b.search_attribute[i])<0){
				  b.search_attributesDedup.push(b.search_attribute[i])   
			  }
		  }
		  map.search_attributesDedup='prop44';
		  map.search_attributesValues='prop45';
	  }
  
	  //AA - Indexing Totals
	  if(b.indexing_totalIndexing != undefined || b.indexing_totalReviews != undefined || b.indexing_totalRecords != undefined){
		  b.indexing_totalsJoined=b.indexing_totalIndexing||'0';
		  b.indexing_totalsJoined+=':'+b.indexing_totalReviews||'0';
		  b.indexing_totalsJoined+=':'+b.indexing_totalRecords||'0';
	  }
	  map["indexing_totalsJoined"]="eVar76"
  
	  //AA - Misc List
	  if(b.list_type && b.list_values && typeof b.list_values != 'string'){
		  for(var i=0;i<b.list_values.length;i++){
			  b.list_final=b.list_final?b.list_final+',':'';
			  b.list_final+=b.list_type+':'+b.list_values[i];
		  }
	  }
  
	  //Global - Tealium Version & Environment
	  b.environment_version=_satellite.buildInfo.environment+':'+_satellite.buildInfo.buildDate;
  
  
  
	  //map vars to s object
	  for (var attrname in b){
		  if(map[attrname]){
			  var aaVars=map[attrname].split(',');
			  for(i=0;i<aaVars.length;i++){
				  _satellite.aaAddVar(aaVars[i],b[attrname],isEvent);
			  }
		  }
	  }
  
  //********************************************************************//
  //****************** END - Map Simple eVars & Props ******************//
  
  //****************** START - Map Counter Events ******************//
  //****************************************************************//
	  var eventMap={
		  "event_name:indexing_client_download": "event4",
		  "event_name:memories_upload_document": "event6",
		  "event_name:memories_upload_photo": "event7",
		  "event_name:memories_tag_photo": "event8",
		  "event_name:memories_link_photo": "event9",
		  "event_name:collection_image_attach": "event10",
		  "event_name:attach_record": "event12",
		  "event_name:source_box_add": "event13",
		  "event_name:print": "event15",
		  "event_name:email": "event16",
		  "event_name:download": "event17",
		  "event_name:social_share": "event19",
		  "event_name:attach_name_manual": "event21",
		  "event_name:attach_record_manual": "event36",
		  "event_name:memories_upload_audio": "event39",
		  "event_name:temple_reserve": "event41",
		  "event_name:temple_print": "event42",
		  "event_name:temple_share_with_temple": "event43",
		  "event_name:temple_unreserve": "event44",
		  "event_name:temple_unshare": "event45",
		  "event_name:attach_name": "event46",
		  "event_name:add_name": "event46",
		  "event_name:collection_record_view": "event51",
		  "event_name:collection_search": "event52",
		  "event_name:collection_image_view": "event53",
		  "event_name:collection_copy_to_clipboard": "event54",
		  "event_name:collection_record_print": "event55",
		  "event_name:collection_about": "event56",
		  "event_name:collection_image_print": "event59",
		  "event_name:collection_image_download": "event60",
		  "event_name:collection_image_view_from_details": "event62",
		  "event_name:collection_visit_partner_site": "event63",
		  "event_name:registration_form_view": "event71",
		  "event_name:registration_start": "event72",
		  "event_name:add_a_name": "event80",
		  "event_name:record_hint": "event81",
		  "event_name:names_ready": "event82",
		  "event_name:names_almost_ready": "event83",
		  "event_name:memories_create_story": "event84",
		  "event_name:memories_tagAndLink_photo": "event85",
		  "event_name:memories_tagAndLink_document": "event86",
		  "event_name:memories_tagAndLink_audio": "event87",
		  "event_name:memories_tagAndLink_story": "event88",
		  "event_name:deceased_person_added": "event91",
		  "event_name:living_person_added": "event92",
		  "event_name:communityTree_view": "event103",
		  "event_name:oralGenealogies_view": "event104",
		  "event_name:indexing_index_batches": b.indexing_index_batches_quantity ? undefined : "event105", 
		  "indexing_index_batches_quantity": !b.indexing_index_batches_quantity ? undefined : "VALUE_event105",
		  "event_name:indexing_review_batches": b.indexing_review_batches_quantity ? undefined : "event106",
		  "indexing_review_batches_quantity": !b.indexing_review_batches_quantity ? undefined : "VALUE_event106",
		  "event_name:indexing_find_batches": "event107",
		  "event_name:indexing_open_batches": "event108",
		  "event_name:indexing_submit_batches": "event109",
		  "event_name:indexing_return_batches": (b.indexing_return_index_batches_quantity || b.indexing_return_review_batches_quantity) ? undefined : "event110",
		  "indexing_return_index_batches_quantity": !b.indexing_return_index_batches_quantity ? undefined : "VALUE_event110",
		  "indexing_return_review_batches_quantity": !b.indexing_return_review_batches_quantity ? undefined : "VALUE_event110",
		  "event_name:member_reg_start": "event111",
		  "event_name:indexing_submit_unique_batches": "event113",
		  "event_name:edit_name_saved": "event119",
		  "event_name:imageSearch_view": "event120",
		  "event_name:start_mrn_add": "event121",
		  "event_name:parental_consent_started": "event122",
		  "event_name:invalid_mrn_entered": "event123",
		  "event_name:dont_know_mrn": "event124",
		  "event_name:question_flow_started": "event125",
		  "event_name:question_incorrect": "event126",
		  "event_name:question_correct": "event127",
		  "event_name:edit_place_saved": "event128",
		  "editRecords_householdRecordCount": "VALUE_event114",
		  "event_name:edit_date_saved": "event129",
		  "event_name:open_upload_complete_dialog": "event130",
		  "event_name:help_center_search_term": "event131",
		  "event_name:church_record_number_added": "event132",
		  "event_name:account_deleted": "event133",
	  }
  
	  //map events
	  s.events=s.events||''; //to avoid 'undefined' in the strings below
	  var uniqueEvents=[];
  
	  //custom incrementor events:
	  for (var attrname in b){
		  if(eventMap[attrname] && typeof eventMap[attrname] == 'string'){
			  var eventName=eventMap[attrname].replace('VALUE_','')
			  _satellite.aaAddEvent(eventName,isEvent,b[attrname])
		  }
	  }
	  //counter events:
	  if(b.event_name){
		  eventArray = typeof b.event_name == 'string' ? b.event_name.split(',') : b.event_name
		  for(i=0;i<eventArray.length;i++){
			  var lookupName='event_name:'+eventArray[i];
			  var eventName=eventMap[lookupName];
			  if(eventName){
				  _satellite.aaAddEvent(eventName,isEvent)
			  }            
		  }
	  }
  
  //**************************************************************//
  //****************** END - Map Counter Events ******************//
  
  
  //****************** START - Registration ******************//
  //**********************************************************//
	  //reg view
	  if(a=='page_view' && (/\/register\/1?\/?$/).test(document.location.pathname)){
		  _satellite.aaAddEvent('event71')
	  }
  
  
	  //reg complete
	  if(b.event_name && b.event_name.indexOf('registration_complete')>=0){
		  if(b.registration_memberType=='non-member' || b.registration_mrnFlag==='false'){
			  _satellite.aaAddEvent('event73',isEvent)
		  }
		  
		  if(b.registration_memberType=='member'){
			  _satellite.aaAddEvent('event74',isEvent)
		  }
		  
		  if(b.registration_memberType=='member'){
			  _satellite.aaAddVar(map.skipped,'MRN entered',isEvent);
		  }else if(b.registration_memberType=='low-confidence-member'){
			  _satellite.aaAddVar(map.skipped,'MRN skipped',isEvent);
		  }
	  }
  
  //********************************************************//
  //****************** END - Registration ******************//
  
  
  //****************** START - AA - Blocker ******************//
  //**********************************************************//
	  var flag=false;
	  if(a=='event'){
		  if(b.link_name && b.link_name.toLowerCase().indexOf(':displayed')>=0){
			  flag=true;
		  }
		  if(b.event_name && b.event_name=='preferences-loaded'){
			  flag=true;
		  }
	  }
	  s.abort=flag?flag:s.abort;
	  //fsClearVars will take care os switching s.abort back to false after every hit
	  //note there is some s.abort logic in doPlugins
  
  //********************************************************//
  //****************** END - AA - Blocker ******************//
  }
  
  //e: event name "event1"
  //lte: boolean for adding to linkTrackEvents
  //val: numeric event value
  
  _satellite.aaAddEvent = function(e,lte,val){
	  s.events=s.apl(s.events,e+(val?'='+val:''),',');
	  if(lte){
		  s.linkTrackVars=s.apl(s.linkTrackVars,'events',',');
		  s.linkTrackEvents=s.apl(s.linkTrackEvents,e,',');
	  }
  }
  
  //v: variable name "eVar1", can be comma delimited "eVar1,prop1" to set multiple variable to the same value
  //val: value of variable
  //lte: boolean for adding to linkTrackVars
  
  _satellite.aaAddVar = function(v,val,lte){
	  var varList=v.split(',')
	  for (i=0; i<varList.length; i++) {
		  s[varList[i]]=val;
		  if(lte){
			  s.linkTrackVars=s.apl(s.linkTrackVars,varList[i],',');
		  }
	  }
  }
  
  
  }
		  },
		  "libraryCode": {
			"type": "managed",
			"accounts": {
			  "staging": [
				"ldsfchdev"
			  ],
			  "production": [
				"ldsfchglobal"
			  ],
			  "development": [
				"ldsfchdev"
			  ]
			},
			"useActivityMap": true,
			"scopeTrackerGlobally": true
		  },
		  "trackerProperties": {
			"currencyCode": "USD",
			"trackInlineStats": true,
			"trackDownloadLinks": true,
			"trackExternalLinks": true,
			"linkDownloadFileTypes": [
			  "doc",
			  "docx",
			  "eps",
			  "jpg",
			  "png",
			  "svg",
			  "xls",
			  "ppt",
			  "pptx",
			  "pdf",
			  "xlsx",
			  "tab",
			  "csv",
			  "zip",
			  "txt",
			  "vsd",
			  "vxd",
			  "xml",
			  "js",
			  "css",
			  "rar",
			  "exe",
			  "wma",
			  "mov",
			  "avi",
			  "wmv",
			  "mp3",
			  "wav",
			  "m4v"
			]
		  }
		},
		"hostedLibFilesBaseUrl": "https://assets.adobedtm.com/extensions/EPbde2f7ca14e540399dcc1f8208860b7b/"
	  },
	  "adobe-mcid": {
		"displayName": "Experience Cloud ID Service",
		"modules": {
		  "adobe-mcid/src/lib/sharedModules/mcidInstance.js": {
			"script": function(module, exports, require, turbine) {
  /*************************************************************************
  * ADOBE CONFIDENTIAL
  * ___________________
  *
  *  Copyright 2016 Adobe Systems Incorporated
  *  All Rights Reserved.
  *
  * NOTICE:  All information contained herein is, and remains
  * the property of Adobe Systems Incorporated and its suppliers,
  * if any.  The intellectual and technical concepts contained
  * herein are proprietary to Adobe Systems Incorporated and its
  * suppliers and are protected by all applicable intellectual property
  * laws, including trade secret and copyright laws.
  * Dissemination of this information or reproduction of this material
  * is strictly forbidden unless prior written permission is obtained
  * from Adobe Systems Incorporated.
  **************************************************************************/
  
  'use strict';
  var document = require('@adobe/reactor-document');
  var VisitorAPI = require('../codeLibrary/VisitorAPI');
  var timeUnits = require('../../view/utils/timeUnits');
  
  var transformArrayToObject = function(configs) {
	var initConfig = configs.reduce(function(obj, config) {
	  var value = /^(true|false)$/i.test(config.value) ? JSON.parse(config.value) : config.value;
  
	  obj[config.name] = value;
  
	  return obj;
	}, {});
  
	return initConfig;
  };
  
  var initializeVisitorId = function(Visitor) {
	var extensionSettings = turbine.getExtensionSettings();
	if (typeof extensionSettings.orgId !== 'string') {
	  throw new TypeError('Org ID is not a string.');
	}
  
	var initConfig = transformArrayToObject(extensionSettings.variables || []);
	var doesOptInApply = extensionSettings.doesOptInApply;
	if (doesOptInApply) {
	  if (typeof doesOptInApply === 'boolean') {
		initConfig['doesOptInApply'] = doesOptInApply; 
	  } else if (extensionSettings.optInCallback) {
		initConfig['doesOptInApply'] = extensionSettings.optInCallback; 
	  }
	}
  
	var isOptInStorageEnabled = extensionSettings.isOptInStorageEnabled;
	if (isOptInStorageEnabled) {
	  initConfig['isOptInStorageEnabled'] = isOptInStorageEnabled;
	}
  
	var optInCookieDomain = extensionSettings.optInCookieDomain;
	if (optInCookieDomain) {
	  initConfig['optInCookieDomain'] = optInCookieDomain;
	}
  
	var optInStorageExpiry = extensionSettings.optInStorageExpiry;
	if (optInStorageExpiry) {
	  var timeUnit = extensionSettings.timeUnit;
	  if (timeUnit && timeUnits[timeUnit]) {
		var seconds = optInStorageExpiry * timeUnits[timeUnit];
		initConfig['optInStorageExpiry'] = seconds;
	  }
	} else if (isOptInStorageEnabled === true) {
	  // default is 13 months
	  initConfig['optInStorageExpiry'] = 13 * 30 * 24 * 3600;
	}
  
	var previousPermissions = extensionSettings.previousPermissions;
	if (previousPermissions) {
	  initConfig['previousPermissions'] = previousPermissions;
	}
  
	var preOptInApprovals = extensionSettings.preOptInApprovals;
	if (preOptInApprovals) {
	  initConfig['preOptInApprovals'] = preOptInApprovals;
	} else {
	  var preOptInApprovalInput = extensionSettings.preOptInApprovalInput;
	  if (preOptInApprovalInput) {
		initConfig['preOptInApprovals'] = preOptInApprovalInput;
	  }
	}
  
	var isIabContext = extensionSettings.isIabContext;
	if (isIabContext) {
	  initConfig['isIabContext'] = isIabContext;
	}
  
	var instance = Visitor.getInstance(extensionSettings.orgId, initConfig);
  
	turbine.logger.info('Created instance using orgId: "' + extensionSettings.orgId + '"');
	turbine.logger.info('Set variables: ' + JSON.stringify(initConfig));
  
	// getMarketingCloudVisitorID is called automatically when the instance is created, but
	// we call it here so that we can log the ID once it has been retrieved from the server.
	// Calling getMarketingCloudVisitorID multiple times will not result in multiple requests
	// to the server.
	instance.getMarketingCloudVisitorID(function(id) {
	  turbine.logger.info('Obtained Marketing Cloud Visitor Id: ' + id);
	}, true);
  
	return instance;
  };
  
  var excludePathsMatched = function(path) {
	var extensionSettings = turbine.getExtensionSettings();
	var pathExclusions = extensionSettings.pathExclusions || [];
  
	return pathExclusions.some(function(pathExclusion) {
	  if (pathExclusion.valueIsRegex) {
		return new RegExp(pathExclusion.value, 'i').test(path);
	  } else {
		return pathExclusion.value === path;
	  }
	});
  };
  
  var visitorIdInstance = null;
  
  // Overwrite the getVisitorId exposed in Turbine. This is largely for backward compatibility
  // since DTM supported this method on _satellite.
  _satellite.getVisitorId = function() { return visitorIdInstance; };
  
  if (excludePathsMatched(document.location.pathname)) {
	turbine.logger.warn('MCID library not loaded. One of the path exclusions matches the ' +
	  'current path.');
  } else {
	visitorIdInstance = initializeVisitorId(VisitorAPI);
  }
  
  module.exports = visitorIdInstance;
  
			}
  ,
			"name": "mcid-instance",
			"shared": true
		  },
		  "adobe-mcid/src/lib/codeLibrary/VisitorAPI.js": {
			"script": function(module, exports, require, turbine) {
  /* istanbul ignore next */
  module.exports = function() {
  var e=function(){"use strict";function e(t){"@babel/helpers - typeof";return(e="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(e){return typeof e}:function(e){return e&&"function"==typeof Symbol&&e.constructor===Symbol&&e!==Symbol.prototype?"symbol":typeof e})(t)}function t(e,t,n){return t in e?Object.defineProperty(e,t,{value:n,enumerable:!0,configurable:!0,writable:!0}):e[t]=n,e}function n(){return{callbacks:{},add:function(e,t){this.callbacks[e]=this.callbacks[e]||[];var n=this.callbacks[e].push(t)-1,i=this;return function(){i.callbacks[e].splice(n,1)}},execute:function(e,t){if(this.callbacks[e]){t=void 0===t?[]:t,t=t instanceof Array?t:[t];try{for(;this.callbacks[e].length;){var n=this.callbacks[e].shift();"function"==typeof n?n.apply(null,t):n instanceof Array&&n[1].apply(n[0],t)}delete this.callbacks[e]}catch(e){}}},executeAll:function(e,t){(t||e&&!V.isObjectEmpty(e))&&Object.keys(this.callbacks).forEach(function(t){var n=void 0!==e[t]?e[t]:"";this.execute(t,n)},this)},hasCallbacks:function(){return Boolean(Object.keys(this.callbacks).length)}}}function i(e,t,n){var i=null==e?void 0:e[t];return void 0===i?n:i}function r(e){for(var t=/^\d+$/,n=0,i=e.length;n<i;n++)if(!t.test(e[n]))return!1;return!0}function a(e,t){for(;e.length<t.length;)e.push("0");for(;t.length<e.length;)t.push("0")}function o(e,t){for(var n=0;n<e.length;n++){var i=parseInt(e[n],10),r=parseInt(t[n],10);if(i>r)return 1;if(r>i)return-1}return 0}function s(e,t){if(e===t)return 0;var n=e.toString().split("."),i=t.toString().split(".");return r(n.concat(i))?(a(n,i),o(n,i)):NaN}function c(e){return e===Object(e)&&0===Object.keys(e).length}function u(e){return"function"==typeof e||e instanceof Array&&e.length}function l(){var e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:"",t=arguments.length>1&&void 0!==arguments[1]?arguments[1]:function(){return!0};this.log=Ie("log",e,t),this.warn=Ie("warn",e,t),this.error=Ie("error",e,t)}function d(){var e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:{},t=e.cookieName,n=arguments.length>1&&void 0!==arguments[1]?arguments[1]:{},i=n.cookies;if(!t||!i)return{get:we,set:we,remove:we};var r={remove:function(){i.remove(t)},get:function(){var e=i.get(t),n={};try{n=JSON.parse(e)}catch(e){n={}}return n},set:function(e,n){n=n||{};var a=r.get(),o=Object.assign(a,e);i.set(t,JSON.stringify(o),{domain:n.optInCookieDomain||"",cookieLifetime:n.optInStorageExpiry||3419e4,expires:!0})}};return r}function f(e){this.name=this.constructor.name,this.message=e,"function"==typeof Error.captureStackTrace?Error.captureStackTrace(this,this.constructor):this.stack=new Error(e).stack}function p(){function e(e,t){var n=Ae(e);return n.length?n.every(function(e){return!!t[e]}):be(t)}function t(){M(b),O(le.COMPLETE),_(h.status,h.permissions),s&&m.set(h.permissions,{optInCookieDomain:c,optInStorageExpiry:u}),C.execute(He)}function n(e){return function(n,i){if(!Oe(n))throw new Error("[OptIn] Invalid category(-ies). Please use the `OptIn.Categories` enum.");return O(le.CHANGED),Object.assign(b,Me(Ae(n),e)),i||t(),h}}var i=arguments.length>0&&void 0!==arguments[0]?arguments[0]:{},r=i.doesOptInApply,a=i.previousPermissions,o=i.preOptInApprovals,s=i.isOptInStorageEnabled,c=i.optInCookieDomain,u=i.optInStorageExpiry,l=i.isIabContext,f=arguments.length>1&&void 0!==arguments[1]?arguments[1]:{},p=f.cookies,g=Fe(a);Ne(g,"Invalid `previousPermissions`!"),Ne(o,"Invalid `preOptInApprovals`!");var m=d({cookieName:"adobeujs-optin"},{cookies:p}),h=this,_=ue(h),C=he(),I=Te(g),S=Te(o),v=s?m.get():{},D={},y=function(e,t){return Pe(e)||t&&Pe(t)?le.COMPLETE:le.PENDING}(I,v),A=function(e,t,n){var i=Me(me,!r);return r?Object.assign({},i,e,t,n):i}(S,I,v),b=ke(A),O=function(e){return y=e},M=function(e){return A=e};h.deny=n(!1),h.approve=n(!0),h.denyAll=h.deny.bind(h,me),h.approveAll=h.approve.bind(h,me),h.isApproved=function(t){return e(t,h.permissions)},h.isPreApproved=function(t){return e(t,S)},h.fetchPermissions=function(e){var t=arguments.length>1&&void 0!==arguments[1]&&arguments[1],n=t?h.on(le.COMPLETE,e):we;return!r||r&&h.isComplete||!!o?e(h.permissions):t||C.add(He,function(){return e(h.permissions)}),n},h.complete=function(){h.status===le.CHANGED&&t()},h.registerPlugin=function(e){if(!e||!e.name||"function"!=typeof e.onRegister)throw new Error(Ue);D[e.name]||(D[e.name]=e,e.onRegister.call(e,h))},h.execute=Ve(D),h.memoizeContent=function(e){Re(e)&&m.set(e,{optInCookieDomain:c,optInStorageExpiry:u})},h.getMemoizedContent=function(e){var t=m.get();if(t)return t[e]},Object.defineProperties(h,{permissions:{get:function(){return A}},status:{get:function(){return y}},Categories:{get:function(){return de}},doesOptInApply:{get:function(){return!!r}},isPending:{get:function(){return h.status===le.PENDING}},isComplete:{get:function(){return h.status===le.COMPLETE}},__plugins:{get:function(){return Object.keys(D)}},isIabContext:{get:function(){return l}}})}function g(e,t){function n(){r=null,e.call(e,new f("The call took longer than you wanted!"))}function i(){r&&(clearTimeout(r),e.apply(e,arguments))}if(void 0===t)return e;var r=setTimeout(n,t);return i}function m(){if(window.__tcfapi)return window.__tcfapi;var e=window;if(e===window.top)return void De.error("__tcfapi not found");for(var t;!t;){e=e.parent;try{e.frames.__tcfapiLocator&&(t=e)}catch(e){}if(e===window.top)break}if(!t)return void De.error("__tcfapi not found");var n={};return window.__tcfapi=function(e,i,r,a){var o=Math.random()+"",s={__tcfapiCall:{command:e,parameter:a,version:i,callId:o}};n[o]=r,t.postMessage(s,"*")},window.addEventListener("message",function(e){var t=e.data;if("string"==typeof t)try{t=JSON.parse(e.data)}catch(e){}if(t.__tcfapiReturn){var i=t.__tcfapiReturn;"function"==typeof n[i.callId]&&(n[i.callId](i.returnValue,i.success),delete n[i.callId])}},!1),window.__tcfapi}function h(e,t){var n=arguments.length>2&&void 0!==arguments[2]?arguments[2]:[],i=!0===e.vendor.consents[t],r=n.every(function(t){return!0===e.purpose.consents[t]});return i&&r}function _(){var e=this;e.name="iabPlugin",e.version="0.0.2";var t,n=he(),i={transparencyAndConsentData:null},r=function(e){var t=arguments.length>1&&void 0!==arguments[1]?arguments[1]:{};return i[e]=t};e.fetchConsentData=function(e){var t=e.callback,n=e.timeout,i=g(t,n);a({callback:i})},e.isApproved=function(e){var t=e.callback,n=e.category,r=e.timeout;if(i.transparencyAndConsentData)return t(null,h(i.transparencyAndConsentData,fe[n],pe[n]));var o=g(function(e,i){t(e,h(i,fe[n],pe[n]))},r);a({category:n,callback:o})},e.onRegister=function(n){t=n;var i=Object.keys(fe),r=function(e,t){!e&&t&&(i.forEach(function(e){var i=h(t,fe[e],pe[e]);n[i?"approve":"deny"](e,!0)}),n.complete())};e.fetchConsentData({callback:r})};var a=function(e){var a=e.callback;if(i.transparencyAndConsentData)return a(null,i.transparencyAndConsentData);n.add("FETCH_CONSENT_DATA",a),o(function(e,a){if(a){var o=ke(e),s=t.getMemoizedContent("iabConsentHash"),c=ve(o.tcString).toString(32);o.consentString=e.tcString,o.hasConsentChangedSinceLastCmpPull=s!==c,r("transparencyAndConsentData",o),t.memoizeContent({iabConsentHash:c})}n.execute("FETCH_CONSENT_DATA",[null,i.transparencyAndConsentData])})},o=function(e){var t=je(fe),n=m();"function"==typeof n&&n("getTCData",2,e,t)}}var C="undefined"!=typeof globalThis?globalThis:"undefined"!=typeof window?window:"undefined"!=typeof global?global:"undefined"!=typeof self?self:{};Object.assign=Object.assign||function(e){for(var t,n,i=1;i<arguments.length;++i){n=arguments[i];for(t in n)Object.prototype.hasOwnProperty.call(n,t)&&(e[t]=n[t])}return e};var I,S,v={HANDSHAKE:"HANDSHAKE",GETSTATE:"GETSTATE",PARENTSTATE:"PARENTSTATE"},D={MCMID:"MCMID",MCAID:"MCAID",MCAAMB:"MCAAMB",MCAAMLH:"MCAAMLH",MCOPTOUT:"MCOPTOUT",CUSTOMERIDS:"CUSTOMERIDS"},y={MCMID:"getMarketingCloudVisitorID",MCAID:"getAnalyticsVisitorID",MCAAMB:"getAudienceManagerBlob",MCAAMLH:"getAudienceManagerLocationHint",MCOPTOUT:"isOptedOut",ALLFIELDS:"getVisitorValues"},A={CUSTOMERIDS:"getCustomerIDs"},b={MCMID:"getMarketingCloudVisitorID",MCAAMB:"getAudienceManagerBlob",MCAAMLH:"getAudienceManagerLocationHint",MCOPTOUT:"isOptedOut",MCAID:"getAnalyticsVisitorID",CUSTOMERIDS:"getCustomerIDs",ALLFIELDS:"getVisitorValues"},O={MC:"MCMID",A:"MCAID",AAM:"MCAAMB"},M={MCMID:"MCMID",MCOPTOUT:"MCOPTOUT",MCAID:"MCAID",MCAAMLH:"MCAAMLH",MCAAMB:"MCAAMB"},k={UNKNOWN:0,AUTHENTICATED:1,LOGGED_OUT:2},E={GLOBAL:"global"},T={MESSAGES:v,STATE_KEYS_MAP:D,ASYNC_API_MAP:y,SYNC_API_MAP:A,ALL_APIS:b,FIELDGROUP_TO_FIELD:O,FIELDS:M,AUTH_STATE:k,OPT_OUT:E},P=T.STATE_KEYS_MAP,L=function(e){function t(){}function n(t,n){var i=this;return function(){var r=e(0,t),a={};return a[t]=r,i.setStateAndPublish(a),n(r),r}}this.getMarketingCloudVisitorID=function(e){e=e||t;var i=this.findField(P.MCMID,e),r=n.call(this,P.MCMID,e);return void 0!==i?i:r()},this.getVisitorValues=function(e){this.getMarketingCloudVisitorID(function(t){e({MCMID:t})})}},R=T.MESSAGES,w=T.ASYNC_API_MAP,F=T.SYNC_API_MAP,N=function(){function e(){}function t(e,t){var n=this;return function(){return n.callbackRegistry.add(e,t),n.messageParent(R.GETSTATE),""}}function n(n){this[w[n]]=function(i){i=i||e;var r=this.findField(n,i),a=t.call(this,n,i);return void 0!==r?r:a()}}function i(t){this[F[t]]=function(){return this.findField(t,e)||{}}}Object.keys(w).forEach(n,this),Object.keys(F).forEach(i,this)},x=T.ASYNC_API_MAP,j=function(){Object.keys(x).forEach(function(e){this[x[e]]=function(t){this.callbackRegistry.add(e,t)}},this)},V=function(e,t){return t={exports:{}},e(t,t.exports),t.exports}(function(t,n){n.isObjectEmpty=function(e){return e===Object(e)&&0===Object.keys(e).length},n.isValueEmpty=function(e){return""===e||n.isObjectEmpty(e)};var i=function(){var e=navigator.appName,t=navigator.userAgent;return"Microsoft Internet Explorer"===e||t.indexOf("MSIE ")>=0||t.indexOf("Trident/")>=0&&t.indexOf("Windows NT 6")>=0};n.getIeVersion=function(){return document.documentMode?document.documentMode:i()?7:null},n.encodeAndBuildRequest=function(e,t){return e.map(encodeURIComponent).join(t)},n.isObject=function(t){return null!==t&&"object"===e(t)&&!1===Array.isArray(t)},n.defineGlobalNamespace=function(){return window.adobe=n.isObject(window.adobe)?window.adobe:{},window.adobe},n.pluck=function(e,t){return t.reduce(function(t,n){return e[n]&&(t[n]=e[n]),t},Object.create(null))},n.parseOptOut=function(e,t,n){t||(t=n,e.d_optout&&e.d_optout instanceof Array&&(t=e.d_optout.join(",")));var i=parseInt(e.d_ottl,10);return isNaN(i)&&(i=7200),{optOut:t,d_ottl:i}},n.normalizeBoolean=function(e){var t=e;return"true"===e?t=!0:"false"===e&&(t=!1),t}}),H=(V.isObjectEmpty,V.isValueEmpty,V.getIeVersion,V.encodeAndBuildRequest,V.isObject,V.defineGlobalNamespace,V.pluck,V.parseOptOut,V.normalizeBoolean,n),U=T.MESSAGES,B={0:"prefix",1:"orgID",2:"state"},G=function(e,t){this.parse=function(e){try{var t={};return e.data.split("|").forEach(function(e,n){if(void 0!==e){t[B[n]]=2!==n?e:JSON.parse(e)}}),t}catch(e){}},this.isInvalid=function(n){var i=this.parse(n);if(!i||Object.keys(i).length<2)return!0;var r=e!==i.orgID,a=!t||n.origin!==t,o=-1===Object.keys(U).indexOf(i.prefix);return r||a||o},this.send=function(n,i,r){var a=i+"|"+e;r&&r===Object(r)&&(a+="|"+JSON.stringify(r));try{n.postMessage(a,t)}catch(e){}}},Y=T.MESSAGES,q=function(e,t,n,i){function r(e){Object.assign(p,e)}function a(e){Object.assign(p.state,e),Object.assign(p.state.ALLFIELDS,e),p.callbackRegistry.executeAll(p.state)}function o(e){if(!h.isInvalid(e)){m=!1;var t=h.parse(e);p.setStateAndPublish(t.state)}}function s(e){!m&&g&&(m=!0,h.send(i,e))}function c(){r(new L(n._generateID)),p.getMarketingCloudVisitorID(),p.callbackRegistry.executeAll(p.state,!0),C.removeEventListener("message",u)}function u(e){if(!h.isInvalid(e)){var t=h.parse(e);m=!1,C.clearTimeout(p._handshakeTimeout),C.removeEventListener("message",u),r(new N(p)),C.addEventListener("message",o),p.setStateAndPublish(t.state),p.callbackRegistry.hasCallbacks()&&s(Y.GETSTATE)}}function l(){g&&postMessage?(C.addEventListener("message",u),s(Y.HANDSHAKE),p._handshakeTimeout=setTimeout(c,250)):c()}function d(){C.s_c_in||(C.s_c_il=[],C.s_c_in=0),p._c="Visitor",p._il=C.s_c_il,p._in=C.s_c_in,p._il[p._in]=p,C.s_c_in++}function f(){function e(e){0!==e.indexOf("_")&&"function"==typeof n[e]&&(p[e]=function(){})}Object.keys(n).forEach(e),p.getSupplementalDataID=n.getSupplementalDataID,p.isAllowed=function(){return!0}}var p=this,g=t.whitelistParentDomain;p.state={ALLFIELDS:{}},p.version=n.version,p.marketingCloudOrgID=e,p.cookieDomain=n.cookieDomain||"",p._instanceType="child";var m=!1,h=new G(e,g);p.callbackRegistry=H(),p.init=function(){d(),f(),r(new j(p)),l()},p.findField=function(e,t){if(void 0!==p.state[e])return t(p.state[e]),p.state[e]},p.messageParent=s,p.setStateAndPublish=a},W=T.MESSAGES,X=T.ALL_APIS,K=T.ASYNC_API_MAP,J=T.FIELDGROUP_TO_FIELD,z=function(e,t){function n(){var t={};return Object.keys(X).forEach(function(n){var i=X[n],r=e[i]();V.isValueEmpty(r)||(t[n]=r)}),t}function i(){var t=[];return e._loading&&Object.keys(e._loading).forEach(function(n){if(e._loading[n]){var i=J[n];t.push(i)}}),t.length?t:null}function r(t){return function n(r){var a=i();if(a){var o=K[a[0]];e[o](n,!0)}else t()}}function a(e,i){var r=n();t.send(e,i,r)}function o(e){c(e),a(e,W.HANDSHAKE)}function s(e){r(function(){a(e,W.PARENTSTATE)})()}function c(n){function i(i){r.call(e,i),t.send(n,W.PARENTSTATE,{CUSTOMERIDS:e.getCustomerIDs()})}var r=e.setCustomerIDs;e.setCustomerIDs=i}return function(e){if(!t.isInvalid(e)){(t.parse(e).prefix===W.HANDSHAKE?o:s)(e.source)}}},Q=function(e,t){function n(e){return function(n){i[e]=n,r++,r===a&&t(i)}}var i={},r=0,a=Object.keys(e).length;Object.keys(e).forEach(function(t){var i=e[t];if(i.fn){var r=i.args||[];r.unshift(n(t)),i.fn.apply(i.context||null,r)}})},$={get:function(e){e=encodeURIComponent(e);var t=(";"+document.cookie).split(" ").join(";"),n=t.indexOf(";"+e+"="),i=n<0?n:t.indexOf(";",n+1);return n<0?"":decodeURIComponent(t.substring(n+2+e.length,i<0?t.length:i))},set:function(e,t,n){var r=i(n,"cookieLifetime"),a=i(n,"expires"),o=i(n,"domain"),s=i(n,"secure"),c=s?"Secure":"";if(a&&"SESSION"!==r&&"NONE"!==r){var u=""!==t?parseInt(r||0,10):-60;if(u)a=new Date,a.setTime(a.getTime()+1e3*u);else if(1===a){a=new Date;var l=a.getYear();a.setYear(l+2+(l<1900?1900:0))}}else a=0;return e&&"NONE"!==r?(document.cookie=encodeURIComponent(e)+"="+encodeURIComponent(t)+"; path=/;"+(a?" expires="+a.toGMTString()+";":"")+(o?" domain="+o+";":"")+c,this.get(e)===t):0},remove:function(e,t){var n=i(t,"domain");n=n?" domain="+n+";":"",document.cookie=encodeURIComponent(e)+"=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;"+n}},Z=function(e){var t;!e&&C.location&&(e=C.location.hostname),t=e;var n,i=t.split(".");for(n=i.length-2;n>=0;n--)if(t=i.slice(n).join("."),$.set("test","cookie",{domain:t}))return $.remove("test",{domain:t}),t;return""},ee={compare:s,isLessThan:function(e,t){return s(e,t)<0},areVersionsDifferent:function(e,t){return 0!==s(e,t)},isGreaterThan:function(e,t){return s(e,t)>0},isEqual:function(e,t){return 0===s(e,t)}},te=!!C.postMessage,ne={postMessage:function(e,t,n){var i=1;t&&(te?n.postMessage(e,t.replace(/([^:]+:\/\/[^\/]+).*/,"$1")):t&&(n.location=t.replace(/#.*$/,"")+"#"+ +new Date+i+++"&"+e))},receiveMessage:function(e,t){var n;try{te&&(e&&(n=function(n){if("string"==typeof t&&n.origin!==t||"[object Function]"===Object.prototype.toString.call(t)&&!1===t(n.origin))return!1;e(n)}),C.addEventListener?C[e?"addEventListener":"removeEventListener"]("message",n):C[e?"attachEvent":"detachEvent"]("onmessage",n))}catch(e){}}},ie=function(e){var t,n,i="0123456789",r="",a="",o=8,s=10,c=10;if(1==e){for(i+="ABCDEF",t=0;16>t;t++)n=Math.floor(Math.random()*o),r+=i.substring(n,n+1),n=Math.floor(Math.random()*o),a+=i.substring(n,n+1),o=16;return r+"-"+a}for(t=0;19>t;t++)n=Math.floor(Math.random()*s),r+=i.substring(n,n+1),0===t&&9==n?s=3:(1==t||2==t)&&10!=s&&2>n?s=10:2<t&&(s=10),n=Math.floor(Math.random()*c),a+=i.substring(n,n+1),0===t&&9==n?c=3:(1==t||2==t)&&10!=c&&2>n?c=10:2<t&&(c=10);return r+a},re=function(e,t){return{corsMetadata:function(){var e="none",t=!0;return"undefined"!=typeof XMLHttpRequest&&XMLHttpRequest===Object(XMLHttpRequest)&&("withCredentials"in new XMLHttpRequest?e="XMLHttpRequest":"undefined"!=typeof XDomainRequest&&XDomainRequest===Object(XDomainRequest)&&(t=!1),Object.prototype.toString.call(C.HTMLElement).indexOf("Constructor")>0&&(t=!1)),{corsType:e,corsCookiesEnabled:t}}(),getCORSInstance:function(){return"none"===this.corsMetadata.corsType?null:new C[this.corsMetadata.corsType]},fireCORS:function(t,n,i){function r(e){var n;try{if((n=JSON.parse(e))!==Object(n))return void a.handleCORSError(t,null,"Response is not JSON")}catch(e){return void a.handleCORSError(t,e,"Error parsing response as JSON")}try{for(var i=t.callback,r=C,o=0;o<i.length;o++)r=r[i[o]];r(n)}catch(e){a.handleCORSError(t,e,"Error forming callback function")}}var a=this;n&&(t.loadErrorHandler=n);try{var o=this.getCORSInstance();o.open("get",t.corsUrl+"&ts="+(new Date).getTime(),!0),"XMLHttpRequest"===this.corsMetadata.corsType&&(o.withCredentials=!0,o.timeout=e.loadTimeout,o.setRequestHeader("Content-Type","application/x-www-form-urlencoded"),o.onreadystatechange=function(){4===this.readyState&&200===this.status&&r(this.responseText)}),o.onerror=function(e){a.handleCORSError(t,e,"onerror")},o.ontimeout=function(e){a.handleCORSError(t,e,"ontimeout")},o.send(),e._log.requests.push(t.corsUrl)}catch(e){this.handleCORSError(t,e,"try-catch")}},handleCORSError:function(t,n,i){e.CORSErrors.push({corsData:t,error:n,description:i}),t.loadErrorHandler&&("ontimeout"===i?t.loadErrorHandler(!0):t.loadErrorHandler(!1))}}},ae={POST_MESSAGE_ENABLED:!!C.postMessage,DAYS_BETWEEN_SYNC_ID_CALLS:1,MILLIS_PER_DAY:864e5,ADOBE_MC:"adobe_mc",ADOBE_MC_SDID:"adobe_mc_sdid",VALID_VISITOR_ID_REGEX:/^[0-9a-fA-F\-]+$/,ADOBE_MC_TTL_IN_MIN:5,VERSION_REGEX:/vVersion\|((\d+\.)?(\d+\.)?(\*|\d+))(?=$|\|)/,FIRST_PARTY_SERVER_COOKIE:"s_ecid"},oe=function(e,t){var n=C.document;return{THROTTLE_START:3e4,MAX_SYNCS_LENGTH:649,throttleTimerSet:!1,id:null,onPagePixels:[],iframeHost:null,getIframeHost:function(e){if("string"==typeof e){var t=e.split("/");return t[0]+"//"+t[2]}},subdomain:null,url:null,getUrl:function(){var t,i="http://fast.",r="?d_nsid="+e.idSyncContainerID+"#"+encodeURIComponent(n.location.origin);return this.subdomain||(this.subdomain="nosubdomainreturned"),e.loadSSL&&(i=e.idSyncSSLUseAkamai?"https://fast.":"https://"),t=i+this.subdomain+".demdex.net/dest5.html"+r,this.iframeHost=this.getIframeHost(t),this.id="destination_publishing_iframe_"+this.subdomain+"_"+e.idSyncContainerID,t},checkDPIframeSrc:function(){var t="?d_nsid="+e.idSyncContainerID+"#"+encodeURIComponent(n.location.href);"string"==typeof e.dpIframeSrc&&e.dpIframeSrc.length&&(this.id="destination_publishing_iframe_"+(e._subdomain||this.subdomain||(new Date).getTime())+"_"+e.idSyncContainerID,this.iframeHost=this.getIframeHost(e.dpIframeSrc),this.url=e.dpIframeSrc+t)},idCallNotProcesssed:null,doAttachIframe:!1,startedAttachingIframe:!1,iframeHasLoaded:null,iframeIdChanged:null,newIframeCreated:null,originalIframeHasLoadedAlready:null,iframeLoadedCallbacks:[],regionChanged:!1,timesRegionChanged:0,sendingMessages:!1,messages:[],messagesPosted:[],messagesReceived:[],messageSendingInterval:ae.POST_MESSAGE_ENABLED?null:100,onPageDestinationsFired:[],jsonForComparison:[],jsonDuplicates:[],jsonWaiting:[],jsonProcessed:[],canSetThirdPartyCookies:!0,receivedThirdPartyCookiesNotification:!1,readyToAttachIframePreliminary:function(){return!(e.idSyncDisableSyncs||e.disableIdSyncs||e.idSyncDisable3rdPartySyncing||e.disableThirdPartyCookies||e.disableThirdPartyCalls)},readyToAttachIframe:function(){return this.readyToAttachIframePreliminary()&&(this.doAttachIframe||e._doAttachIframe)&&(this.subdomain&&"nosubdomainreturned"!==this.subdomain||e._subdomain)&&this.url&&!this.startedAttachingIframe},attachIframe:function(){function e(){r=n.createElement("iframe"),r.sandbox="allow-scripts allow-same-origin",r.title="Adobe ID Syncing iFrame",r.id=i.id,r.name=i.id+"_name",r.style.cssText="display: none; width: 0; height: 0;",r.src=i.url,i.newIframeCreated=!0,t(),n.body.appendChild(r)}function t(e){r.addEventListener("load",function(){r.className="aamIframeLoaded",i.iframeHasLoaded=!0,i.fireIframeLoadedCallbacks(e),i.requestToProcess()})}this.startedAttachingIframe=!0;var i=this,r=n.getElementById(this.id);r?"IFRAME"!==r.nodeName?(this.id+="_2",this.iframeIdChanged=!0,e()):(this.newIframeCreated=!1,"aamIframeLoaded"!==r.className?(this.originalIframeHasLoadedAlready=!1,t("The destination publishing iframe already exists from a different library, but hadn't loaded yet.")):(this.originalIframeHasLoadedAlready=!0,this.iframeHasLoaded=!0,this.iframe=r,this.fireIframeLoadedCallbacks("The destination publishing iframe already exists from a different library, and had loaded alresady."),this.requestToProcess())):e(),this.iframe=r},fireIframeLoadedCallbacks:function(e){this.iframeLoadedCallbacks.forEach(function(t){"function"==typeof t&&t({message:e||"The destination publishing iframe was attached and loaded successfully."})}),this.iframeLoadedCallbacks=[]},requestToProcess:function(t){function n(){r.jsonForComparison.push(t),r.jsonWaiting.push(t),r.processSyncOnPage(t)}var i,r=this;if(t===Object(t)&&t.ibs)if(i=JSON.stringify(t.ibs||[]),this.jsonForComparison.length){var a,o,s,c=!1;for(a=0,o=this.jsonForComparison.length;a<o;a++)if(s=this.jsonForComparison[a],i===JSON.stringify(s.ibs||[])){c=!0;break}c?this.jsonDuplicates.push(t):n()}else n();if((this.receivedThirdPartyCookiesNotification||!ae.POST_MESSAGE_ENABLED||this.iframeHasLoaded)&&this.jsonWaiting.length){var u=this.jsonWaiting.shift();this.process(u),this.requestToProcess()}e.idSyncDisableSyncs||e.disableIdSyncs||!this.iframeHasLoaded||!this.messages.length||this.sendingMessages||(this.throttleTimerSet||(this.throttleTimerSet=!0,setTimeout(function(){r.messageSendingInterval=ae.POST_MESSAGE_ENABLED?null:150},this.THROTTLE_START)),this.sendingMessages=!0,this.sendMessages())},getRegionAndCheckIfChanged:function(t,n){var i=e._getField("MCAAMLH"),r=t.d_region||t.dcs_region;return i?r&&(e._setFieldExpire("MCAAMLH",n),e._setField("MCAAMLH",r),parseInt(i,10)!==r&&(this.regionChanged=!0,this.timesRegionChanged++,e._setField("MCSYNCSOP",""),e._setField("MCSYNCS",""),i=r)):(i=r)&&(e._setFieldExpire("MCAAMLH",n),e._setField("MCAAMLH",i)),i||(i=""),i},processSyncOnPage:function(e){var t,n,i,r;if((t=e.ibs)&&t instanceof Array&&(n=t.length))for(i=0;i<n;i++)r=t[i],r.syncOnPage&&this.checkFirstPartyCookie(r,"","syncOnPage")},process:function(e){var t,n,i,r,a,o=encodeURIComponent,s=!1;if((t=e.ibs)&&t instanceof Array&&(n=t.length))for(s=!0,i=0;i<n;i++)r=t[i],a=[o("ibs"),o(r.id||""),o(r.tag||""),V.encodeAndBuildRequest(r.url||[],","),o(r.ttl||""),"","",r.fireURLSync?"true":"false"],r.syncOnPage||(this.canSetThirdPartyCookies?this.addMessage(a.join("|")):r.fireURLSync&&this.checkFirstPartyCookie(r,a.join("|")));s&&this.jsonProcessed.push(e)},checkFirstPartyCookie:function(t,n,i){var r="syncOnPage"===i,a=r?"MCSYNCSOP":"MCSYNCS";e._readVisitor();var o,s,c=e._getField(a),u=!1,l=!1,d=Math.ceil((new Date).getTime()/ae.MILLIS_PER_DAY);c?(o=c.split("*"),s=this.pruneSyncData(o,t.id,d),u=s.dataPresent,l=s.dataValid,u&&l||this.fireSync(r,t,n,o,a,d)):(o=[],this.fireSync(r,t,n,o,a,d))},pruneSyncData:function(e,t,n){var i,r,a,o=!1,s=!1;for(r=0;r<e.length;r++)i=e[r],a=parseInt(i.split("-")[1],10),i.match("^"+t+"-")?(o=!0,n<a?s=!0:(e.splice(r,1),r--)):n>=a&&(e.splice(r,1),r--);return{dataPresent:o,dataValid:s}},manageSyncsSize:function(e){if(e.join("*").length>this.MAX_SYNCS_LENGTH)for(e.sort(function(e,t){return parseInt(e.split("-")[1],10)-parseInt(t.split("-")[1],10)});e.join("*").length>this.MAX_SYNCS_LENGTH;)e.shift()},fireSync:function(t,n,i,r,a,o){var s=this;if(t){if("img"===n.tag){var c,u,l,d,f=n.url,p=e.loadSSL?"https:":"http:";for(c=0,u=f.length;c<u;c++){l=f[c],d=/^\/\//.test(l);var g=new Image;g.addEventListener("load",function(t,n,i,r){return function(){s.onPagePixels[t]=null,e._readVisitor();var o,c=e._getField(a),u=[];if(c){o=c.split("*");var l,d,f;for(l=0,d=o.length;l<d;l++)f=o[l],f.match("^"+n.id+"-")||u.push(f)}s.setSyncTrackingData(u,n,i,r)}}(this.onPagePixels.length,n,a,o)),g.src=(d?p:"")+l,this.onPagePixels.push(g)}}}else this.addMessage(i),this.setSyncTrackingData(r,n,a,o)},addMessage:function(t){var n=encodeURIComponent,i=n(e._enableErrorReporting?"---destpub-debug---":"---destpub---");this.messages.push((ae.POST_MESSAGE_ENABLED?"":i)+t)},setSyncTrackingData:function(t,n,i,r){t.push(n.id+"-"+(r+Math.ceil(n.ttl/60/24))),this.manageSyncsSize(t),e._setField(i,t.join("*"))},sendMessages:function(){var e,t=this,n="",i=encodeURIComponent;this.regionChanged&&(n=i("---destpub-clear-dextp---"),this.regionChanged=!1),this.messages.length?ae.POST_MESSAGE_ENABLED?(e=n+i("---destpub-combined---")+this.messages.join("%01"),this.postMessage(e),this.messages=[],this.sendingMessages=!1):(e=this.messages.shift(),this.postMessage(n+e),setTimeout(function(){t.sendMessages()},this.messageSendingInterval)):this.sendingMessages=!1},postMessage:function(e){ne.postMessage(e,this.url,this.iframe.contentWindow),this.messagesPosted.push(e)},receiveMessage:function(e){var t,n=/^---destpub-to-parent---/;"string"==typeof e&&n.test(e)&&(t=e.replace(n,"").split("|"),"canSetThirdPartyCookies"===t[0]&&(this.canSetThirdPartyCookies="true"===t[1],this.receivedThirdPartyCookiesNotification=!0,this.requestToProcess()),this.messagesReceived.push(e))},processIDCallData:function(i){(null==this.url||i.subdomain&&"nosubdomainreturned"===this.subdomain)&&("string"==typeof e._subdomain&&e._subdomain.length?this.subdomain=e._subdomain:this.subdomain=i.subdomain||"",this.url=this.getUrl()),i.ibs instanceof Array&&i.ibs.length&&(this.doAttachIframe=!0),this.readyToAttachIframe()&&(e.idSyncAttachIframeOnWindowLoad?(t.windowLoaded||"complete"===n.readyState||"loaded"===n.readyState)&&this.attachIframe():this.attachIframeASAP()),"function"==typeof e.idSyncIDCallResult?e.idSyncIDCallResult(i):this.requestToProcess(i),"function"==typeof e.idSyncAfterIDCallResult&&e.idSyncAfterIDCallResult(i)},canMakeSyncIDCall:function(t,n){return e._forceSyncIDCall||!t||n-t>ae.DAYS_BETWEEN_SYNC_ID_CALLS},attachIframeASAP:function(){function e(){t.startedAttachingIframe||(n.body?t.attachIframe():setTimeout(e,30))}var t=this;e()}}},se={audienceManagerServer:{},audienceManagerServerSecure:{},cookieDomain:{},cookieLifetime:{},cookieName:{},doesOptInApply:{},disableThirdPartyCalls:{},discardTrackingServerECID:{},idSyncAfterIDCallResult:{},idSyncAttachIframeOnWindowLoad:{},idSyncContainerID:{},idSyncDisable3rdPartySyncing:{},disableThirdPartyCookies:{},idSyncDisableSyncs:{},disableIdSyncs:{},idSyncIDCallResult:{},idSyncSSLUseAkamai:{},isCoopSafe:{},isIabContext:{},isOptInStorageEnabled:{},loadSSL:{},loadTimeout:{},marketingCloudServer:{},marketingCloudServerSecure:{},optInCookieDomain:{},optInStorageExpiry:{},overwriteCrossDomainMCIDAndAID:{},preOptInApprovals:{},previousPermissions:{},resetBeforeVersion:{},sdidParamExpiry:{},serverState:{},sessionCookieName:{},secureCookie:{},takeTimeoutMetrics:{},trackingServer:{},trackingServerSecure:{},whitelistIframeDomains:{},whitelistParentDomain:{}},ce={getConfigNames:function(){return Object.keys(se)},getConfigs:function(){return se},normalizeConfig:function(e){return"function"!=typeof e?e:e()}},ue=function(e){var t={};return e.on=function(e,n,i){if(!n||"function"!=typeof n)throw new Error("[ON] Callback should be a function.");t.hasOwnProperty(e)||(t[e]=[]);var r=t[e].push({callback:n,context:i})-1;return function(){t[e].splice(r,1),t[e].length||delete t[e]}},e.off=function(e,n){t.hasOwnProperty(e)&&(t[e]=t[e].filter(function(e){if(e.callback!==n)return e}))},e.publish=function(e){if(t.hasOwnProperty(e)){var n=[].slice.call(arguments,1);t[e].slice(0).forEach(function(e){e.callback.apply(e.context,n)})}},e.publish},le={PENDING:"pending",CHANGED:"changed",COMPLETE:"complete"},de={AAM:"aam",ADCLOUD:"adcloud",ANALYTICS:"aa",CAMPAIGN:"campaign",ECID:"ecid",LIVEFYRE:"livefyre",TARGET:"target",MEDIA_ANALYTICS:"mediaaa"},fe=(I={},t(I,de.AAM,565),t(I,de.ECID,565),I),pe=(S={},t(S,de.AAM,[1,10]),t(S,de.ECID,[1,10]),S),ge=["videoaa","iabConsentHash"],me=function(e){return Object.keys(e).map(function(t){return e[t]})}(de),he=function(){var e={};return e.callbacks=Object.create(null),e.add=function(t,n){if(!u(n))throw new Error("[callbackRegistryFactory] Make sure callback is a function or an array of functions.");e.callbacks[t]=e.callbacks[t]||[];var i=e.callbacks[t].push(n)-1;return function(){e.callbacks[t].splice(i,1)}},e.execute=function(t,n){if(e.callbacks[t]){n=void 0===n?[]:n,n=n instanceof Array?n:[n];try{for(;e.callbacks[t].length;){var i=e.callbacks[t].shift();"function"==typeof i?i.apply(null,n):i instanceof Array&&i[1].apply(i[0],n)}delete e.callbacks[t]}catch(e){}}},e.executeAll=function(t,n){(n||t&&!c(t))&&Object.keys(e.callbacks).forEach(function(n){var i=void 0!==t[n]?t[n]:"";e.execute(n,i)},e)},e.hasCallbacks=function(){return Boolean(Object.keys(e.callbacks).length)},e},_e=function(){},Ce=function(e){var t=window,n=t.console;return!!n&&"function"==typeof n[e]},Ie=function(e,t,n){return n()?function(){if(Ce(e)){for(var n=arguments.length,i=new Array(n),r=0;r<n;r++)i[r]=arguments[r];console[e].apply(console,[t].concat(i))}}:_e},Se=l,ve=function(){for(var e=[],t=0;t<256;t++){for(var n=t,i=0;i<8;i++)n=1&n?3988292384^n>>>1:n>>>1;e.push(n)}return function(t,n){t=unescape(encodeURIComponent(t)),n||(n=0),n^=-1;for(var i=0;i<t.length;i++){var r=255&(n^t.charCodeAt(i));n=n>>>8^e[r]}return(n^=-1)>>>0}}(),De=new Se("[ADOBE OPT-IN]"),ye=function(t,n){return e(t)===n},Ae=function(e,t){return e instanceof Array?e:ye(e,"string")?[e]:t||[]},be=function(e){var t=Object.keys(e);return!!t.length&&t.every(function(t){return!0===e[t]})},Oe=function(e){var t=arguments.length>1&&void 0!==arguments[1]&&arguments[1];return!(!e||Ee(e))&&Ae(e).every(function(e){return me.indexOf(e)>-1||t&&ge.indexOf(e)>-1})},Me=function(e,t){return e.reduce(function(e,n){return e[n]=t,e},{})},ke=function(e){return JSON.parse(JSON.stringify(e))},Ee=function(e){return"[object Array]"===Object.prototype.toString.call(e)&&!e.length},Te=function(e){if(Re(e))return e;try{return JSON.parse(e)}catch(e){return{}}},Pe=function(e){return void 0===e||(Re(e)?Oe(Object.keys(e),!0):Le(e))},Le=function(e){try{var t=JSON.parse(e);return!!e&&ye(e,"string")&&Oe(Object.keys(t),!0)}catch(e){return!1}},Re=function(e){return null!==e&&ye(e,"object")&&!1===Array.isArray(e)},we=function(){},Fe=function(e){return ye(e,"function")?e():e},Ne=function(e,t){Pe(e)||De.error("".concat(t))},xe=function(e){return Object.keys(e).map(function(t){return e[t]})},je=function(e){return xe(e).filter(function(e,t,n){return n.indexOf(e)===t})},Ve=function(e){return function(){var t=arguments.length>0&&void 0!==arguments[0]?arguments[0]:{},n=t.command,i=t.params,r=void 0===i?{}:i,a=t.callback,o=void 0===a?we:a;if(!n||-1===n.indexOf("."))throw new Error("[OptIn.execute] Please provide a valid command.");try{var s=n.split("."),c=e[s[0]],u=s[1];if(!c||"function"!=typeof c[u])throw new Error("Make sure the plugin and API name exist.");var l=Object.assign(r,{callback:o});c[u].call(c,l)}catch(e){De.error("[execute] Something went wrong: "+e.message)}}};f.prototype=Object.create(Error.prototype),f.prototype.constructor=f;var He="fetchPermissions",Ue="[OptIn#registerPlugin] Plugin is invalid.";p.Categories=de,p.TimeoutError=f;var Be=Object.freeze({OptIn:p,IabPlugin:_}),Ge=function(e,t){e.publishDestinations=function(n){var i=arguments[1],r=arguments[2];try{r="function"==typeof r?r:n.callback}catch(e){r=function(){}}var a=t;if(!a.readyToAttachIframePreliminary())return void r({error:"The destination publishing iframe is disabled in the Visitor library."});if("string"==typeof n){
  if(!n.length)return void r({error:"subdomain is not a populated string."});if(!(i instanceof Array&&i.length))return void r({error:"messages is not a populated array."});var o=!1;if(i.forEach(function(e){"string"==typeof e&&e.length&&(a.addMessage(e),o=!0)}),!o)return void r({error:"None of the messages are populated strings."})}else{if(!V.isObject(n))return void r({error:"Invalid parameters passed."});var s=n;if("string"!=typeof(n=s.subdomain)||!n.length)return void r({error:"config.subdomain is not a populated string."});var c=s.urlDestinations;if(!(c instanceof Array&&c.length))return void r({error:"config.urlDestinations is not a populated array."});var u=[];c.forEach(function(e){V.isObject(e)&&(e.hideReferrer?e.message&&a.addMessage(e.message):u.push(e))});!function e(){u.length&&setTimeout(function(){var t=new Image,n=u.shift();t.src=n.url,a.onPageDestinationsFired.push(n),e()},100)}()}a.iframe?(r({message:"The destination publishing iframe is already attached and loaded."}),a.requestToProcess()):!e.subdomain&&e._getField("MCMID")?(a.subdomain=n,a.doAttachIframe=!0,a.url=a.getUrl(),a.readyToAttachIframe()?(a.iframeLoadedCallbacks.push(function(e){r({message:"Attempted to attach and load the destination publishing iframe through this API call. Result: "+(e.message||"no result")})}),a.attachIframe()):r({error:"Encountered a problem in attempting to attach and load the destination publishing iframe through this API call."})):a.iframeLoadedCallbacks.push(function(e){r({message:"Attempted to attach and load the destination publishing iframe through normal Visitor API processing. Result: "+(e.message||"no result")})})}},Ye=function e(t){function n(e,t){return e>>>t|e<<32-t}for(var i,r,a=Math.pow,o=a(2,32),s="",c=[],u=8*t.length,l=e.h=e.h||[],d=e.k=e.k||[],f=d.length,p={},g=2;f<64;g++)if(!p[g]){for(i=0;i<313;i+=g)p[i]=g;l[f]=a(g,.5)*o|0,d[f++]=a(g,1/3)*o|0}for(t+="Â€";t.length%64-56;)t+="\0";for(i=0;i<t.length;i++){if((r=t.charCodeAt(i))>>8)return;c[i>>2]|=r<<(3-i)%4*8}for(c[c.length]=u/o|0,c[c.length]=u,r=0;r<c.length;){var m=c.slice(r,r+=16),h=l;for(l=l.slice(0,8),i=0;i<64;i++){var _=m[i-15],C=m[i-2],I=l[0],S=l[4],v=l[7]+(n(S,6)^n(S,11)^n(S,25))+(S&l[5]^~S&l[6])+d[i]+(m[i]=i<16?m[i]:m[i-16]+(n(_,7)^n(_,18)^_>>>3)+m[i-7]+(n(C,17)^n(C,19)^C>>>10)|0);l=[v+((n(I,2)^n(I,13)^n(I,22))+(I&l[1]^I&l[2]^l[1]&l[2]))|0].concat(l),l[4]=l[4]+v|0}for(i=0;i<8;i++)l[i]=l[i]+h[i]|0}for(i=0;i<8;i++)for(r=3;r+1;r--){var D=l[i]>>8*r&255;s+=(D<16?0:"")+D.toString(16)}return s},qe=function(e,t){return"SHA-256"!==t&&"SHA256"!==t&&"sha256"!==t&&"sha-256"!==t||(e=Ye(e)),e},We=function(e){return String(e).trim().toLowerCase()},Xe=Be.OptIn;V.defineGlobalNamespace(),window.adobe.OptInCategories=Xe.Categories;var Ke=function(t,n,i){function r(){I._customerIDsHashChanged=!1}function a(e){var t=e;return function(e){var n=e||b.location.href;try{var i=I._extractParamFromUri(n,t);if(i)return B.parsePipeDelimetedKeyValues(i)}catch(e){}}}function o(e){function t(e,t,n){e&&e.match(ae.VALID_VISITOR_ID_REGEX)&&(n===E&&(A=!0),t(e))}t(e[E],I.setMarketingCloudVisitorID,E),I._setFieldExpire(F,-1),t(e[R],I.setAnalyticsVisitorID)}function s(e){e=e||{},I._supplementalDataIDCurrent=e.supplementalDataIDCurrent||"",I._supplementalDataIDCurrentConsumed=e.supplementalDataIDCurrentConsumed||{},I._supplementalDataIDLast=e.supplementalDataIDLast||"",I._supplementalDataIDLastConsumed=e.supplementalDataIDLastConsumed||{}}function c(e){function t(e,t,n){return n=n?n+="|":n,n+=e+"="+encodeURIComponent(t)}function n(e,n){var i=n[0],r=n[1];return null!=r&&r!==N&&(e=t(i,r,e)),e}var i=e.reduce(n,"");return function(e){var t=B.getTimestampInSeconds();return e=e?e+="|":e,e+="TS="+t}(i)}function u(e){var t=e.minutesToLive,n="";return(I.idSyncDisableSyncs||I.disableIdSyncs)&&(n=n||"Error: id syncs have been disabled"),"string"==typeof e.dpid&&e.dpid.length||(n=n||"Error: config.dpid is empty"),"string"==typeof e.url&&e.url.length||(n=n||"Error: config.url is empty"),void 0===t?t=20160:(t=parseInt(t,10),(isNaN(t)||t<=0)&&(n=n||"Error: config.minutesToLive needs to be a positive number")),{error:n,ttl:t}}function l(){return!!I.configs.doesOptInApply&&!(S.optIn.isComplete&&d())}function d(){return I.configs.doesOptInApply&&I.configs.isIabContext?S.optIn.isApproved(S.optIn.Categories.ECID)&&y:S.optIn.isApproved(S.optIn.Categories.ECID)}function f(){[["getMarketingCloudVisitorID"],["setCustomerIDs",void 0],["syncIdentity",void 0],["getAnalyticsVisitorID"],["getAudienceManagerLocationHint"],["getLocationHint"],["getAudienceManagerBlob"]].forEach(function(e){var t=e[0],n=2===e.length?e[1]:"",i=I[t];I[t]=function(e){return d()&&I.isAllowed()?i.apply(I,arguments):("function"==typeof e&&I._callCallback(e,[n]),n)}})}function p(){var e=I._getAudienceManagerURLData(),t=e.url;return I._loadData(k,t,null,e)}function g(e,t){if(y=!0,e)throw new Error("[IAB plugin] : "+e);t&&t.gdprApplies&&(v=t.consentString,D=t.hasConsentChangedSinceLastCmpPull?1:0),p(),_()}function m(e,t){if(y=!0,e)throw new Error("[IAB plugin] : "+e);t.gdprApplies&&(v=t.consentString,D=t.hasConsentChangedSinceLastCmpPull?1:0),I.init(),_()}function h(){S.optIn.isComplete&&(S.optIn.isApproved(S.optIn.Categories.ECID)?I.configs.isIabContext?S.optIn.execute({command:"iabPlugin.fetchConsentData",callback:m}):(I.init(),_()):I.configs.isIabContext?S.optIn.execute({command:"iabPlugin.fetchConsentData",callback:g}):(f(),_()))}function _(){S.optIn.off("complete",h)}if(!i||i.split("").reverse().join("")!==t)throw new Error("Please use `Visitor.getInstance` to instantiate Visitor.");var I=this,S=window.adobe,v="",D=0,y=!1,A=!1;I.version="5.0.1";var b=C,O=b.Visitor;O.version=I.version,O.AuthState=T.AUTH_STATE,O.OptOut=T.OPT_OUT,b.s_c_in||(b.s_c_il=[],b.s_c_in=0),I._c="Visitor",I._il=b.s_c_il,I._in=b.s_c_in,I._il[I._in]=I,b.s_c_in++,I._instanceType="regular",I._log={requests:[]},I.marketingCloudOrgID=t,I.cookieName="AMCV_"+t,I.sessionCookieName="AMCVS_"+t,I.cookieDomain=Z(),I.loadSSL=!0,I.loadTimeout=3e4,I.CORSErrors=[],I.marketingCloudServer=I.audienceManagerServer="dpm.demdex.net",I.sdidParamExpiry=30;var M=null,k="MC",E="MCMID",P="MCIDTS",L="A",R="MCAID",w="AAM",F="MCAAMB",N="NONE",x=function(e){return!Object.prototype[e]},j=re(I);I.FIELDS=T.FIELDS,I.cookieRead=function(e){return $.get(e)},I.cookieWrite=function(e,t,n){var i=I.cookieLifetime?(""+I.cookieLifetime).toUpperCase():"",r=!1;return I.configs&&I.configs.secureCookie&&"https:"===location.protocol&&(r=!0),$.set(e,""+t,{expires:n,domain:I.cookieDomain,cookieLifetime:i,secure:r})},I.resetState=function(e){e?I._mergeServerState(e):s()},I._isAllowedDone=!1,I._isAllowedFlag=!1,I.isAllowed=function(){return I._isAllowedDone||(I._isAllowedDone=!0,(I.cookieRead(I.cookieName)||I.cookieWrite(I.cookieName,"T",1))&&(I._isAllowedFlag=!0)),"T"===I.cookieRead(I.cookieName)&&I._helpers.removeCookie(I.cookieName),I._isAllowedFlag},I.setMarketingCloudVisitorID=function(e){I._setMarketingCloudFields(e)},I._use1stPartyMarketingCloudServer=!1,I.getMarketingCloudVisitorID=function(e,t){I.marketingCloudServer&&I.marketingCloudServer.indexOf(".demdex.net")<0&&(I._use1stPartyMarketingCloudServer=!0);var n=I._getAudienceManagerURLData("_setMarketingCloudFields"),i=n.url;return I._getRemoteField(E,i,e,t,n)};var H=function(e,t){var n={};I.getMarketingCloudVisitorID(function(){t.forEach(function(e){n[e]=I._getField(e,!0)}),-1!==t.indexOf("MCOPTOUT")?I.isOptedOut(function(t){n.MCOPTOUT=t,e(n)},null,!0):e(n)},!0)};I.getVisitorValues=function(e,t){var n={MCMID:{fn:I.getMarketingCloudVisitorID,args:[!0],context:I},MCOPTOUT:{fn:I.isOptedOut,args:[void 0,!0],context:I},MCAID:{fn:I.getAnalyticsVisitorID,args:[!0],context:I},MCAAMLH:{fn:I.getAudienceManagerLocationHint,args:[!0],context:I},MCAAMB:{fn:I.getAudienceManagerBlob,args:[!0],context:I}},i=t&&t.length?V.pluck(n,t):n;t&&-1===t.indexOf("MCAID")?H(e,t):Q(i,e)},I._currentCustomerIDs={},I._customerIDsHashChanged=!1,I._newCustomerIDsHash="",I.setCustomerIDs=function(t,n){if(!I.isOptedOut()&&t){if(!V.isObject(t)||V.isObjectEmpty(t))return!1;I._readVisitor();var i,a,o,s;for(i in t)if(x(i)&&(I._currentCustomerIDs.dataSources=I._currentCustomerIDs.dataSources||{},a=t[i],n=a.hasOwnProperty("hashType")?a.hashType:n,a))if("object"===e(a)){var c={};if(a.id){if(n){if(!(s=qe(We(a.id),n)))return;a.id=s,c.hashType=n}c.id=a.id}void 0!=a.authState&&(c.authState=a.authState),I._currentCustomerIDs.dataSources[i]=c}else if(n){if(!(s=qe(We(a),n)))return;I._currentCustomerIDs.dataSources[i]={id:s,hashType:n}}else I._currentCustomerIDs.dataSources[i]={id:a};var u=I.getCustomerIDs(!0),l=I._getField("MCCIDH"),d="";l||(l=0);for(o in u){var f=u[o];if(!V.isObjectEmpty(f))for(i in f)x(i)&&(a=f[i],d+=(d?"|":"")+i+"|"+(a.id?a.id:"")+(a.authState?a.authState:""))}I._newCustomerIDsHash=String(I._hash(d)),I._newCustomerIDsHash!==l&&(I._customerIDsHashChanged=!0,I._mapCustomerIDs(r))}},I.syncIdentity=function(t,n){if(!I.isOptedOut()&&t){if(!V.isObject(t)||V.isObjectEmpty(t))return!1;I._readVisitor();var i,a,o,s,c;for(i in t)if(x(i)&&(I._currentCustomerIDs.nameSpaces=I._currentCustomerIDs.nameSpaces||{},a=t[i],n=a.hasOwnProperty("hashType")?a.hashType:n,a&&"object"===e(a))){var u={};if(a.id){if(n){if(!(o=qe(We(a.id),n)))return;a.id=o,u.hashType=n}u.id=a.id}void 0!=a.authState&&(u.authState=a.authState),a.dataSource&&(I._currentCustomerIDs.dataSources=I._currentCustomerIDs.dataSources||{},s=a.dataSource,I._currentCustomerIDs.dataSources[s]=u),I._currentCustomerIDs.nameSpaces[i]=u}var l=I.getCustomerIDs(!0),d=I._getField("MCCIDH"),f="";d||(d="0");for(c in l){var p=l[c];if(!V.isObjectEmpty(p))for(i in p)x(i)&&(a=p[i],f+=(f?"|":"")+i+"|"+(a.id?a.id:"")+(a.authState?a.authState:""))}I._newCustomerIDsHash=String(I._hash(f)),I._newCustomerIDsHash!==d&&(I._customerIDsHashChanged=!0,I._mapCustomerIDs(r))}},I.getCustomerIDs=function(e){I._readVisitor();var t,n,i={dataSources:{},nameSpaces:{}},r=I._currentCustomerIDs.dataSources;for(t in r)x(t)&&(n=r[t],n.id&&(i.dataSources[t]||(i.dataSources[t]={}),i.dataSources[t].id=n.id,void 0!=n.authState?i.dataSources[t].authState=n.authState:i.dataSources[t].authState=O.AuthState.UNKNOWN,n.hashType&&(i.dataSources[t].hashType=n.hashType)));var a=I._currentCustomerIDs.nameSpaces;for(t in a)x(t)&&(n=a[t],n.id&&(i.nameSpaces[t]||(i.nameSpaces[t]={}),i.nameSpaces[t].id=n.id,void 0!=n.authState?i.nameSpaces[t].authState=n.authState:i.nameSpaces[t].authState=O.AuthState.UNKNOWN,n.hashType&&(i.nameSpaces[t].hashType=n.hashType)));return e?i:i.dataSources},I.setAnalyticsVisitorID=function(e){I._setAnalyticsFields(e)},I.getAnalyticsVisitorID=function(e,t,n){if(!B.isTrackingServerPopulated()&&!n)return I._callCallback(e,[""]),"";var i="";if(n||(i=I.getMarketingCloudVisitorID(function(t){I.getAnalyticsVisitorID(e,!0)})),i||n){var r=n?I.marketingCloudServer:I.trackingServer,a="";I.loadSSL&&(n?I.marketingCloudServerSecure&&(r=I.marketingCloudServerSecure):I.trackingServerSecure&&(r=I.trackingServerSecure));var o={};if(r){var s="http"+(I.loadSSL?"s":"")+"://"+r+"/id",c="d_visid_ver="+I.version+"&mcorgid="+encodeURIComponent(I.marketingCloudOrgID)+(i?"&mid="+encodeURIComponent(i):"")+(I.idSyncDisable3rdPartySyncing||I.disableThirdPartyCookies?"&d_coppa=true":""),u=["s_c_il",I._in,"_set"+(n?"MarketingCloud":"Analytics")+"Fields"];a=s+"?"+c+"&callback=s_c_il%5B"+I._in+"%5D._set"+(n?"MarketingCloud":"Analytics")+"Fields",o.corsUrl=s+"?"+c,o.callback=u}return o.url=a,I._getRemoteField(n?E:R,a,e,t,o)}return""},I.getAudienceManagerLocationHint=function(e,t){if(I.getMarketingCloudVisitorID(function(t){I.getAudienceManagerLocationHint(e,!0)})){var n=I._getField(R);if(!n&&B.isTrackingServerPopulated()&&(n=I.getAnalyticsVisitorID(function(t){I.getAudienceManagerLocationHint(e,!0)})),n||!B.isTrackingServerPopulated()){var i=I._getAudienceManagerURLData(),r=i.url;return I._getRemoteField("MCAAMLH",r,e,t,i)}}return""},I.getLocationHint=I.getAudienceManagerLocationHint,I.getAudienceManagerBlob=function(e,t){if(I.getMarketingCloudVisitorID(function(t){I.getAudienceManagerBlob(e,!0)})){var n=I._getField(R);if(!n&&B.isTrackingServerPopulated()&&(n=I.getAnalyticsVisitorID(function(t){I.getAudienceManagerBlob(e,!0)})),n||!B.isTrackingServerPopulated()){var i=I._getAudienceManagerURLData(),r=i.url;return I._customerIDsHashChanged&&I._setFieldExpire(F,-1),I._getRemoteField(F,r,e,t,i)}}return""},I._supplementalDataIDCurrent="",I._supplementalDataIDCurrentConsumed={},I._supplementalDataIDLast="",I._supplementalDataIDLastConsumed={},I.getSupplementalDataID=function(e,t){I._supplementalDataIDCurrent||t||(I._supplementalDataIDCurrent=I._generateID(1));var n=I._supplementalDataIDCurrent;return I._supplementalDataIDLast&&!I._supplementalDataIDLastConsumed[e]?(n=I._supplementalDataIDLast,I._supplementalDataIDLastConsumed[e]=!0):n&&(I._supplementalDataIDCurrentConsumed[e]&&(I._supplementalDataIDLast=I._supplementalDataIDCurrent,I._supplementalDataIDLastConsumed=I._supplementalDataIDCurrentConsumed,I._supplementalDataIDCurrent=n=t?"":I._generateID(1),I._supplementalDataIDCurrentConsumed={}),n&&(I._supplementalDataIDCurrentConsumed[e]=!0)),n};var U=!1;I._liberatedOptOut=null,I.getOptOut=function(e,t){var n=I._getAudienceManagerURLData("_setMarketingCloudFields"),i=n.url;if(d())return I._getRemoteField("MCOPTOUT",i,e,t,n);if(I._registerCallback("liberatedOptOut",e),null!==I._liberatedOptOut)return I._callAllCallbacks("liberatedOptOut",[I._liberatedOptOut]),U=!1,I._liberatedOptOut;if(U)return null;U=!0;var r="liberatedGetOptOut";return n.corsUrl=n.corsUrl.replace(/\.demdex\.net\/id\?/,".demdex.net/optOutStatus?"),n.callback=[r],C[r]=function(e){if(e===Object(e)){var t,n,i=V.parseOptOut(e,t,N);t=i.optOut,n=1e3*i.d_ottl,I._liberatedOptOut=t,setTimeout(function(){I._liberatedOptOut=null},n)}I._callAllCallbacks("liberatedOptOut",[t]),U=!1},j.fireCORS(n),null},I.isOptedOut=function(e,t,n){t||(t=O.OptOut.GLOBAL);var i=I.getOptOut(function(n){var i=n===O.OptOut.GLOBAL||n.indexOf(t)>=0;I._callCallback(e,[i])},n);return i?i===O.OptOut.GLOBAL||i.indexOf(t)>=0:null},I._fields=null,I._fieldsExpired=null,I._hash=function(e){var t,n,i=0;if(e)for(t=0;t<e.length;t++)n=e.charCodeAt(t),i=(i<<5)-i+n,i&=i;return i},I._generateID=ie,I._generateLocalMID=function(){var e=I._generateID(0);return q.isClientSideMarketingCloudVisitorID=!0,e},I._callbackList=null,I._callCallback=function(e,t){try{"function"==typeof e?e.apply(b,t):e[1].apply(e[0],t)}catch(e){}},I._registerCallback=function(e,t){t&&(null==I._callbackList&&(I._callbackList={}),void 0==I._callbackList[e]&&(I._callbackList[e]=[]),I._callbackList[e].push(t))},I._callAllCallbacks=function(e,t){if(null!=I._callbackList){var n=I._callbackList[e];if(n)for(;n.length>0;)I._callCallback(n.shift(),t)}},I._addQuerystringParam=function(e,t,n,i){var r=encodeURIComponent(t)+"="+encodeURIComponent(n),a=B.parseHash(e),o=B.hashlessUrl(e);if(-1===o.indexOf("?"))return o+"?"+r+a;var s=o.split("?"),c=s[0]+"?",u=s[1];return c+B.addQueryParamAtLocation(u,r,i)+a},I._extractParamFromUri=function(e,t){var n=new RegExp("[\\?&#]"+t+"=([^&#]*)"),i=n.exec(e);if(i&&i.length)return decodeURIComponent(i[1])},I._parseAdobeMcFromUrl=a(ae.ADOBE_MC),I._parseAdobeMcSdidFromUrl=a(ae.ADOBE_MC_SDID),I._attemptToPopulateSdidFromUrl=function(e){var n=I._parseAdobeMcSdidFromUrl(e),i=1e9;n&&n.TS&&(i=B.getTimestampInSeconds()-n.TS),n&&n.SDID&&n.MCORGID===t&&i<I.sdidParamExpiry&&(I._supplementalDataIDCurrent=n.SDID,I._supplementalDataIDCurrentConsumed.SDID_URL_PARAM=!0)},I._attemptToPopulateIdsFromUrl=function(){var e=I._parseAdobeMcFromUrl();if(e&&e.TS){var n=B.getTimestampInSeconds(),i=n-e.TS;if(Math.floor(i/60)>ae.ADOBE_MC_TTL_IN_MIN||e.MCORGID!==t)return;o(e)}},I._mergeServerState=function(e){if(e)try{if(e=function(e){return B.isObject(e)?e:JSON.parse(e)}(e),e[I.marketingCloudOrgID]){var t=e[I.marketingCloudOrgID];!function(e){B.isObject(e)&&I.setCustomerIDs(e)}(t.customerIDs),s(t.sdid)}}catch(e){throw new Error("`serverState` has an invalid format.")}},I._timeout=null,I._loadData=function(e,t,n,i){t=I._addQuerystringParam(t,"d_fieldgroup",e,1),i.url=I._addQuerystringParam(i.url,"d_fieldgroup",e,1),i.corsUrl=I._addQuerystringParam(i.corsUrl,"d_fieldgroup",e,1),q.fieldGroupObj[e]=!0,i===Object(i)&&i.corsUrl&&"XMLHttpRequest"===j.corsMetadata.corsType&&j.fireCORS(i,n,e)},I._clearTimeout=function(e){null!=I._timeout&&I._timeout[e]&&(clearTimeout(I._timeout[e]),I._timeout[e]=0)},I._settingsDigest=0,I._getSettingsDigest=function(){if(!I._settingsDigest){var e=I.version;I.audienceManagerServer&&(e+="|"+I.audienceManagerServer),I.audienceManagerServerSecure&&(e+="|"+I.audienceManagerServerSecure),I._settingsDigest=I._hash(e)}return I._settingsDigest},I._readVisitorDone=!1,I._readVisitor=function(){if(!I._readVisitorDone){I._readVisitorDone=!0;var e,t,n,i,r,a,o=I._getSettingsDigest(),s=!1,c=I.cookieRead(I.cookieName),u=new Date;if(c||A||I.discardTrackingServerECID||(c=I.cookieRead(ae.FIRST_PARTY_SERVER_COOKIE)),null==I._fields&&(I._fields={}),c&&"T"!==c)for(c=c.split("|"),c[0].match(/^[\-0-9]+$/)&&(parseInt(c[0],10)!==o&&(s=!0),c.shift()),c.length%2==1&&c.pop(),e=0;e<c.length;e+=2)t=c[e].split("-"),n=t[0],i=c[e+1],t.length>1?(r=parseInt(t[1],10),a=t[1].indexOf("s")>0):(r=0,a=!1),s&&("MCCIDH"===n&&(i=""),r>0&&(r=u.getTime()/1e3-60)),n&&i&&(I._setField(n,i,1),r>0&&(I._fields["expire"+n]=r+(a?"s":""),(u.getTime()>=1e3*r||a&&!I.cookieRead(I.sessionCookieName))&&(I._fieldsExpired||(I._fieldsExpired={}),I._fieldsExpired[n]=!0)));!I._getField(R)&&B.isTrackingServerPopulated()&&(c=I.cookieRead("s_vi"))&&(c=c.split("|"),c.length>1&&c[0].indexOf("v1")>=0&&(i=c[1],e=i.indexOf("["),e>=0&&(i=i.substring(0,e)),i&&i.match(ae.VALID_VISITOR_ID_REGEX)&&I._setField(R,i)))}},I._appendVersionTo=function(e){var t="vVersion|"+I.version,n=e?I._getCookieVersion(e):null;return n?ee.areVersionsDifferent(n,I.version)&&(e=e.replace(ae.VERSION_REGEX,t)):e+=(e?"|":"")+t,e},I._writeVisitor=function(){var e,t,n=I._getSettingsDigest();for(e in I._fields)x(e)&&I._fields[e]&&"expire"!==e.substring(0,6)&&(t=I._fields[e],n+=(n?"|":"")+e+(I._fields["expire"+e]?"-"+I._fields["expire"+e]:"")+"|"+t);n=I._appendVersionTo(n),I.cookieWrite(I.cookieName,n,1)},I._getField=function(e,t){return null==I._fields||!t&&I._fieldsExpired&&I._fieldsExpired[e]?null:I._fields[e]},I._setField=function(e,t,n){null==I._fields&&(I._fields={}),I._fields[e]=t,n||I._writeVisitor()},I._getFieldList=function(e,t){var n=I._getField(e,t);return n?n.split("*"):null},I._setFieldList=function(e,t,n){I._setField(e,t?t.join("*"):"",n)},I._getFieldMap=function(e,t){var n=I._getFieldList(e,t);if(n){var i,r={};for(i=0;i<n.length;i+=2)r[n[i]]=n[i+1];return r}return null},I._setFieldMap=function(e,t,n){var i,r=null;if(t){r=[];for(i in t)x(i)&&(r.push(i),r.push(t[i]))}I._setFieldList(e,r,n)},I._setFieldExpire=function(e,t,n){var i=new Date;i.setTime(i.getTime()+1e3*t),null==I._fields&&(I._fields={}),I._fields["expire"+e]=Math.floor(i.getTime()/1e3)+(n?"s":""),t<0?(I._fieldsExpired||(I._fieldsExpired={}),I._fieldsExpired[e]=!0):I._fieldsExpired&&(I._fieldsExpired[e]=!1),n&&(I.cookieRead(I.sessionCookieName)||I.cookieWrite(I.sessionCookieName,"1"))},I._findVisitorID=function(t){return t&&("object"===e(t)&&(t=t.d_mid?t.d_mid:t.visitorID?t.visitorID:t.id?t.id:t.uuid?t.uuid:""+t),t&&"NOTARGET"===(t=t.toUpperCase())&&(t=N),t&&(t===N||t.match(ae.VALID_VISITOR_ID_REGEX))||(t="")),t},I._setFields=function(t,n){if(I._clearTimeout(t),null!=I._loading&&(I._loading[t]=!1),q.fieldGroupObj[t]&&q.setState(t,!1),t===k){!0!==q.isClientSideMarketingCloudVisitorID&&(q.isClientSideMarketingCloudVisitorID=!1);var i=I._getField(E);if(!i||I.overwriteCrossDomainMCIDAndAID){if(!(i="object"===e(n)&&n.mid?n.mid:I._findVisitorID(n))){if(I._use1stPartyMarketingCloudServer&&!I.tried1stPartyMarketingCloudServer)return I.tried1stPartyMarketingCloudServer=!0,void I.getAnalyticsVisitorID(null,!1,!0);i=I._generateLocalMID()}I._setField(E,i)}i&&i!==N||(i=""),"object"===e(n)&&((n.d_region||n.dcs_region||n.d_blob||n.blob)&&I._setFields(w,n),I._use1stPartyMarketingCloudServer&&n.mid&&I._setFields(L,{id:n.id})),I._callAllCallbacks(E,[i])}if(t===w&&"object"===e(n)){var r=604800;void 0!=n.id_sync_ttl&&n.id_sync_ttl&&(r=parseInt(n.id_sync_ttl,10));var a=Y.getRegionAndCheckIfChanged(n,r);I._callAllCallbacks("MCAAMLH",[a]);var o=I._getField(F);(n.d_blob||n.blob)&&(o=n.d_blob,o||(o=n.blob),I._setFieldExpire(F,r),I._setField(F,o)),o||(o=""),I._callAllCallbacks(F,[o]),!n.error_msg&&I._newCustomerIDsHash&&I._setField("MCCIDH",I._newCustomerIDsHash)}if(t===L){var s=I._getField(R);s&&!I.overwriteCrossDomainMCIDAndAID||(s=I._findVisitorID(n),s?s!==N&&I._setFieldExpire(F,-1):s=N,I._setField(R,s)),s&&s!==N||(s=""),I._callAllCallbacks(R,[s])}if(I.idSyncDisableSyncs||I.disableIdSyncs)Y.idCallNotProcesssed=!0;else{Y.idCallNotProcesssed=!1;var c={};c.ibs=n.ibs,c.subdomain=n.subdomain,Y.processIDCallData(c)}if(n===Object(n)){var u,l;d()&&I.isAllowed()&&(u=I._getField("MCOPTOUT"));var f=V.parseOptOut(n,u,N);u=f.optOut,l=f.d_ottl,I._setFieldExpire("MCOPTOUT",l,!0),I._setField("MCOPTOUT",u),I._callAllCallbacks("MCOPTOUT",[u])}},I._loading=null,I._getRemoteField=function(e,t,n,i,r){var a,o="",s=B.isFirstPartyAnalyticsVisitorIDCall(e),c={MCAAMLH:!0,MCAAMB:!0};if(d()&&I.isAllowed()){I._readVisitor(),o=I._getField(e,!0===c[e]);if(function(){return(!o||I._fieldsExpired&&I._fieldsExpired[e])&&(!I.disableThirdPartyCalls||s)}()){if(e===E||"MCOPTOUT"===e?a=k:"MCAAMLH"===e||e===F?a=w:e===R&&(a=L),a)return!t||null!=I._loading&&I._loading[a]||(null==I._loading&&(I._loading={}),I._loading[a]=!0,a===w&&(D=0),I._loadData(a,t,function(t){if(!I._getField(e)){t&&q.setState(a,!0);var n="";e===E?n=I._generateLocalMID():a===w&&(n={error_msg:"timeout"}),I._setFields(a,n)}},r)),I._registerCallback(e,n),o||(t||I._setFields(a,{id:N}),"")}else o||(e===E?(I._registerCallback(e,n),o=I._generateLocalMID(),I.setMarketingCloudVisitorID(o)):e===R?(I._registerCallback(e,n),o="",I.setAnalyticsVisitorID(o)):(o="",i=!0))}return e!==E&&e!==R||o!==N||(o="",i=!0),n&&i&&I._callCallback(n,[o]),o},I._setMarketingCloudFields=function(e){I._readVisitor(),I._setFields(k,e)},I._mapCustomerIDs=function(e){I.getAudienceManagerBlob(e,!0)},I._setAnalyticsFields=function(e){I._readVisitor(),I._setFields(L,e)},I._setAudienceManagerFields=function(e){I._readVisitor(),I._setFields(w,e)},I._getAudienceManagerURLData=function(e){var t=I.audienceManagerServer,n="",i=I._getField(E),r=I._getField(F,!0),a=I._getField(R),o=a&&a!==N?"&d_cid_ic=AVID%01"+encodeURIComponent(a):"";if(I.loadSSL&&I.audienceManagerServerSecure&&(t=I.audienceManagerServerSecure),t){var s,c,u,l=I.getCustomerIDs(!0);if(l)for(c in l){var d=l[c];if(!V.isObjectEmpty(d)){var f="nameSpaces"===c?"&d_cid_ns=":"&d_cid_ic=";for(s in d)x(s)&&(u=d[s],o+=f+encodeURIComponent(s)+"%01"+encodeURIComponent(u.id?u.id:"")+(u.authState?"%01"+u.authState:""))}}e||(e="_setAudienceManagerFields");var p="http"+(I.loadSSL?"s":"")+"://"+t+"/id",g="d_visid_ver="+I.version+(v&&-1!==p.indexOf("demdex.net")?"&gdpr=1&gdpr_consent="+v:"")+(D&&-1!==p.indexOf("demdex.net")?"&d_cf="+D:"")+"&d_rtbd=json&d_ver=2"+(!i&&I._use1stPartyMarketingCloudServer?"&d_verify=1":"")+"&d_orgid="+encodeURIComponent(I.marketingCloudOrgID)+"&d_nsid="+(I.idSyncContainerID||0)+(i?"&d_mid="+encodeURIComponent(i):"")+(I.idSyncDisable3rdPartySyncing||I.disableThirdPartyCookies?"&d_coppa=true":"")+(!0===M?"&d_coop_safe=1":!1===M?"&d_coop_unsafe=1":"")+(r?"&d_blob="+encodeURIComponent(r):"")+o,m=["s_c_il",I._in,e];return n=p+"?"+g+"&d_cb=s_c_il%5B"+I._in+"%5D."+e,{url:n,corsUrl:p+"?"+g,callback:m}}return{url:n}},I.appendVisitorIDsTo=function(e){try{var t=[[E,I._getField(E)],[R,I._getField(R)],["MCORGID",I.marketingCloudOrgID]];return I._addQuerystringParam(e,ae.ADOBE_MC,c(t))}catch(t){return e}},I.appendSupplementalDataIDTo=function(e,t){if(!(t=t||I.getSupplementalDataID(B.generateRandomString(),!0)))return e;try{var n=c([["SDID",t],["MCORGID",I.marketingCloudOrgID]]);return I._addQuerystringParam(e,ae.ADOBE_MC_SDID,n)}catch(t){return e}};var B={parseHash:function(e){var t=e.indexOf("#");return t>0?e.substr(t):""},hashlessUrl:function(e){var t=e.indexOf("#");return t>0?e.substr(0,t):e},addQueryParamAtLocation:function(e,t,n){var i=e.split("&");return n=null!=n?n:i.length,i.splice(n,0,t),i.join("&")},isFirstPartyAnalyticsVisitorIDCall:function(e,t,n){if(e!==R)return!1;var i;return t||(t=I.trackingServer),n||(n=I.trackingServerSecure),!("string"!=typeof(i=I.loadSSL?n:t)||!i.length)&&(i.indexOf("2o7.net")<0&&i.indexOf("omtrdc.net")<0)},isObject:function(e){return Boolean(e&&e===Object(e))},removeCookie:function(e){$.remove(e,{domain:I.cookieDomain})},isTrackingServerPopulated:function(){return!!I.trackingServer||!!I.trackingServerSecure},getTimestampInSeconds:function(){return Math.round((new Date).getTime()/1e3)},parsePipeDelimetedKeyValues:function(e){return e.split("|").reduce(function(e,t){var n=t.split("=");return e[n[0]]=decodeURIComponent(n[1]),e},{})},generateRandomString:function(e){e=e||5;for(var t="",n="abcdefghijklmnopqrstuvwxyz0123456789";e--;)t+=n[Math.floor(Math.random()*n.length)];return t},normalizeBoolean:function(e){return"true"===e||"false"!==e&&e},parseBoolean:function(e){return"true"===e||"false"!==e&&null},replaceMethodsWithFunction:function(e,t){for(var n in e)e.hasOwnProperty(n)&&"function"==typeof e[n]&&(e[n]=t);return e}};I._helpers=B;var Y=oe(I,O);I._destinationPublishing=Y,I.timeoutMetricsLog=[];var q={isClientSideMarketingCloudVisitorID:null,MCIDCallTimedOut:null,AnalyticsIDCallTimedOut:null,AAMIDCallTimedOut:null,fieldGroupObj:{},setState:function(e,t){switch(e){case k:!1===t?!0!==this.MCIDCallTimedOut&&(this.MCIDCallTimedOut=!1):this.MCIDCallTimedOut=t;break;case L:!1===t?!0!==this.AnalyticsIDCallTimedOut&&(this.AnalyticsIDCallTimedOut=!1):this.AnalyticsIDCallTimedOut=t;break;case w:!1===t?!0!==this.AAMIDCallTimedOut&&(this.AAMIDCallTimedOut=!1):this.AAMIDCallTimedOut=t}}};I.isClientSideMarketingCloudVisitorID=function(){return q.isClientSideMarketingCloudVisitorID},I.MCIDCallTimedOut=function(){return q.MCIDCallTimedOut},I.AnalyticsIDCallTimedOut=function(){return q.AnalyticsIDCallTimedOut},I.AAMIDCallTimedOut=function(){return q.AAMIDCallTimedOut},I.idSyncGetOnPageSyncInfo=function(){return I._readVisitor(),I._getField("MCSYNCSOP")},I.idSyncByURL=function(e){if(!I.isOptedOut()){var t=u(e||{});if(t.error)return t.error;var n,i,r=e.url,a=encodeURIComponent,o=Y;return r=r.replace(/^https:/,"").replace(/^http:/,""),n=V.encodeAndBuildRequest(["",e.dpid,e.dpuuid||""],","),i=["ibs",a(e.dpid),"img",a(r),t.ttl,"",n],o.addMessage(i.join("|")),o.requestToProcess(),"Successfully queued"}},I.idSyncByDataSource=function(e){if(!I.isOptedOut())return e===Object(e)&&"string"==typeof e.dpuuid&&e.dpuuid.length?(e.url="//dpm.demdex.net/ibs:dpid="+e.dpid+"&dpuuid="+e.dpuuid,I.idSyncByURL(e)):"Error: config or config.dpuuid is empty"},Ge(I,Y),I._getCookieVersion=function(e){e=e||I.cookieRead(I.cookieName);var t=ae.VERSION_REGEX.exec(e);return t&&t.length>1?t[1]:null},I._resetAmcvCookie=function(e){var t=I._getCookieVersion();t&&!ee.isLessThan(t,e)||B.removeCookie(I.cookieName)},I.setAsCoopSafe=function(){M=!0},I.setAsCoopUnsafe=function(){M=!1},function(){if(I.configs=Object.create(null),B.isObject(n))for(var e in n)x(e)&&(I[e]=n[e],I.configs[e]=n[e])}(),f();var W;I.init=function(){l()&&(S.optIn.fetchPermissions(h,!0),!S.optIn.isApproved(S.optIn.Categories.ECID))||W||(W=!0,function(){if(B.isObject(n)){I.idSyncContainerID=I.idSyncContainerID||0,M="boolean"==typeof I.isCoopSafe?I.isCoopSafe:B.parseBoolean(I.isCoopSafe),I.resetBeforeVersion&&I._resetAmcvCookie(I.resetBeforeVersion),I._attemptToPopulateIdsFromUrl(),I._attemptToPopulateSdidFromUrl(),I._readVisitor();var e=I._getField(P),t=Math.ceil((new Date).getTime()/ae.MILLIS_PER_DAY);I.idSyncDisableSyncs||I.disableIdSyncs||!Y.canMakeSyncIDCall(e,t)||(I._setFieldExpire(F,-1),I._setField(P,t)),I.getMarketingCloudVisitorID(),I.getAudienceManagerLocationHint(),I.getAudienceManagerBlob(),I._mergeServerState(I.serverState)}else I._attemptToPopulateIdsFromUrl(),I._attemptToPopulateSdidFromUrl()}(),function(){if(!I.idSyncDisableSyncs&&!I.disableIdSyncs){Y.checkDPIframeSrc();var e=function(){var e=Y;e.readyToAttachIframe()&&e.attachIframe()};b.addEventListener("load",function(){O.windowLoaded=!0,e()});try{ne.receiveMessage(function(e){Y.receiveMessage(e.data)},Y.iframeHost)}catch(e){}}}(),function(){I.whitelistIframeDomains&&ae.POST_MESSAGE_ENABLED&&(I.whitelistIframeDomains=I.whitelistIframeDomains instanceof Array?I.whitelistIframeDomains:[I.whitelistIframeDomains],I.whitelistIframeDomains.forEach(function(e){var n=new G(t,e),i=z(I,n);ne.receiveMessage(i,e)}))}())}};Ke.config=ce,C.Visitor=Ke;var Je=Ke,ze=function(e){if(V.isObject(e))return Object.keys(e).filter(function(t){return""!==e[t]}).reduce(function(t,n){var i=ce.normalizeConfig(e[n]),r=V.normalizeBoolean(i);return t[n]=r,t},Object.create(null))},Qe=Be.OptIn,$e=Be.IabPlugin;return Je.getInstance=function(e,t){if(!e)throw new Error("Visitor requires Adobe Marketing Cloud Org ID.");e.indexOf("@")<0&&(e+="@AdobeOrg");var n=function(){var t=C.s_c_il;if(t)for(var n=0;n<t.length;n++){var i=t[n];if(i&&"Visitor"===i._c&&i.marketingCloudOrgID===e)return i}}();if(n)return n;var i=ze(t);!function(e){C.adobe.optIn=C.adobe.optIn||function(){var t=V.pluck(e,["doesOptInApply","previousPermissions","preOptInApprovals","isOptInStorageEnabled","optInStorageExpiry","isIabContext"]),n=e.optInCookieDomain||e.cookieDomain;n=n||Z(),n=n===window.location.hostname?"":n,t.optInCookieDomain=n;var i=new Qe(t,{cookies:$});if(t.isIabContext&&t.doesOptInApply){var r=new $e;i.registerPlugin(r)}return i}()}(i||{});var r=e,a=r.split("").reverse().join(""),o=new Je(e,null,a);V.isObject(i)&&i.cookieDomain&&(o.cookieDomain=i.cookieDomain),function(){C.s_c_il.splice(--C.s_c_in,1)}();var s=V.getIeVersion();if("number"==typeof s&&s<10)return o._helpers.replaceMethodsWithFunction(o,function(){});var c=function(){try{return C.self!==C.parent}catch(e){return!0}}()&&!function(e){return e.cookieWrite("TEST_AMCV_COOKIE","T",1),"T"===e.cookieRead("TEST_AMCV_COOKIE")&&(e._helpers.removeCookie("TEST_AMCV_COOKIE"),!0)}(o)&&C.parent?new q(e,i,o,C.parent):new Je(e,i,a);return o=null,c.init(),c},function(){function e(){Je.windowLoaded=!0}C.addEventListener?C.addEventListener("load",e):C.attachEvent&&C.attachEvent("onload",e),Je.codeLoadEnd=(new Date).getTime()}(),Je}();
	return Visitor;
  }();
  
			}
  
		  },
		  "adobe-mcid/src/view/utils/timeUnits.js": {
			"script": function(module, exports, require, turbine) {
  /*************************************************************************
  * ADOBE CONFIDENTIAL
  * ___________________
  *
  *  Copyright 2018 Adobe Systems Incorporated
  *  All Rights Reserved.
  *
  * NOTICE:  All information contained herein is, and remains
  * the property of Adobe Systems Incorporated and its suppliers,
  * if any.  The intellectual and technical concepts contained
  * herein are proprietary to Adobe Systems Incorporated and its
  * suppliers and are protected by all applicable intellectual property
  * laws, including trade secret and copyright laws.
  * Dissemination of this information or reproduction of this material
  * is strictly forbidden unless prior written permission is obtained
  * from Adobe Systems Incorporated.
  **************************************************************************/
  
  var timeUnits = {
	Hours: 3600,
	Days: 24 * 3600,
	Weeks: 7 * 24 * 3600,
	Months: 30 * 24 * 3600,
	Years: 365 * 24 * 3600
  };
  
  module.exports = timeUnits;
  
			}
  
		  }
		},
		"settings": {
		  "orgId": "66C5485451E56AAE0A490D45@AdobeOrg",
		  "variables": [
			{
			  "name": "trackingServer",
			  "value": "om.familysearch.org"
			},
			{
			  "name": "trackingServerSecure",
			  "value": "om.familysearch.org"
			},
			{
			  "name": "marketingCloudServer",
			  "value": "om.familysearch.org"
			},
			{
			  "name": "marketingCloudServerSecure",
			  "value": "om.familysearch.org"
			},
			{
			  "name": "disableIdSyncs",
			  "value": "true"
			}
		  ]
		},
		"hostedLibFilesBaseUrl": "https://assets.adobedtm.com/extensions/EP6437fa78ab024946a211397689052381/"
	  }
	},
	"company": {
	  "orgId": "66C5485451E56AAE0A490D45@AdobeOrg"
	},
	"property": {
	  "name": "familysearch.org",
	  "settings": {
		"domains": [
		  "familysearch.org"
		],
		"undefinedVarsReturnEmpty": true,
		"ruleComponentSequencingEnabled": false
	  }
	},
	"rules": [
	  {
		"id": "RL0993427f6bdc45fc803f0def2155edbe",
		"name": "AA - event - 01 - Base Config",
		"events": [
		  {
			"modulePath": "core/src/lib/events/directCall.js",
			"settings": {
			  "identifier": "event"
			},
			"ruleOrder": 1.0
		  }
		],
		"conditions": [
  
		],
		"actions": [
		  {
			"modulePath": "adobe-analytics/src/lib/actions/setVariables.js",
			"settings": {
			  "customSetup": {
				"source": function(event, s) {
	_satellite.fsConfig(event.identifier,event.detail)
  }
			  },
			  "trackerProperties": {
			  }
			}
		  }
		]
	  },
	  {
		"id": "RL723db5db3b244db5813cce8715245b6a",
		"name": "AA - Utility - Clear Vars - Page Top - 50",
		"events": [
		  {
			"modulePath": "core/src/lib/events/libraryLoaded.js",
			"settings": {
			},
			"ruleOrder": 50.0
		  }
		],
		"conditions": [
  
		],
		"actions": [
		  {
			"modulePath": "core/src/lib/actions/customCode.js",
			"settings": {
			  "source": "_satellite.fsClearVars=function(){\n  //list s attributes that should not be cleared out. This will override the clear list\n  var keeperList=[\n    'pageName'  \n  ]\n\n  //all of these attributes are clearlisted by default\n  var clearList=['pageName','channel','products','events','linkTrackVars','linkTrackEvents'];\n  for(i=1;i<200;i++){\n    if(i<4) clearList.push('list'+i);\n    clearList.push('eVar'+i);\n    clearList.push('prop'+i);\n  }\n\n  if(window.s){\n    //clear vars\n    for(i=0;i<clearList.length;i++){\n      var attr=clearList[i]\n      if(window.s[attr] && keeperList.indexOf(attr)<0){\n        window.s[attr]='';\n      }\n    }\n\n    //rest abort as well\n    s.abort=false;\n  }\n}",
			  "language": "javascript"
			}
		  }
		]
	  },
	  {
		"id": "RL77efc52280b84161b4dc3cb3dbc6ceae",
		"name": "AA - event - 99 - Send & Clear Vars",
		"events": [
		  {
			"modulePath": "core/src/lib/events/directCall.js",
			"settings": {
			  "identifier": "event"
			},
			"ruleOrder": 99.0
		  }
		],
		"conditions": [
  
		],
		"actions": [
		  {
			"modulePath": "adobe-analytics/src/lib/actions/sendBeacon.js",
			"settings": {
			  "type": "link",
			  "linkName": "%event.detail.link_name%",
			  "linkType": "o"
			}
		  },
		  {
			"modulePath": "core/src/lib/actions/customCode.js",
			"settings": {
			  "source": 'https://assets.adobedtm.com/05064fe6cab0/c247cd0acad1/49c14401677a/RCf94abe3fcc82433cbeae936149969570-source.js',
			  "language": "javascript",
			  "isExternal": true
			}
		  }
		]
	  },
	  {
		"id": "RLecb3ea3951694023bfbeab2c48ffe8c7",
		"name": "AA - page_view - 99 -  Send & Clear Vars",
		"events": [
		  {
			"modulePath": "core/src/lib/events/directCall.js",
			"settings": {
			  "identifier": "page_view"
			},
			"ruleOrder": 99.0
		  }
		],
		"conditions": [
  
		],
		"actions": [
		  {
			"modulePath": "adobe-analytics/src/lib/actions/sendBeacon.js",
			"settings": {
			  "type": "page"
			}
		  },
		  {
			"modulePath": "core/src/lib/actions/customCode.js",
			"settings": {
			  "source": 'https://assets.adobedtm.com/05064fe6cab0/c247cd0acad1/49c14401677a/RC1c719ba6f7844ca09e4c546addfd615a-source.js',
			  "language": "javascript",
			  "isExternal": true
			}
		  }
		]
	  },
	  {
		"id": "RLf4a8ff4ad45d4425a7422716acd05b4a",
		"name": "AA - page_view - 01 - Base Config",
		"events": [
		  {
			"modulePath": "core/src/lib/events/directCall.js",
			"settings": {
			  "identifier": "page_view"
			},
			"ruleOrder": 1.0
		  }
		],
		"conditions": [
  
		],
		"actions": [
		  {
			"modulePath": "adobe-analytics/src/lib/actions/setVariables.js",
			"settings": {
			  "customSetup": {
				"source": function(event, s) {
	_satellite.fsConfig(event.identifier,event.detail)
  }
			  },
			  "trackerProperties": {
			  }
			}
		  }
		]
	  },
	  {
		"id": "RLeca3eb9e9da54806a688b16242558b10",
		"name": "ClickTale - page_view",
		"events": [
		  {
			"modulePath": "core/src/lib/events/directCall.js",
			"settings": {
			  "identifier": "page_view"
			},
			"ruleOrder": 50.0
		  }
		],
		"conditions": [
  
		],
		"actions": [
		  {
			"modulePath": "core/src/lib/actions/customCode.js",
			"settings": {
			  "source": 'https://assets.adobedtm.com/05064fe6cab0/c247cd0acad1/49c14401677a/RC2a9e5379ae604d56a4ded737f7c319d7-source.js',
			  "language": "javascript",
			  "isExternal": true
			}
		  }
		]
	  }
	]
  }
  })();
  
  var _satellite = (function () {
	'use strict';
  
	if (!window.atob) { console.warn('Adobe Launch is unsupported in IE 9 and below.'); return; }
  
	/***************************************************************************************
	 * (c) 2017 Adobe. All rights reserved.
	 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
	 * you may not use this file except in compliance with the License. You may obtain a copy
	 * of the License at http://www.apache.org/licenses/LICENSE-2.0
	 *
	 * Unless required by applicable law or agreed to in writing, software distributed under
	 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
	 * OF ANY KIND, either express or implied. See the License for the specific language
	 * governing permissions and limitations under the License.
	 ****************************************************************************************/
  
	/**
	 * Rules can be ordered by users at the event type level. For example, assume both Rule A and Rule B
	 * use the Library Loaded and Window Loaded event types. Rule A can be ordered to come before Rule B
	 * on Library Loaded but after Rule B on Window Loaded.
	 *
	 * Order values are integers and act more as a priority. In other words, multiple rules can have the
	 * same order value. If they have the same order value, their order of execution should be
	 * considered nondetermistic.
	 *
	 * @param {Array} rules
	 * @returns {Array} An ordered array of rule-event pair objects.
	 */
	var buildRuleExecutionOrder = function (rules) {
	  var ruleEventPairs = [];
  
	  rules.forEach(function (rule) {
		if (rule.events) {
		  rule.events.forEach(function (event) {
			ruleEventPairs.push({
			  rule: rule,
			  event: event
			});
		  });
		}
	  });
  
	  return ruleEventPairs.sort(function (ruleEventPairA, ruleEventPairB) {
		return ruleEventPairA.event.ruleOrder - ruleEventPairB.event.ruleOrder;
	  });
	};
  
	/*
	Copyright 2020 Adobe. All rights reserved.
	This file is licensed to you under the Apache License, Version 2.0 (the "License");
	you may not use this file except in compliance with the License. You may obtain a copy
	of the License at http://www.apache.org/licenses/LICENSE-2.0
  
	Unless required by applicable law or agreed to in writing, software distributed under
	the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
	OF ANY KIND, either express or implied. See the License for the specific language
	governing permissions and limitations under the License.
	*/
	var DEBUG_LOCAL_STORAGE_NAME = 'debug';
  
	var createDebugController = function (localStorage, logger) {
	  var getPersistedDebugEnabled = function () {
		return localStorage.getItem(DEBUG_LOCAL_STORAGE_NAME) === 'true';
	  };
  
	  var setPersistedDebugEnabled = function (enabled) {
		localStorage.setItem(DEBUG_LOCAL_STORAGE_NAME, enabled);
	  };
  
	  var debugChangedCallbacks = [];
	  var onDebugChanged = function (callback) {
		debugChangedCallbacks.push(callback);
	  };
  
	  logger.outputEnabled = getPersistedDebugEnabled();
  
	  return {
		onDebugChanged: onDebugChanged,
		getDebugEnabled: getPersistedDebugEnabled,
		setDebugEnabled: function (enabled) {
		  if (getPersistedDebugEnabled() !== enabled) {
			setPersistedDebugEnabled(enabled);
			logger.outputEnabled = enabled;
			debugChangedCallbacks.forEach(function (callback) {
			  callback(enabled);
			});
		  }
		}
	  };
	};
  
	/***************************************************************************************
	 * (c) 2018 Adobe. All rights reserved.
	 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
	 * you may not use this file except in compliance with the License. You may obtain a copy
	 * of the License at http://www.apache.org/licenses/LICENSE-2.0
	 *
	 * Unless required by applicable law or agreed to in writing, software distributed under
	 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
	 * OF ANY KIND, either express or implied. See the License for the specific language
	 * governing permissions and limitations under the License.
	 ****************************************************************************************/
  
	var MODULE_NOT_FUNCTION_ERROR = 'Module did not export a function.';
  
	var createExecuteDelegateModule = function (moduleProvider, replaceTokens) {
	  return function (moduleDescriptor, syntheticEvent, moduleCallParameters) {
		moduleCallParameters = moduleCallParameters || [];
		var moduleExports = moduleProvider.getModuleExports(
		  moduleDescriptor.modulePath
		);
  
		if (typeof moduleExports !== 'function') {
		  throw new Error(MODULE_NOT_FUNCTION_ERROR);
		}
  
		var settings = replaceTokens(
		  moduleDescriptor.settings || {},
		  syntheticEvent
		);
		return moduleExports.bind(null, settings).apply(null, moduleCallParameters);
	  };
	};
  
	/***************************************************************************************
	 * (c) 2017 Adobe. All rights reserved.
	 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
	 * you may not use this file except in compliance with the License. You may obtain a copy
	 * of the License at http://www.apache.org/licenses/LICENSE-2.0
	 *
	 * Unless required by applicable law or agreed to in writing, software distributed under
	 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
	 * OF ANY KIND, either express or implied. See the License for the specific language
	 * governing permissions and limitations under the License.
	 ****************************************************************************************/
  
	/**
	 * "Cleans" text by trimming the string and removing spaces and newlines.
	 * @param {string} str The string to clean.
	 * @returns {string}
	 */
	var cleanText = function (str) {
	  return typeof str === 'string' ? str.replace(/\s+/g, ' ').trim() : str;
	};
  
	/***************************************************************************************
	 * (c) 2017 Adobe. All rights reserved.
	 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
	 * you may not use this file except in compliance with the License. You may obtain a copy
	 * of the License at http://www.apache.org/licenses/LICENSE-2.0
	 *
	 * Unless required by applicable law or agreed to in writing, software distributed under
	 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
	 * OF ANY KIND, either express or implied. See the License for the specific language
	 * governing permissions and limitations under the License.
	 ****************************************************************************************/
  
	/**
	 * Log levels.
	 * @readonly
	 * @enum {string}
	 * @private
	 */
	var levels = {
	  LOG: 'log',
	  INFO: 'info',
	  DEBUG: 'debug',
	  WARN: 'warn',
	  ERROR: 'error'
	};
  
	/**
	 * Rocket unicode surrogate pair.
	 * @type {string}
	 */
	var ROCKET = '\uD83D\uDE80';
  
	/**
	 * The user's internet explorer version. If they're not running internet explorer, then it should
	 * be NaN.
	 * @type {Number}
	 */
	var ieVersion = parseInt(
	  (/msie (\d+)/.exec(navigator.userAgent.toLowerCase()) || [])[1]
	);
  
	/**
	 * Prefix to use on all messages. The rocket unicode doesn't work on IE 10.
	 * @type {string}
	 */
	var launchPrefix = ieVersion === 10 ? '[Launch]' : ROCKET;
  
	/**
	 * Whether logged messages should be output to the console.
	 * @type {boolean}
	 */
	var outputEnabled = false;
  
	/**
	 * Processes a log message.
	 * @param {string} level The level of message to log.
	 * @param {...*} arg Any argument to be logged.
	 * @private
	 */
	var process = function (level) {
	  if (outputEnabled && window.console) {
		var logArguments = Array.prototype.slice.call(arguments, 1);
		logArguments.unshift(launchPrefix);
		// window.debug is unsupported in IE 10
		if (level === levels.DEBUG && !window.console[level]) {
		  level = levels.INFO;
		}
		window.console[level].apply(window.console, logArguments);
	  }
	};
  
	/**
	 * Outputs a message to the web console.
	 * @param {...*} arg Any argument to be logged.
	 */
	var log = process.bind(null, levels.LOG);
  
	/**
	 * Outputs informational message to the web console. In some browsers a small "i" icon is
	 * displayed next to these items in the web console's log.
	 * @param {...*} arg Any argument to be logged.
	 */
	var info = process.bind(null, levels.INFO);
  
	/**
	 * Outputs debug message to the web console. In browsers that do not support
	 * console.debug, console.info is used instead.
	 * @param {...*} arg Any argument to be logged.
	 */
	var debug = process.bind(null, levels.DEBUG);
  
	/**
	 * Outputs a warning message to the web console.
	 * @param {...*} arg Any argument to be logged.
	 */
	var warn = process.bind(null, levels.WARN);
  
	/**
	 * Outputs an error message to the web console.
	 * @param {...*} arg Any argument to be logged.
	 */
	var error = process.bind(null, levels.ERROR);
  
	var logger = {
	  log: log,
	  info: info,
	  debug: debug,
	  warn: warn,
	  error: error,
	  /**
	   * Whether logged messages should be output to the console.
	   * @type {boolean}
	   */
	  get outputEnabled() {
		return outputEnabled;
	  },
	  set outputEnabled(value) {
		outputEnabled = value;
	  },
	  /**
	   * Creates a logging utility that only exposes logging functionality and prefixes all messages
	   * with an identifier.
	   */
	  createPrefixedLogger: function (identifier) {
		var loggerSpecificPrefix = '[' + identifier + ']';
  
		return {
		  log: log.bind(null, loggerSpecificPrefix),
		  info: info.bind(null, loggerSpecificPrefix),
		  debug: debug.bind(null, loggerSpecificPrefix),
		  warn: warn.bind(null, loggerSpecificPrefix),
		  error: error.bind(null, loggerSpecificPrefix)
		};
	  }
	};
  
	function createCommonjsModule(fn, module) {
		return module = { exports: {} }, fn(module, module.exports), module.exports;
	}
  
	var js_cookie = createCommonjsModule(function (module, exports) {
	(function (factory) {
		var registeredInModuleLoader;
		{
			module.exports = factory();
			registeredInModuleLoader = true;
		}
		if (!registeredInModuleLoader) {
			var OldCookies = window.Cookies;
			var api = window.Cookies = factory();
			api.noConflict = function () {
				window.Cookies = OldCookies;
				return api;
			};
		}
	}(function () {
		function extend () {
			var i = 0;
			var result = {};
			for (; i < arguments.length; i++) {
				var attributes = arguments[ i ];
				for (var key in attributes) {
					result[key] = attributes[key];
				}
			}
			return result;
		}
  
		function decode (s) {
			return s.replace(/(%[0-9A-Z]{2})+/g, decodeURIComponent);
		}
  
		function init (converter) {
			function api() {}
  
			function set (key, value, attributes) {
				if (typeof document === 'undefined') {
					return;
				}
  
				attributes = extend({
					path: '/'
				}, api.defaults, attributes);
  
				if (typeof attributes.expires === 'number') {
					attributes.expires = new Date(new Date() * 1 + attributes.expires * 864e+5);
				}
  
				// We're using "expires" because "max-age" is not supported by IE
				attributes.expires = attributes.expires ? attributes.expires.toUTCString() : '';
  
				try {
					var result = JSON.stringify(value);
					if (/^[\{\[]/.test(result)) {
						value = result;
					}
				} catch (e) {}
  
				value = converter.write ?
					converter.write(value, key) :
					encodeURIComponent(String(value))
						.replace(/%(23|24|26|2B|3A|3C|3E|3D|2F|3F|40|5B|5D|5E|60|7B|7D|7C)/g, decodeURIComponent);
  
				key = encodeURIComponent(String(key))
					.replace(/%(23|24|26|2B|5E|60|7C)/g, decodeURIComponent)
					.replace(/[\(\)]/g, escape);
  
				var stringifiedAttributes = '';
				for (var attributeName in attributes) {
					if (!attributes[attributeName]) {
						continue;
					}
					stringifiedAttributes += '; ' + attributeName;
					if (attributes[attributeName] === true) {
						continue;
					}
  
					// Considers RFC 6265 section 5.2:
					// ...
					// 3.  If the remaining unparsed-attributes contains a %x3B (";")
					//     character:
					// Consume the characters of the unparsed-attributes up to,
					// not including, the first %x3B (";") character.
					// ...
					stringifiedAttributes += '=' + attributes[attributeName].split(';')[0];
				}
  
				return (document.cookie = key + '=' + value + stringifiedAttributes);
			}
  
			function get (key, json) {
				if (typeof document === 'undefined') {
					return;
				}
  
				var jar = {};
				// To prevent the for loop in the first place assign an empty array
				// in case there are no cookies at all.
				var cookies = document.cookie ? document.cookie.split('; ') : [];
				var i = 0;
  
				for (; i < cookies.length; i++) {
					var parts = cookies[i].split('=');
					var cookie = parts.slice(1).join('=');
  
					if (!json && cookie.charAt(0) === '"') {
						cookie = cookie.slice(1, -1);
					}
  
					try {
						var name = decode(parts[0]);
						cookie = (converter.read || converter)(cookie, name) ||
							decode(cookie);
  
						if (json) {
							try {
								cookie = JSON.parse(cookie);
							} catch (e) {}
						}
  
						jar[name] = cookie;
  
						if (key === name) {
							break;
						}
					} catch (e) {}
				}
  
				return key ? jar[key] : jar;
			}
  
			api.set = set;
			api.get = function (key) {
				return get(key, false /* read as raw */);
			};
			api.getJSON = function (key) {
				return get(key, true /* read as json */);
			};
			api.remove = function (key, attributes) {
				set(key, '', extend(attributes, {
					expires: -1
				}));
			};
  
			api.defaults = {};
  
			api.withConverter = init;
  
			return api;
		}
  
		return init(function () {});
	}));
	});
  
	// js-cookie has other methods that we haven't exposed here. By limiting the exposed API,
	// we have a little more flexibility to change the underlying implementation later. If clear
	// use cases come up for needing the other methods js-cookie exposes, we can re-evaluate whether
	// we want to expose them here.
	var reactorCookie = {
	  get: js_cookie.get,
	  set: js_cookie.set,
	  remove: js_cookie.remove
	};
  
	var reactorWindow = window;
  
	/***************************************************************************************
	 * (c) 2017 Adobe. All rights reserved.
	 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
	 * you may not use this file except in compliance with the License. You may obtain a copy
	 * of the License at http://www.apache.org/licenses/LICENSE-2.0
	 *
	 * Unless required by applicable law or agreed to in writing, software distributed under
	 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
	 * OF ANY KIND, either express or implied. See the License for the specific language
	 * governing permissions and limitations under the License.
	 ****************************************************************************************/
  
  
	var NAMESPACE = 'com.adobe.reactor.';
  
	var getNamespacedStorage = function (storageType, additionalNamespace) {
	  var finalNamespace = NAMESPACE + (additionalNamespace || '');
  
	  // When storage is disabled on Safari, the mere act of referencing window.localStorage
	  // or window.sessionStorage throws an error. For this reason, we wrap in a try-catch.
	  return {
		/**
		 * Reads a value from storage.
		 * @param {string} name The name of the item to be read.
		 * @returns {string}
		 */
		getItem: function (name) {
		  try {
			return reactorWindow[storageType].getItem(finalNamespace + name);
		  } catch (e) {
			return null;
		  }
		},
		/**
		 * Saves a value to storage.
		 * @param {string} name The name of the item to be saved.
		 * @param {string} value The value of the item to be saved.
		 * @returns {boolean} Whether the item was successfully saved to storage.
		 */
		setItem: function (name, value) {
		  try {
			reactorWindow[storageType].setItem(finalNamespace + name, value);
			return true;
		  } catch (e) {
			return false;
		  }
		}
	  };
	};
  
	/***************************************************************************************
	 * (c) 2017 Adobe. All rights reserved.
	 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
	 * you may not use this file except in compliance with the License. You may obtain a copy
	 * of the License at http://www.apache.org/licenses/LICENSE-2.0
	 *
	 * Unless required by applicable law or agreed to in writing, software distributed under
	 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
	 * OF ANY KIND, either express or implied. See the License for the specific language
	 * governing permissions and limitations under the License.
	 ****************************************************************************************/
  
  
  
  
	var COOKIE_PREFIX = '_sdsat_';
  
	var DATA_ELEMENTS_NAMESPACE = 'dataElements.';
	var MIGRATED_KEY = 'dataElementCookiesMigrated';
  
	var reactorLocalStorage = getNamespacedStorage('localStorage');
	var dataElementSessionStorage = getNamespacedStorage(
	  'sessionStorage',
	  DATA_ELEMENTS_NAMESPACE
	);
	var dataElementLocalStorage = getNamespacedStorage(
	  'localStorage',
	  DATA_ELEMENTS_NAMESPACE
	);
  
	var storageDurations = {
	  PAGEVIEW: 'pageview',
	  SESSION: 'session',
	  VISITOR: 'visitor'
	};
  
	var pageviewCache = {};
  
	var serialize = function (value) {
	  var serialized;
  
	  try {
		// On some browsers, with some objects, errors will be thrown during serialization. For example,
		// in Chrome with the window object, it will throw "TypeError: Converting circular structure
		// to JSON"
		serialized = JSON.stringify(value);
	  } catch (e) {}
  
	  return serialized;
	};
  
	var setValue = function (key, storageDuration, value) {
	  var serializedValue;
  
	  switch (storageDuration) {
		case storageDurations.PAGEVIEW:
		  pageviewCache[key] = value;
		  return;
		case storageDurations.SESSION:
		  serializedValue = serialize(value);
		  if (serializedValue) {
			dataElementSessionStorage.setItem(key, serializedValue);
		  }
		  return;
		case storageDurations.VISITOR:
		  serializedValue = serialize(value);
		  if (serializedValue) {
			dataElementLocalStorage.setItem(key, serializedValue);
		  }
		  return;
	  }
	};
  
	var getValue = function (key, storageDuration) {
	  var value;
  
	  // It should consistently return the same value if no stored item was found. We chose null,
	  // though undefined could be a reasonable value as well.
	  switch (storageDuration) {
		case storageDurations.PAGEVIEW:
		  return pageviewCache.hasOwnProperty(key) ? pageviewCache[key] : null;
		case storageDurations.SESSION:
		  value = dataElementSessionStorage.getItem(key);
		  return value === null ? value : JSON.parse(value);
		case storageDurations.VISITOR:
		  value = dataElementLocalStorage.getItem(key);
		  return value === null ? value : JSON.parse(value);
	  }
	};
  
	// Remove when migration period has ended. We intentionally leave cookies as they are so that if
	// DTM is running on the same domain it can still use the persisted values. Our migration strategy
	// is essentially copying data from cookies and then diverging the storage mechanism between
	// DTM and Launch (DTM uses cookies and Launch uses session and local storage).
	var migrateDataElement = function (dataElementName, storageDuration) {
	  var storedValue = reactorCookie.get(COOKIE_PREFIX + dataElementName);
  
	  if (storedValue !== undefined) {
		setValue(dataElementName, storageDuration, storedValue);
	  }
	};
  
	var migrateCookieData = function (dataElements) {
	  if (!reactorLocalStorage.getItem(MIGRATED_KEY)) {
		Object.keys(dataElements).forEach(function (dataElementName) {
		  migrateDataElement(
			dataElementName,
			dataElements[dataElementName].storageDuration
		  );
		});
  
		reactorLocalStorage.setItem(MIGRATED_KEY, true);
	  }
	};
  
	var dataElementSafe = {
	  setValue: setValue,
	  getValue: getValue,
	  migrateCookieData: migrateCookieData
	};
  
	/***************************************************************************************
	 * (c) 2017 Adobe. All rights reserved.
	 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
	 * you may not use this file except in compliance with the License. You may obtain a copy
	 * of the License at http://www.apache.org/licenses/LICENSE-2.0
	 *
	 * Unless required by applicable law or agreed to in writing, software distributed under
	 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
	 * OF ANY KIND, either express or implied. See the License for the specific language
	 * governing permissions and limitations under the License.
	 ****************************************************************************************/
  
  
  
  
  
	var getErrorMessage = function (
	  dataDef,
	  dataElementName,
	  errorMessage,
	  errorStack
	) {
	  return (
		'Failed to execute data element module ' +
		dataDef.modulePath +
		' for data element ' +
		dataElementName +
		'. ' +
		errorMessage +
		(errorStack ? '\n' + errorStack : '')
	  );
	};
  
	var createGetDataElementValue = function (
	  moduleProvider,
	  getDataElementDefinition,
	  replaceTokens,
	  undefinedVarsReturnEmpty
	) {
	  return function (name, syntheticEvent) {
		var dataDef = getDataElementDefinition(name);
  
		if (!dataDef) {
		  return undefinedVarsReturnEmpty ? '' : undefined;
		}
  
		var storageDuration = dataDef.storageDuration;
		var moduleExports;
  
		try {
		  moduleExports = moduleProvider.getModuleExports(dataDef.modulePath);
		} catch (e) {
		  logger.error(getErrorMessage(dataDef, name, e.message, e.stack));
		  return;
		}
  
		if (typeof moduleExports !== 'function') {
		  logger.error(
			getErrorMessage(dataDef, name, 'Module did not export a function.')
		  );
		  return;
		}
  
		var value;
  
		try {
		  value = moduleExports(
			replaceTokens(dataDef.settings, syntheticEvent),
			syntheticEvent
		  );
		} catch (e) {
		  logger.error(getErrorMessage(dataDef, name, e.message, e.stack));
		  return;
		}
  
		if (storageDuration) {
		  if (value != null) {
			dataElementSafe.setValue(name, storageDuration, value);
		  } else {
			value = dataElementSafe.getValue(name, storageDuration);
		  }
		}
  
		if (value == null && dataDef.defaultValue != null) {
		  value = dataDef.defaultValue;
		}
  
		if (typeof value === 'string') {
		  if (dataDef.cleanText) {
			value = cleanText(value);
		  }
  
		  if (dataDef.forceLowerCase) {
			value = value.toLowerCase();
		  }
		}
  
		return value;
	  };
	};
  
	/***************************************************************************************
	 * (c) 2017 Adobe. All rights reserved.
	 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
	 * you may not use this file except in compliance with the License. You may obtain a copy
	 * of the License at http://www.apache.org/licenses/LICENSE-2.0
	 *
	 * Unless required by applicable law or agreed to in writing, software distributed under
	 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
	 * OF ANY KIND, either express or implied. See the License for the specific language
	 * governing permissions and limitations under the License.
	 ****************************************************************************************/
  
  
  
	var specialPropertyAccessors = {
	  text: function (obj) {
		return obj.textContent;
	  },
	  cleanText: function (obj) {
		return cleanText(obj.textContent);
	  }
	};
  
	/**
	 * This returns the value of a property at a given path. For example, a <code>path<code> of
	 * <code>foo.bar</code> will return the value of <code>obj.foo.bar</code>.
	 *
	 * In addition, if <code>path</code> is <code>foo.bar.getAttribute(unicorn)</code> and
	 * <code>obj.foo.bar</code> has a method named <code>getAttribute</code>, the method will be
	 * called with a value of <code>"unicorn"</code> and the value will be returned.
	 *
	 * Also, if <code>path</code> is <code>foo.bar.@text</code> or other supported properties
	 * beginning with <code>@</code>, a special accessor will be used.
	 *
	 * @param host
	 * @param path
	 * @param supportSpecial
	 * @returns {*}
	 */
	var getObjectProperty = function (host, propChain, supportSpecial) {
	  var value = host;
	  var attrMatch;
	  for (var i = 0, len = propChain.length; i < len; i++) {
		if (value == null) {
		  return undefined;
		}
		var prop = propChain[i];
		if (supportSpecial && prop.charAt(0) === '@') {
		  var specialProp = prop.slice(1);
		  value = specialPropertyAccessors[specialProp](value);
		  continue;
		}
		if (
		  value.getAttribute &&
		  (attrMatch = prop.match(/^getAttribute\((.+)\)$/))
		) {
		  var attr = attrMatch[1];
		  value = value.getAttribute(attr);
		  continue;
		}
		value = value[prop];
	  }
	  return value;
	};
  
	/**
	 * Returns the value of a variable.
	 * @param {string} variable
	 * @param {Object} [syntheticEvent] A synthetic event. Only required when using %event... %this...
	 * or %target...
	 * @returns {*}
	 */
	var createGetVar = function (
	  customVars,
	  getDataElementDefinition,
	  getDataElementValue
	) {
	  return function (variable, syntheticEvent) {
		var value;
  
		if (getDataElementDefinition(variable)) {
		  // Accessing nested properties of a data element using dot-notation is unsupported because
		  // users can currently create data elements with periods in the name.
		  value = getDataElementValue(variable, syntheticEvent);
		} else {
		  var propChain = variable.split('.');
		  var variableHostName = propChain.shift();
  
		  if (variableHostName === 'this') {
			if (syntheticEvent) {
			  // I don't know why this is the only one that supports special properties, but that's the
			  // way it was in Satellite.
			  value = getObjectProperty(syntheticEvent.element, propChain, true);
			}
		  } else if (variableHostName === 'event') {
			if (syntheticEvent) {
			  value = getObjectProperty(syntheticEvent, propChain);
			}
		  } else if (variableHostName === 'target') {
			if (syntheticEvent) {
			  value = getObjectProperty(syntheticEvent.target, propChain);
			}
		  } else {
			value = getObjectProperty(customVars[variableHostName], propChain);
		  }
		}
  
		return value;
	  };
	};
  
	/***************************************************************************************
	 * (c) 2017 Adobe. All rights reserved.
	 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
	 * you may not use this file except in compliance with the License. You may obtain a copy
	 * of the License at http://www.apache.org/licenses/LICENSE-2.0
	 *
	 * Unless required by applicable law or agreed to in writing, software distributed under
	 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
	 * OF ANY KIND, either express or implied. See the License for the specific language
	 * governing permissions and limitations under the License.
	 ****************************************************************************************/
  
	/**
	 * Determines if the provided name is a valid variable, where the variable
	 * can be a data element, element, event, target, or custom var.
	 * @param variableName
	 * @returns {boolean}
	 */
	var createIsVar = function (customVars, getDataElementDefinition) {
	  return function (variableName) {
		var nameBeforeDot = variableName.split('.')[0];
  
		return Boolean(
		  getDataElementDefinition(variableName) ||
			nameBeforeDot === 'this' ||
			nameBeforeDot === 'event' ||
			nameBeforeDot === 'target' ||
			customVars.hasOwnProperty(nameBeforeDot)
		);
	  };
	};
  
	/***************************************************************************************
	 * (c) 2017 Adobe. All rights reserved.
	 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
	 * you may not use this file except in compliance with the License. You may obtain a copy
	 * of the License at http://www.apache.org/licenses/LICENSE-2.0
	 *
	 * Unless required by applicable law or agreed to in writing, software distributed under
	 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
	 * OF ANY KIND, either express or implied. See the License for the specific language
	 * governing permissions and limitations under the License.
	 ****************************************************************************************/
  
	var extractModuleExports = function (script, require, turbine) {
	  var module = {
		exports: {}
	  };
  
	  script.call(module.exports, module, module.exports, require, turbine);
  
	  return module.exports;
	};
  
	/***************************************************************************************
	 * (c) 2017 Adobe. All rights reserved.
	 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
	 * you may not use this file except in compliance with the License. You may obtain a copy
	 * of the License at http://www.apache.org/licenses/LICENSE-2.0
	 *
	 * Unless required by applicable law or agreed to in writing, software distributed under
	 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
	 * OF ANY KIND, either express or implied. See the License for the specific language
	 * governing permissions and limitations under the License.
	 ****************************************************************************************/
  
  
  
  
	var createModuleProvider = function () {
	  var moduleByReferencePath = {};
  
	  var getModule = function (referencePath) {
		var module = moduleByReferencePath[referencePath];
  
		if (!module) {
		  throw new Error('Module ' + referencePath + ' not found.');
		}
  
		return module;
	  };
  
	  var registerModule = function (
		referencePath,
		moduleDefinition,
		extensionName,
		require,
		turbine
	  ) {
		var module = {
		  definition: moduleDefinition,
		  extensionName: extensionName,
		  require: require,
		  turbine: turbine
		};
		module.require = require;
		moduleByReferencePath[referencePath] = module;
	  };
  
	  var hydrateCache = function () {
		Object.keys(moduleByReferencePath).forEach(function (referencePath) {
		  try {
			getModuleExports(referencePath);
		  } catch (e) {
			var errorMessage =
			  'Error initializing module ' +
			  referencePath +
			  '. ' +
			  e.message +
			  (e.stack ? '\n' + e.stack : '');
			logger.error(errorMessage);
		  }
		});
	  };
  
	  var getModuleExports = function (referencePath) {
		var module = getModule(referencePath);
  
		// Using hasOwnProperty instead of a falsey check because the module could export undefined
		// in which case we don't want to execute the module each time the exports is requested.
		if (!module.hasOwnProperty('exports')) {
		  module.exports = extractModuleExports(
			module.definition.script,
			module.require,
			module.turbine
		  );
		}
  
		return module.exports;
	  };
  
	  var getModuleDefinition = function (referencePath) {
		return getModule(referencePath).definition;
	  };
  
	  var getModuleExtensionName = function (referencePath) {
		return getModule(referencePath).extensionName;
	  };
  
	  return {
		registerModule: registerModule,
		hydrateCache: hydrateCache,
		getModuleExports: getModuleExports,
		getModuleDefinition: getModuleDefinition,
		getModuleExtensionName: getModuleExtensionName
	  };
	};
  
	/***************************************************************************************
	 * (c) 2017 Adobe. All rights reserved.
	 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
	 * you may not use this file except in compliance with the License. You may obtain a copy
	 * of the License at http://www.apache.org/licenses/LICENSE-2.0
	 *
	 * Unless required by applicable law or agreed to in writing, software distributed under
	 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
	 * OF ANY KIND, either express or implied. See the License for the specific language
	 * governing permissions and limitations under the License.
	 ****************************************************************************************/
  
  
	var warningLogged = false;
  
	var createNotifyMonitors = function (_satellite) {
	  return function (type, event) {
		var monitors = _satellite._monitors;
  
		if (monitors) {
		  if (!warningLogged) {
			logger.warn(
			  'The _satellite._monitors API may change at any time and should only ' +
				'be used for debugging.'
			);
			warningLogged = true;
		  }
  
		  monitors.forEach(function (monitor) {
			if (monitor[type]) {
			  monitor[type](event);
			}
		  });
		}
	  };
	};
  
	/***************************************************************************************
	 * (c) 2017 Adobe. All rights reserved.
	 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
	 * you may not use this file except in compliance with the License. You may obtain a copy
	 * of the License at http://www.apache.org/licenses/LICENSE-2.0
	 *
	 * Unless required by applicable law or agreed to in writing, software distributed under
	 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
	 * OF ANY KIND, either express or implied. See the License for the specific language
	 * governing permissions and limitations under the License.
	 ****************************************************************************************/
  
  
  
	/**
	 * Replacing any variable tokens (%myDataElement%, %this.foo%, etc.) with their associated values.
	 * A new string, object, or array will be created; the thing being processed will never be
	 * modified.
	 * @param {*} thing Thing potentially containing variable tokens. Objects and arrays will be
	 * deeply processed.
	 * @param {HTMLElement} [element] Associated HTML element. Used for special tokens
	 * (%this.something%).
	 * @param {Object} [event] Associated event. Used for special tokens (%event.something%,
	 * %target.something%)
	 * @returns {*} A processed value.
	 */
	var createReplaceTokens = function (isVar, getVar, undefinedVarsReturnEmpty) {
	  var replaceTokensInString;
	  var replaceTokensInObject;
	  var replaceTokensInArray;
	  var replaceTokens;
	  var variablesBeingRetrieved = [];
  
	  var getVarValue = function (token, variableName, syntheticEvent) {
		if (!isVar(variableName)) {
		  return token;
		}
  
		variablesBeingRetrieved.push(variableName);
		var val = getVar(variableName, syntheticEvent);
		variablesBeingRetrieved.pop();
		return val == null && undefinedVarsReturnEmpty ? '' : val;
	  };
  
	  /**
	   * Perform variable substitutions to a string where tokens are specified in the form %foo%.
	   * If the only content of the string is a single data element token, then the raw data element
	   * value will be returned instead.
	   *
	   * @param str {string} The string potentially containing data element tokens.
	   * @param element {HTMLElement} The element to use for tokens in the form of %this.property%.
	   * @param event {Object} The event object to use for tokens in the form of %target.property%.
	   * @returns {*}
	   */
	  replaceTokensInString = function (str, syntheticEvent) {
		// Is the string a single data element token and nothing else?
		var result = /^%([^%]+)%$/.exec(str);
  
		if (result) {
		  return getVarValue(str, result[1], syntheticEvent);
		} else {
		  return str.replace(/%(.+?)%/g, function (token, variableName) {
			return getVarValue(token, variableName, syntheticEvent);
		  });
		}
	  };
  
	  replaceTokensInObject = function (obj, syntheticEvent) {
		var ret = {};
		var keys = Object.keys(obj);
		for (var i = 0; i < keys.length; i++) {
		  var key = keys[i];
		  var value = obj[key];
		  ret[key] = replaceTokens(value, syntheticEvent);
		}
		return ret;
	  };
  
	  replaceTokensInArray = function (arr, syntheticEvent) {
		var ret = [];
		for (var i = 0, len = arr.length; i < len; i++) {
		  ret.push(replaceTokens(arr[i], syntheticEvent));
		}
		return ret;
	  };
  
	  replaceTokens = function (thing, syntheticEvent) {
		if (typeof thing === 'string') {
		  return replaceTokensInString(thing, syntheticEvent);
		} else if (Array.isArray(thing)) {
		  return replaceTokensInArray(thing, syntheticEvent);
		} else if (typeof thing === 'object' && thing !== null) {
		  return replaceTokensInObject(thing, syntheticEvent);
		}
  
		return thing;
	  };
  
	  return function (thing, syntheticEvent) {
		// It's possible for a data element to reference another data element. Because of this,
		// we need to prevent circular dependencies from causing an infinite loop.
		if (variablesBeingRetrieved.length > 10) {
		  logger.error(
			'Data element circular reference detected: ' +
			  variablesBeingRetrieved.join(' -> ')
		  );
		  return thing;
		}
  
		return replaceTokens(thing, syntheticEvent);
	  };
	};
  
	/***************************************************************************************
	 * (c) 2017 Adobe. All rights reserved.
	 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
	 * you may not use this file except in compliance with the License. You may obtain a copy
	 * of the License at http://www.apache.org/licenses/LICENSE-2.0
	 *
	 * Unless required by applicable law or agreed to in writing, software distributed under
	 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
	 * OF ANY KIND, either express or implied. See the License for the specific language
	 * governing permissions and limitations under the License.
	 ****************************************************************************************/
  
	var createSetCustomVar = function (customVars) {
	  return function () {
		if (typeof arguments[0] === 'string') {
		  customVars[arguments[0]] = arguments[1];
		} else if (arguments[0]) {
		  // assume an object literal
		  var mapping = arguments[0];
		  for (var key in mapping) {
			customVars[key] = mapping[key];
		  }
		}
	  };
	};
  
	/**
	 * @this {Promise}
	 */
	function finallyConstructor(callback) {
	  var constructor = this.constructor;
	  return this.then(
		function(value) {
		  // @ts-ignore
		  return constructor.resolve(callback()).then(function() {
			return value;
		  });
		},
		function(reason) {
		  // @ts-ignore
		  return constructor.resolve(callback()).then(function() {
			// @ts-ignore
			return constructor.reject(reason);
		  });
		}
	  );
	}
  
	// Store setTimeout reference so promise-polyfill will be unaffected by
	// other code modifying setTimeout (like sinon.useFakeTimers())
	var setTimeoutFunc = setTimeout;
  
	function isArray(x) {
	  return Boolean(x && typeof x.length !== 'undefined');
	}
  
	function noop() {}
  
	// Polyfill for Function.prototype.bind
	function bind(fn, thisArg) {
	  return function() {
		fn.apply(thisArg, arguments);
	  };
	}
  
	/**
	 * @constructor
	 * @param {Function} fn
	 */
	function Promise(fn) {
	  if (!(this instanceof Promise))
		throw new TypeError('Promises must be constructed via new');
	  if (typeof fn !== 'function') throw new TypeError('not a function');
	  /** @type {!number} */
	  this._state = 0;
	  /** @type {!boolean} */
	  this._handled = false;
	  /** @type {Promise|undefined} */
	  this._value = undefined;
	  /** @type {!Array<!Function>} */
	  this._deferreds = [];
  
	  doResolve(fn, this);
	}
  
	function handle(self, deferred) {
	  while (self._state === 3) {
		self = self._value;
	  }
	  if (self._state === 0) {
		self._deferreds.push(deferred);
		return;
	  }
	  self._handled = true;
	  Promise._immediateFn(function() {
		var cb = self._state === 1 ? deferred.onFulfilled : deferred.onRejected;
		if (cb === null) {
		  (self._state === 1 ? resolve : reject)(deferred.promise, self._value);
		  return;
		}
		var ret;
		try {
		  ret = cb(self._value);
		} catch (e) {
		  reject(deferred.promise, e);
		  return;
		}
		resolve(deferred.promise, ret);
	  });
	}
  
	function resolve(self, newValue) {
	  try {
		// Promise Resolution Procedure: https://github.com/promises-aplus/promises-spec#the-promise-resolution-procedure
		if (newValue === self)
		  throw new TypeError('A promise cannot be resolved with itself.');
		if (
		  newValue &&
		  (typeof newValue === 'object' || typeof newValue === 'function')
		) {
		  var then = newValue.then;
		  if (newValue instanceof Promise) {
			self._state = 3;
			self._value = newValue;
			finale(self);
			return;
		  } else if (typeof then === 'function') {
			doResolve(bind(then, newValue), self);
			return;
		  }
		}
		self._state = 1;
		self._value = newValue;
		finale(self);
	  } catch (e) {
		reject(self, e);
	  }
	}
  
	function reject(self, newValue) {
	  self._state = 2;
	  self._value = newValue;
	  finale(self);
	}
  
	function finale(self) {
	  if (self._state === 2 && self._deferreds.length === 0) {
		Promise._immediateFn(function() {
		  if (!self._handled) {
			Promise._unhandledRejectionFn(self._value);
		  }
		});
	  }
  
	  for (var i = 0, len = self._deferreds.length; i < len; i++) {
		handle(self, self._deferreds[i]);
	  }
	  self._deferreds = null;
	}
  
	/**
	 * @constructor
	 */
	function Handler(onFulfilled, onRejected, promise) {
	  this.onFulfilled = typeof onFulfilled === 'function' ? onFulfilled : null;
	  this.onRejected = typeof onRejected === 'function' ? onRejected : null;
	  this.promise = promise;
	}
  
	/**
	 * Take a potentially misbehaving resolver function and make sure
	 * onFulfilled and onRejected are only called once.
	 *
	 * Makes no guarantees about asynchrony.
	 */
	function doResolve(fn, self) {
	  var done = false;
	  try {
		fn(
		  function(value) {
			if (done) return;
			done = true;
			resolve(self, value);
		  },
		  function(reason) {
			if (done) return;
			done = true;
			reject(self, reason);
		  }
		);
	  } catch (ex) {
		if (done) return;
		done = true;
		reject(self, ex);
	  }
	}
  
	Promise.prototype['catch'] = function(onRejected) {
	  return this.then(null, onRejected);
	};
  
	Promise.prototype.then = function(onFulfilled, onRejected) {
	  // @ts-ignore
	  var prom = new this.constructor(noop);
  
	  handle(this, new Handler(onFulfilled, onRejected, prom));
	  return prom;
	};
  
	Promise.prototype['finally'] = finallyConstructor;
  
	Promise.all = function(arr) {
	  return new Promise(function(resolve, reject) {
		if (!isArray(arr)) {
		  return reject(new TypeError('Promise.all accepts an array'));
		}
  
		var args = Array.prototype.slice.call(arr);
		if (args.length === 0) return resolve([]);
		var remaining = args.length;
  
		function res(i, val) {
		  try {
			if (val && (typeof val === 'object' || typeof val === 'function')) {
			  var then = val.then;
			  if (typeof then === 'function') {
				then.call(
				  val,
				  function(val) {
					res(i, val);
				  },
				  reject
				);
				return;
			  }
			}
			args[i] = val;
			if (--remaining === 0) {
			  resolve(args);
			}
		  } catch (ex) {
			reject(ex);
		  }
		}
  
		for (var i = 0; i < args.length; i++) {
		  res(i, args[i]);
		}
	  });
	};
  
	Promise.resolve = function(value) {
	  if (value && typeof value === 'object' && value.constructor === Promise) {
		return value;
	  }
  
	  return new Promise(function(resolve) {
		resolve(value);
	  });
	};
  
	Promise.reject = function(value) {
	  return new Promise(function(resolve, reject) {
		reject(value);
	  });
	};
  
	Promise.race = function(arr) {
	  return new Promise(function(resolve, reject) {
		if (!isArray(arr)) {
		  return reject(new TypeError('Promise.race accepts an array'));
		}
  
		for (var i = 0, len = arr.length; i < len; i++) {
		  Promise.resolve(arr[i]).then(resolve, reject);
		}
	  });
	};
  
	// Use polyfill for setImmediate for performance gains
	Promise._immediateFn =
	  // @ts-ignore
	  (typeof setImmediate === 'function' &&
		function(fn) {
		  // @ts-ignore
		  setImmediate(fn);
		}) ||
	  function(fn) {
		setTimeoutFunc(fn, 0);
	  };
  
	Promise._unhandledRejectionFn = function _unhandledRejectionFn(err) {
	  if (typeof console !== 'undefined' && console) {
		console.warn('Possible Unhandled Promise Rejection:', err); // eslint-disable-line no-console
	  }
	};
  
	// For building Turbine we are using Rollup. For running the turbine tests we are using
	// Karma + Webpack. You need to specify the default import when using promise-polyfill`
	// with Webpack 2+. We need `require('promise-polyfill').default` for running the tests
	// and `require('promise-polyfill')` for building Turbine.
	var reactorPromise =
	  window.Promise ||
	  Promise.default ||
	  Promise;
  
	/*
	Copyright 2020 Adobe. All rights reserved.
	This file is licensed to you under the Apache License, Version 2.0 (the "License");
	you may not use this file except in compliance with the License. You may obtain a copy
	of the License at http://www.apache.org/licenses/LICENSE-2.0
  
	Unless required by applicable law or agreed to in writing, software distributed under
	the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
	OF ANY KIND, either express or implied. See the License for the specific language
	governing permissions and limitations under the License.
	*/
  
  
  
	var createAddActionToQueue = function (
	  executeDelegateModule,
	  normalizeRuleComponentError,
	  logActionError
	) {
	  return function (action, rule, syntheticEvent, lastPromiseInQueue) {
		return lastPromiseInQueue.then(function () {
		  // This module is used when ruleComponentSequencing is enabled.
		  // action.timeout is always supplied to this module as >= 0 when delayNext is true.
  
		  var delayNextAction = action.delayNext;
		  var actionTimeoutId;
  
		  return new reactorPromise(function (resolve, reject) {
			var moduleResult = executeDelegateModule(action, syntheticEvent, [
			  syntheticEvent
			]);
  
			if (!delayNextAction) {
			  return resolve();
			}
  
			var promiseTimeoutMs = action.timeout;
			var timeoutPromise = new reactorPromise(function (resolve, reject) {
			  actionTimeoutId = setTimeout(function () {
				reject(
				  new Error(
					'A timeout occurred because the action took longer than ' +
					  promiseTimeoutMs / 1000 +
					  ' seconds to complete. '
				  )
				);
			  }, promiseTimeoutMs);
			});
  
			reactorPromise.race([moduleResult, timeoutPromise]).then(resolve, reject);
		  })
			.catch(function (e) {
			  clearTimeout(actionTimeoutId);
			  e = normalizeRuleComponentError(e);
			  logActionError(action, rule, e);
			  return reactorPromise.reject(e);
			})
			.then(function () {
			  clearTimeout(actionTimeoutId);
			});
		});
	  };
	};
  
	/*
	Copyright 2020 Adobe. All rights reserved.
	This file is licensed to you under the Apache License, Version 2.0 (the "License");
	you may not use this file except in compliance with the License. You may obtain a copy
	of the License at http://www.apache.org/licenses/LICENSE-2.0
  
	Unless required by applicable law or agreed to in writing, software distributed under
	the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
	OF ANY KIND, either express or implied. See the License for the specific language
	governing permissions and limitations under the License.
	*/
  
  
  
	var createAddConditionToQueue = function (
	  executeDelegateModule,
	  normalizeRuleComponentError,
	  isConditionMet,
	  logConditionError,
	  logConditionNotMet
	) {
	  return function (condition, rule, syntheticEvent, lastPromiseInQueue) {
		return lastPromiseInQueue.then(function () {
		  // This module is used when ruleComponentSequencing is enabled.
		  // condition.timeout is always supplied to this module as >= 0.
		  // Conditions always assume delayNext = true because we have to know the
		  // condition result before moving on.
		  var conditionTimeoutId;
  
		  return new reactorPromise(function (resolve, reject) {
			var moduleResult = executeDelegateModule(condition, syntheticEvent, [
			  syntheticEvent
			]);
  
			var promiseTimeoutMs = condition.timeout;
			var timeoutPromise = new reactorPromise(function (resolve, reject) {
			  conditionTimeoutId = setTimeout(function () {
				reject(
				  new Error(
					'A timeout occurred because the condition took longer than ' +
					  promiseTimeoutMs / 1000 +
					  ' seconds to complete. '
				  )
				);
			  }, promiseTimeoutMs);
			});
  
			reactorPromise.race([moduleResult, timeoutPromise]).then(resolve, reject);
		  })
			.catch(function (e) {
			  clearTimeout(conditionTimeoutId);
			  e = normalizeRuleComponentError(e);
			  logConditionError(condition, rule, e);
			  return reactorPromise.reject(e);
			})
			.then(function (result) {
			  clearTimeout(conditionTimeoutId);
			  if (!isConditionMet(condition, result)) {
				logConditionNotMet(condition, rule);
				return reactorPromise.reject();
			  }
			});
		});
	  };
	};
  
	/*
	Copyright 2020 Adobe. All rights reserved.
	This file is licensed to you under the Apache License, Version 2.0 (the "License");
	you may not use this file except in compliance with the License. You may obtain a copy
	of the License at http://www.apache.org/licenses/LICENSE-2.0
  
	Unless required by applicable law or agreed to in writing, software distributed under
	the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
	OF ANY KIND, either express or implied. See the License for the specific language
	governing permissions and limitations under the License.
	*/
  
  
	var lastPromiseInQueue = reactorPromise.resolve();
  
	var createAddRuleToQueue = function (
	  addConditionToQueue,
	  addActionToQueue,
	  logRuleCompleted
	) {
	  return function (rule, syntheticEvent) {
		if (rule.conditions) {
		  rule.conditions.forEach(function (condition) {
			lastPromiseInQueue = addConditionToQueue(
			  condition,
			  rule,
			  syntheticEvent,
			  lastPromiseInQueue
			);
		  });
		}
  
		if (rule.actions) {
		  rule.actions.forEach(function (action) {
			lastPromiseInQueue = addActionToQueue(
			  action,
			  rule,
			  syntheticEvent,
			  lastPromiseInQueue
			);
		  });
		}
  
		lastPromiseInQueue = lastPromiseInQueue.then(function () {
		  logRuleCompleted(rule);
		});
  
		// Allows later rules to keep running when an error occurs within this rule.
		lastPromiseInQueue = lastPromiseInQueue.catch(function () {});
  
		return lastPromiseInQueue;
	  };
	};
  
	var isPromiseLike = function (value) {
	  return Boolean(
		value && typeof value === 'object' && typeof value.then === 'function'
	  );
	};
  
	/*
	Copyright 2020 Adobe. All rights reserved.
	This file is licensed to you under the Apache License, Version 2.0 (the "License");
	you may not use this file except in compliance with the License. You may obtain a copy
	of the License at http://www.apache.org/licenses/LICENSE-2.0
  
	Unless required by applicable law or agreed to in writing, software distributed under
	the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
	OF ANY KIND, either express or implied. See the License for the specific language
	governing permissions and limitations under the License.
	*/
  
  
  
	var createEvaluateConditions = function (
	  executeDelegateModule,
	  isConditionMet,
	  logConditionNotMet,
	  logConditionError
	) {
	  return function (rule, syntheticEvent) {
		var condition;
  
		if (rule.conditions) {
		  for (var i = 0; i < rule.conditions.length; i++) {
			condition = rule.conditions[i];
  
			try {
			  var result = executeDelegateModule(condition, syntheticEvent, [
				syntheticEvent
			  ]);
  
			  // If the result is promise-like, the extension needs to do something asynchronously,
			  // but the customer does not have rule component sequencing enabled on the property.
			  // If we didn't do this, the condition would always pass because the promise is
			  // considered "truthy".
			  if (isPromiseLike(result)) {
				throw new Error(
				  'Rule component sequencing must be enabled on the property ' +
					'for this condition to function properly.'
				);
			  }
  
			  if (!isConditionMet(condition, result)) {
				logConditionNotMet(condition, rule);
				return false;
			  }
			} catch (e) {
			  logConditionError(condition, rule, e);
			  return false;
			}
		  }
		}
  
		return true;
	  };
	};
  
	/*
	Copyright 2020 Adobe. All rights reserved.
	This file is licensed to you under the Apache License, Version 2.0 (the "License");
	you may not use this file except in compliance with the License. You may obtain a copy
	of the License at http://www.apache.org/licenses/LICENSE-2.0
  
	Unless required by applicable law or agreed to in writing, software distributed under
	the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
	OF ANY KIND, either express or implied. See the License for the specific language
	governing permissions and limitations under the License.
	*/
  
	var createExecuteRule = function (evaluateConditions, runActions) {
	  return function (rule, normalizedSyntheticEvent) {
		if (evaluateConditions(rule, normalizedSyntheticEvent)) {
		  runActions(rule, normalizedSyntheticEvent);
		}
	  };
	};
  
	/*
	Copyright 2020 Adobe. All rights reserved.
	This file is licensed to you under the Apache License, Version 2.0 (the "License");
	you may not use this file except in compliance with the License. You may obtain a copy
	of the License at http://www.apache.org/licenses/LICENSE-2.0
  
	Unless required by applicable law or agreed to in writing, software distributed under
	the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
	OF ANY KIND, either express or implied. See the License for the specific language
	governing permissions and limitations under the License.
	*/
  
	var createGetModuleDisplayNameByRuleComponent = function (moduleProvider) {
	  return function (ruleComponent) {
		var moduleDefinition = moduleProvider.getModuleDefinition(
		  ruleComponent.modulePath
		);
		return (
		  (moduleDefinition && moduleDefinition.displayName) ||
		  ruleComponent.modulePath
		);
	  };
	};
  
	/*
	Copyright 2020 Adobe. All rights reserved.
	This file is licensed to you under the Apache License, Version 2.0 (the "License");
	you may not use this file except in compliance with the License. You may obtain a copy
	of the License at http://www.apache.org/licenses/LICENSE-2.0
  
	Unless required by applicable law or agreed to in writing, software distributed under
	the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
	OF ANY KIND, either express or implied. See the License for the specific language
	governing permissions and limitations under the License.
	*/
  
	var createGetSyntheticEventMeta = function (moduleProvider) {
	  return function (ruleEventPair) {
		var rule = ruleEventPair.rule;
		var event = ruleEventPair.event;
  
		var moduleName = moduleProvider.getModuleDefinition(event.modulePath).name;
		var extensionName = moduleProvider.getModuleExtensionName(event.modulePath);
  
		return {
		  $type: extensionName + '.' + moduleName,
		  $rule: {
			id: rule.id,
			name: rule.name
		  }
		};
	  };
	};
  
	/*
	Copyright 2020 Adobe. All rights reserved.
	This file is licensed to you under the Apache License, Version 2.0 (the "License");
	you may not use this file except in compliance with the License. You may obtain a copy
	of the License at http://www.apache.org/licenses/LICENSE-2.0
  
	Unless required by applicable law or agreed to in writing, software distributed under
	the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
	OF ANY KIND, either express or implied. See the License for the specific language
	governing permissions and limitations under the License.
	*/
  
	var createInitEventModule = function (
	  triggerRule,
	  executeDelegateModule,
	  normalizeSyntheticEvent,
	  getErrorMessage,
	  getSyntheticEventMeta,
	  logger
	) {
	  return function (guardUntilAllInitialized, ruleEventPair) {
		var rule = ruleEventPair.rule;
		var event = ruleEventPair.event;
		event.settings = event.settings || {};
  
		try {
		  var syntheticEventMeta = getSyntheticEventMeta(ruleEventPair);
  
		  executeDelegateModule(event, null, [
			/**
			 * This is the callback that executes a particular rule when an event has occurred.
			 * @param {Object} [syntheticEvent] An object that contains detail regarding the event
			 * that occurred.
			 */
			function trigger(syntheticEvent) {
			  // DTM-11871
			  // If we're still in the process of initializing event modules,
			  // we need to queue up any calls to trigger, otherwise if the triggered
			  // rule does something that triggers a different rule whose event module
			  // has not been initialized, that secondary rule will never get executed.
			  // This can be removed if we decide to always use the rule queue, since
			  // conditions and actions will be processed asynchronously, which
			  // would give time for all event modules to be initialized.
  
			  var normalizedSyntheticEvent = normalizeSyntheticEvent(
				syntheticEventMeta,
				syntheticEvent
			  );
  
			  guardUntilAllInitialized(function () {
				triggerRule(normalizedSyntheticEvent, rule);
			  });
			}
		  ]);
		} catch (e) {
		  logger.error(getErrorMessage(event, rule, e));
		}
	  };
	};
  
	/*
	Copyright 2020 Adobe. All rights reserved.
	This file is licensed to you under the Apache License, Version 2.0 (the "License");
	you may not use this file except in compliance with the License. You may obtain a copy
	of the License at http://www.apache.org/licenses/LICENSE-2.0
  
	Unless required by applicable law or agreed to in writing, software distributed under
	the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
	OF ANY KIND, either express or implied. See the License for the specific language
	governing permissions and limitations under the License.
	*/
  
	var createLogActionError = function (
	  getRuleComponentErrorMessage,
	  getModuleDisplayNameByRuleComponent,
	  logger,
	  notifyMonitors
	) {
	  return function (action, rule, e) {
		var actionDisplayName = getModuleDisplayNameByRuleComponent(action);
  
		logger.error(getRuleComponentErrorMessage(actionDisplayName, rule.name, e));
  
		notifyMonitors('ruleActionFailed', {
		  rule: rule,
		  action: action
		});
	  };
	};
  
	/*
	Copyright 2020 Adobe. All rights reserved.
	This file is licensed to you under the Apache License, Version 2.0 (the "License");
	you may not use this file except in compliance with the License. You may obtain a copy
	of the License at http://www.apache.org/licenses/LICENSE-2.0
  
	Unless required by applicable law or agreed to in writing, software distributed under
	the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
	OF ANY KIND, either express or implied. See the License for the specific language
	governing permissions and limitations under the License.
	*/
  
	var createLogConditionError = function (
	  getRuleComponentErrorMessage,
	  getModuleDisplayNameByRuleComponent,
	  logger,
	  notifyMonitors
	) {
	  return function (condition, rule, e) {
		var conditionDisplayName = getModuleDisplayNameByRuleComponent(condition);
  
		logger.error(
		  getRuleComponentErrorMessage(conditionDisplayName, rule.name, e)
		);
  
		notifyMonitors('ruleConditionFailed', {
		  rule: rule,
		  condition: condition
		});
	  };
	};
  
	/*
	Copyright 2020 Adobe. All rights reserved.
	This file is licensed to you under the Apache License, Version 2.0 (the "License");
	you may not use this file except in compliance with the License. You may obtain a copy
	of the License at http://www.apache.org/licenses/LICENSE-2.0
  
	Unless required by applicable law or agreed to in writing, software distributed under
	the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
	OF ANY KIND, either express or implied. See the License for the specific language
	governing permissions and limitations under the License.
	*/
  
	var createLogConditionNotMet = function (
	  getModuleDisplayNameByRuleComponent,
	  logger,
	  notifyMonitors
	) {
	  return function (condition, rule) {
		var conditionDisplayName = getModuleDisplayNameByRuleComponent(condition);
  
		logger.log(
		  'Condition "' +
			conditionDisplayName +
			'" for rule "' +
			rule.name +
			'" was not met.'
		);
  
		notifyMonitors('ruleConditionFailed', {
		  rule: rule,
		  condition: condition
		});
	  };
	};
  
	/*
	Copyright 2020 Adobe. All rights reserved.
	This file is licensed to you under the Apache License, Version 2.0 (the "License");
	you may not use this file except in compliance with the License. You may obtain a copy
	of the License at http://www.apache.org/licenses/LICENSE-2.0
  
	Unless required by applicable law or agreed to in writing, software distributed under
	the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
	OF ANY KIND, either express or implied. See the License for the specific language
	governing permissions and limitations under the License.
	*/
  
	var createLogRuleCompleted = function (logger, notifyMonitors) {
	  return function (rule) {
		logger.log('Rule "' + rule.name + '" fired.');
		notifyMonitors('ruleCompleted', {
		  rule: rule
		});
	  };
	};
  
	/*
	Copyright 2020 Adobe. All rights reserved.
	This file is licensed to you under the Apache License, Version 2.0 (the "License");
	you may not use this file except in compliance with the License. You may obtain a copy
	of the License at http://www.apache.org/licenses/LICENSE-2.0
  
	Unless required by applicable law or agreed to in writing, software distributed under
	the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
	OF ANY KIND, either express or implied. See the License for the specific language
	governing permissions and limitations under the License.
	*/
  
	var createRunActions = function (
	  executeDelegateModule,
	  logActionError,
	  logRuleCompleted
	) {
	  return function (rule, syntheticEvent) {
		var action;
  
		if (rule.actions) {
		  for (var i = 0; i < rule.actions.length; i++) {
			action = rule.actions[i];
			try {
			  executeDelegateModule(action, syntheticEvent, [syntheticEvent]);
			} catch (e) {
			  logActionError(action, rule, e);
			  return;
			}
		  }
		}
  
		logRuleCompleted(rule);
	  };
	};
  
	/*
	Copyright 2020 Adobe. All rights reserved.
	This file is licensed to you under the Apache License, Version 2.0 (the "License");
	you may not use this file except in compliance with the License. You may obtain a copy
	of the License at http://www.apache.org/licenses/LICENSE-2.0
  
	Unless required by applicable law or agreed to in writing, software distributed under
	the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
	OF ANY KIND, either express or implied. See the License for the specific language
	governing permissions and limitations under the License.
	*/
  
	var createTriggerRule = function (
	  ruleComponentSequencingEnabled,
	  executeRule,
	  addRuleToQueue,
	  notifyMonitors
	) {
	  return function (normalizedSyntheticEvent, rule) {
		notifyMonitors('ruleTriggered', {
		  rule: rule
		});
  
		if (ruleComponentSequencingEnabled) {
		  addRuleToQueue(rule, normalizedSyntheticEvent);
		} else {
		  executeRule(rule, normalizedSyntheticEvent);
		}
	  };
	};
  
	/*
	Copyright 2020 Adobe. All rights reserved.
	This file is licensed to you under the Apache License, Version 2.0 (the "License");
	you may not use this file except in compliance with the License. You may obtain a copy
	of the License at http://www.apache.org/licenses/LICENSE-2.0
  
	Unless required by applicable law or agreed to in writing, software distributed under
	the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
	OF ANY KIND, either express or implied. See the License for the specific language
	governing permissions and limitations under the License.
	*/
  
	var getRuleComponentErrorMessage = function (ruleComponentName, ruleName, error) {
	  return (
		'Failed to execute "' +
		ruleComponentName +
		'" for "' +
		ruleName +
		'" rule. ' +
		error.message +
		(error.stack ? '\n' + error.stack : '')
	  );
	};
  
	/*
	Copyright 2020 Adobe. All rights reserved.
	This file is licensed to you under the Apache License, Version 2.0 (the "License");
	you may not use this file except in compliance with the License. You may obtain a copy
	of the License at http://www.apache.org/licenses/LICENSE-2.0
  
	Unless required by applicable law or agreed to in writing, software distributed under
	the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
	OF ANY KIND, either express or implied. See the License for the specific language
	governing permissions and limitations under the License.
	*/
  
	var isConditionMet = function (condition, result) {
	  return (result && !condition.negate) || (!result && condition.negate);
	};
  
	/*
	Copyright 2020 Adobe. All rights reserved.
	This file is licensed to you under the Apache License, Version 2.0 (the "License");
	you may not use this file except in compliance with the License. You may obtain a copy
	of the License at http://www.apache.org/licenses/LICENSE-2.0
  
	Unless required by applicable law or agreed to in writing, software distributed under
	the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
	OF ANY KIND, either express or implied. See the License for the specific language
	governing permissions and limitations under the License.
	*/
  
	var triggerCallQueue = [];
	var eventModulesInitialized = false;
  
	var guardUntilAllInitialized = function (callback) {
	  if (!eventModulesInitialized) {
		triggerCallQueue.push(callback);
	  } else {
		callback();
	  }
	};
  
	var initRules = function (buildRuleExecutionOrder, rules, initEventModule) {
	  buildRuleExecutionOrder(rules).forEach(function (ruleEventPair) {
		initEventModule(guardUntilAllInitialized, ruleEventPair);
	  });
  
	  eventModulesInitialized = true;
	  triggerCallQueue.forEach(function (triggerCall) {
		triggerCall();
	  });
  
	  triggerCallQueue = [];
	};
  
	/*
	Copyright 2020 Adobe. All rights reserved.
	This file is licensed to you under the Apache License, Version 2.0 (the "License");
	you may not use this file except in compliance with the License. You may obtain a copy
	of the License at http://www.apache.org/licenses/LICENSE-2.0
  
	Unless required by applicable law or agreed to in writing, software distributed under
	the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
	OF ANY KIND, either express or implied. See the License for the specific language
	governing permissions and limitations under the License.
	*/
  
	var normalizeRuleComponentError = function (e) {
	  if (!e) {
		e = new Error(
		  'The extension triggered an error, but no error information was provided.'
		);
	  }
  
	  if (!(e instanceof Error)) {
		var stringifiedError =
		  typeof e === 'object' ? JSON.stringify(e) : String(e);
		e = new Error(stringifiedError);
	  }
  
	  return e;
	};
  
	/*
	object-assign
	(c) Sindre Sorhus
	@license MIT
	*/
	/* eslint-disable no-unused-vars */
	var getOwnPropertySymbols = Object.getOwnPropertySymbols;
	var hasOwnProperty = Object.prototype.hasOwnProperty;
	var propIsEnumerable = Object.prototype.propertyIsEnumerable;
  
	function toObject(val) {
		if (val === null || val === undefined) {
			throw new TypeError('Object.assign cannot be called with null or undefined');
		}
  
		return Object(val);
	}
  
	function shouldUseNative() {
		try {
			if (!Object.assign) {
				return false;
			}
  
			// Detect buggy property enumeration order in older V8 versions.
  
			// https://bugs.chromium.org/p/v8/issues/detail?id=4118
			var test1 = new String('abc');  // eslint-disable-line no-new-wrappers
			test1[5] = 'de';
			if (Object.getOwnPropertyNames(test1)[0] === '5') {
				return false;
			}
  
			// https://bugs.chromium.org/p/v8/issues/detail?id=3056
			var test2 = {};
			for (var i = 0; i < 10; i++) {
				test2['_' + String.fromCharCode(i)] = i;
			}
			var order2 = Object.getOwnPropertyNames(test2).map(function (n) {
				return test2[n];
			});
			if (order2.join('') !== '0123456789') {
				return false;
			}
  
			// https://bugs.chromium.org/p/v8/issues/detail?id=3056
			var test3 = {};
			'abcdefghijklmnopqrst'.split('').forEach(function (letter) {
				test3[letter] = letter;
			});
			if (Object.keys(Object.assign({}, test3)).join('') !==
					'abcdefghijklmnopqrst') {
				return false;
			}
  
			return true;
		} catch (err) {
			// We don't expect any of the above to throw, but better to be safe.
			return false;
		}
	}
  
	var objectAssign = shouldUseNative() ? Object.assign : function (target, source) {
		var from;
		var to = toObject(target);
		var symbols;
  
		for (var s = 1; s < arguments.length; s++) {
			from = Object(arguments[s]);
  
			for (var key in from) {
				if (hasOwnProperty.call(from, key)) {
					to[key] = from[key];
				}
			}
  
			if (getOwnPropertySymbols) {
				symbols = getOwnPropertySymbols(from);
				for (var i = 0; i < symbols.length; i++) {
					if (propIsEnumerable.call(from, symbols[i])) {
						to[symbols[i]] = from[symbols[i]];
					}
				}
			}
		}
  
		return to;
	};
  
	var reactorObjectAssign = objectAssign;
  
	/***************************************************************************************
	 * (c) 2017 Adobe. All rights reserved.
	 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
	 * you may not use this file except in compliance with the License. You may obtain a copy
	 * of the License at http://www.apache.org/licenses/LICENSE-2.0
	 *
	 * Unless required by applicable law or agreed to in writing, software distributed under
	 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
	 * OF ANY KIND, either express or implied. See the License for the specific language
	 * governing permissions and limitations under the License.
	 ****************************************************************************************/
  
  
  
  
	/**
	 * Normalizes a synthetic event so that it exists and has at least meta.
	 * @param {Object} syntheticEventMeta
	 * @param {Object} [syntheticEvent]
	 * @returns {Object}
	 */
	var normalizeSyntheticEvent = function (syntheticEventMeta, syntheticEvent) {
	  syntheticEvent = syntheticEvent || {};
	  reactorObjectAssign(syntheticEvent, syntheticEventMeta);
  
	  // Remove after some arbitrary time period when we think users have had sufficient chance
	  // to move away from event.type
	  if (!syntheticEvent.hasOwnProperty('type')) {
		Object.defineProperty(syntheticEvent, 'type', {
		  get: function () {
			logger.warn(
			  'Accessing event.type in Adobe Launch has been deprecated and will be ' +
				'removed soon. Please use event.$type instead.'
			);
			return syntheticEvent.$type;
		  }
		});
	  }
  
	  return syntheticEvent;
	};
  
	/***************************************************************************************
	 * (c) 2017 Adobe. All rights reserved.
	 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
	 * you may not use this file except in compliance with the License. You may obtain a copy
	 * of the License at http://www.apache.org/licenses/LICENSE-2.0
	 *
	 * Unless required by applicable law or agreed to in writing, software distributed under
	 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
	 * OF ANY KIND, either express or implied. See the License for the specific language
	 * governing permissions and limitations under the License.
	 ****************************************************************************************/
  
	/**
	 * Creates a function that, when called with an extension name and module name, will return the
	 * exports of the respective shared module.
	 *
	 * @param {Object} extensions
	 * @param {Object} moduleProvider
	 * @returns {Function}
	 */
	var createGetSharedModuleExports = function (extensions, moduleProvider) {
	  return function (extensionName, moduleName) {
		var extension = extensions[extensionName];
  
		if (extension) {
		  var modules = extension.modules;
		  if (modules) {
			var referencePaths = Object.keys(modules);
			for (var i = 0; i < referencePaths.length; i++) {
			  var referencePath = referencePaths[i];
			  var module = modules[referencePath];
			  if (module.shared && module.name === moduleName) {
				return moduleProvider.getModuleExports(referencePath);
			  }
			}
		  }
		}
	  };
	};
  
	/***************************************************************************************
	 * (c) 2017 Adobe. All rights reserved.
	 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
	 * you may not use this file except in compliance with the License. You may obtain a copy
	 * of the License at http://www.apache.org/licenses/LICENSE-2.0
	 *
	 * Unless required by applicable law or agreed to in writing, software distributed under
	 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
	 * OF ANY KIND, either express or implied. See the License for the specific language
	 * governing permissions and limitations under the License.
	 ****************************************************************************************/
  
	/**
	 * Creates a function that, when called, will return a configuration object with data element
	 * tokens replaced.
	 *
	 * @param {Object} settings
	 * @returns {Function}
	 */
	var createGetExtensionSettings = function (replaceTokens, settings) {
	  return function () {
		return settings ? replaceTokens(settings) : {};
	  };
	};
  
	/***************************************************************************************
	 * (c) 2017 Adobe. All rights reserved.
	 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
	 * you may not use this file except in compliance with the License. You may obtain a copy
	 * of the License at http://www.apache.org/licenses/LICENSE-2.0
	 *
	 * Unless required by applicable law or agreed to in writing, software distributed under
	 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
	 * OF ANY KIND, either express or implied. See the License for the specific language
	 * governing permissions and limitations under the License.
	 ****************************************************************************************/
  
	/**
	 * Creates a function that, when called, will return the full hosted lib file URL.
	 *
	 * @param {string} hostedLibFilesBaseUrl
	 * @returns {Function}
	 */
  
	var createGetHostedLibFileUrl = function (hostedLibFilesBaseUrl, minified) {
	  return function (file) {
		if (minified) {
		  var fileParts = file.split('.');
		  fileParts.splice(fileParts.length - 1 || 1, 0, 'min');
		  file = fileParts.join('.');
		}
  
		return hostedLibFilesBaseUrl + file;
	  };
	};
  
	/***************************************************************************************
	 * (c) 2017 Adobe. All rights reserved.
	 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
	 * you may not use this file except in compliance with the License. You may obtain a copy
	 * of the License at http://www.apache.org/licenses/LICENSE-2.0
	 *
	 * Unless required by applicable law or agreed to in writing, software distributed under
	 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
	 * OF ANY KIND, either express or implied. See the License for the specific language
	 * governing permissions and limitations under the License.
	 ****************************************************************************************/
  
	var JS_EXTENSION = '.js';
  
	/**
	 * @private
	 * Returns the directory of a path. A limited version of path.dirname in nodejs.
	 *
	 * To keep it simple, it makes the following assumptions:
	 * path has a least one slash
	 * path does not end with a slash
	 * path does not have empty segments (e.g., /src/lib//foo.bar)
	 *
	 * @param {string} path
	 * @returns {string}
	 */
	var dirname = function (path) {
	  return path.substr(0, path.lastIndexOf('/'));
	};
  
	/**
	 * Determines if a string ends with a certain string.
	 * @param {string} str The string to test.
	 * @param {string} suffix The suffix to look for at the end of str.
	 * @returns {boolean} Whether str ends in suffix.
	 */
	var endsWith = function (str, suffix) {
	  return str.indexOf(suffix, str.length - suffix.length) !== -1;
	};
  
	/**
	 * Given a starting path and a path relative to the starting path, returns the final path. A
	 * limited version of path.resolve in nodejs.
	 *
	 * To keep it simple, it makes the following assumptions:
	 * fromPath has at least one slash
	 * fromPath does not end with a slash.
	 * fromPath does not have empty segments (e.g., /src/lib//foo.bar)
	 * relativePath starts with ./ or ../
	 *
	 * @param {string} fromPath
	 * @param {string} relativePath
	 * @returns {string}
	 */
	var resolveRelativePath = function (fromPath, relativePath) {
	  // Handle the case where the relative path does not end in the .js extension. We auto-append it.
	  if (!endsWith(relativePath, JS_EXTENSION)) {
		relativePath = relativePath + JS_EXTENSION;
	  }
  
	  var relativePathSegments = relativePath.split('/');
	  var resolvedPathSegments = dirname(fromPath).split('/');
  
	  relativePathSegments.forEach(function (relativePathSegment) {
		if (!relativePathSegment || relativePathSegment === '.') {
		  return;
		} else if (relativePathSegment === '..') {
		  if (resolvedPathSegments.length) {
			resolvedPathSegments.pop();
		  }
		} else {
		  resolvedPathSegments.push(relativePathSegment);
		}
	  });
  
	  return resolvedPathSegments.join('/');
	};
  
	var reactorDocument = document;
  
	var getPromise = function(url, script) {
	  return new reactorPromise(function(resolve, reject) {
		script.onload = function() {
		  resolve(script);
		};
  
		script.onerror = function() {
		  reject(new Error('Failed to load script ' + url));
		};
	  });
	};
  
	var reactorLoadScript = function(url) {
	  var script = document.createElement('script');
	  script.src = url;
	  script.async = true;
  
	  var promise = getPromise(url, script);
  
	  document.getElementsByTagName('head')[0].appendChild(script);
	  return promise;
	};
  
	// Copyright Joyent, Inc. and other Node contributors.
  
	// If obj.hasOwnProperty has been overridden, then calling
	// obj.hasOwnProperty(prop) will break.
	// See: https://github.com/joyent/node/issues/1707
	function hasOwnProperty$1(obj, prop) {
	  return Object.prototype.hasOwnProperty.call(obj, prop);
	}
  
	var decode = function(qs, sep, eq, options) {
	  sep = sep || '&';
	  eq = eq || '=';
	  var obj = {};
  
	  if (typeof qs !== 'string' || qs.length === 0) {
		return obj;
	  }
  
	  var regexp = /\+/g;
	  qs = qs.split(sep);
  
	  var maxKeys = 1000;
	  if (options && typeof options.maxKeys === 'number') {
		maxKeys = options.maxKeys;
	  }
  
	  var len = qs.length;
	  // maxKeys <= 0 means that we should not limit keys count
	  if (maxKeys > 0 && len > maxKeys) {
		len = maxKeys;
	  }
  
	  for (var i = 0; i < len; ++i) {
		var x = qs[i].replace(regexp, '%20'),
			idx = x.indexOf(eq),
			kstr, vstr, k, v;
  
		if (idx >= 0) {
		  kstr = x.substr(0, idx);
		  vstr = x.substr(idx + 1);
		} else {
		  kstr = x;
		  vstr = '';
		}
  
		k = decodeURIComponent(kstr);
		v = decodeURIComponent(vstr);
  
		if (!hasOwnProperty$1(obj, k)) {
		  obj[k] = v;
		} else if (Array.isArray(obj[k])) {
		  obj[k].push(v);
		} else {
		  obj[k] = [obj[k], v];
		}
	  }
  
	  return obj;
	};
  
	// Copyright Joyent, Inc. and other Node contributors.
  
	var stringifyPrimitive = function(v) {
	  switch (typeof v) {
		case 'string':
		  return v;
  
		case 'boolean':
		  return v ? 'true' : 'false';
  
		case 'number':
		  return isFinite(v) ? v : '';
  
		default:
		  return '';
	  }
	};
  
	var encode = function(obj, sep, eq, name) {
	  sep = sep || '&';
	  eq = eq || '=';
	  if (obj === null) {
		obj = undefined;
	  }
  
	  if (typeof obj === 'object') {
		return Object.keys(obj).map(function(k) {
		  var ks = encodeURIComponent(stringifyPrimitive(k)) + eq;
		  if (Array.isArray(obj[k])) {
			return obj[k].map(function(v) {
			  return ks + encodeURIComponent(stringifyPrimitive(v));
			}).join(sep);
		  } else {
			return ks + encodeURIComponent(stringifyPrimitive(obj[k]));
		  }
		}).join(sep);
  
	  }
  
	  if (!name) return '';
	  return encodeURIComponent(stringifyPrimitive(name)) + eq +
			 encodeURIComponent(stringifyPrimitive(obj));
	};
  
	var querystring = createCommonjsModule(function (module, exports) {
  
	exports.decode = exports.parse = decode;
	exports.encode = exports.stringify = encode;
	});
	var querystring_1 = querystring.decode;
	var querystring_2 = querystring.parse;
	var querystring_3 = querystring.encode;
	var querystring_4 = querystring.stringify;
  
	// We proxy the underlying querystring module so we can limit the API we expose.
	// This allows us to more easily make changes to the underlying implementation later without
	// having to worry about breaking extensions. If extensions demand additional functionality, we
	// can make adjustments as needed.
	var reactorQueryString = {
	  parse: function(string) {
		//
		if (typeof string === 'string') {
		  // Remove leading ?, #, & for some leniency so you can pass in location.search or
		  // location.hash directly.
		  string = string.trim().replace(/^[?#&]/, '');
		}
		return querystring.parse(string);
	  },
	  stringify: function(object) {
		return querystring.stringify(object);
	  }
	};
  
	/***************************************************************************************
	 * (c) 2017 Adobe. All rights reserved.
	 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
	 * you may not use this file except in compliance with the License. You may obtain a copy
	 * of the License at http://www.apache.org/licenses/LICENSE-2.0
	 *
	 * Unless required by applicable law or agreed to in writing, software distributed under
	 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
	 * OF ANY KIND, either express or implied. See the License for the specific language
	 * governing permissions and limitations under the License.
	 ****************************************************************************************/
  
	var CORE_MODULE_PREFIX = '@adobe/reactor-';
  
	var modules = {
	  cookie: reactorCookie,
	  document: reactorDocument,
	  'load-script': reactorLoadScript,
	  'object-assign': reactorObjectAssign,
	  promise: reactorPromise,
	  'query-string': reactorQueryString,
	  window: reactorWindow
	};
  
	/**
	 * Creates a function which can be passed as a "require" function to extension modules.
	 *
	 * @param {Function} getModuleExportsByRelativePath
	 * @returns {Function}
	 */
	var createPublicRequire = function (getModuleExportsByRelativePath) {
	  return function (key) {
		if (key.indexOf(CORE_MODULE_PREFIX) === 0) {
		  var keyWithoutScope = key.substr(CORE_MODULE_PREFIX.length);
		  var module = modules[keyWithoutScope];
  
		  if (module) {
			return module;
		  }
		}
  
		if (key.indexOf('./') === 0 || key.indexOf('../') === 0) {
		  return getModuleExportsByRelativePath(key);
		}
  
		throw new Error('Cannot resolve module "' + key + '".');
	  };
	};
  
	/***************************************************************************************
	 * (c) 2017 Adobe. All rights reserved.
	 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
	 * you may not use this file except in compliance with the License. You may obtain a copy
	 * of the License at http://www.apache.org/licenses/LICENSE-2.0
	 *
	 * Unless required by applicable law or agreed to in writing, software distributed under
	 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
	 * OF ANY KIND, either express or implied. See the License for the specific language
	 * governing permissions and limitations under the License.
	 ****************************************************************************************/
  
  
  
  
  
  
  
  
	var hydrateModuleProvider = function (
	  container,
	  moduleProvider,
	  debugController,
	  replaceTokens,
	  getDataElementValue
	) {
	  var extensions = container.extensions;
	  var buildInfo = container.buildInfo;
	  var propertySettings = container.property.settings;
  
	  if (extensions) {
		var getSharedModuleExports = createGetSharedModuleExports(
		  extensions,
		  moduleProvider
		);
  
		Object.keys(extensions).forEach(function (extensionName) {
		  var extension = extensions[extensionName];
		  var getExtensionSettings = createGetExtensionSettings(
			replaceTokens,
			extension.settings
		  );
  
		  if (extension.modules) {
			var prefixedLogger = logger.createPrefixedLogger(extension.displayName);
			var getHostedLibFileUrl = createGetHostedLibFileUrl(
			  extension.hostedLibFilesBaseUrl,
			  buildInfo.minified
			);
			var turbine = {
			  buildInfo: buildInfo,
			  getDataElementValue: getDataElementValue,
			  getExtensionSettings: getExtensionSettings,
			  getHostedLibFileUrl: getHostedLibFileUrl,
			  getSharedModule: getSharedModuleExports,
			  logger: prefixedLogger,
			  propertySettings: propertySettings,
			  replaceTokens: replaceTokens,
			  onDebugChanged: debugController.onDebugChanged,
			  get debugEnabled() {
				return debugController.getDebugEnabled();
			  }
			};
  
			Object.keys(extension.modules).forEach(function (referencePath) {
			  var module = extension.modules[referencePath];
			  var getModuleExportsByRelativePath = function (relativePath) {
				var resolvedReferencePath = resolveRelativePath(
				  referencePath,
				  relativePath
				);
				return moduleProvider.getModuleExports(resolvedReferencePath);
			  };
			  var publicRequire = createPublicRequire(
				getModuleExportsByRelativePath
			  );
  
			  moduleProvider.registerModule(
				referencePath,
				module,
				extensionName,
				publicRequire,
				turbine
			  );
			});
		  }
		});
  
		// We want to extract the module exports immediately to allow the modules
		// to run some logic immediately.
		// We need to do the extraction here in order for the moduleProvider to
		// have all the modules previously registered. (eg. when moduleA needs moduleB, both modules
		// must exist inside moduleProvider).
		moduleProvider.hydrateCache();
	  }
	  return moduleProvider;
	};
  
	/***************************************************************************************
	 * (c) 2017 Adobe. All rights reserved.
	 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
	 * you may not use this file except in compliance with the License. You may obtain a copy
	 * of the License at http://www.apache.org/licenses/LICENSE-2.0
	 *
	 * Unless required by applicable law or agreed to in writing, software distributed under
	 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
	 * OF ANY KIND, either express or implied. See the License for the specific language
	 * governing permissions and limitations under the License.
	 ****************************************************************************************/
  
  
  
  
	var hydrateSatelliteObject = function (
	  _satellite,
	  container,
	  setDebugEnabled,
	  getVar,
	  setCustomVar
	) {
	  var customScriptPrefixedLogger = logger.createPrefixedLogger('Custom Script');
  
	  // Will get replaced by the directCall event delegate from the Core extension. Exists here in
	  // case there are no direct call rules (and therefore the directCall event delegate won't get
	  // included) and our customers are still calling the method. In this case, we don't want an error
	  // to be thrown. This method existed before Reactor.
	  _satellite.track = function (identifier) {
		logger.log(
		  '"' + identifier + '" does not match any direct call identifiers.'
		);
	  };
  
	  // Will get replaced by the Marketing Cloud ID extension if installed. Exists here in case
	  // the extension is not installed and our customers are still calling the method. In this case,
	  // we don't want an error to be thrown. This method existed before Reactor.
	  _satellite.getVisitorId = function () {
		return null;
	  };
  
	  // container.property also has property settings, but it shouldn't concern the user.
	  // By limiting our API exposure to necessities, we provide more flexibility in the future.
	  _satellite.property = {
		name: container.property.name
	  };
  
	  _satellite.company = container.company;
  
	  _satellite.buildInfo = container.buildInfo;
  
	  _satellite.logger = customScriptPrefixedLogger;
  
	  /**
	   * Log a message. We keep this due to legacy baggage.
	   * @param {string} message The message to log.
	   * @param {number} [level] A number that represents the level of logging.
	   * 3=info, 4=warn, 5=error, anything else=log
	   */
	  _satellite.notify = function (message, level) {
		logger.warn(
		  '_satellite.notify is deprecated. Please use the `_satellite.logger` API.'
		);
  
		switch (level) {
		  case 3:
			customScriptPrefixedLogger.info(message);
			break;
		  case 4:
			customScriptPrefixedLogger.warn(message);
			break;
		  case 5:
			customScriptPrefixedLogger.error(message);
			break;
		  default:
			customScriptPrefixedLogger.log(message);
		}
	  };
  
	  _satellite.getVar = getVar;
	  _satellite.setVar = setCustomVar;
  
	  /**
	   * Writes a cookie.
	   * @param {string} name The name of the cookie to save.
	   * @param {string} value The value of the cookie to save.
	   * @param {number} [days] The number of days to store the cookie. If not specified, the cookie
	   * will be stored for the session only.
	   */
	  _satellite.setCookie = function (name, value, days) {
		var optionsStr = '';
		var options = {};
  
		if (days) {
		  optionsStr = ', { expires: ' + days + ' }';
		  options.expires = days;
		}
  
		var msg =
		  '_satellite.setCookie is deprecated. Please use ' +
		  '_satellite.cookie.set("' +
		  name +
		  '", "' +
		  value +
		  '"' +
		  optionsStr +
		  ').';
  
		logger.warn(msg);
		reactorCookie.set(name, value, options);
	  };
  
	  /**
	   * Reads a cookie value.
	   * @param {string} name The name of the cookie to read.
	   * @returns {string}
	   */
	  _satellite.readCookie = function (name) {
		logger.warn(
		  '_satellite.readCookie is deprecated. ' +
			'Please use _satellite.cookie.get("' +
			name +
			'").'
		);
		return reactorCookie.get(name);
	  };
  
	  /**
	   * Removes a cookie value.
	   * @param name
	   */
	  _satellite.removeCookie = function (name) {
		logger.warn(
		  '_satellite.removeCookie is deprecated. ' +
			'Please use _satellite.cookie.remove("' +
			name +
			'").'
		);
		reactorCookie.remove(name);
	  };
  
	  _satellite.cookie = reactorCookie;
  
	  // Will get replaced by the pageBottom event delegate from the Core extension. Exists here in
	  // case the customers are not using core (and therefore the pageBottom event delegate won't get
	  // included) and they are still calling the method. In this case, we don't want an error
	  // to be thrown. This method existed before Reactor.
	  _satellite.pageBottom = function () {};
  
	  _satellite.setDebug = setDebugEnabled;
  
	  var warningLogged = false;
  
	  Object.defineProperty(_satellite, '_container', {
		get: function () {
		  if (!warningLogged) {
			logger.warn(
			  '_satellite._container may change at any time and should only ' +
				'be used for debugging.'
			);
			warningLogged = true;
		  }
  
		  return container;
		}
	  });
	};
  
	/***************************************************************************************
	 * (c) 2017 Adobe. All rights reserved.
	 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
	 * you may not use this file except in compliance with the License. You may obtain a copy
	 * of the License at http://www.apache.org/licenses/LICENSE-2.0
	 *
	 * Unless required by applicable law or agreed to in writing, software distributed under
	 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
	 * OF ANY KIND, either express or implied. See the License for the specific language
	 * governing permissions and limitations under the License.
	 ****************************************************************************************/
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
	var _satellite = window._satellite;
  
	if (_satellite && !window.__satelliteLoaded) {
	  // If a consumer loads the library multiple times, make sure only the first time is effective.
	  window.__satelliteLoaded = true;
  
	  var container = _satellite.container;
  
	  // Remove container in public scope ASAP so it can't be manipulated by extension or user code.
	  delete _satellite.container;
  
	  var undefinedVarsReturnEmpty =
		container.property.settings.undefinedVarsReturnEmpty;
	  var ruleComponentSequencingEnabled =
		container.property.settings.ruleComponentSequencingEnabled;
  
	  var dataElements = container.dataElements || {};
  
	  // Remove when migration period has ended.
	  dataElementSafe.migrateCookieData(dataElements);
  
	  var getDataElementDefinition = function (name) {
		return dataElements[name];
	  };
  
	  var moduleProvider = createModuleProvider();
  
	  var replaceTokens;
  
	  // We support data elements referencing other data elements. In order to be able to retrieve a
	  // data element value, we need to be able to replace data element tokens inside its settings
	  // object (which is what replaceTokens is for). In order to be able to replace data element
	  // tokens inside a settings object, we need to be able to retrieve data element
	  // values (which is what getDataElementValue is for). This proxy replaceTokens function solves the
	  // chicken-or-the-egg problem by allowing us to provide a replaceTokens function to
	  // getDataElementValue that will stand in place of the real replaceTokens function until it
	  // can be created. This also means that createDataElementValue should not call the proxy
	  // replaceTokens function until after the real replaceTokens has been created.
	  var proxyReplaceTokens = function () {
		return replaceTokens.apply(null, arguments);
	  };
  
	  var getDataElementValue = createGetDataElementValue(
		moduleProvider,
		getDataElementDefinition,
		proxyReplaceTokens,
		undefinedVarsReturnEmpty
	  );
  
	  var customVars = {};
	  var setCustomVar = createSetCustomVar(customVars);
  
	  var isVar = createIsVar(customVars, getDataElementDefinition);
  
	  var getVar = createGetVar(
		customVars,
		getDataElementDefinition,
		getDataElementValue
	  );
  
	  replaceTokens = createReplaceTokens(isVar, getVar, undefinedVarsReturnEmpty);
  
	  var localStorage = getNamespacedStorage('localStorage');
	  var debugController = createDebugController(localStorage, logger);
  
	  // Important to hydrate satellite object before we hydrate the module provider or init rules.
	  // When we hydrate module provider, we also execute extension code which may be
	  // accessing _satellite.
	  hydrateSatelliteObject(
		_satellite,
		container,
		debugController.setDebugEnabled,
		getVar,
		setCustomVar
	  );
  
	  hydrateModuleProvider(
		container,
		moduleProvider,
		debugController,
		replaceTokens,
		getDataElementValue
	  );
  
	  var notifyMonitors = createNotifyMonitors(_satellite);
	  var executeDelegateModule = createExecuteDelegateModule(
		moduleProvider,
		replaceTokens
	  );
  
	  var getModuleDisplayNameByRuleComponent = createGetModuleDisplayNameByRuleComponent(
		moduleProvider
	  );
	  var logConditionNotMet = createLogConditionNotMet(
		getModuleDisplayNameByRuleComponent,
		logger,
		notifyMonitors
	  );
	  var logConditionError = createLogConditionError(
		getRuleComponentErrorMessage,
		getModuleDisplayNameByRuleComponent,
		logger,
		notifyMonitors
	  );
	  var logActionError = createLogActionError(
		getRuleComponentErrorMessage,
		getModuleDisplayNameByRuleComponent,
		logger,
		notifyMonitors
	  );
	  var logRuleCompleted = createLogRuleCompleted(logger, notifyMonitors);
  
	  var evaluateConditions = createEvaluateConditions(
		executeDelegateModule,
		isConditionMet,
		logConditionNotMet,
		logConditionError
	  );
	  var runActions = createRunActions(
		executeDelegateModule,
		logActionError,
		logRuleCompleted
	  );
	  var executeRule = createExecuteRule(evaluateConditions, runActions);
  
	  var addConditionToQueue = createAddConditionToQueue(
		executeDelegateModule,
		normalizeRuleComponentError,
		isConditionMet,
		logConditionError,
		logConditionNotMet
	  );
	  var addActionToQueue = createAddActionToQueue(
		executeDelegateModule,
		normalizeRuleComponentError,
		logActionError
	  );
	  var addRuleToQueue = createAddRuleToQueue(
		addConditionToQueue,
		addActionToQueue,
		logRuleCompleted
	  );
  
	  var triggerRule = createTriggerRule(
		ruleComponentSequencingEnabled,
		executeRule,
		addRuleToQueue,
		notifyMonitors
	  );
  
	  var getSyntheticEventMeta = createGetSyntheticEventMeta(moduleProvider);
  
	  var initEventModule = createInitEventModule(
		triggerRule,
		executeDelegateModule,
		normalizeSyntheticEvent,
		getRuleComponentErrorMessage,
		getSyntheticEventMeta,
		logger
	  );
  
	  initRules(buildRuleExecutionOrder, container.rules || [], initEventModule);
	}
  
	// Rollup's iife option always sets a global with whatever is exported, so we'll set the
	// _satellite global with the same object it already is (we've only modified it).
	var src = _satellite;
  
	return src;
  
  }());
  
var recordPage = require( './init.js' );