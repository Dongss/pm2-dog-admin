var moment = require('moment');
var _ = require('underscore');
var url = require('url');
var request = require('request');
var ioClient = require('socket.io-client');
var ioServer = {};

var serverUrl = {
    restart: "/restart",
    stop: "/stop",
    start: "/start",
    reload: "/reload"
};

function findServerByAlias(alias) {
    var server = _.where(SERVERS, { alias: alias });   
    return server[0].host;
}

function formatList(list, server) {
    list.forEach(function(_list) {
        _list.monit.cpu = _list.monit.cpu.toFixed(2);
        _list.monit.memory = (_list.monit.memory / (1024*1024)).toFixed(2);
        _list.pm2_env.pm_uptime = _list.pm2_env.status == 'online' ? moment.unix(_list.pm2_env.pm_uptime / (1000)).toNow(true) : "-";
        _list.server_info = server;
    });

    return {
        list: list,
        server: server
    };
}

module.exports.servers = function(req, res, next) {
    res.json({
        retCode: 0,
        servers: _.map(SERVERS, function(server) {
            return {
                name: server.alias,
                host: url.parse(server.host).hostname
            };
        })
    });
};

module.exports.action = function(req, res, next) {
    var alias = req.query.alias;
    var pmId = req.query.pm_id;
    var operate = req.query.action;
    var url = findServerByAlias(alias);
    url += serverUrl[operate];
    url += "?pm_id=" + pmId;

    request({
        url: url,
        method: 'GET',
        timeout: 12000
    }, function(err, response, body) {
        var code = 0;
        var message;
        if (err) {
            code = -1;
            message = "Request server error: " + err;
        } else {
            body = JSON.parse(body);
            if (body.retCode !== 0 ) {
                code = -1;
                message = "Operate failed: " + body.Message;
            }
        }

        res.json({
            retCode: code,
            Message: message
        });
    });
};

module.exports.index = function(req, res, next) {
    res.render('index', {
        adminHost: "http://" + HOST + ":" + PORT
    });
};

module.exports.ioCtrl = function() {
    var sendList = function(socket, data, server) {
        if (data.retCode !== 0) {
            GLOBAL.logger.error('Get list failed: ', data);
            return;
        }
        ioServer.list(formatList(JSON.parse(data.list), server));
    };

    SERVERS.forEach(function(server) {
        var socket = ioClient.connect(server.host);

        // pm2 dog server data pushed
        socket.on('pm2_list', function(data) {
            sendList(socket, data, server);
        });

        // pm2 dog server connected
        socket.on('connect', function() {
            ioServer.onServerConnected(server);
        });

        // pm2 dog server disconnected
        socket.on('disconnect', function() {
            ioServer.onServerDisconnected(server);
        });

        try {
            var handler = require("./event_handler").handler;
            socket.on('event', function(data) {
                handler(JSON.parse(data).event, server);
            });
        } catch(e) {
            console.log(e);
        }
    });
};

module.exports.ioInit = function(io, callback) {
    // pm2 dog server data pushed
    ioServer.list = function(list) {
        io.emit('list', {
            retCode: 0,
            list: list
        });
    };

    // pm2 dog server connected
    ioServer.onServerConnected = function(server) {
        io.emit('server-connected', {
            server: server
        });
    };

    // pm2 dog server disconnected
    ioServer.onServerDisconnected = function(server) {
        io.emit('server-disconnected', {
            server: server
        });
    };

    // pm2 dog admin connected
    io.on('connection', function(socket) {
        return callback(socket);
    });
};
