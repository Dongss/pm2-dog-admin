var socket = io.connect(ADMIN_SERVER);
var SERVERS = [];

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
        el.dataTable().fnClearTable();
        el.dataTable().fnAddData(data.list);
        el.siblings('.host-head').find('.updated').html('[ UPDATED ]' + updated);
    }
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

var loadServers = function() {
    $.ajax({
        url: '/servers',
        contentType: 'application/json'
    })
    .done(function(data) {
        SERVERS = data.servers.sort(function(a, b) {
            var A = a.name.toUpperCase();
            var B = b.name.toUpperCase();

            if (A > B) {
                return 1;
            }

            if (A < B) {
                return -1;
            }

            return 0;
        });
        var selectData = _.map(SERVERS,function(server) {
            return {
                id: server.name,
                text: server.name
            };
        });
        $(document).ready(function() {
            $('#hosts-select').select2({ // select2 init
                placeholder: '  Select by hosts',
                data: selectData,
                namer: true,
                tags: true
            });
        });
        initServerList(SERVERS);
    })
    .fail(function(xhr, status, error) {
        myAlert("danger", "<strong>[ ERROR ]</strong> get hosts list failed: " + error);
    });
};

var initServerList = function(serverList) {
    var updated = moment().format("HH:mm:ss");
    serverList.forEach(function(server) {
        var html = Mustache.to_html($("#host-container-tpl").html(), {
            server: server,
            updated: updated
        });
        $('#pm2-test').append(html);
    });
};

var updateProcessList = function(list) {
    list.list.forEach(function(process) {
        process.pm2_env.label_class = statusLabelClass[process.pm2_env.status] || "label-default";
    });
    var server = list.server;
    var updated = moment().format("HH:mm:ss");
    var $tableEl = $("#host-" + server.alias + " .table");

    if (!$tableEl.length) {
        var html = Mustache.to_html($("#process-list-tpl").html());
        $("#host-" + server.alias).find('.alert').replaceWith(html);
        processesTable.init($("#host-" + server.alias + " .table"), list);
    } else {
        processesTable.reload($tableEl, list, updated);
    }
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
    $('.host-container .table').each(function() {
        $(this).DataTable()
            .column(2)
            .search($target.val())
            .draw();
    });
};

var onHostsSelect = function(e) {
    var dataSelected = $(this).select2('data');
    if (!dataSelected.length) {
        $('.host-container').show();
        return;
    }

    var hostsSelected = _.map(dataSelected, function(data) {
        return data.id;
    });
    SERVERS.forEach(function(server) {
        var displayed = _.find(hostsSelected, function(val) {
            val = val.toUpperCase();
            return server.name.toUpperCase().indexOf(val) > -1;
        });
        var $el = $('#host-' + server.name);
        if (displayed) {
            $el.show();
        } else {
            $el.hide();    
        }
    });
};

var updateServerState = function(server, state) {
    var $el = $('#host-' + server.alias);
    var $badge = $el.find('.host-head .badge');
    $badge.attr('class', 'badge ' + state);
};

var eventsInit = function() {
    $("#pm2-dog-list").on("click", ".action", onActionClicked);
    $("#process-select").on("keyup", onProcessSelect);
    $("#hosts-select").on("change", onHostsSelect);
};


socket.on('connect', function() {
    myAlert("success", "<strong>[ CONNECTED ]</strong>  You have been connected with server !", 4000);
});

socket.on('list', function(data) {
    if (data.retCode !== 0) { 
        myAlert("warning", "Get list failed: " + data.Message);
        return; 
    }
    updateServerState(data.list.server, 'success');
    updateProcessList(data.list);
});

socket.on('disconnect', function() {
    myAlert("danger", "<strong>[ DISCONNECTED ]</strong>  You have been disconnected !");
});

// pm2 dog server connected
socket.on('server-connected', function(data) {
    updateServerState(data.server, 'success');
});

// pm2 dog server disconnected
socket.on('server-disconnected', function(data) {
    updateServerState(data.server, 'error');
});

var init = function() {
    loadServers();
    eventsInit();   
};

init();
