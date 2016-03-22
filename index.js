var server = require("./pm2-dog");

var args = {
    admin: {
        host: 'localhost',
        port: 9090
    },
    servers: []
};

if (process.argv.indexOf("--config") != -1) {
    try {
        args = require(__dirname +'/' +  (process.argv[process.argv.indexOf("--config") + 1]));
    } catch(e) {
        process.exit(1);
    }
}

server(args.admin.port, args.admin.host, args.servers, args.exclude);
