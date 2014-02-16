var registry = require('etcd-registry');
var noop = function() {};

module.exports = function(services, names, server, cb) {
	if (!cb) cb = noop;
	if (typeof services === 'string') services = registry(services);

	var port = typeof server === 'number' ? server : server.address().port;
	var server = typeof server === 'number' ? null : server;

	names = [].concat(names);

	var loop = function(err, service) {
		if (err) return cb(err);
		if (!names.length) return cb(null, service);
		services.join(names.shift(), {port:port}, loop);
	};

	loop();

	var pexit = process.exit;

	var exit = function(timeout) {
		if (timeout) return setTimeout(pexit, timeout).unref();
		pexit();
	};

	process.exit = function(code) { // a bit hackish but we want to intercept process exit and do async stuff
		services.leave(function() {
			pexit(code);
		});
	};

	process.on('SIGTERM', function() {
		services.leave(function(err) {
			if (err) return exit();
			if (!server) return exit(10000);
			server.unref();
			exit(10000);
		});
	});

	process.on('SIGINT', function() {
		services.leave(function() {
			exit();
		});
	});

	return server;
};