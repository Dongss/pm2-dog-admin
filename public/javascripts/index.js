var socket = io.connect("http://192.168.8.131:10106");

var servers = [];
var displayHosts = [];

var statusLabelClass = {
    online: "label-success",
    stopped: "label-warning",
    errored: "label-danger"
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
    servers = _.uniq(servers, false, function(item) {
        return item.alias;
    });
    servers.sort(function(a, b) {
        var A = a.alias.toUpperCase();
        var B = b.alias.toUpperCase();

        if (A > B) {
            return 1;
        }

        if (A < B) {
            return -1;
        }

        return 0;
    });
};

var processesTable = {
    init: function(el, list) {
        el.DataTable({
            paging: false,
            ordering: false,
            info: false,
            bFilter: true,
            sDom: '',
            search: $("#process-select").val(),
            data: list.list,
            createdRow: function(row, data, rowIndex) {
                $(row).attr('data-process-id', data.pm_id);
                $(row).attr('data-alias', data.server_info.alias);
            },
            columns: [{
                data: 'pid'
            }, {
                data: 'pm_id'  
            }, {
                data: 'name'    
            }, {
                data: function(row) {
                    return row.pm2_env.restart_time;
                }    
            }, {
                data: function(row) {
                    return row.pm2_env.pm_uptime;
                }        
            }, {
                data: function(row) {
                    return '<span class="label ' + row.pm2_env.label_class + '">' + row.pm2_env.status + '</span>'
                }    
            }, {
                data: function(row) {
                    return row.monit.cpu;
                }
            }, {
                data: function(row) {
                    return row.monit.memory;
                }    
            }, {
                data: function (row) {
                    return '<span class="glyphicon glyphicon-repeat action" data-action="restart" aria-hidden="true" data-toggle="tooltip" data-placement="top" title="Retart process"></span>'
                         + '<span class="glyphicon glyphicon-pause action" data-action="stop" aria-hidden="true" data-toggle="tooltip" data-placement="top" title="Stop process"></span>'
                         + '<span class="glyphicon glyphicon-play action" data-action="start" aria-hidden="true" data-toggle="tooltip" data-placement="top" title="Start process"></span>'
                         + '<span class="glyphicon glyphicon-retweet action" data-action="reload" aria-hidden="true" data-toggle="tooltip" data-placement="top" title="Reload process"></span>';
                }    
            }]
        });
    },
    reload: function(el, data, updated) {
        var selectedHosts = $("#hosts-select").select2('data');
        displayHosts = _.map(selectedHosts, function(host) {
            return host.id;
        });

        if (displayHosts.length === 0) {
            $('.pm2-host').show();
        } else {
            var display = _.find(displayHosts, function(host) {
                var originString = data.server.alias.toLowerCase();
                var subString = host.toLowerCase();
                return originString.indexOf(subString) > -1;
            });
            var hostEl = el.closest('.pm2-host');
            var hostElVisible = hostEl.is(':visible');
            if (!display && hostElVisible) {
                hostEl.hide();
                return false; 
            } else if (display && !hostElVisible){
                hostEl.show();
            }
        }

        el.dataTable().fnClearTable();
        el.dataTable().fnAddData(data.list);
        el.siblings('.updated').html('[ UPDATED ]' + updated);
    }
};

var renderList = function(list) {
    list.list.forEach(function(process) {
        process.pm2_env.label_class = statusLabelClass[process.pm2_env.status] || "label-default";
    });

    var updated = moment().format("HH:mm:ss");

    servers.forEach(function(server) {
        if (server.alias == list.server.alias) {
            if ($("#" + server.alias).get(0)) { // Update if host exit
                processesTable.reload($("#" + server.alias + " .table"), list, updated);
            } else { // Append if not exit
                var hostHtml = Mustache.to_html($("#pm2_list_host_container").html(), {
                    server: server,
                    updated: updated
                });
                $("#pm2-dog-list").append(hostHtml);
                processesTable.init($("#" + server.alias + " .table"), list);
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
};

var hostsSelectRender = function() {
    $.ajax({
        url: '/servers',
        contentType: 'application/json'
    })
    .done(function(data) {
        var selectData = _.map(data.servers,function(server) {
            return {
                id: server.name,
                text: server.name
            };
        });
        $(document).ready(function() {
            $('#hosts-select').select2({ // select2 init
                placeholder: '  Select by hosts',
                data: _.sortBy(selectData, 'id'),
                allowClear: true,
                tags: true
            });
        });
    })
    .fail(function(xhr, status, error) {
        myAlert("danger", "<strong>[ ERROR ]</strong> get hosts list failed: " + error);
    });
};

var onActionClicked = function(e) {
    var $target = $(e.currentTarget);
    var $pm = $target.closest("tr");
    var action = $target.attr("data-action");
    var pmId = $pm.attr("data-process-id");
    var alias = $pm.attr("data-alias");
    var r = window.confirm("Sure to exec [" + action + "] action to [ pm_id: " + pmId + " ] process on [ host: " + alias + " ] ?");
    if (!r) { return false; }
    actionRequest(alias, action, pmId);
};

var onProcessSelect = function(e) {
    var $target = $(e.currentTarget);
    $('.pm2-host .table').each(function() {
        $(this).DataTable()
            .column(2)
            .search($target.val())
            .draw();
    });
};

var eventsInit = function() {
    $("#pm2-dog-list").on("click", ".action", onActionClicked);
    $("#process-select").on("keyup", onProcessSelect);
};


socket.on('connect', function() {
    myAlert("success", "<strong>[ CONNECTED ]</strong>  You have been connected with server !", 4000);
});

socket.on('list', function(data) {
    if (data.retCode !== 0) { 
        myAlert("warning", "Get list failed: " + data.Message);
        return; 
    }
    formatServers(data.list.server);
    renderList(data.list);
});

socket.on('disconnect', function() {
    myAlert("danger", "<strong>[ DISCONNECTED ]</strong>  You have been disconnected !");
});

var init = function() {
    hostsSelectRender();
    eventsInit();   
};

init();
