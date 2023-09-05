const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
const Pusher = require("pusher");
const app = express();
const port = 3507;
const server = http.createServer(app);


const pusher = new Pusher({
  appId: "1663963",
  key: "136f1a7c7875e0106034",
  secret: "36cc3dd6fa2261f0ec2d",
  cluster: "eu",
  useTLS: true
});


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
    
    //res.json({ message: 'Received your message!' });
});

app.post('/pusher/trigger', (req, res) => {
    const payload = req.body;
    let firstplayer = false;
    console.log("recieved", payload)
    if (payload.type === "joined game"){
        let game = games.find(x => payload.id.toString() === x.id);
        if (game) {
            game.players.push(Math.random()*100);
            if (game.players.length === 2) {
                pusher.trigger(payload.id.toString(), 'start game', payload);
            } else {
                firstplayer = true
            }
        }
    } else if (payload.type === "move"){
        let game = games.find(x => payload.id.toString() === x.id);
        if(payload.game_over_condition){
            game.game_state = payload.game_over_condition;
        }
        pusher.trigger(payload.id.toString(), 'move', payload);
    }
    payload.firstplayer = firstplayer
    res.send(payload);
});

server.listen(port, () => {
    console.log("Server running");
    console.log("games:", games)
});