var mongodb = require('mongodb');

module.exports = function (config) {
    return {
        getCollection: function (collection, callback) {
            var db = new mongodb.Db(
                config.mongo.dbname,
                new mongodb.Server(config.mongo.host, config.mongo.port)
            );
            db.open(function (err, db) {
                if (err) { throw err; }
                db.authenticate(
                    config.mongo.authenticate.username,
                    config.mongo.authenticate.password,
                    function (err, result) {
                        if (err) { throw err; }
                        db.collection(collection, callback);
                    }
                );
            });
        }
    };
};
