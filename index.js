const app = require("express")();
const PORT = 8080;
const http = require("http").createServer(app).listen(PORT, () => {
    console.log(`server listening on port ${PORT} ...`)
});
const io = require("socket.io")(http);
const uuid = require("uuid");


let users = new Map();
let rooms = new Map();

io.on("connection", (socket) => {
    socket.on("get all rooms", () => {
        const obj = {};
        rooms.forEach((v, k) => {
            obj[k] = v
        });
        socket.emit("all rooms", obj);
    });
    socket.on("create room", (id, roomName, msg) => {
        const roomId = uuid.v4();
        rooms.set(roomId, roomName);
        socket.join(roomId);
        socket.currentRoom = roomId;
        // socket.emit("get all rooms")
    });
    socket.on("join room", (roomId) => {
        socket.join(roomId);
        socket.currentRoom = roomId;
        socket.broadcast.to(roomId).emit("news", {msg: `${socket.nickname} join the chat!`});
    });
    socket.on("disconnect", (userId) => {
        socket.leave(socket.currentRoom);
        socket.broadcast.to(socket.currentRoom).emit("news", {msg: `${socket.nickname} leave the chat`});
        socket.currentRoom = null;
    });
    socket.on("nickname", (nickname) => {
        // users.push({nickname: nickname, id: socket.id});
        users.set(socket.id, {nickname: nickname});
        socket.nickname = nickname;
        // console.log(socket.nickname);
    });
    socket.on("chat message", (data) => {
        io.to(socket.currentRoom).emit('chat message', `${socket.nickname}: ${data.msg}`);
    });
    socket.on("members", () => {
        const clients = io.sockets.adapter.rooms[socket.currentRoom];
        // io.to(socket.currnetRoom).emit("members",JSON.stringify(clients));
        // console.log(clients);
        let dataToSend = {};
        for (let member in clients.sockets) {
            // console.log(users.get(member).nickname);
            dataToSend[member] = {nickname: users.get(member).nickname};
        }
        // console.log(io.sockets.adapter.rooms);
        // console.log(dataToSend);
        // io.to(socket.currentRoom).emit("members", (clients));
        io.to(socket.currentRoom).emit("members", (dataToSend));
    });
    socket.on("webrtc", (id, msg) => {
        // console.log(id, msg);
        socket.to(id).emit("webrtc", socket.id, msg);
    })
});
