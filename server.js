const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
const socketIo = require('socket.io');
const app = express();
const server = http.createServer(app);
const io = socketIo(server);
const port = 3507;

let games = [];

app.use(cors());
app.use(express.json());

app.use(express.static(path.join(__dirname, 'public')));
app.use('/game/assets', express.static(path.join(__dirname, 'assets')));
app.use('/game/sounds', express.static(path.join(__dirname, 'sounds')));
console.log(__dirname)

app.get('/game/:id', function(req, res) {
    const game = games.find(game => game.id === req.params.id);
    if (game) {
        res.sendFile(path.join(__dirname + '/game.html'));
    } else {
        res.status(404).send('Game not found');
    }
});

app.get('/lobby', function(req, res) {
    res.sendFile(path.join(__dirname + '/lobby.html'));
});

app.get('/', (req, res) => {
    res.redirect("/lobby")
});


app.post('/lobby', (req, res) => {
    var body = req.body
    console.log(body);
    if (body.action == "create server"){
        do{
            var id = []
            for (let i = 1; i <= 4; i++){
                id.push(Math.floor(Math.random()*10))
            }
            id = id.join("")
        } while (games.some(game => game.id === id))
        
        games.push({id: id, enough_players: false, players: [], game_state: "waiting for players"});

        //app.get("/" + id, function(req, res) {
        //    res.sendFile(path.join(__dirname + '/game.html'));
        //})

        res.redirect(303, "/game/" + id);
    }
    else if (body.action == "join server"){
        var game = games.find(x => body.id === x.id)
        if (game){
            game.enough_players = true; // make this work with direct link
            game_state = "ongoing";     // this too
            res.redirect(303, "/game/" + body.id);
        }
        else{
            res.json({error: true, message: "That lobby doesn't exist"});
        }
    }
    console.log(games)
});

io.on('connection', (socket) => {
    socket.on('joined game', (gameId) => {
        let game = games.find(x => gameId === x.id);
        if (game) {
            game.players.push(socket);
            if (game.players.length === 2) {
                var i = 0
                game.players.forEach(playerSocket => {
                    i++
                    playerSocket.emit('start game', i);
                });
            }
        }
    });
    socket.on("move", (x1, y1, x2, y2, user, id, game_over_condition, promption) => {
        let game = games.find(x => id.toString() === x.id);
        game.players.forEach(playerSocket => {
            if(game_over_condition){
                game.game_state = game_over_condition;
            }
            playerSocket.emit("move", x1, y1, x2, y2, user, id, game_over_condition, promption);
        });
    })
});



server.listen(port, () => {
    console.log("Server running");
});