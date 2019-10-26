const app = require("express")();
const http = require("http").createServer(app);
const io = require("socket.io")(http);

const PORT = 8080;
// app.get("/", (req, res) => {
//     res.sendFile(__dirname + "/index.html");
// });

io.on("connection", (socket) => {
    console.log("a new user connected");
    // io.send("a new user connected!");
    socket.broadcast.emit("news", {msg: "a new user connected"});
    socket.on("nickname", (nickname) => {
        io.emit("news", {msg: `${nickname} joined the chat!!`})
    });
    socket.on("chat message", (data) => {
        io.emit('chat message', `${data.nickname}: ${data.msg}`);
        // console.log(msg);
    });
    socket.on("disconnect", () => {
        // console.log("user disconnected")
        socket.broadcast.emit("news", {msg: "a user disconnected"});
    });
});

http.listen(PORT, () => {
    console.log(`server listening on port ${PORT} ...`)
});