import * as rollup from "rollup";
import * as path from "path";
import { DependencyTree } from "./dependencyTree";
const colors = require('colors');
colors.enable();

const loadConfigFile = require('rollup/dist/loadConfigFile');

interface RollupConfigBase {
    options: any,
    warnings: any
}

interface BundleOutData {
    outPath: string,
    id: string
}

interface BundleLabelData {
    requestedBundleID?: string,
    absPathToRequiredEntryPoint: string
}

const configMap = new Map<string, Array<Promise<RollupConfigBase>>>(); // Entry Path -> [All possible out configs]

const entryPathToLabels = new Map<string, Map<string, BundleLabelData>>(); // entry path -> <label name, {requested file id, abs path to requested bundle}>

// TODO: find a way to associate inputs to multiple outputs, and keeping track of substitutions
// const entryPathToOutPath = new Map<string, Array<string>>();
const entryPathToOutPath = new Map<string, Array<BundleOutData>>(); // Entry path -> out path

const failedBuildsMap = new Map<string, any>() // entry path -> reason of failure

// Not really needed
const submoduleToParent = new Map<string, string>(); // Associates absolute paths of submodules to its parent
const filesToWatch = new Array<string>();

let endOfAllBuildCallback: CallableFunction | undefined;
const endOfSingleBuildCallbackMap = new Map<string, RollerEndSingleBuildCallback>(); // <inPath, end callback>

interface RollerSetupCallback {
    (nodeEnv: NodeJS.ProcessEnv, buildRecipe?: string, buildSubrecipe?: string): any
}

interface RollerEndAllBuildsCallback {
    (entryPathToOutPath: Map<string, Array<string>>, failedBuildsMap: Map<string, any>): any
}

interface RollerEndSingleBuildCallback {
    (success: boolean, inPath: string, outPaths: string): any
}

function logger(msg: any) {
    console.log(colors.grey("[roller]:", msg));
}

function loggerError(msg: any) {
    console.log(colors.red("[roller]:", msg));
}

declare let buildRecipe: string;
declare let buildSubrecipe: string;
declare let watch: boolean | undefined;

async function roller(setupFunction?: RollerSetupCallback, postBuildCb?: RollerEndAllBuildsCallback) {
    if(setupFunction == undefined && postBuildCb) {
        return;
    }
    console.clear();

    // Setup configurations
    logger("Setting up configurations...");
    if(setupFunction != undefined) {
        setupFunction(process.env, buildRecipe, buildSubrecipe);
    }

    // Verify configurations
    logger("Verifying configurations...");
    const it = configMap.entries();
    let elem = it.next()
    while(!elem.done) {
        // Each inPath could have multiple outs, so iterate through all the configurations
        const currConfigs = elem.value[1];
        for(const singleConfig of currConfigs) {
            if((await singleConfig).warnings != undefined) {
                throw new Error("Warning in imported rollup configuration " + 
                    elem.value[1])
            }
        }
        elem = it.next();
    }

    // Build all bundles
    logger("Building all bundles...");
    const it2 = configMap.entries();
    let i = 0;
    elem = it2.next()
    while(!elem.done) {
        try {
            await buildBundleFromEntryPath(elem.value[0], false, false, false);
            logger(`${++i}/${configMap.size} '${path.basename(elem.value[0])}' completed...`);
        } catch(e) {
            // Build has failed
            loggerError("Build Failed: " + elem.value[0]);
            
            // Add to failed builds
            failedBuildsMap.set(elem.value[0], e);
        }
        elem = it2.next();
    }

    // Create dependecy tree
    logger("Generating dependency tree...");
    const depTree = new DependencyTree(entryPathToLabels);
    const allBundleIterator = configMap.entries();
    for(let bundle = allBundleIterator.next(); !bundle.done; bundle = allBundleIterator.next()) {
        depTree.addNode(bundle.value[0]);
    }

    
    // Get build order
    const buildOrder = depTree.getOrderedBuildOrderList();
    
    // Rebuild all files that are in the entrypath to labels map
    logger("Updating imports and emitting bundles...");
    i = 0;
    for(const bundleEntryPath of buildOrder) {
        i++;

        // Check if build has previously failed
        if(failedBuildsMap.has(bundleEntryPath)) {
            loggerError(`[${i}/${buildOrder.length}]: FAILED. Linking of file '${bundleEntryPath}' has failed due to its build having failed in the previous step`);
            callEndBuildCallback(false, bundleEntryPath);
            continue;
        }

        try {
            await buildBundleFromEntryPath(bundleEntryPath, true, true, watch ?? false);
            logger(`[${i}/${buildOrder.length}]: SUCCESS. '${path.basename(bundleEntryPath)}' completed...`);
        } catch (e) {
            // Build has failed
            loggerError(`[${i}/${buildOrder.length}]: FAILED. Could not link ${bundleEntryPath}`);
            loggerError("This usually happens because one of more builds linked to it have previously failed");
            
            // Add to failed builds
            failedBuildsMap.set(bundleEntryPath, e);
            callEndBuildCallback(false, bundleEntryPath);
        }

    }

    // List failed builds
    if(failedBuildsMap.size > 0) {
        console.log(colors.red.bold("====================================================="));
        loggerError("The following builds have failed");
        let failedBuildIterator = failedBuildsMap.entries();
        let singleFailedElem = failedBuildIterator.next();
        
        while(!singleFailedElem.done) {
            logError(singleFailedElem.value[0], singleFailedElem.value[1]);
            singleFailedElem = failedBuildIterator.next();
        } 
        console.log(colors.red.bold("====================================================="));
    
        // Remove all failed builds from entryPathToOutPath to show that the files didn't output
        failedBuildIterator = failedBuildsMap.entries();
        singleFailedElem = failedBuildIterator.next();
        
        while(!singleFailedElem.done) {
            entryPathToOutPath.delete(singleFailedElem.value[0]);
            singleFailedElem = failedBuildIterator.next();
        }
    }

    // Call end of build callback
    endOfAllBuildCallback = postBuildCb;
    if(endOfAllBuildCallback != undefined) {
        logger("Calling end of build callback...")
        endOfAllBuildCallback(entryPathToOutPath, failedBuildsMap);
    }

    console.log(failedBuildsMap.size == 0 ? colors.brightCyan.bold(`All done!`) : colors.brightRed.bold(`Done with errors!`));
}

interface RollerHelperPluginArgs {
    inPathBundle: string;
    replaceLabels: boolean;
    bundleID: string;
}

function logError(input: string, error: any) {
    console.log(colors.magenta.bold(`[roller]: ~~~~~~~~~ ${input} ~~~~~~~~~`));
    if(error.name == undefined) {
        console.log(colors.red.bold("[!] Error"))
        console.log(colors.red(error.error));
        return;
    }

    console.log(colors.red.bold("[!] Error: " + error.message))
    console.log(colors.grey("[" + error.loc.line + ":" + error.loc.column + "] - ") + colors.white.bold(error.id));
    console.log(colors.white(error.frame));
}

async function callEndBuildCallback(buildSuccess: boolean, entryPath: string, rollerID?: string) {
    const configsForCurrBuild = configMap.get(entryPath);
    if(configsForCurrBuild == undefined) {
        throw new Error("Unexpected undefined in map while calling end of build callbacks");
    }

    // If called with a specific roller ID then call that and find the callback
    if(rollerID != undefined) {
        const cb = endOfSingleBuildCallbackMap.get(entryPath + rollerID);
        if(cb != undefined) {
            // Get the corresponding out path for the bundle with the specified roller ID
            const outPaths = entryPathToOutPath.get(entryPath);
            let outPath = "";
            if(outPaths != undefined) {
                for(const singleOutPath of outPaths) {
                    if(singleOutPath.id == rollerID) {
                        outPath = singleOutPath.outPath;
                        break;
                    }
                }
            }
            
            cb(buildSuccess, entryPath, outPath);
        } 
        return;
    }

    // If no roller id call all the end callbacks
    for(const singleConfig of configsForCurrBuild) {
        for(const singleBundleConf of (await singleConfig).options.options) {
            const outPaths = entryPathToOutPath.get(entryPath);
            let outPath = "";

            if(outPaths != undefined) {
                outPath = outPaths[0].outPath;
            }

            const cb = endOfSingleBuildCallbackMap.get(entryPath + (singleBundleConf.output.rollerID ?? ""));
            if(cb != undefined) {
                cb(buildSuccess, entryPath, outPath);
            }
        }
    }
}

async function buildBundleFromEntryPath(entryPath: string, writeOnDisk: boolean, replaceLabels: boolean, watchModeEnabled: boolean) {
    const configsForCurrBuild = configMap.get(entryPath);
    if(configsForCurrBuild == undefined) {
        throw new Error("Unexpected undefined in map while rebuilding: " + entryPath);
    }

    // Each of the entry paths could have more than one config
    for(const singleConfig of configsForCurrBuild) {
        for(const singleBundleConf of (await singleConfig).options.options) {
            // If a configuration contains more than on output, iterate through them
            const allOuts = JSON.parse(JSON.stringify(singleBundleConf.output));
            if(Array.isArray(allOuts)) {
                for(const singleOut of allOuts) {
                    singleBundleConf.output = singleOut;
                    if(writeOnDisk) {
                        if(watchModeEnabled) {
                            await watchBundle(singleBundleConf, entryPath, replaceLabels);
                        } else {
                            await writeBundle(singleBundleConf, entryPath, replaceLabels);
                        }
                        
                        // Call end of single bundle callback
                        callEndBuildCallback(true, entryPath, singleBundleConf.output.rollerID);
                    } else {
                        await generateBundle(singleBundleConf, entryPath, replaceLabels);
                    }
                }
            } else {
                if(writeOnDisk) {
                    if(watchModeEnabled) {
                        await watchBundle(singleBundleConf, entryPath, replaceLabels);
                    } else {
                        await writeBundle(singleBundleConf, entryPath, replaceLabels);
                    }

                    // Call end of single bundle callback
                    callEndBuildCallback(true, entryPath, singleBundleConf.output.rollerID);
                } else {
                    await generateBundle(singleBundleConf, entryPath, replaceLabels);
                }
            }
        }
    }
}

async function writeBundle(configuration: any, entryPath: string, replaceLabels: boolean) {
    // Add helper plugin to configuration
    configuration.plugins.push(rollerPlugin({
        inPathBundle: entryPath,
        replaceLabels: replaceLabels,
        bundleID: configuration.output.rollerID
    }));

    const bundle = await rollup.rollup(configuration);
    // TODO: this might be useless
    // Add new files to the files to watch
    for(const watchFile of bundle.watchFiles) {
        submoduleToParent.set(watchFile, entryPath);
        if(!filesToWatch.includes(watchFile)) {
            filesToWatch.push(watchFile);
        }
    }

    await bundle.write(configuration.output);
    
    if(bundle) {
        // closes the bundle
        await bundle.close();
    }
}

function findDependentBundles(absPathToThisBundle: string) {
    const dependentBundles = new Array<string>();

    // For each entry in entryPathToLabels find the builds who are dependent on the current build
    const bundlesIterator = entryPathToLabels.entries();
    for(let currBundle = bundlesIterator.next(); !currBundle.done; currBundle = bundlesIterator.next()) {
        // Find the lables that reference this file
        const labelIterator = currBundle.value[1].entries();
        for(let currLabel = labelIterator.next(); !currLabel.done; currLabel = labelIterator.next()) {
            const pathToRequiredFile = currLabel.value[1];
            if(pathToRequiredFile.absPathToRequiredEntryPoint == absPathToThisBundle) {
                dependentBundles.push(currBundle.value[0])
                break; // Once we found one dependency, we don't need to check anything else in the file to mark it as dependent
            }
        }
    }

    return dependentBundles;
}

async function watchBundle(configuration: any, entryPath: string, replaceLabels: boolean): Promise<void> {
    // Add helper plugin to configuration
    configuration.plugins.push(rollerPlugin({
        inPathBundle: entryPath,
        replaceLabels: replaceLabels,
        bundleID: configuration.output.rollerID
    }));
    return new Promise<void>((resolve, reject) => {
        let firstTimeBuild = true;
        const watcher = rollup.watch(configuration);
        let hadError = false;
        watcher.on("event", async (event) => {
            const absPathToThisFile = path.resolve(configuration.input);
            if((event as any).result) {
                (event as any).result.close();
            }
            if(event.code == "START") {
                hadError = false;
                if(!firstTimeBuild) {
                    // Clear failed builds map
                    failedBuildsMap.clear();
                    console.clear();

                    logger("File modification detected for: " + path.basename(absPathToThisFile) + " with output " + (configuration.output.dir ?? "") + "/" + (configuration.output.entryFileNames ?? ""));
                    logger("Rebuilding...");
                }
            }

            if(event.code == "END") {
                // Callback for end of main bundle 
                if(!firstTimeBuild) {
                    if(hadError) {
                        callEndBuildCallback(false, absPathToThisFile, configuration.output.rollerID);
                    } else {
                        callEndBuildCallback(true, absPathToThisFile, configuration.output.rollerID);
                    }
                }

                // If it's first time, don't build other bundles
                if(firstTimeBuild) {
                    firstTimeBuild = false;
                } else {
                    // File has been bundled from watch mode, so rebuild the rest
                    const dependentBundles = findDependentBundles(absPathToThisFile);

                    // Find dependent files of the dependent files
                    while(true) {
                        let oldCount = dependentBundles.length;
                        for(const singleDependentBundle of dependentBundles) {
                            const moreDependentBundles = findDependentBundles(singleDependentBundle);

                            // Merge new dependents with old ones
                            for(const newSingleDep of moreDependentBundles) {
                                if(!dependentBundles.includes(newSingleDep)) {
                                    dependentBundles.push(newSingleDep);
                                }
                            }
                        }

                        if(oldCount == dependentBundles.length) {
                            break;
                        }
                    }

                    // Check if builds have failed, if so don't rebuild dependencies
                    if(failedBuildsMap.has(absPathToThisFile)) {
                        // Build has failed, don't rebuild dependecies
                        loggerError(`Main build has failed, cannot build dependent files.`);
                        for(const dependency of dependentBundles) {
                            logger(`Dependent '${path.basename(dependency)}' build skipped...`);
                            
                            // Remove from entryPathToOutPath
                            entryPathToOutPath.delete(dependency);

                            // Add to failed builds
                            failedBuildsMap.set(dependency, "Build failed because it is depended on a failed build");
                        }
                    } else {
                        // Rebuild those bundles
                        logger(`Rebuilding ${dependentBundles.length} dependent files...`);
                        let i = 0;
                        for(const dependency of dependentBundles) {
                            await buildBundleFromEntryPath(dependency, false, false, false);
                            await buildBundleFromEntryPath(dependency, true, true, false);
                            logger(`${++i}/${dependentBundles.length} '${path.basename(dependency)}' completed...`);
                        }
                    }

                    // Call end of build callback
                    if(endOfAllBuildCallback != undefined) {
                        logger("Calling end of build callback...")
                        endOfAllBuildCallback(entryPathToOutPath, failedBuildsMap);
                    }

                    console.log(failedBuildsMap.size == 0 ? colors.brightCyan.bold(`All done!`) : colors.brightRed.bold(`Done with errors!`));

                } 
                resolve();
                return;
            }

            if(event.code == "ERROR") {
                if(firstTimeBuild) {
                    reject(event);
                } else {
                    loggerError(`Error: build for '${absPathToThisFile}' has failed`);
                    logError(absPathToThisFile, event.error);
                    
                    // Add build to failed map
                    failedBuildsMap.set(absPathToThisFile, event);
                
                    // Remove build from entryPathToOutPath
                    entryPathToOutPath.delete(absPathToThisFile);
                }

                hadError = true;
                return;
            }
        })

    })
}

// Used for replace all
function escapeRegExp(string: string) {
    return string.replace(/[.*+\-?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

function replaceAll(input: string, key: string, replaceWith: string) {
    return input.replace(new RegExp(escapeRegExp(key), "g"), replaceWith);
}

async function generateBundle(configuration: any, entryPath: string, replaceLabels: boolean) {
    // Add helper plugin to configuration
    configuration.plugins.push(rollerPlugin({
        inPathBundle: entryPath,
        replaceLabels: replaceLabels,
        bundleID: configuration.output.rollerID
    }));
    const bundle = await rollup.rollup(configuration);

    // Add new files to the files to watch
    for(const watchFile of bundle.watchFiles) {
        submoduleToParent.set(watchFile, entryPath);
        if(!filesToWatch.includes(watchFile)) {
            filesToWatch.push(watchFile);
        }
    }

    await bundle.generate(configuration.output);
    
    if(bundle) {
        // closes the bundle
        await bundle.close();
    }
}

function rollerPlugin(args: RollerHelperPluginArgs) {
    return {
        name: "roller-helper-plugin",
        transform(code: string, id: string) {
            // for each entry in map for this file, replace all labels with relative path to dist
            let newCode = code;

            // Get all labels to replace on this file
            const labIterator = entryPathToLabels.get(args.inPathBundle)?.entries();
            if(!args.replaceLabels) {
                // It was asked to not replace labels, return
                return;
            }

            if(labIterator == undefined) {
                // Nothing to replace
                return;
            }

            for(let elem = labIterator.next(); !elem.done;) {
                const currLabel = elem.value[0];
                const pathRequired = elem.value[1].absPathToRequiredEntryPoint;
                const bundleIDRequired = elem.value[1].requestedBundleID
                // Find for the current label the actual value
                // Remember that one path could have multiple outs
                
                const distAbsPathsToRequired = getAbsolutePathToBundleOut(pathRequired, bundleIDRequired);
                let absPathsToOutFileOfThisEntrypoint;
                try {
                    absPathsToOutFileOfThisEntrypoint = getAbsolutePathToBundleOut(args.inPathBundle, args.bundleID);
                } catch(e) {
                    // TODO: FIXME. This is probably a bug
                    // when a build in a watch event fails, after its dependent get deleted from the entryPathToOutPath map
                    // on the next run it cannot find the path to iself even if it was asked to it to build itself without replacing lables
                    return;
                }

                if(absPathsToOutFileOfThisEntrypoint == undefined || distAbsPathsToRequired == undefined) {
                    throw new Error("Unexpected undefined in lab replacement routine");
                }

                // Create relative path 
                let relPathToRequiredDist = path.join(
                    path.relative(path.dirname(absPathsToOutFileOfThisEntrypoint), path.dirname(distAbsPathsToRequired)), 
                    path.basename(distAbsPathsToRequired)
                );

                if(!relPathToRequiredDist.startsWith("./")) {
                    relPathToRequiredDist = "./" + relPathToRequiredDist.split(path.sep).join(path.posix.sep);
                }

                // Replace all
                newCode = replaceAll(newCode, currLabel, relPathToRequiredDist);
                elem = labIterator.next();
            }
            
            return {
                code: newCode
            }
        },
        generateBundle(options: rollup.OutputOptions, bundles: any, isWrite: boolean) {
            // Get all roller paths from bundles
            for(const propBundle in bundles) {
                if(bundles[propBundle].facadeModuleId == undefined) {
                    console.log("Unhandled no facadeModuleID except");
                    continue;
                    throw new Error("Unhandled no facadeModuleID except");
                }

                const absoluteInPath = bundles[propBundle].facadeModuleId;
                const absoluteContainingInFolder = path.dirname(absoluteInPath);
                if(bundles[propBundle].code != undefined) {
                    
                    // Iterate through javascript's literals and keep only roller:// ones
                    // this saves the labels
                    const allMatches = (bundles[propBundle].code as string).matchAll(/(['"`])(?:\\\1|(?!\1).)*?\1/gm);
                    let elem = allMatches.next();
                    while(!elem.done) {
                        //
                        let currString = elem.value[0];
                        currString = currString.replace(new RegExp("\"", 'g'), "");
                        currString = currString.replace(new RegExp("'", 'g'), "");
                        currString = currString.replace(new RegExp("`", 'g'), "");

                        
                        if(currString.startsWith("roller://")) {
                            const requiredID = currString.split("?id=")[1];
                            const requiredFileRelPath = currString.replace("roller://", "").replace("?id=" + (requiredID ?? ""), "");

                            const requiredAbsPath = path.join(absoluteContainingInFolder, requiredFileRelPath);
                            let mapOfLabels = entryPathToLabels.get(absoluteInPath);

                            if(mapOfLabels == undefined) {
                                entryPathToLabels.set(absoluteInPath, new Map<string, BundleLabelData>())
                                mapOfLabels = entryPathToLabels.get(absoluteInPath);
                                mapOfLabels?.set(currString, {
                                    requestedBundleID: requiredID,
                                    absPathToRequiredEntryPoint: requiredAbsPath
                                });
                            } else {
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
                const outFilename = bundles[propBundle].fileName;
                if(outFilename == undefined) {
                    throw new Error("Unhandled: There's no filename for output of this bundle");
                }

                // Get absolute path to out filename
                
                let absPathToOutFilename = "";
                if(options.dir != undefined) {
                    if(!options.dir.startsWith("/")) {
                        absPathToOutFilename = path.join(process.cwd(), options.dir, outFilename);
                    } else {
                        absPathToOutFilename = path.join(options.dir, outFilename);
                    }
                } else if(options.file != undefined) {
                    if(!options.file.startsWith("/")) {
                        absPathToOutFilename = path.join(process.cwd(), options.file);
                    } else {
                        absPathToOutFilename = path.join(options.file);
                    }
                }

                // Since a entry path can have multiple outs, get the array of outs
                let outPathsArr = entryPathToOutPath.get(absoluteInPath);
                
                if(outPathsArr == undefined) {
                    // First bundle for this entry point, add an array to the map
                    entryPathToOutPath.set(absoluteInPath, new Array<BundleOutData>());
                    outPathsArr = entryPathToOutPath.get(absoluteInPath);
                }

                if(outPathsArr == undefined) {
                    throw new Error("Unexpected undefined in outPathArr after definition");
                }

                // Check if outPathArr has already the absPathToOutFilename
                let alreadyInArray = false;
                for(const outObj of outPathsArr) {
                    if(outObj.outPath == absPathToOutFilename) {
                        alreadyInArray = true;
                        break;
                    }

                    if(outObj.id == args.bundleID) {
                        outObj.outPath = absPathToOutFilename;
                        alreadyInArray = true;
                        break;
                    }
                }

                if(!alreadyInArray) {
                    // Add to the array ouf outs
                    outPathsArr?.push({
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
    }
}

function getAbsolutePathToBundleOut(bundleEntryPointAbsPath: string, bundleID?: string) {
    const distAbsPathsToRequired = entryPathToOutPath.get(bundleEntryPointAbsPath);
    if(distAbsPathsToRequired == undefined) {
        throw new Error("Could not find the requested bundle entry point: " + bundleEntryPointAbsPath);
    }

    // If no bundle id is specified, just return the first one
    if(bundleID == undefined) {
        return distAbsPathsToRequired[0].outPath;
    }

    // Find the requested Bundle ID
    for(const currBundleData of distAbsPathsToRequired) {
        if(currBundleData.id == bundleID) {
            return currBundleData.outPath;
        }
    }
    
    throw new Error("Could not find the requested bundle entry point + bundle ID combo.");
    
}

function build(inputPath: string, output: any, configPath: string,
    overrides?: any, postBuildCb?: RollerEndSingleBuildCallback) {
        if(inputPath == "-1" && output == "-1" && configPath == "-1") {
            return;
        }

        // TODO: get the current package path
        const currDir = "./"
        
        // Check if input path is relative
        if(!configPath.startsWith("/")) {
            configPath = path.join(currDir, configPath); 
        } 

        const fullPath = path.resolve(configPath);
        let config = loadConfigFile(fullPath, {
            format: "es"
        })

        // TODO: find better way to get full path
        const fullInPath = path.join(process.cwd(), inputPath);
        
        // Get array if already present in map
        let arrayOfConfigsForInPath = configMap.get(fullInPath);
        if(arrayOfConfigsForInPath == undefined) {
            arrayOfConfigsForInPath = new Array<Promise<RollupConfigBase>>();
            configMap.set(fullInPath, arrayOfConfigsForInPath);
        }

        arrayOfConfigsForInPath.push(new Promise<RollupConfigBase>((resolve, reject) => {
            config.then(async (options: any, warnings: any) => {
                // TODO: possible rollup bug, it doesn't follow the specified bundle type
                // Also why is it an array of options? it should only be one
                for(const currConfig of options.options) {
                    // Add input to options
                    currConfig.input = inputPath;
                    
                    // Add output to options
                    for(let i = 0; i < currConfig.output.length; i++) {
                        for(const outputProp in output) {
                            currConfig.output[i][outputProp] = output[outputProp];
                        }
                    }

                    // Set build callback if present
                    // TODO: what happens if there is more than one output for the current build block?
                    // my suggestion would be to only allow one output per block
                    if(postBuildCb != undefined) {
                        // Save them in map with <inpath+rollerID>
                        const pathToFile = fullInPath + (currConfig.output[0].rollerID ?? "");
                        endOfSingleBuildCallbackMap.set(pathToFile, postBuildCb);
                    }

                    // Override the rest
                    if(overrides != undefined) {
                        for(const overrideProp in overrides) {
                            currConfig[overrideProp] = overrides[overrideProp];
                        }
                    }                
                } 
                resolve({options, warnings});
            })
        }))
       
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