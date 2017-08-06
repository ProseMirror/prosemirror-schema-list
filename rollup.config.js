module.exports = {
  entry: "./src/schema-list.js",
  dest: "dist/schema-list.js",
  format: "cjs",
  sourceMap: true,
  plugins: [require("rollup-plugin-buble")()],
  external(id) { return !/^[\.\/]/.test(id) }
}
