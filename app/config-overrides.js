const webpack = require('webpack');

module.exports = function override(config) {
    // Fallback untuk modul node yang dibutuhkan oleh Solana dan Axios
    config.resolve.fallback = {
        crypto: require.resolve('crypto-browserify'),
        stream: require.resolve('stream-browserify'),
        assert: require.resolve('assert'),
        http: require.resolve('stream-http'),
        https: require.resolve('https-browserify'),
        os: require.resolve('os-browserify'),
        url: require.resolve('url'),
        zlib: require.resolve('browserify-zlib'),
        buffer: require.resolve('buffer'),
        process: require.resolve('process/browser'),
        "process/browser": require.resolve('process/browser'),
        util: require.resolve('util'),
    };

    config.plugins.push(
        new webpack.ProvidePlugin({
            process: 'process/browser',
            Buffer: ['buffer', 'Buffer'],
        })
    );

    return config;
};