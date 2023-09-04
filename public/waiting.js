var socket = io();
let enough_players = false
let user
let id = window.location.href.split("/")[window.location.href.split("/").length-1]
socket.emit('join game', id); // gameId should be the id of the game the player is joining

var messagesdiv;
document.addEventListener('DOMContentLoaded', function() {
    messagesdiv = document.getElementById("messagesdiv");
});

// Listen for 'start game' event
socket.on('start game', (x) => {
    // Run your code here when the game starts
    console.log('Game is starting!');
    enough_players = true
    user = x
});

socket.on("clientmessage", (message, user2) => {
    if (user != user2){
        var node = document.createElement("p")
        node.textContent = "Other person: " + message
        messagesdiv.appendChild(node)
    }
})

function send(){
    var value = document.getElementById("messagefield").value
    socket.emit("message", value, user, id)
    var node = document.createElement("p")
    node.textContent = "You: " + value
    messagesdiv.appendChild(node)
}