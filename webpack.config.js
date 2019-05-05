var path = require('path');
var fs = require('fs');
var externalModules = {};
fs.readdirSync('node_modules/@terrencecrowley')
  .forEach((mod) => {
    mod = '@terrencecrowley/' + mod;
    externalModules[mod] = 'commonjs ' + mod;
  });

var libConfig = {
    entry: {
      library: './lib/all.ts'
	  },
    target: 'node',
    mode: 'development',
    output: {
        library: 'dbmongo',
        libraryTarget: 'umd',
        path: __dirname + '/dist',
        filename: 'dbmongo.js'
    },

    // Enable source maps
    devtool: "source-map",

    externals: externalModules,

    module: {
		rules: [
			{ test: /\.tsx?$/, use: 'ts-loader', exclude: /node_modules/ },
			{ test: /\.json$/, loader: 'json-loader', exclude: /node_modules/ },
			{ test: /\.js$/, enforce: "pre", loader: "source-map-loader" }
		]
    },

    resolve: {
        extensions: [".webpack.js", ".web.js", ".ts", ".tsx", ".js"]
    }

};

module.exports = [ libConfig ];
