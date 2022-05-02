#! /usr/bin/env NODE_OPTIONS=--no-deprecation node --no-deprecation
console.log("b");
const vm = require("vm");
const fs = require("fs");
const { program } = require('commander');
program.option("-b, --buildFile <type>", "Build file path");
program.option("-r, --recipe <type>", "Recipe name");
program.option("-s, --subRecipe <type>", "Sub recipe name");
program.option("-w, --watch", "Sub recipe name");

program.parse(process.argv);
let pathToBuildInstructions = "./buildfile.roller.js";
if(program.opts().buildFile) {
    pathToBuildInstructions = program.opts().buildFile;
}

// Check path exists
if (!fs.existsSync(pathToBuildInstructions)) { 
    console.log(`The build configuration specified ${pathToBuildInstructions} does not exist. Create it or specify a path to the configuration file with -b`); 
} else {
    init();
} 

function init() {
    // Try to load the roller code
    const rollerScript = new vm.Script(fs.readFileSync(__dirname + "/roller.js").toString());
    
    // Try to load the buildfile specified
    const userBuildFile = new vm.Script(fs.readFileSync(pathToBuildInstructions).toString());
    
    const sandbox = {
        require: require,
        process: process,
        console: console,
        buildRecipe: program.opts().recipe,
        buildSubrecipe: program.opts().subRecipe,
        watch: program.opts().watch
    };
    
    const context = new vm.createContext(sandbox);
    rollerScript.runInContext(context);
    userBuildFile.runInContext(context);
}
