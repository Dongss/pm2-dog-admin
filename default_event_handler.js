var request = require("request");

module.exports.handler = function(event, server) { 
    /*
     * Event handler here
     * */
    // if exclude
    var exclude = EXCLUDE.pname || [];
    if (exclude.indexOf(event.process.name) !== -1) {
        /*
         * Ignore processes
         * */
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
