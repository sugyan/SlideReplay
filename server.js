var express = require('express');
var mongodb = require('mongodb');
var mongoStore = require('connect-mongodb');

var app = module.exports = express.createServer();
var config = require('./config/default.js');

app.configure(function () {
    app.set('views', __dirname + '/views');
    app.set('view engine', 'jade');
    app.use(express.bodyParser());
    app.use(express.methodOverride());
    app.use(express.cookieParser());
    app.use(express['static'](__dirname + '/public'));
});

app.configure('development', function () {
    require('underscore').extend(config, require('./config/development'));
    app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('production', function () {
    app.use(express.errorHandler());
});

app.dynamicHelpers({
    session: function (req, res) {
        return req.session;
    }
});

new mongodb.Db(
    config.mongo.dbname,
    new mongodb.Server(config.mongo.host, config.mongo.port)
).open(function (err, db) {
    if (err) { throw err; }
    db.authenticate(
        config.mongo.authenticate.username,
        config.mongo.authenticate.password,
        function (err, result) {
            if (err) { throw err; }
            var store = new mongoStore({ db: db });
            app.use(express.session({
                secret: config.http.cookie_secret,
                store: store
            }));
            require('./lib/router')(app, config);
            app.use(app.router);

            app.listen(parseInt(process.env.PORT, 10) || 7777);
            console.log('Listening on port %d in %s mode', app.address().port, app.settings.env);

            require('./lib/socket.io')(app, config, store);
        }
    );
});
