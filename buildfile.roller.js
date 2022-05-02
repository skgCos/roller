/**
 * This is a test
 */
 roller((env, recipe, subrecipe) => {
    // console.log("this is env", env);
    console.log("rec", recipe);
    console.log("subrec", subrecipe);
    build("testFiles/mainThingy.js", 
            {
                format: "commonjs",
                file: "testFiles/dist/mainThingy.js",
                // dir: "testFiles/dist",
                // entryFileNames: "mainThingy-[hash].js",
                // rollerID: "abc"
            },
        "./bundleConfigs/generalConfig.rollup.config.js", {}, (a, b, c) => {
            // console.log("Post build of testFiles/mainThingy.js", a, b, c);
        }
    )

    // build("testFiles/mainThingy.js", 
    //         {
    //             format: "commonjs",
    //             // file: "testFiles/dist/mainThingy.js",
    //             dir: "testFiles/dist/anotherMain",
    //             entryFileNames: "mainThingyA-[hash].js",
    //             rollerID: "def"
    //         },
    //     "./bundleConfigs/generalConfig.rollup.config.js", {}
    // )

    build("testFiles/referencedFile1.js", 
            {
                file: "testFiles/dist/referencedFile1.js",
                // dir: "testFiles/dist",
                // entryFileNames: "referencedFile1-[hash].js"
            },
        "./bundleConfigs/generalConfig.rollup.config.js", {}, (a, b, c) => {
            // console.log("Post build of testFiles/referencedFile1.js", a, b, c);
        }
    )

    build("testFiles/testSubfolder/referencedFile2.js", 
            {
                file: "testFiles/dist/referencedFile2.js",
                // dir: "testFiles/dist/testSubfolder",
                // entryFileNames: "referencedFile2-[hash].js"
            },
        "./bundleConfigs/generalConfig.rollup.config.js", {}, (a, b, c) => {
            // console.log("Post build of testFiles/testSubfolder/referencedFile2.js", a, b, c);
        }
    )
}, (files, failedBuilds) => {
    // console.log("==== These are the files that were emitted ====");
    // console.log(files);
    // console.log("==== Failed Builds ====");
    // console.log(failedBuilds);
})