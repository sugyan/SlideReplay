module.exports = function (app, config, store) {
    var io = require('socket.io').listen(app);
    var model = require('./model')(config);
    var utils = (function () {
        var path = require('path');
        var expressPath = require.resolve('express');
        var utilsPath = path.join(path.dirname(expressPath), 'node_modules', 'connect', 'lib', 'utils');
        return require(utilsPath);
    }());
    io.sockets.on('connection', function (socket) {
        var name, room;
        var key = utils.parseCookie(socket.handshake.headers.cookie)['connect.sid'];
        store.get(key, function (err, result) {
            if (err) { throw err; }
            if (result.user) {
                name = result.user.name;
            } else {
                name = 'guest#' + socket.id.substr(0, 5);
            }
        });
        var notifyConnection = function () {
            io.sockets.emit('connection', { total: io.of().clients().length });
            if (room) {
                socket.broadcast.to(room).emit('connection', { room: io.of().clients(room).length });
            }
        };
        socket.on('join', function (id) {
            room = id;
            socket.join(room);
            notifyConnection();
            socket.emit('connection', { room: io.of().clients(room).length });
            model.getCollection('message', function (err, collection) {
                if (err) { throw err; }
                collection.find({ room: room }).sort({ created_at: 1 }).limit(200).toArray(function (err, results) {
                    if (err) { throw err; }
                    results.forEach(function (e) {
                        ['_id', 'created_at', 'room'].forEach(function (f) {
                            delete e[f];
                        });
                        socket.emit('message', e);
                    });
                });
            });
        });
        socket.on('disconnect', function () {
            if (room) { socket.leave(room); }
            process.nextTick(notifyConnection);
        });
        socket.on('message', function (data) {
            if (room) {
                data.name = name;
                socket.broadcast.to(room).emit('message', data);
                data.created_at = new Date();
                data.room = room;
                model.getCollection('message', function (err, collection) {
                    if (err) { throw err; }
                    collection.insert(data, function (err, objects) {
                        if (err) { throw err; }
                    });
                });
            }
        });
    });
};
