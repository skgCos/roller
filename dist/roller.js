'use strict';

var rollup = require('rollup');
var path = require('path');

function _interopNamespace(e) {
    if (e && e.__esModule) return e;
    var n = Object.create(null);
    if (e) {
        Object.keys(e).forEach(function (k) {
            if (k !== 'default') {
                var d = Object.getOwnPropertyDescriptor(e, k);
                Object.defineProperty(n, k, d.get ? d : {
                    enumerable: true,
                    get: function () { return e[k]; }
                });
            }
        });
    }
    n["default"] = e;
    return Object.freeze(n);
}

var rollup__namespace = /*#__PURE__*/_interopNamespace(rollup);
var path__namespace = /*#__PURE__*/_interopNamespace(path);

/*! *****************************************************************************
Copyright (c) Microsoft Corporation.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
***************************************************************************** */

function __awaiter(thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
}

function __generator(thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
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
}

var DependencyTreeEntry = /** @class */ (function () {
    function DependencyTreeEntry(entryPath) {
        this.entryPath = entryPath;
        this.dependents = new Array();
    }
    return DependencyTreeEntry;
}());
var DependencyTree = /** @class */ (function () {
    function DependencyTree(entryPathToLabels) {
        this.rootNode = new DependencyTreeEntry("");
        this.nodeMap = new Map();
        this.entryPathToLabels = entryPathToLabels;
    }
    DependencyTree.prototype.addNode = function (entryPath) {
        var node = this.nodeMap.get(entryPath);
        // If this is not prent in map, add it;
        if (node == undefined) {
            node = new DependencyTreeEntry(entryPath);
            this.nodeMap.set(entryPath, node);
        }
        var labelMap = this.entryPathToLabels.get(entryPath);
        // If has no dependencies
        if (labelMap == undefined) {
            // Check if it's already there
            if (!this.rootNode.dependents.includes(node)) {
                // Add to root node
                this.rootNode.dependents.push(node);
            }
        }
        else {
            // For each dependency
            var labelIterator = labelMap.entries();
            for (var label = labelIterator.next(); !label.done; label = labelIterator.next()) {
                var dependency = label.value[1];
                var dependencyNode = this.nodeMap.get(dependency.absPathToRequiredEntryPoint);
                if (dependencyNode != undefined) {
                    // Get dependecy from map and add its path to it's dependants
                    // Check if it's already there 
                    if (!dependencyNode.dependents.includes(node)) {
                        dependencyNode.dependents.push(node);
                    }
                }
                else {
                    // If it's not there create a new node
                    this.addNode(dependency.absPathToRequiredEntryPoint);
                    // After making one, add to it's dependecies
                    dependencyNode = this.nodeMap.get(dependency.absPathToRequiredEntryPoint);
                    if (dependencyNode == undefined) {
                        throw new Error("Unexpected undefined while trying to get dependant nodes");
                    }
                    if (!dependencyNode.dependents.includes(node)) {
                        dependencyNode.dependents.push(node);
                    }
                }
            }
        }
    };
    DependencyTree.prototype.getOrderedBuildOrderList = function () {
        this.buildOrderList = new Array();
        this.addDependentsToBuildList(this.rootNode);
        return this.buildOrderList;
    };
    DependencyTree.prototype.addDependentsToBuildList = function (node) {
        // No dependents, return
        if (node.dependents.length == 0) {
            return;
        }
        for (var _i = 0, _a = node.dependents; _i < _a.length; _i++) {
            var dependent = _a[_i];
            if (!this.buildOrderList.includes(dependent.entryPath)) {
                this.buildOrderList.push(dependent.entryPath);
            }
        }
        // Add all dependents and recurse throught them
        for (var _b = 0, _c = node.dependents; _b < _c.length; _b++) {
            var dependent = _c[_b];
            this.addDependentsToBuildList(dependent);
        }
    };
    return DependencyTree;
}());

var colors = require('colors');
colors.enable();
var loadConfigFile = require('rollup/dist/loadConfigFile');
var configMap = new Map(); // Entry Path -> [All possible out configs]
var entryPathToLabels = new Map(); // entry path -> <label name, {requested file id, abs path to requested bundle}>
// TODO: find a way to associate inputs to multiple outputs, and keeping track of substitutions
// const entryPathToOutPath = new Map<string, Array<string>>();
var entryPathToOutPath = new Map(); // Entry path -> out path
var failedBuildsMap = new Map(); // entry path -> reason of failure
// Not really needed
var submoduleToParent = new Map(); // Associates absolute paths of submodules to its parent
var filesToWatch = new Array();
var endOfAllBuildCallback;
var endOfSingleBuildCallbackMap = new Map(); // <inPath, end callback>
function logger(msg) {
    console.log(colors.grey("[roller]:", msg));
}
function loggerError(msg) {
    console.log(colors.red("[roller]:", msg));
}
function roller(setupFunction, postBuildCb) {
    return __awaiter(this, void 0, void 0, function () {
        var it, elem, currConfigs, _i, currConfigs_1, singleConfig, it2, i, e_1, depTree, allBundleIterator, bundle, buildOrder, _a, buildOrder_1, bundleEntryPath, e_2, failedBuildIterator, singleFailedElem;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    if (setupFunction == undefined && postBuildCb) {
                        return [2 /*return*/];
                    }
                    console.clear();
                    // Setup configurations
                    logger("Setting up configurations...");
                    if (setupFunction != undefined) {
                        setupFunction(process.env, buildRecipe, buildSubrecipe);
                    }
                    // Verify configurations
                    logger("Verifying configurations...");
                    it = configMap.entries();
                    elem = it.next();
                    _b.label = 1;
                case 1:
                    if (!!elem.done) return [3 /*break*/, 6];
                    currConfigs = elem.value[1];
                    _i = 0, currConfigs_1 = currConfigs;
                    _b.label = 2;
                case 2:
                    if (!(_i < currConfigs_1.length)) return [3 /*break*/, 5];
                    singleConfig = currConfigs_1[_i];
                    return [4 /*yield*/, singleConfig];
                case 3:
                    if ((_b.sent()).warnings != undefined) {
                        throw new Error("Warning in imported rollup configuration " +
                            elem.value[1]);
                    }
                    _b.label = 4;
                case 4:
                    _i++;
                    return [3 /*break*/, 2];
                case 5:
                    elem = it.next();
                    return [3 /*break*/, 1];
                case 6:
                    // Build all bundles
                    logger("Building all bundles...");
                    it2 = configMap.entries();
                    i = 0;
                    elem = it2.next();
                    _b.label = 7;
                case 7:
                    if (!!elem.done) return [3 /*break*/, 12];
                    _b.label = 8;
                case 8:
                    _b.trys.push([8, 10, , 11]);
                    return [4 /*yield*/, buildBundleFromEntryPath(elem.value[0], false, false, false)];
                case 9:
                    _b.sent();
                    logger("".concat(++i, "/").concat(configMap.size, " '").concat(path__namespace.basename(elem.value[0]), "' completed..."));
                    return [3 /*break*/, 11];
                case 10:
                    e_1 = _b.sent();
                    // Build has failed
                    loggerError("Build Failed: " + elem.value[0]);
                    // Add to failed builds
                    failedBuildsMap.set(elem.value[0], e_1);
                    return [3 /*break*/, 11];
                case 11:
                    elem = it2.next();
                    return [3 /*break*/, 7];
                case 12:
                    // Create dependecy tree
                    logger("Generating dependency tree...");
                    depTree = new DependencyTree(entryPathToLabels);
                    allBundleIterator = configMap.entries();
                    for (bundle = allBundleIterator.next(); !bundle.done; bundle = allBundleIterator.next()) {
                        depTree.addNode(bundle.value[0]);
                    }
                    buildOrder = depTree.getOrderedBuildOrderList();
                    // Rebuild all files that are in the entrypath to labels map
                    logger("Updating imports and emitting bundles...");
                    i = 0;
                    _a = 0, buildOrder_1 = buildOrder;
                    _b.label = 13;
                case 13:
                    if (!(_a < buildOrder_1.length)) return [3 /*break*/, 18];
                    bundleEntryPath = buildOrder_1[_a];
                    i++;
                    // Check if build has previously failed
                    if (failedBuildsMap.has(bundleEntryPath)) {
                        loggerError("[".concat(i, "/").concat(buildOrder.length, "]: FAILED. Linking of file '").concat(bundleEntryPath, "' has failed due to its build having failed in the previous step"));
                        callEndBuildCallback(false, bundleEntryPath);
                        return [3 /*break*/, 17];
                    }
                    _b.label = 14;
                case 14:
                    _b.trys.push([14, 16, , 17]);
                    return [4 /*yield*/, buildBundleFromEntryPath(bundleEntryPath, true, true, watch !== null && watch !== void 0 ? watch : false)];
                case 15:
                    _b.sent();
                    logger("[".concat(i, "/").concat(buildOrder.length, "]: SUCCESS. '").concat(path__namespace.basename(bundleEntryPath), "' completed..."));
                    return [3 /*break*/, 17];
                case 16:
                    e_2 = _b.sent();
                    // Build has failed
                    loggerError("[".concat(i, "/").concat(buildOrder.length, "]: FAILED. Could not link ").concat(bundleEntryPath));
                    loggerError("This usually happens because one of more builds linked to it have previously failed");
                    // Add to failed builds
                    failedBuildsMap.set(bundleEntryPath, e_2);
                    callEndBuildCallback(false, bundleEntryPath);
                    return [3 /*break*/, 17];
                case 17:
                    _a++;
                    return [3 /*break*/, 13];
                case 18:
                    // List failed builds
                    if (failedBuildsMap.size > 0) {
                        console.log(colors.red.bold("====================================================="));
                        loggerError("The following builds have failed");
                        failedBuildIterator = failedBuildsMap.entries();
                        singleFailedElem = failedBuildIterator.next();
                        while (!singleFailedElem.done) {
                            logError(singleFailedElem.value[0], singleFailedElem.value[1]);
                            singleFailedElem = failedBuildIterator.next();
                        }
                        console.log(colors.red.bold("====================================================="));
                        // Remove all failed builds from entryPathToOutPath to show that the files didn't output
                        failedBuildIterator = failedBuildsMap.entries();
                        singleFailedElem = failedBuildIterator.next();
                        while (!singleFailedElem.done) {
                            entryPathToOutPath["delete"](singleFailedElem.value[0]);
                            singleFailedElem = failedBuildIterator.next();
                        }
                    }
                    // Call end of build callback
                    endOfAllBuildCallback = postBuildCb;
                    if (endOfAllBuildCallback != undefined) {
                        logger("Calling end of build callback...");
                        endOfAllBuildCallback(entryPathToOutPath, failedBuildsMap);
                    }
                    console.log(failedBuildsMap.size == 0 ? colors.brightCyan.bold("All done!") : colors.brightRed.bold("Done with errors!"));
                    return [2 /*return*/];
            }
        });
    });
}
function logError(input, error) {
    console.log(colors.magenta.bold("[roller]: ~~~~~~~~~ ".concat(input, " ~~~~~~~~~")));
    if (error.name == undefined) {
        console.log(colors.red.bold("[!] Error"));
        console.log(colors.red(error.error));
        return;
    }
    console.log(colors.red.bold("[!] Error: " + error.message));
    console.log(colors.grey("[" + error.loc.line + ":" + error.loc.column + "] - ") + colors.white.bold(error.id));
    console.log(colors.white(error.frame));
}
function callEndBuildCallback(buildSuccess, entryPath, rollerID) {
    var _a;
    return __awaiter(this, void 0, void 0, function () {
        var configsForCurrBuild, cb, outPaths, outPath, _i, outPaths_1, singleOutPath, _b, configsForCurrBuild_1, singleConfig, _c, _d, singleBundleConf, outPaths, outPath, cb;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0:
                    configsForCurrBuild = configMap.get(entryPath);
                    if (configsForCurrBuild == undefined) {
                        throw new Error("Unexpected undefined in map while calling end of build callbacks");
                    }
                    // If called with a specific roller ID then call that and find the callback
                    if (rollerID != undefined) {
                        cb = endOfSingleBuildCallbackMap.get(entryPath + rollerID);
                        if (cb != undefined) {
                            outPaths = entryPathToOutPath.get(entryPath);
                            outPath = "";
                            if (outPaths != undefined) {
                                for (_i = 0, outPaths_1 = outPaths; _i < outPaths_1.length; _i++) {
                                    singleOutPath = outPaths_1[_i];
                                    if (singleOutPath.id == rollerID) {
                                        outPath = singleOutPath.outPath;
                                        break;
                                    }
                                }
                            }
                            cb(buildSuccess, entryPath, outPath);
                        }
                        return [2 /*return*/];
                    }
                    _b = 0, configsForCurrBuild_1 = configsForCurrBuild;
                    _e.label = 1;
                case 1:
                    if (!(_b < configsForCurrBuild_1.length)) return [3 /*break*/, 6];
                    singleConfig = configsForCurrBuild_1[_b];
                    _c = 0;
                    return [4 /*yield*/, singleConfig];
                case 2:
                    _d = (_e.sent()).options.options;
                    _e.label = 3;
                case 3:
                    if (!(_c < _d.length)) return [3 /*break*/, 5];
                    singleBundleConf = _d[_c];
                    outPaths = entryPathToOutPath.get(entryPath);
                    outPath = "";
                    if (outPaths != undefined) {
                        outPath = outPaths[0].outPath;
                    }
                    cb = endOfSingleBuildCallbackMap.get(entryPath + ((_a = singleBundleConf.output.rollerID) !== null && _a !== void 0 ? _a : ""));
                    if (cb != undefined) {
                        cb(buildSuccess, entryPath, outPath);
                    }
                    _e.label = 4;
                case 4:
                    _c++;
                    return [3 /*break*/, 3];
                case 5:
                    _b++;
                    return [3 /*break*/, 1];
                case 6: return [2 /*return*/];
            }
        });
    });
}
function buildBundleFromEntryPath(entryPath, writeOnDisk, replaceLabels, watchModeEnabled) {
    return __awaiter(this, void 0, void 0, function () {
        var configsForCurrBuild, _i, configsForCurrBuild_2, singleConfig, _a, _b, singleBundleConf, allOuts, _c, allOuts_1, singleOut;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    configsForCurrBuild = configMap.get(entryPath);
                    if (configsForCurrBuild == undefined) {
                        throw new Error("Unexpected undefined in map while rebuilding: " + entryPath);
                    }
                    _i = 0, configsForCurrBuild_2 = configsForCurrBuild;
                    _d.label = 1;
                case 1:
                    if (!(_i < configsForCurrBuild_2.length)) return [3 /*break*/, 22];
                    singleConfig = configsForCurrBuild_2[_i];
                    _a = 0;
                    return [4 /*yield*/, singleConfig];
                case 2:
                    _b = (_d.sent()).options.options;
                    _d.label = 3;
                case 3:
                    if (!(_a < _b.length)) return [3 /*break*/, 21];
                    singleBundleConf = _b[_a];
                    allOuts = JSON.parse(JSON.stringify(singleBundleConf.output));
                    if (!Array.isArray(allOuts)) return [3 /*break*/, 13];
                    _c = 0, allOuts_1 = allOuts;
                    _d.label = 4;
                case 4:
                    if (!(_c < allOuts_1.length)) return [3 /*break*/, 12];
                    singleOut = allOuts_1[_c];
                    singleBundleConf.output = singleOut;
                    if (!writeOnDisk) return [3 /*break*/, 9];
                    if (!watchModeEnabled) return [3 /*break*/, 6];
                    return [4 /*yield*/, watchBundle(singleBundleConf, entryPath, replaceLabels)];
                case 5:
                    _d.sent();
                    return [3 /*break*/, 8];
                case 6: return [4 /*yield*/, writeBundle(singleBundleConf, entryPath, replaceLabels)];
                case 7:
                    _d.sent();
                    _d.label = 8;
                case 8:
                    // Call end of single bundle callback
                    callEndBuildCallback(true, entryPath, singleBundleConf.output.rollerID);
                    return [3 /*break*/, 11];
                case 9: return [4 /*yield*/, generateBundle(singleBundleConf, entryPath, replaceLabels)];
                case 10:
                    _d.sent();
                    _d.label = 11;
                case 11:
                    _c++;
                    return [3 /*break*/, 4];
                case 12: return [3 /*break*/, 20];
                case 13:
                    if (!writeOnDisk) return [3 /*break*/, 18];
                    if (!watchModeEnabled) return [3 /*break*/, 15];
                    return [4 /*yield*/, watchBundle(singleBundleConf, entryPath, replaceLabels)];
                case 14:
                    _d.sent();
                    return [3 /*break*/, 17];
                case 15: return [4 /*yield*/, writeBundle(singleBundleConf, entryPath, replaceLabels)];
                case 16:
                    _d.sent();
                    _d.label = 17;
                case 17:
                    // Call end of single bundle callback
                    callEndBuildCallback(true, entryPath, singleBundleConf.output.rollerID);
                    return [3 /*break*/, 20];
                case 18: return [4 /*yield*/, generateBundle(singleBundleConf, entryPath, replaceLabels)];
                case 19:
                    _d.sent();
                    _d.label = 20;
                case 20:
                    _a++;
                    return [3 /*break*/, 3];
                case 21:
                    _i++;
                    return [3 /*break*/, 1];
                case 22: return [2 /*return*/];
            }
        });
    });
}
function writeBundle(configuration, entryPath, replaceLabels) {
    return __awaiter(this, void 0, void 0, function () {
        var bundle, _i, _a, watchFile;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    // Add helper plugin to configuration
                    configuration.plugins.push(rollerPlugin({
                        inPathBundle: entryPath,
                        replaceLabels: replaceLabels,
                        bundleID: configuration.output.rollerID
                    }));
                    return [4 /*yield*/, rollup__namespace.rollup(configuration)];
                case 1:
                    bundle = _b.sent();
                    // TODO: this might be useless
                    // Add new files to the files to watch
                    for (_i = 0, _a = bundle.watchFiles; _i < _a.length; _i++) {
                        watchFile = _a[_i];
                        submoduleToParent.set(watchFile, entryPath);
                        if (!filesToWatch.includes(watchFile)) {
                            filesToWatch.push(watchFile);
                        }
                    }
                    return [4 /*yield*/, bundle.write(configuration.output)];
                case 2:
                    _b.sent();
                    if (!bundle) return [3 /*break*/, 4];
                    // closes the bundle
                    return [4 /*yield*/, bundle.close()];
                case 3:
                    // closes the bundle
                    _b.sent();
                    _b.label = 4;
                case 4: return [2 /*return*/];
            }
        });
    });
}
function findDependentBundles(absPathToThisBundle) {
    var dependentBundles = new Array();
    // For each entry in entryPathToLabels find the builds who are dependent on the current build
    var bundlesIterator = entryPathToLabels.entries();
    for (var currBundle = bundlesIterator.next(); !currBundle.done; currBundle = bundlesIterator.next()) {
        // Find the lables that reference this file
        var labelIterator = currBundle.value[1].entries();
        for (var currLabel = labelIterator.next(); !currLabel.done; currLabel = labelIterator.next()) {
            var pathToRequiredFile = currLabel.value[1];
            if (pathToRequiredFile.absPathToRequiredEntryPoint == absPathToThisBundle) {
                dependentBundles.push(currBundle.value[0]);
                break; // Once we found one dependency, we don't need to check anything else in the file to mark it as dependent
            }
        }
    }
    return dependentBundles;
}
function watchBundle(configuration, entryPath, replaceLabels) {
    return __awaiter(this, void 0, void 0, function () {
        var _this = this;
        return __generator(this, function (_a) {
            // Add helper plugin to configuration
            configuration.plugins.push(rollerPlugin({
                inPathBundle: entryPath,
                replaceLabels: replaceLabels,
                bundleID: configuration.output.rollerID
            }));
            return [2 /*return*/, new Promise(function (resolve, reject) {
                    var firstTimeBuild = true;
                    var watcher = rollup__namespace.watch(configuration);
                    var hadError = false;
                    watcher.on("event", function (event) { return __awaiter(_this, void 0, void 0, function () {
                        var absPathToThisFile, dependentBundles, oldCount, _i, dependentBundles_1, singleDependentBundle, moreDependentBundles, _a, moreDependentBundles_1, newSingleDep, _b, dependentBundles_2, dependency, i, _c, dependentBundles_3, dependency;
                        var _d, _e;
                        return __generator(this, function (_f) {
                            switch (_f.label) {
                                case 0:
                                    absPathToThisFile = path__namespace.resolve(configuration.input);
                                    if (event.result) {
                                        event.result.close();
                                    }
                                    if (event.code == "START") {
                                        hadError = false;
                                        if (!firstTimeBuild) {
                                            // Clear failed builds map
                                            failedBuildsMap.clear();
                                            console.clear();
                                            logger("File modification detected for: " + path__namespace.basename(absPathToThisFile) + " with output " + ((_d = configuration.output.dir) !== null && _d !== void 0 ? _d : "") + "/" + ((_e = configuration.output.entryFileNames) !== null && _e !== void 0 ? _e : ""));
                                            logger("Rebuilding...");
                                        }
                                    }
                                    if (!(event.code == "END")) return [3 /*break*/, 9];
                                    // Callback for end of main bundle 
                                    if (!firstTimeBuild) {
                                        if (hadError) {
                                            callEndBuildCallback(false, absPathToThisFile, configuration.output.rollerID);
                                        }
                                        else {
                                            callEndBuildCallback(true, absPathToThisFile, configuration.output.rollerID);
                                        }
                                    }
                                    if (!firstTimeBuild) return [3 /*break*/, 1];
                                    firstTimeBuild = false;
                                    return [3 /*break*/, 8];
                                case 1:
                                    dependentBundles = findDependentBundles(absPathToThisFile);
                                    // Find dependent files of the dependent files
                                    while (true) {
                                        oldCount = dependentBundles.length;
                                        for (_i = 0, dependentBundles_1 = dependentBundles; _i < dependentBundles_1.length; _i++) {
                                            singleDependentBundle = dependentBundles_1[_i];
                                            moreDependentBundles = findDependentBundles(singleDependentBundle);
                                            // Merge new dependents with old ones
                                            for (_a = 0, moreDependentBundles_1 = moreDependentBundles; _a < moreDependentBundles_1.length; _a++) {
                                                newSingleDep = moreDependentBundles_1[_a];
                                                if (!dependentBundles.includes(newSingleDep)) {
                                                    dependentBundles.push(newSingleDep);
                                                }
                                            }
                                        }
                                        if (oldCount == dependentBundles.length) {
                                            break;
                                        }
                                    }
                                    if (!failedBuildsMap.has(absPathToThisFile)) return [3 /*break*/, 2];
                                    // Build has failed, don't rebuild dependecies
                                    loggerError("Main build has failed, cannot build dependent files.");
                                    for (_b = 0, dependentBundles_2 = dependentBundles; _b < dependentBundles_2.length; _b++) {
                                        dependency = dependentBundles_2[_b];
                                        logger("Dependent '".concat(path__namespace.basename(dependency), "' build skipped..."));
                                        // Remove from entryPathToOutPath
                                        entryPathToOutPath["delete"](dependency);
                                        // Add to failed builds
                                        failedBuildsMap.set(dependency, "Build failed because it is depended on a failed build");
                                    }
                                    return [3 /*break*/, 7];
                                case 2:
                                    // Rebuild those bundles
                                    logger("Rebuilding ".concat(dependentBundles.length, " dependent files..."));
                                    i = 0;
                                    _c = 0, dependentBundles_3 = dependentBundles;
                                    _f.label = 3;
                                case 3:
                                    if (!(_c < dependentBundles_3.length)) return [3 /*break*/, 7];
                                    dependency = dependentBundles_3[_c];
                                    return [4 /*yield*/, buildBundleFromEntryPath(dependency, false, false, false)];
                                case 4:
                                    _f.sent();
                                    return [4 /*yield*/, buildBundleFromEntryPath(dependency, true, true, false)];
                                case 5:
                                    _f.sent();
                                    logger("".concat(++i, "/").concat(dependentBundles.length, " '").concat(path__namespace.basename(dependency), "' completed..."));
                                    _f.label = 6;
                                case 6:
                                    _c++;
                                    return [3 /*break*/, 3];
                                case 7:
                                    // Call end of build callback
                                    if (endOfAllBuildCallback != undefined) {
                                        logger("Calling end of build callback...");
                                        endOfAllBuildCallback(entryPathToOutPath, failedBuildsMap);
                                    }
                                    console.log(failedBuildsMap.size == 0 ? colors.brightCyan.bold("All done!") : colors.brightRed.bold("Done with errors!"));
                                    _f.label = 8;
                                case 8:
                                    resolve();
                                    return [2 /*return*/];
                                case 9:
                                    if (event.code == "ERROR") {
                                        if (firstTimeBuild) {
                                            reject(event);
                                        }
                                        else {
                                            loggerError("Error: build for '".concat(absPathToThisFile, "' has failed"));
                                            logError(absPathToThisFile, event.error);
                                            // Add build to failed map
                                            failedBuildsMap.set(absPathToThisFile, event);
                                            // Remove build from entryPathToOutPath
                                            entryPathToOutPath["delete"](absPathToThisFile);
                                        }
                                        hadError = true;
                                        return [2 /*return*/];
                                    }
                                    return [2 /*return*/];
                            }
                        });
                    }); });
                })];
        });
    });
}
// Used for replace all
function escapeRegExp(string) {
    return string.replace(/[.*+\-?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}
function replaceAll(input, key, replaceWith) {
    return input.replace(new RegExp(escapeRegExp(key), "g"), replaceWith);
}
function generateBundle(configuration, entryPath, replaceLabels) {
    return __awaiter(this, void 0, void 0, function () {
        var bundle, _i, _a, watchFile;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    // Add helper plugin to configuration
                    configuration.plugins.push(rollerPlugin({
                        inPathBundle: entryPath,
                        replaceLabels: replaceLabels,
                        bundleID: configuration.output.rollerID
                    }));
                    return [4 /*yield*/, rollup__namespace.rollup(configuration)];
                case 1:
                    bundle = _b.sent();
                    // Add new files to the files to watch
                    for (_i = 0, _a = bundle.watchFiles; _i < _a.length; _i++) {
                        watchFile = _a[_i];
                        submoduleToParent.set(watchFile, entryPath);
                        if (!filesToWatch.includes(watchFile)) {
                            filesToWatch.push(watchFile);
                        }
                    }
                    return [4 /*yield*/, bundle.generate(configuration.output)];
                case 2:
                    _b.sent();
                    if (!bundle) return [3 /*break*/, 4];
                    // closes the bundle
                    return [4 /*yield*/, bundle.close()];
                case 3:
                    // closes the bundle
                    _b.sent();
                    _b.label = 4;
                case 4: return [2 /*return*/];
            }
        });
    });
}
function rollerPlugin(args) {
    return {
        name: "roller-helper-plugin",
        transform: function (code, id) {
            var _a;
            // for each entry in map for this file, replace all labels with relative path to dist
            var newCode = code;
            // Get all labels to replace on this file
            var labIterator = (_a = entryPathToLabels.get(args.inPathBundle)) === null || _a === void 0 ? void 0 : _a.entries();
            if (!args.replaceLabels) {
                // It was asked to not replace labels, return
                return;
            }
            if (labIterator == undefined) {
                // Nothing to replace
                return;
            }
            for (var elem = labIterator.next(); !elem.done;) {
                var currLabel = elem.value[0];
                var pathRequired = elem.value[1].absPathToRequiredEntryPoint;
                var bundleIDRequired = elem.value[1].requestedBundleID;
                // Find for the current label the actual value
                // Remember that one path could have multiple outs
                var distAbsPathsToRequired = getAbsolutePathToBundleOut(pathRequired, bundleIDRequired);
                var absPathsToOutFileOfThisEntrypoint = void 0;
                try {
                    absPathsToOutFileOfThisEntrypoint = getAbsolutePathToBundleOut(args.inPathBundle, args.bundleID);
                }
                catch (e) {
                    // TODO: FIXME. This is probably a bug
                    // when a build in a watch event fails, after its dependent get deleted from the entryPathToOutPath map
                    // on the next run it cannot find the path to iself even if it was asked to it to build itself without replacing lables
                    return;
                }
                if (absPathsToOutFileOfThisEntrypoint == undefined || distAbsPathsToRequired == undefined) {
                    throw new Error("Unexpected undefined in lab replacement routine");
                }
                // Create relative path 
                var relPathToRequiredDist = path__namespace.join(path__namespace.relative(path__namespace.dirname(absPathsToOutFileOfThisEntrypoint), path__namespace.dirname(distAbsPathsToRequired)), path__namespace.basename(distAbsPathsToRequired));
                if (!relPathToRequiredDist.startsWith("./")) {
                    relPathToRequiredDist = "./" + relPathToRequiredDist.split(path__namespace.sep).join(path__namespace.posix.sep);
                }
                // Replace all
                newCode = replaceAll(newCode, currLabel, relPathToRequiredDist);
                elem = labIterator.next();
            }
            return {
                code: newCode
            };
        },
        generateBundle: function (options, bundles, isWrite) {
            // Get all roller paths from bundles
            for (var propBundle in bundles) {
                if (bundles[propBundle].facadeModuleId == undefined) {
                    console.log("Unhandled no facadeModuleID except");
                    continue;
                }
                var absoluteInPath = bundles[propBundle].facadeModuleId;
                var absoluteContainingInFolder = path__namespace.dirname(absoluteInPath);
                if (bundles[propBundle].code != undefined) {
                    // Iterate through javascript's literals and keep only roller:// ones
                    // this saves the labels
                    var allMatches = bundles[propBundle].code.matchAll(/(['"`])(?:\\\1|(?!\1).)*?\1/gm);
                    var elem = allMatches.next();
                    while (!elem.done) {
                        //
                        var currString = elem.value[0];
                        currString = currString.replace(new RegExp("\"", 'g'), "");
                        currString = currString.replace(new RegExp("'", 'g'), "");
                        currString = currString.replace(new RegExp("`", 'g'), "");
                        if (currString.startsWith("roller://")) {
                            var requiredID = currString.split("?id=")[1];
                            var requiredFileRelPath = currString.replace("roller://", "").replace("?id=" + (requiredID !== null && requiredID !== void 0 ? requiredID : ""), "");
                            var requiredAbsPath = path__namespace.join(absoluteContainingInFolder, requiredFileRelPath);
                            var mapOfLabels = entryPathToLabels.get(absoluteInPath);
                            if (mapOfLabels == undefined) {
                                entryPathToLabels.set(absoluteInPath, new Map());
                                mapOfLabels = entryPathToLabels.get(absoluteInPath);
                                mapOfLabels === null || mapOfLabels === void 0 ? void 0 : mapOfLabels.set(currString, {
                                    requestedBundleID: requiredID,
                                    absPathToRequiredEntryPoint: requiredAbsPath
                                });
                            }
                            else {
                                mapOfLabels.set(currString, {
                                    requestedBundleID: requiredID,
                                    absPathToRequiredEntryPoint: requiredAbsPath
                                });
                            }
                        }
                        elem = allMatches.next();
                    }
                }
                // Save the full path to entry file to the output file name
                var outFilename = bundles[propBundle].fileName;
                if (outFilename == undefined) {
                    throw new Error("Unhandled: There's no filename for output of this bundle");
                }
                // Get absolute path to out filename
                var absPathToOutFilename = "";
                if (options.dir != undefined) {
                    if (!options.dir.startsWith("/")) {
                        absPathToOutFilename = path__namespace.join(process.cwd(), options.dir, outFilename);
                    }
                    else {
                        absPathToOutFilename = path__namespace.join(options.dir, outFilename);
                    }
                }
                else if (options.file != undefined) {
                    if (!options.file.startsWith("/")) {
                        absPathToOutFilename = path__namespace.join(process.cwd(), options.file);
                    }
                    else {
                        absPathToOutFilename = path__namespace.join(options.file);
                    }
                }
                // Since a entry path can have multiple outs, get the array of outs
                var outPathsArr = entryPathToOutPath.get(absoluteInPath);
                if (outPathsArr == undefined) {
                    // First bundle for this entry point, add an array to the map
                    entryPathToOutPath.set(absoluteInPath, new Array());
                    outPathsArr = entryPathToOutPath.get(absoluteInPath);
                }
                if (outPathsArr == undefined) {
                    throw new Error("Unexpected undefined in outPathArr after definition");
                }
                // Check if outPathArr has already the absPathToOutFilename
                var alreadyInArray = false;
                for (var _i = 0, outPathsArr_1 = outPathsArr; _i < outPathsArr_1.length; _i++) {
                    var outObj = outPathsArr_1[_i];
                    if (outObj.outPath == absPathToOutFilename) {
                        alreadyInArray = true;
                        break;
                    }
                    if (outObj.id == args.bundleID) {
                        outObj.outPath = absPathToOutFilename;
                        alreadyInArray = true;
                        break;
                    }
                }
                if (!alreadyInArray) {
                    // Add to the array ouf outs
                    outPathsArr === null || outPathsArr === void 0 ? void 0 : outPathsArr.push({
                        id: args.bundleID,
                        outPath: absPathToOutFilename
                    });
                }
                // let outArray = entryPathToOutPath.get(absoluteInPath);
                // if(outArray == undefined) {
                //     outArray = new Array<string>();
                // }
                // if(outArray.)
                // outArray.push(absPathToOutFilename);
            }
        }
    };
}
function getAbsolutePathToBundleOut(bundleEntryPointAbsPath, bundleID) {
    var distAbsPathsToRequired = entryPathToOutPath.get(bundleEntryPointAbsPath);
    if (distAbsPathsToRequired == undefined) {
        throw new Error("Could not find the requested bundle entry point: " + bundleEntryPointAbsPath);
    }
    // If no bundle id is specified, just return the first one
    if (bundleID == undefined) {
        return distAbsPathsToRequired[0].outPath;
    }
    // Find the requested Bundle ID
    for (var _i = 0, distAbsPathsToRequired_1 = distAbsPathsToRequired; _i < distAbsPathsToRequired_1.length; _i++) {
        var currBundleData = distAbsPathsToRequired_1[_i];
        if (currBundleData.id == bundleID) {
            return currBundleData.outPath;
        }
    }
    throw new Error("Could not find the requested bundle entry point + bundle ID combo.");
}
function build(inputPath, output, configPath, overrides, postBuildCb) {
    var _this = this;
    if (inputPath == "-1" && output == "-1" && configPath == "-1") {
        return;
    }
    // TODO: get the current package path
    var currDir = "./";
    // Check if input path is relative
    if (!configPath.startsWith("/")) {
        configPath = path__namespace.join(currDir, configPath);
    }
    var fullPath = path__namespace.resolve(configPath);
    var config = loadConfigFile(fullPath, {
        format: "es"
    });
    // TODO: find better way to get full path
    var fullInPath = path__namespace.join(process.cwd(), inputPath);
    // Get array if already present in map
    var arrayOfConfigsForInPath = configMap.get(fullInPath);
    if (arrayOfConfigsForInPath == undefined) {
        arrayOfConfigsForInPath = new Array();
        configMap.set(fullInPath, arrayOfConfigsForInPath);
    }
    arrayOfConfigsForInPath.push(new Promise(function (resolve, reject) {
        config.then(function (options, warnings) { return __awaiter(_this, void 0, void 0, function () {
            var _i, _a, currConfig, i, outputProp, pathToFile, overrideProp;
            var _b;
            return __generator(this, function (_c) {
                // TODO: possible rollup bug, it doesn't follow the specified bundle type
                // Also why is it an array of options? it should only be one
                for (_i = 0, _a = options.options; _i < _a.length; _i++) {
                    currConfig = _a[_i];
                    // Add input to options
                    currConfig.input = inputPath;
                    // Add output to options
                    for (i = 0; i < currConfig.output.length; i++) {
                        for (outputProp in output) {
                            currConfig.output[i][outputProp] = output[outputProp];
                        }
                    }
                    // Set build callback if present
                    // TODO: what happens if there is more than one output for the current build block?
                    // my suggestion would be to only allow one output per block
                    if (postBuildCb != undefined) {
                        pathToFile = fullInPath + ((_b = currConfig.output[0].rollerID) !== null && _b !== void 0 ? _b : "");
                        endOfSingleBuildCallbackMap.set(pathToFile, postBuildCb);
                    }
                    // Override the rest
                    if (overrides != undefined) {
                        for (overrideProp in overrides) {
                            currConfig[overrideProp] = overrides[overrideProp];
                        }
                    }
                }
                resolve({ options: options, warnings: warnings });
                return [2 /*return*/];
            });
        }); });
    }));
}
roller();
build("-1", "-1", "-1");
// // Start app
// loadExternalFileAndStart("./buildfile.roller.js");
// function loadExternalFileAndStart(pathToBuildInstructions: string) {
//     fs.readFile(pathToBuildInstructions, {}, (err, data) => {
//         if(err) {
//             throw new Error("Error while reading the build file at path: " + pathToBuildInstructions);
//         }
//         const buildJS = data.toString();
//         eval(buildJS);
//     });
// }
/**
 * This is a test
 */
//  roller((env) => {
//     build("testFiles/mainThingy.js", 
//             {
//                 format: "commonjs",
//                 // file: "testFiles/dist/mainThingy.js",
//                 dir: "testFiles/dist",
//                 entryFileNames: "mainThingy-[hash].js",
//                 rollerID: "abc"
//             },
//         "./bundleConfigs/generalConfig.rollup.config.js", {}, (a, b, c) => {
//             // console.log("Post build of testFiles/mainThingy.js", a, b, c);
//         }
//     )
//     // build("testFiles/mainThingy.js", 
//     //         {
//     //             format: "commonjs",
//     //             // file: "testFiles/dist/mainThingy.js",
//     //             dir: "testFiles/dist/anotherMain",
//     //             entryFileNames: "mainThingyA-[hash].js",
//     //             rollerID: "def"
//     //         },
//     //     "./bundleConfigs/generalConfig.rollup.config.js", {}
//     // )
//     build("testFiles/referencedFile1.js", 
//             {
//                 // file: "testFiles/dist/referencedFile1.js",
//                 dir: "testFiles/dist",
//                 entryFileNames: "referencedFile1-[hash].js"
//             },
//         "./bundleConfigs/generalConfig.rollup.config.js", {}, (a, b, c) => {
//             // console.log("Post build of testFiles/referencedFile1.js", a, b, c);
//         }
//     )
//     build("testFiles/testSubfolder/referencedFile2.js", 
//             {
//                 // file: "testFiles/dist/referencedFile2.js",
//                 dir: "testFiles/dist/testSubfolder",
//                 entryFileNames: "referencedFile2-[hash].js"
//             },
//         "./bundleConfigs/generalConfig.rollup.config.js", {}, (a, b, c) => {
//             // console.log("Post build of testFiles/testSubfolder/referencedFile2.js", a, b, c);
//         }
//     )
// }, (files, failedBuilds) => {
//     // console.log("==== These are the files that were emitted ====");
//     // console.log(files);
//     // console.log("==== Failed Builds ====");
//     // console.log(failedBuilds);
// })
//# sourceMappingURL=roller.js.map
