module.exports = {
  input: "./src/schema-list.js",
  output: {format: "cjs", file: "dist/schema-list.js"},
  sourcemap: true,
  plugins: [require("rollup-plugin-buble")()],
  external(id) { return !/^[\.\/]/.test(id) }
}
