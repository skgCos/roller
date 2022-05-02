import typescript from "@rollup/plugin-typescript";

// This is the build configuration for the actual builder
export default {
    input: "src/index.ts",
    output: {
        file: "dist/roller.js",
        sourcemap: true,
        format: "commonjs"
    },
    plugins: [
        typescript({
            sourceMap: true,
            module: "esnext"
        })
    ]
}