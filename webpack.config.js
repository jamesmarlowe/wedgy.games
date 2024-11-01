const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const CssMinimizerPlugin = require("css-minimizer-webpack-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const InlineSourceWebpackPlugin = require('inline-source-webpack-plugin');
const CopyPlugin = require("copy-webpack-plugin");

const static = {
    entry: ["./static/stylesheet.css"],
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
      minimize: true,
      minimizer: [
        // For webpack@5 you can use the `...` syntax to extend existing minimizers (i.e. `terser-webpack-plugin`), uncomment the next line
        // `...`,
        new CssMinimizerPlugin(),
      ],
    },
    plugins: [
        new CopyPlugin({ patterns: [
            { from: "./public", to: "" },
            { from: "./static", to: "static" },
            { from: "./.well-known", to: ".well-known" }
        ] }),
        new MiniCssExtractPlugin(),
        new HtmlWebpackPlugin({
          filename: `index.html`,
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

const player = {
    entry: "./src/player.js",
    target: "web",
    mode: "production",
    output: {
      filename: "uhhh.js",
    },
    optimization: {
      minimize: true
    },
  };

const server = {
      entry: "./src/chat.mjs",
      target: "web",
      mode: "production",
      output: {
        filename: "chat.js",
        libraryTarget: 'commonjs',
      },
      optimization: {
        minimize: true
      },
    };

  module.exports = [player, static];