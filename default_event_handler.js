var request = require("request");

module.exports.handler = function(event, server) { 
    /*
     * Event handler here
     * */
    // if exclude
    if (SERVERS.exclude.indexOf(event.process.name) !== -1) {
        return;
    }
    if (event.event == 'exit') {
        request.post("your url", {           
            form: {                                                            
                alias: server.alias,
                event: event
            }   
        }, function(err, response, body) {                                               
        });
    }   
};  
