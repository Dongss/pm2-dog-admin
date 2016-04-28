var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var url = require('url');

var bodyParser = require('body-parser');
var path = require('path');
var controller = require('./controller');
GLOBAL.logger = GLOBAL.logger || console;
SERVERS = [];
EXCLUDE = {};
HOST = '';
PORT = 0;

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));
app.set('views', path.join(__dirname, 'views'));

// Routers
app.get('/', function(req, res, next) {
    controller.index(req, res, next);
});

app.get('/servers', function(req, res, next) {
    controller.servers(req, res, next);
});

app.get('/action', function(req, res, next) {
    controller.action(req, res, next);
});

// Create server
module.exports = function(port, host, config, exclude) {
    HOST = host;
    PORT = port;

    config.forEach(function(server) {
        SERVERS.push({
            host: url.format({
                protocol: 'http',
                hostname: server.host,
                port: server.port
            }),
            alias: server.alias
        });
    });
    EXCLUDE = exclude || {};

    http.listen(port, host, function(){
        controller.ioInit(io, function() {});
        controller.ioCtrl();
        GLOBAL.logger.info('PM2-dog admin listening on: ', host, port);
    });
};
