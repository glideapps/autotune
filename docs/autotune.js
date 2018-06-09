(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.autotune = f()}})(function(){var define,module,exports;return (function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var _1 = require(".");
var util_1 = require("./util");
function optionNodeLabelOrText(node) {
    return node.getAttribute("option") || util_1.hash(node.outerHTML).toString();
}
function getTagExperiments() {
    var experiments = {};
    var customTagNodes = document.getElementsByTagName("autotune");
    util_1.each(customTagNodes, function (node) {
        var name = node.getAttribute("experiment") ||
            util_1.hash(node.innerHTML).toString();
        var data = { node: node, options: util_1.map(node.children, optionNodeLabelOrText) };
        var list = experiments[name] || [];
        list.push(data);
        experiments[name] = list;
    });
    return experiments;
}
function getAttributeExperiments() {
    var experiments = {};
    var attributedNodes = document.querySelectorAll("[data-experiment]");
    util_1.each(attributedNodes, function (node) {
        var name = node.getAttribute("data-experiment");
        var option = node.getAttribute("data-option");
        var data = experiments[name];
        if (data === undefined) {
            data = experiments[name] = { options: [], nodes: [] };
        }
        if (data.options.indexOf(option) === -1) {
            data.options.push(option);
        }
        data.nodes.push(node);
    });
    return experiments;
}
function getClassAttributeExperiments() {
    var experiments = {};
    var attributedNodes = document.querySelectorAll("[autotune-class],[data-autotune-class]");
    util_1.each(attributedNodes, function (node) {
        var classesRaw = node.getAttribute("autotune-class") || node.getAttribute("data-autotune-class") || "";
        var classes = classesRaw.split(" ");
        var experimentName = node.getAttribute("autotune-experiment") ||
            node.getAttribute("data-autotune-experiment") ||
            util_1.hash(node.innerHTML) + "-class";
        experiments[experimentName] = { options: classes, node: node };
    });
    return experiments;
}
function startHTMLExperiments() {
    document.addEventListener("DOMContentLoaded", function () {
        gatherAndStartDOMExperiments();
        setupHTMLCompletions();
    });
}
exports.startHTMLExperiments = startHTMLExperiments;
function setupHTMLCompletions() {
    var links = document.querySelectorAll("a[autotune],a[data-autotune]");
    util_1.each(links, function (link) {
        var onclick = link.onclick;
        link.onclick = function (event) {
            event.preventDefault();
            _1.complete(function () {
                if (onclick !== null) {
                    onclick.bind(link)(event);
                }
                else {
                    window.location.href = link.href;
                }
            });
        };
    });
}
function gatherAndStartDOMExperiments() {
    var attributeExperiments = getAttributeExperiments();
    var tagExperiments = getTagExperiments();
    Object.getOwnPropertyNames(attributeExperiments).forEach(function (name) {
        var _a = attributeExperiments[name], options = _a.options, nodes = _a.nodes;
        var choice = _1.oneOf(name, options);
        nodes.forEach(function (node) {
            if (node.getAttribute("data-option") !== choice) {
                node.remove();
            }
        });
    });
    Object.getOwnPropertyNames(tagExperiments).forEach(function (name) {
        var options = {};
        tagExperiments[name].forEach(function (experiment) {
            experiment.options.forEach(function (o) { return (options[o] = null); });
        });
        var choice = _1.oneOf(name, Object.getOwnPropertyNames(options));
        tagExperiments[name].forEach(function (experiment) {
            util_1.map(experiment.node.children, function (x) { return x; })
                .forEach(function (child) {
                if (optionNodeLabelOrText(child) !== choice) {
                    child.remove();
                }
            });
        });
    });
    var classExperiments = getClassAttributeExperiments();
    Object.getOwnPropertyNames(classExperiments).forEach(function (name) {
        var experiment = classExperiments[name];
        var pick = _1.oneOf(name, experiment.options);
        experiment.node.classList.add(pick);
    });
}

},{".":2,"./util":3}],2:[function(require,module,exports){
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = y[op[0] & 2 ? "return" : op[0] ? "throw" : "next"]) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [0, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var html_1 = require("./html");
var util_1 = require("./util");
function api(path) {
    return "https://2vyiuehl9j.execute-api.us-east-2.amazonaws.com/prod/" + path;
}
function outcomesUrl(appKey) {
    return "https://s3.us-east-2.amazonaws.com/autotune-outcomes/" + appKey + ".json";
}
var state = {
    appKey: "",
    experiments: {},
    defaultCompletions: {},
    queuedCompletedExperiments: {},
    queuedStartedExperiments: {}
};
function startExperiment(theExperiment) {
    var _this = this;
    if (state.startExperimentsTimer !== undefined) {
        clearTimeout(state.startExperimentsTimer);
        state.startExperimentsTimer = undefined;
    }
    state.queuedStartedExperiments[theExperiment.name] = theExperiment;
    state.startExperimentsTimer = setTimeout(function () { return __awaiter(_this, void 0, void 0, function () {
        var experiments;
        return __generator(this, function (_a) {
            experiments = util_1.mapObject(state.queuedStartedExperiments, function (e) { return ({
                instanceKey: e.key,
                options: e.options,
                pick: e.pick
            }); });
            util_1.log("Starting experiments", experiments);
            state.queuedStartedExperiments = {};
            state.startExperimentsTimer = undefined;
            try {
                util_1.http("POST", api("/startExperiments"), {
                    version: 2,
                    appKey: state.appKey,
                    experiments: experiments,
                    ctx: {
                        lang: util_1.getLocalLanguage(),
                        tzo: util_1.getTimeZoneOffset()
                    }
                });
            }
            catch (e) {
                util_1.error("Failed to start experiments", e);
                return [2];
            }
            return [2];
        });
    }); }, 100);
}
function completeExperiment(theExperiment, then) {
    var _this = this;
    if (state.completeExperimentsTimer !== undefined) {
        clearTimeout(state.completeExperimentsTimer);
        state.completeExperimentsTimer = undefined;
    }
    state.queuedCompletedExperiments[theExperiment.name] = theExperiment;
    state.completeExperimentsTimer = setTimeout(function () { return __awaiter(_this, void 0, void 0, function () {
        var experiments, experimentsByKey, e_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    experiments = util_1.getOwnPropertyValues(state.queuedCompletedExperiments);
                    state.queuedCompletedExperiments = {};
                    state.completeExperimentsTimer = undefined;
                    experimentsByKey = {};
                    experiments.forEach(function (e) { return (experimentsByKey[e.key] = { pick: e.pick, payoff: e.payoff }); });
                    util_1.log("Completing experiments", experimentsByKey);
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, 4, 5]);
                    return [4, util_1.http("POST", api("/completeExperiments"), {
                            version: 1,
                            appKey: state.appKey,
                            experiments: experimentsByKey
                        })];
                case 2:
                    _a.sent();
                    return [3, 5];
                case 3:
                    e_1 = _a.sent();
                    util_1.error("Failed to complete experiments", e_1);
                    return [3, 5];
                case 4:
                    if (then !== undefined) {
                        then();
                    }
                    return [7];
                case 5: return [2];
            }
        });
    }); }, 10);
}
function initialize(appKey, outcomes) {
    if (outcomes === void 0) { outcomes = undefined; }
    return __awaiter(this, void 0, void 0, function () {
        var e_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    util_1.log("Initialize", appKey);
                    state.appKey = appKey;
                    if (!(outcomes === undefined)) return [3, 4];
                    outcomes = {};
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4, util_1.http("GET", outcomesUrl(appKey))];
                case 2:
                    outcomes = _a.sent();
                    util_1.log("Got outcomes", outcomes);
                    return [3, 4];
                case 3:
                    e_2 = _a.sent();
                    util_1.error("Could not get outcomes", e_2);
                    return [3, 4];
                case 4:
                    Object.getOwnPropertyNames(outcomes).forEach(function (name) {
                        if (state.experiments[name] !== undefined)
                            return;
                        var _a = outcomes[name], bestOption = _a.bestOption, epsilon = _a.epsilon;
                        state.experiments[name] = new Experiment(name, bestOption, epsilon);
                    });
                    html_1.startHTMLExperiments();
                    return [2];
            }
        });
    });
}
exports.initialize = initialize;
function experiment(name) {
    var ex = state.experiments[name];
    if (ex === undefined) {
        ex = state.experiments[name] = new Experiment(name);
    }
    return ex;
}
var Experiment = (function () {
    function Experiment(name, bestOption, epsilon) {
        if (bestOption === void 0) { bestOption = undefined; }
        if (epsilon === void 0) { epsilon = 1; }
        this.name = name;
        this.bestOption = bestOption;
        this.epsilon = epsilon;
        this.key = util_1.uuidv4();
    }
    Experiment.prototype.setValueAndStartExperiment = function (value) {
        if (this.pick === undefined) {
            this.pick = value;
            startExperiment(this);
        }
        return this.pick;
    };
    Experiment.prototype.complete = function (payoff, then) {
        if (payoff === void 0) { payoff = 1; }
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                this.payoff = payoff;
                completeExperiment(this, then);
                return [2];
            });
        });
    };
    Experiment.prototype.flipCoin = function () {
        return this.oneOf("true", "false") === "true";
    };
    Experiment.prototype.oneOf = function () {
        var options = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            options[_i] = arguments[_i];
        }
        this.options = options;
        var one;
        if (this.bestOption === undefined || Math.random() < this.epsilon) {
            one = options[Math.floor(Math.random() * options.length)];
        }
        else {
            one = this.bestOption;
        }
        return this.setValueAndStartExperiment(one);
    };
    return Experiment;
}());
exports.Experiment = Experiment;
function flipCoin(experimentName) {
    var ex = experiment(experimentName);
    state.defaultCompletions[experimentName] = ex;
    return ex.flipCoin();
}
exports.flipCoin = flipCoin;
function oneOf(experimentName, options) {
    var ex = experiment(experimentName);
    state.defaultCompletions[experimentName] = ex;
    var optionsIsArray = Object.prototype.toString.call(options) === "[object Array]";
    if (optionsIsArray) {
        return ex.oneOf.apply(ex, options);
    }
    else {
        var choice = ex.oneOf.apply(ex, Object.getOwnPropertyNames(options));
        return options[choice];
    }
}
exports.oneOf = oneOf;
function complete(scoreOrThen, maybeThen) {
    var score;
    if (typeof scoreOrThen === "number") {
        score = scoreOrThen;
    }
    else {
        score = 1;
    }
    var then;
    if (typeof scoreOrThen === "function") {
        then = scoreOrThen;
    }
    else {
        then = maybeThen;
    }
    var completions = state.defaultCompletions;
    Object.getOwnPropertyNames(completions).forEach(function (name) { return completions[name].complete(score, then); });
}
exports.complete = complete;
if (typeof window !== "undefined" && typeof window.autotuneConfig !== "undefined") {
    var config = window.autotuneConfig;
    initialize(config.appKey, config.outcomes);
}

},{"./html":1,"./util":3}],3:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var DEBUG = true;
function uuidv4() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
        var r = (Math.random() * 16) | 0;
        var v = c == "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}
exports.uuidv4 = uuidv4;
function log() {
    var args = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        args[_i] = arguments[_i];
    }
    if (DEBUG) {
        console.log.apply(console, ["AUTOTUNE"].concat(args));
    }
}
exports.log = log;
function error() {
    var args = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        args[_i] = arguments[_i];
    }
    if (DEBUG) {
        console.error.apply(console, ["AUTOTUNE"].concat(args));
    }
}
exports.error = error;
function getOwnPropertyValues(x) {
    return Object.getOwnPropertyNames(x).map(function (n) { return x[n]; });
}
exports.getOwnPropertyValues = getOwnPropertyValues;
function mapObject(x, f) {
    var result = {};
    Object.getOwnPropertyNames(x).forEach(function (n) { return (result[n] = f(x[n], n)); });
    return result;
}
exports.mapObject = mapObject;
function http(method, url, data) {
    if (data === void 0) { data = undefined; }
    return new Promise(function (resolve, reject) {
        if (typeof XMLHttpRequest === "undefined") {
            return reject("Not running in browser");
        }
        var request = new XMLHttpRequest();
        request.open(method, url, true);
        request.setRequestHeader("Content-Type", "application/json");
        request.onerror = function () { return reject(request.statusText); };
        request.onreadystatechange = function () {
            if (request.readyState == 4)
                if (request.status == 200) {
                    resolve(JSON.parse(request.responseText));
                }
                else {
                    reject("Request failed with status " + request.status);
                }
        };
        if (data !== undefined) {
            request.send(JSON.stringify(data));
        }
        else {
            request.send();
        }
    });
}
exports.http = http;
function map(collection, f) {
    var results = [];
    for (var i = 0; i < collection.length; i++) {
        results.push(f(collection.item(i), i));
    }
    return results;
}
exports.map = map;
function each(collection, f) {
    map(collection, function (e, i) {
        f(e, i);
        return undefined;
    });
}
exports.each = each;
function hash(s) {
    var hash = 0;
    for (var i = 0; i < s.length; i++) {
        var character = s.charCodeAt(i);
        hash = (hash << 5) - hash + character;
        hash = hash & hash;
    }
    return Math.abs(hash);
}
exports.hash = hash;
function getLocalLanguage() {
    try {
        var n = navigator;
        return n.language || n.userLanguage;
    }
    catch (_a) {
        return undefined;
    }
}
exports.getLocalLanguage = getLocalLanguage;
function getTimeZoneOffset() {
    return new Date().getTimezoneOffset();
}
exports.getTimeZoneOffset = getTimeZoneOffset;

},{}]},{},[2])(2)
});
