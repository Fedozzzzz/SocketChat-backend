const app = require("express")();
const http = require("http").createServer(app);
const io = require("socket.io")(http);
const uuid = require("uuid");

const PORT = 8080;

let users = [];
let rooms = new Map();

io.on("connection", (socket) => {
    // console.log("a new user connected");
    // io.send("a new user connected!");
    // if (socket.rooms) {
    // let room = uuid.v4();
    // socket.join(room);
    // socket.emit("all rooms", io.sockets.adapter.rooms);
    // }
    // let room;
    socket.on("get all rooms", () => {
        // console.log(socket);
        // console.log(io.sockets.adapter.rooms);
        // socket.emit("all rooms", io.sockets.adapter.rooms)
        // console.log(rooms);
        // console.log(JSON.stringify(rooms));
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
    });
    // console.log(socket.rooms);
    // socket.emit("all rooms", socket);
    // socket.on("room", msg => {
    //     const json = JSON.parse(msg);
    //     users[json.id] = socket;
    //     if (socket.room) {
    //         socket.leave(socket.room)
    //     }
    //     socket.room = json.room;
    //     socket.join(socket.room);
    //     socket.user_id = json.id;
    //     socket.broadcast.to(socket.room).emit("new", json.id)
    // });
    socket.on("join room", (roomId) => {
        socket.join(roomId);
        socket.currentRoom = roomId;
        socket.broadcast.to(roomId).emit("news", {msg: `a ${socket.nickname} user connected!`});
    });
    socket.on("disconnect", (userId) => {
        socket.leave(socket.currentRoom);
        socket.broadcast.to(socket.currentRoom).emit("news", {msg: `a user ${socket.nickname} disconnected`});
        socket.currentRoom = null;
    });
    socket.on("nickname", (nickname) => {
        users.push({nickname: nickname, id: socket.id});
        socket.nickname = nickname;
        console.log(socket.nickname);
    });
    socket.on("chat message", (data) => {
        io.to(socket.currentRoom).emit('chat message', `${socket.nickname}: ${data.msg}`);
    });
});

http.listen(PORT, () => {
    console.log(`server listening on port ${PORT} ...`)
});