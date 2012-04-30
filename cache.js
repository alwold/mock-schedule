var Memcached = require('memcached');
var memcached = new Memcached("localhost:11211");

exports.memcached = memcached;