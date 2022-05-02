function postbuild() {
    console.log("post build");
}

rollerUp((env) => {
    if(env = "prod") {
        build("some path", "some other thing");
        build("some path", "some other thing");
    }

    if(env = "dev") {
        build("input", "output", "config",
        {
            overrides: ""
        }, postbuild);
    }
}, () => {
    // After all post builds
});

// eval(`
// rollerUp((env) => {
//     if(env = "prod") {
//         build("some path", "some other thing");
//     }
// });
// `);

function rollerUp(someThing) {
    console.log("something", someThing);
    // Load bundle configs
    someThing("prod");

    // Build all bundles

    // For each file that has tags, rebuild with new tags (essentially linking them)

    // Run all post builds
}

function build(p1, p2) {
    // add to the bundles
    console.log("build", p1, p2);
}



