module.exports = {
    ...require('./lib/runtimeLoader'),
    ...require('./versionMiddleware'),
    smartVersionMiddleware: require('./lib/smartVersionMiddleware').versionMiddleware,
    diff: require('./lib/utils/diff'),
};