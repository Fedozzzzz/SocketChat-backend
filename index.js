const app = require("express")();
const PORT = 8080;
const http = require("http").createServer(app).listen(PORT, () => {
    console.log(`server listening on port ${PORT} ...`)
});
const io = require("socket.io")(http);
const uuid = require("uuid");


let users = new Map();
let rooms = new Map();
let roomSockets = {}; //an object for creating a mesh network

io.on("connection", (socket) => {
    socket.on("get all rooms", () => {
        socket.emit("all rooms", convertMapToObject(rooms));
    });
    socket.on("create room", (roomName) => {
        const roomId = uuid.v4();
        rooms.set(roomId, roomName);
        socket.currentRoom = roomId;
        roomSockets[roomId] = new Map();
        io.emit("all rooms", convertMapToObject(rooms));
    });
    socket.on("join room", (roomId) => {
        socket.join(roomId);
        socket.currentRoom = roomId;
        roomSockets[roomId].set(socket.id, false);
        socket.broadcast.to(roomId).emit("news", {msg: `${socket.nickname} join the chat!`});
        if (checkVideoConference(roomId)) {
            io.to(socket.id).emit("news", {msg: "video conference started, you can join the conference!!!"});
        }
    });
    socket.on("disconnect", () => {
        if (socket.currentRoom) {
            socket.leave(socket.currentRoom);
            roomSockets[socket.currentRoom].delete(socket.id);
            if (!roomSockets[socket.currentRoom].size) {
                rooms.delete(socket.currentRoom);
            }
            socket.broadcast.to(socket.currentRoom).emit("news", {msg: `${socket.nickname} leave the chat`});
            io.to(socket.currentRoom).emit("disconnect");
            socket.currentRoom = null;
        }
    });
    socket.on("nickname", (nickname) => { //set the nickname
        users.set(socket.id, {nickname: nickname});
        socket.nickname = nickname;
    });
    socket.on("chat message", (data) => {
        io.to(socket.currentRoom).emit('chat message', {
            date: new Date().toLocaleString(),
            from: socket.nickname,
            msg: data.msg
        });
    });
    socket.on("members", () => { // returns an array of room members
        try {
            const clients = io.sockets.adapter.rooms[socket.currentRoom];
            let dataToSend = {};
            for (let member in clients.sockets) {
                dataToSend[member] = {nickname: users.get(member).nickname};
            }
            io.to(socket.currentRoom).emit("members", dataToSend);
        } catch (e) {
            console.log(e)
        }
    });
    socket.on("webrtc signal", (id, msg) => {
        socket.to(id).emit("webrtc signal", socket.id, msg);
    });
    socket.on("webrtc join", () => { //join to video conference
        let currRoom = roomSockets[socket.currentRoom];
        let dataToSend = [];
        for (let [memberId, flag] of currRoom) {
            if (memberId !== socket.id) {
                dataToSend.push(memberId);
            }
        }
        if (dataToSend.length) {
            io.to(socket.id).emit("webrtc make offer", dataToSend);
        }
    });
    socket.on("webrtc hangup", () => { //leave the video conference
        roomSockets[socket.currentRoom].set(socket.id, false);
        if (!checkVideoConference(socket.currentRoom)) {
            clearRoomSockets(socket.currentRoom);
        }
    });
    socket.on("webrtc offer", () => { //creating a mesh network to create a video conference (offer to all room members)
        let currRoom = roomSockets[socket.currentRoom];
        let toId; // socket id of member who should make an offer
        if (currRoom.get(socket.id)) {
            for (let [memberId, flag] of currRoom) {
                if (!flag) {
                    toId = memberId;
                    currRoom.set(toId, true);
                    break
                }
            }
        } else {
            toId = socket.id;
            currRoom.set(socket.id, true);
        }
        let dataToSend = [];
        for (let [memberId, flag] of currRoom) {
            if (!flag) {
                dataToSend.push(memberId);
            }
        }
        if (dataToSend.length) {
            io.to(toId).emit("webrtc make offer", dataToSend); // make an offer to rest of room members
        }
    })
});


function checkVideoConference(roomId) {
    let videoChatMembers = 0;
    for (let [memberId, flag] of roomSockets[roomId]) {
        if (flag) {
            videoChatMembers++;
        }
    }
    return videoChatMembers >= 1;
}

function clearRoomSockets(roomId) {
    for (let [memberId, flag] of roomSockets[roomId]) {
        if (flag) {
            roomSockets[roomId].set(memberId, false);
        }
    }
}

function convertMapToObject(map) {
    const obj = {};
    map.forEach((v, k) => {
        obj[k] = v
    });
    return obj;
}