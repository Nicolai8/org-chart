const HtmlWebpackPlugin = require('html-webpack-plugin');
const path = require('path');

module.exports = {
  mode: 'development',
  devtool: 'cheap-module-source-map',
  entry: './demo/index.ts',
  output: {
    filename: 'index.js',
  },
  optimization: {
    minimize: false,
  },
  devServer: {
    open: true,
    hot: true,
    host: 'localhost',
    port: 4000,
    static: {
      directory: path.resolve(__dirname, './demo'),
      publicPath: '/demo',
    },
  },
  module: {
    rules: [
      {
        test: /\.([mjt])s$/,
        exclude: /(node_modules|bower_components)/,
        use: {
          loader: 'babel-loader',
        },
      },
      {
        test: /\.svg/,
        type: 'asset/source'
      }
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      inject: true,
      template: 'demo/index.html',
    }),
  ],
  resolve: {
    extensions: ['.ts', '.js', '.json'],
  },
};
