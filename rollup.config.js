module.exports = {
  input: './src/schema-list.js',
  output: [{
    file: 'dist/index.js',
    format: 'cjs',
    sourcemap: true
  }, {
    file: 'dist/index.mjs',
    format: 'es',
    sourcemap: true
  }],
  plugins: [require('@rollup/plugin-buble')()],
  external(id) { return !/^[\.\/]/.test(id) }
}
