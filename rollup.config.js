export default {
  input: 'index.js',
  output: {
    file: 'build/d3-org-chart.js',
    name: 'd3',
    extend: true,
    sourcemap: true,
    format: 'umd',
    globals: {
      'd3-selection': 'd3',
      'd3-array': 'd3',
      'd3-hierarchy': 'd3',
      'd3-zoom': 'd3',
      'd3-flextree': 'd3',
      'd3-shape': 'd3',
      'd3-group': 'd3',
      'd3-drag': 'd3',
    }
  }
};