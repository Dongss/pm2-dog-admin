var request = require("request");

module.exports.handler = function(event, server) { 
    /*
     * Event handler here
     * */
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
