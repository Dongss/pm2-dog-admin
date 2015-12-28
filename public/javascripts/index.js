var socket = io.connect("http://192.168.8.131:10106");

var servers = [];
var statusLabelClass = {
    online: "label-success",
    stopped: "label-warning",
    error: "label-danger"
};

var myAlert = function(alertClass, content, timeout) {
    var html = Mustache.to_html($("#my_alert").html(), {
        class: alertClass,
        content: content
    });
    $("body").prepend(html);
    if (timeout) {
        var $firstAlert = $(".my-alert").first();
        setTimeout(function() {
            $firstAlert.remove();
        }, timeout);
    }
};

var formatServers = function(server) {
    servers.push(server);
    servers = _.uniq(servers);
};

var renderList = function(list) {
    list.list.forEach(function(process) {
        process.pm2_env.label_class = statusLabelClass[process.pm2_env.status] || "label-default";
    });

    var updated = moment().format("HH:mm:ss");
    var html = Mustache.to_html($("#pm2_list_table_tpl").html(), { 
        list: list.list,
        server: list.server,
        updated: updated
    });

    servers.forEach(function(server) {
        if (server.alias == list.server.alias) {
            if ($("#" + server.alias).get(0)) {
                $("#" + server.alias).html(html);
            } else {
                var hostHtml = Mustache.to_html($("#pm2_list_host_container").html(), {
                    server: server
                });
                $("#pm2-dog-list").append(hostHtml);
                $("#" + server.alias).html(html);
            }
        }
    });
};

var actionRequest = function(alias, action, pmId) {
    $.ajax({
        url: "/action?alias=" + alias + "&action=" + action + "&pm_id=" + pmId,
        type: "GET",
        cache: false
    }).done(function(data) {
        if (data.retCode !== 0) {
            myAlert("danger", "<strong>[ " + action + " ]</strong>  process failed: " + data.Message);
            return false;
        }
        myAlert("success", "<strong>[ " + action + " ]</strong>  process success", 5000);
    }).fail(function(xhr, status, error) {
        myAlert("danger", "<strong>[ " + action + " ]</strong>  process error: " + error);
        return false;
    });
}

var onActionClicked = function(e) {
    var $target = $(e.currentTarget);
    var $pm = $target.closest("tr");
    var action = $target.attr("data-action");
    var pmId = $pm.attr("data-process-id");
    var alias = $pm.attr("data-alias");
    var r = window.confirm("Sure to exec [" + action + "] action to " + pmId + " process on host: " + alias + " ?");
    if (!r) { return false; }
    actionRequest(alias, action, pmId);
};

var eventsInit = function() {
    $("#pm2-dog-list").on("click", ".action", onActionClicked);
};


socket.on('connect', function() {
    myAlert("success", "<strong>[ CONNECTED ]</strong>  You have been connected with server !", 4000);
});

socket.on('list', function(data) {
    if (data.retCode !== 0) { 
        myAlert("warning", "Get ist failed: " + data.Message);
        return; 
    }
    formatServers(data.list.server);
    renderList(data.list);
});

socket.on('disconnect', function() {
    myAlert("danger", "<strong>[ DISCONNECTED ]</strong>  You have been disconnected !");
});

eventsInit();
