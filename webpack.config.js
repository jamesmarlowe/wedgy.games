const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const CssMinimizerPlugin = require("css-minimizer-webpack-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const InlineSourceWebpackPlugin = require('inline-source-webpack-plugin');
const CopyPlugin = require("copy-webpack-plugin");

const css = {
    entry: "./src/stylesheet.css",
    mode: "production",
    module: {
      rules: [
        {
          test: /.s?css$/,
          use: [MiniCssExtractPlugin.loader, "css-loader"],
        },
      ],
    },
    optimization: {
      minimizer: [
        // For webpack@5 you can use the `...` syntax to extend existing minimizers (i.e. `terser-webpack-plugin`), uncomment the next line
        // `...`,
        new CssMinimizerPlugin(),
      ],
    },
    plugins: [
        new CopyPlugin({ patterns: [{ from: "./static", to: "" }] }),
        new MiniCssExtractPlugin(),
        new HtmlWebpackPlugin({
          filename: `player.html`,
          template: "./src/index.ejs",
          inlineSource: ".(js|css)$",
          minify: {
            collapseWhitespace: true,
          },
        }),
        new InlineSourceWebpackPlugin({
            compress: true,
            rootpath: './src',
            noAssetMatch: 'warn'
          })
      ],
  };

const server = {
    entry: "./src/chat.mjs",
    target: "node-webkit",
    mode: "development",
    devtool: "source-map",
    output: {
      filename: "worker.js",
      sourceMapFilename: "worker.js.map"
    },
    optimization: {
      minimize: true
    },
  };

  module.exports = [server, css];