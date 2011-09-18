var _ = require('underscore');
var qs = require('qs');
var url = require('url');
var http = require('http');
var oauth = require('oauth');
var crypto = require('crypto');
var xml2json = require('xml2json');

module.exports = function (app, config) {
    var model = require('./model')(config);
    var createQuery = function (query) {
        var ts = String(Math.floor(new Date().getTime() / 1000));
        var shasum = crypto.createHash('sha1');
        shasum.update(config.slideshare.secret + ts);
        var params = {
            api_key: config.slideshare.key,
            ts: ts,
            hash: shasum.digest('hex')
        };
        _.extend(params, query);
        return qs.stringify(params);
    };

    app.use(function (req, res, next) {
        var parsed = url.parse(req.url);
        if (RegExp("^/(?:new|create|edit/|api/)").test(parsed.pathname) && ! req.session.user) {
            req.session.redirect = parsed.pathname;
            res.redirect('/signin');
        } else {
            next();
        }
    });

    app.get('/', function (req, res) {
        model.getCollection('slide', function (err, collection) {
            if (err) { throw err; }
            collection.find().sort({ created_at: -1 }).limit(10).toArray(function (err, results) {
                if (err) { throw err; }
                res.render('index', { slides: results });
            });
        });
    });

    app.get('/signin', function (req, res) {
        if (req.session.user) {
            res.redirect('/');
            return;
        } else {
            res.render('signin');
        }
    });

    app.get('/signin/github', function (req, res) {
        var oauth2 = new oauth.OAuth2(
            config.oauth.github.client,
            config.oauth.github.secret,
            'https://github.com/login'
        );
        var code = req.param('code');
        if (req.session.oauth && code) {
            delete req.session.oauth;
            oauth2.getOAuthAccessToken(code, null, function (err, access_token) {
                if (err) { throw err; }
                oauth2.get(
                    'https://api.github.com/user',
                    access_token,
                    function (err, result) {
                        if (err) { throw err; }
                        var data = JSON.parse(result);
                        data._id = data.name;
                        delete data.name;
                        delete data.plan;
                        model.getCollection('user', function (err, collection) {
                            if (err) { throw err; }
                            collection.findAndModify({ _id: data._id }, [], data, { upsert: true, 'new': true }, function (err, result) {
                                if (err) { throw err; }
                                var redirect = req.session.redirect || '/';
                                delete req.session.redirect;
                                req.session.user = {
                                    id: result.id,
                                    name: result._id,
                                    image: result.avatar_url
                                };
                                res.redirect(redirect);
                            });
                        });
                    }
                );
            });
        } else {
            req.session.oauth = true;
            res.redirect(oauth2.getAuthorizeUrl());
        }
    });

    app.get('/signout', function (req, res) {
        req.session.destroy();
        res.redirect('/');
    });

    app.get('/new', function (req, res) {
        res.render('new');
    });

    app.post('/create', function (req, res) {
        http.get({
            host: 'www.slideshare.net',
            path: '/api/2/get_slideshow?' + createQuery({ slideshow_id: req.param('id'), detailed: "1" })
        }, function (response) {
            var buf = '';
            response.on('data', function (chunk) {
                buf += chunk;
            });
            response.on('end', function () {
                var i, replay = [];
                var data = xml2json.toJson(buf, { object: true }).Slideshow;
                Object.keys(data).forEach(function (key) {
                    if (typeof data[key] === 'object') {
                        data[key] = JSON.stringify(data[key]);
                    }
                });
                for (i = data.NumSlides; i--;) {
                    replay.push(10);
                }
                data.replay = JSON.stringify(replay);
                data.registered_by = req.session.user.name;
                data.created_at = new Date();
                model.getCollection('slide', function (err, collection) {
                    if (err) { throw err; }
                    collection.insert(data, function (err, objects) {
                        if (err) { throw err; }
                        res.redirect('/edit/' + objects[0]._id);
                    });
                });
            });
        });
    });

    app.get('/edit/:id', function (req, res) {
        model.getCollection('slide', function (err, collection) {
            try {
                var id = collection.db.bson_serializer.ObjectID(req.param('id'));
                if (err) { throw err; }
                collection.findOne({ _id: id }, function (err, object) {
                    if (err) { throw err; }
                    if (object) {
                        res.render('edit', object);
                    } else {
                        res.send(404);
                    }
                });
            } catch (e) {
                res.send(404);
            }
        });
    });
    app.post('/edit/:id', function (req, res) {
        var i, l, replay = [];
        for (i = 0, l = Object.keys(req.body).length; i < l; i++) {
            if (req.body[i] === undefined) { throw 'invalid'; }
            replay.push(Number(req.body[i]));
        }
        model.getCollection('slide', function (err, collection) {
            try {
                var id = collection.db.bson_serializer.ObjectID(req.param('id'));
                if (err) { throw err; }
                collection.findAndModify({ _id: id }, [], { $set: { replay: JSON.stringify(replay) } }, {}, function (err, result) {
                    if (err) { throw err; }
                    res.redirect('/play/' + id);
                });
            } catch (e) {
                res.send(404);
            }
        });
    });

    app.get('/play/:id', function (req, res) {
        model.getCollection('slide', function (err, collection) {
            try {
                var id = collection.db.bson_serializer.ObjectID(req.param('id'));
                if (err) { throw err; }
                collection.findOne({ _id: id }, function (err, object) {
                    if (err) { throw err; }
                    if (object) {
                        res.render('play', object);
                    } else {
                        res.send(404);
                    }
                });
            } catch (e) {
                res.send(404);
            }
        });
    });

    app.get('/api/search', function (req, res) {
        var q = req.param('q');
        if (! q) {
            res.end();
            return;
        }
        http.get({
            host: 'www.slideshare.net',
            path: '/api/2/search_slideshows?' + createQuery({ q: q })
        }, function (response) {
            var buf = '';
            response.on('data', function (chunk) {
                buf += chunk;
            });
            response.on('end', function () {
                res.end(xml2json.toJson(buf));
            });
        });
    });
};
