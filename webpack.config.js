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

	externals: {
    "mongodb": "commonjs mongodb",

    "@terrencecrowley/context": "commonjs @terrencecrowley/context",
    "@terrencecrowley/util": "commonjs @terrencecrowley/util",
    "@terrencecrowley/fsm": "commonjs @terrencecrowley/fsm",
    "@terrencecrowley/log": "commonjs @terrencecrowley/log",
    "@terrencecrowley/dbabstract": "commonjs @terrencecrowley/dbabstract",
    "@terrencecrowley/storage": "commonjs @terrencecrowley/storage"
	},

    module: {
		rules: [
			{ test: /\.tsx?$/, use: 'ts-loader', exclude: /node_modules/ },
			{ test: /\.json$/, loader: 'json-loader' },
			{ test: /\.js$/, enforce: "pre", loader: "source-map-loader" }
		]
    },

    resolve: {
        extensions: [".webpack.js", ".web.js", ".ts", ".tsx", ".js"]
    }

};

module.exports = [ libConfig ];
