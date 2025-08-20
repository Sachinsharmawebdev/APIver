module.exports = {
    ...require('./lib/runtimeLoader'),
    ...require('./serveVersionedAPI'),
    ...require('./versionMiddleware'),
    smartVersionMiddleware: require('./lib/smartVersionMiddleware').versionMiddleware,
    diff: require('./lib/utils/diff'),
};