
const webPath = document.currentScript.getAttribute("data-webpath");

window.addEventListener('load', function () {

    const socket = io(undefined, { path: `${webPath}/socket.io/` });

    socket.on('readings', function (msg) {


        const entry = document.createElement("div");
        entry.append(msg);

        document.querySelector('.readings').append(entry);
    });

    socket.on('connect', function () {
        socket.emit('devices', JSON.stringify(['rPI_46_1047_1', 'rPI_30_1071_1']));
    });
});
