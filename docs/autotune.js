(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.autotune = f()}})(function(){var define,module,exports;return (function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
"use strict";
exports.__esModule = true;
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
exports.__esModule = true;
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
    if (state.startExperimentsTimer !== undefined) {
        clearTimeout(state.startExperimentsTimer);
        state.startExperimentsTimer = undefined;
    }
    state.queuedStartedExperiments[theExperiment.name] = theExperiment;
    state.startExperimentsTimer = setTimeout(function () {
        var experiments = util_1.mapObject(state.queuedStartedExperiments, function (e) { return ({
            instanceKey: e.key,
            options: e.options,
            pick: e.pick,
            pickedBest: e.pickedBest
        }); });
        util_1.log("Starting experiments", experiments);
        state.queuedStartedExperiments = {};
        state.startExperimentsTimer = undefined;
        util_1.http("POST", api("/startExperiments"), {
            version: 2,
            appKey: state.appKey,
            experiments: experiments,
            ctx: {
                lang: util_1.getLocalLanguage(),
                tzo: util_1.getTimeZoneOffset()
            }
        }, function () {
            return;
        }, function (e) { return util_1.error("Failed to start experiments", e); });
    }, 100);
}
function completeExperiment(theExperiment, then) {
    if (state.completeExperimentsTimer !== undefined) {
        clearTimeout(state.completeExperimentsTimer);
        state.completeExperimentsTimer = undefined;
    }
    state.queuedCompletedExperiments[theExperiment.name] = theExperiment;
    state.completeExperimentsTimer = setTimeout(function () {
        var experiments = util_1.getOwnPropertyValues(state.queuedCompletedExperiments);
        state.queuedCompletedExperiments = {};
        state.completeExperimentsTimer = undefined;
        var experimentsByKey = {};
        experiments.forEach(function (e) { return (experimentsByKey[e.key] = { pick: e.pick, payoff: e.payoff }); });
        util_1.log("Completing experiments", experimentsByKey);
        function callThen() {
            if (then !== undefined) {
                then();
            }
        }
        util_1.http("POST", api("/completeExperiments"), {
            version: 1,
            appKey: state.appKey,
            experiments: experimentsByKey
        }, function () { return callThen(); }, function (e) {
            util_1.error("Failed to complete experiments", e);
            callThen();
        });
    }, 10);
}
function finishInit(outcomes) {
    try {
        Object.getOwnPropertyNames(outcomes).forEach(function (name) {
            if (state.experiments[name] !== undefined)
                return;
            var _a = outcomes[name], bestOption = _a.bestOption, epsilon = _a.epsilon;
            state.experiments[name] = new Experiment(name, bestOption, epsilon);
        });
        html_1.startHTMLExperiments();
    }
    catch (e) {
        util_1.error("Couldn not finish init", e);
    }
}
function initialize(appKey, then, outcomes) {
    if (outcomes === void 0) { outcomes = undefined; }
    if (state.appKey !== "") {
        util_1.log("Initialized more than once");
        return;
    }
    util_1.log("Initialize", appKey);
    state.appKey = appKey;
    if (outcomes !== undefined) {
        finishInit(outcomes);
        return;
    }
    util_1.http("GET", outcomesUrl(appKey), undefined, function (o) {
        util_1.log("Got outcomes", o);
        finishInit(o);
        then();
    }, function (e) {
        util_1.error("Could not get outcomes", e);
        finishInit({});
        then();
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
    Experiment.prototype.setValueAndStartExperiment = function (value, pickedBest) {
        this.pickedBest = pickedBest;
        if (this.pick === undefined) {
            this.pick = value;
            startExperiment(this);
        }
        return this.pick;
    };
    Experiment.prototype.complete = function (payoff, then) {
        if (payoff === void 0) { payoff = 1; }
        this.payoff = payoff;
        completeExperiment(this, then);
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
        var pickRandom = this.bestOption === undefined || Math.random() < this.epsilon;
        var one;
        if (pickRandom) {
            one = options[Math.floor(Math.random() * options.length)];
        }
        else {
            one = this.bestOption;
        }
        return this.setValueAndStartExperiment(one, !pickRandom);
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
    initialize(config.appKey, function () {
        return;
    }, config.outcomes);
}

},{"./html":1,"./util":3}],3:[function(require,module,exports){
"use strict";
exports.__esModule = true;
var DEBUG = true;
function uuidv4() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
        var r = (Math.random() * 16) | 0;
        var v = c === "x" ? r : (r & 0x3) | 0x8;
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
function http(method, url, data, resolve, reject) {
    if (typeof XMLHttpRequest === "undefined") {
        return reject(new Error("Not running in browser"));
    }
    try {
        var request_1 = new XMLHttpRequest();
        request_1.open(method, url, true);
        request_1.setRequestHeader("Content-Type", "application/json");
        request_1.onerror = function () { return reject(new Error(request_1.statusText)); };
        request_1.onreadystatechange = function () {
            if (request_1.readyState === 4)
                if (request_1.status === 200) {
                    resolve(JSON.parse(request_1.responseText));
                }
                else {
                    reject(new Error("Request failed with status " + request_1.status));
                }
        };
        if (data !== undefined) {
            request_1.send(JSON.stringify(data));
        }
        else {
            request_1.send();
        }
    }
    catch (e) {
        return reject(e);
    }
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
    var h = 0;
    for (var i = 0; i < s.length; i++) {
        var character = s.charCodeAt(i);
        h = (h << 5) - h + character;
        h = h & h;
    }
    return Math.abs(h);
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
