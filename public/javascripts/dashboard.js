
$(function () {
    var socket = io(undefined, { path: "/graphs/socket.io/" });
    //$('form').submit(function () {
    //    socket.emit('randomword', $('#m').val());
    //    $('#m').val('');
    //    return false;
    //});
    socket.on('readings', function (msg) {
        var entry = $('<div>');
        entry.text(msg);
        $('.readings').append(entry);
    });

    socket.on('connect', function () {
        socket.emit('devices', JSON.stringify(['rPI_46_1047_1', 'rPI_30_1071_1']));
    });
});
