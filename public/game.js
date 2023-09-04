let heldPiece = null;
let selectedPiece = null;
let orgPos = null;
let offset = {x: 32, y: 32};
let piece = document.getElementById('p');
let board_html_table = document.getElementById("chessboard");
//let board_offset = {x: Number(board_html_table.style.left.replace("px", "")), y: Number(board_html_table.style.top.replace("px", ""))};
let board_offset = {x: 10, y: 10}

let can_castle = new Array(4).fill(true)
let all_legal_moves_white = null;
let all_legal_moves_black = null;
let white_in_check = false;
let black_in_check = false;
let turn = "none";
let color = null;
let emit = false;
let overwrite = false;
let castle_rook = false;
let board_copy;
let event_function_map = new Map()

const enpassant = "enpassant";
const castle = "castle";

let gamestart_sound = new Audio("sounds/gamestart.wav");
let castle_sound = new Audio("sounds/castle.wav");
let check_sound = new Audio("sounds/check.wav");
let move_sound = new Audio("sounds/move.wav");
let capture_sound = new Audio("sounds/capture.wav");
let gameover_sound = new Audio("sounds/gameover.wav");

let enough_players = false;
let user;
let id = window.location.href.split("/")[window.location.href.split("/").length-1];

Pusher.logToConsole = true;

var pusher = new Pusher('136f1a7c7875e0106034', {
    cluster: 'eu'
});
var channel = pusher.subscribe(id);

function emit_move(type, x1, y1, x2, y2, user, id, game_over_condition){
    let body;
    if (type === "move"){
        body = JSON.stringify({type: type, x1: x1, y1: y1, x2: x2, y2: y2, user: user, id: id, game_over_condition: game_over_condition});
    } else if (type === "joined game"){
        body = JSON.stringify({type: type, id: x1})
    }
    return fetch('https://odd-red-zebra-tie.cyclic.app/pusher/trigger', {
        method: 'POST',
        body: body,
        headers: { 'Content-Type': 'application/json' }
    }).then(response => response.json());
}

channel.bind('start game', function(data) {
    gamestart_sound.play().catch() //
    console.log('Game is starting!');
    enough_players = true;
    turn = "white";
    initialize_board();
});

emit_move('joined game', id).then(response => {
    user = response.firstplayer ? 1 : 2
    console.log("You are player", user)
    color = user === 1 ? "white" : "black";
});


function request_rematch(){
    document.getElementById("rematch").textContent = "This button does nothing"
}

function game_over(title, desc){
    clear_legal_move_indicators()
    Array.from(document.getElementsByClassName("piece")).forEach(piece => {
        piece.removeEventListener("mousedown", event_function_map.get(piece))
    });
    document.getElementById("gameovertitle").textContent = title;
    document.getElementById("gameoverdesc").textContent = desc;
    document.getElementById("gameover").classList.remove("hidden")
}

channel.bind('move', function(data) {
    if (data.user != user){
        emit = false;
        overwrite = true;
        move_piece(data.x1, data.y1, data.x2, data.y2);
        turn = color
        overwrite = false;

    }

    if (data.game_over_condition === "white checkmate"){
        if (color === "white"){
            game_over("You Lose!", "By checkmate")
        } else{
            game_over("You Win!", "By checkmate")
        }
    }
    else if (data.game_over_condition === "black checkmate"){
        if (color === "black"){
            game_over("You Lose!", "By checkmate")
        } else{
            game_over("You Win!", "By checkmate")
        }
    }
    else if (data.game_over_condition === "stalemate"){
        game_over("Draw", "By stalemate")
    } else if (data.game_over_condition === "repetition"){
        game_over("Draw", "By repetition")
    }
});

//socket.on("move", (x1, y1, x2, y2, player, id, game_over_condition) => {
//    if (player != user){
//        emit = false;
//        overwrite = true;
//        move_piece(x1, y1, x2, y2);
//        turn = color
//        overwrite = false;
//
//    }
//
//    if (game_over_condition === "white checkmate"){
//        if (color === "white"){
//            game_over("You Lose!", "By checkmate")
//        } else{
//            game_over("You Win!", "By checkmate")
//        }
//    }
//    else if (game_over_condition === "black checkmate"){
//        if (color === "black"){
//            game_over("You Lose!", "By checkmate")
//        } else{
//            game_over("You Win!", "By checkmate")
//        }
//    }
//    else if (game_over_condition === "stalemate"){
//        game_over("Draw", "By stalemate")
//    } else if (game_over_condition === "repetition"){
//        game_over("Draw", "By repetition")
//    }
//});

/* TODO

pawn promotion

rematch button functionality

move animation?
clocks

confirm if move is legal server side
confirm which socket it got input from

*/

let board = [
    "rnbkqbnr" .split(""),
    "pppppppp" .split(""),
    new Array(8).fill(""),
    new Array(8).fill(""),
    new Array(8).fill(""),
    new Array(8).fill(""),
    "PPPPPPPP" .split(""),
    "RNBKQBNR" .split(""),
];



let board_history = [board.map(function(arr) {
    return arr.map(function(arr2) {
        return arr2.slice();
    })
})]

let whydidthefrenchhavetoinventenpassant = [
    new Array(16).fill(false),
]

function is_check_for(color){
    function get_all_moves(color){
        if (color !== "black" && color !== "white"){
            throw new Error('"' + color + '" is not a valid color')
        }
        let moves = []
        board_copy.forEach((line, y) => {
            line.forEach((p, x) => {
                if (p !== "" && (color === "white" ? p.toUpperCase() === p : p.toLowerCase() === p)){
                    moves.push(...get_legal_moves_for_piece(x, y, board_copy, legal=false))
                }
            });
        });
        return moves
    }
    let king_pos = null
    board_copy.forEach((line, y) => {
        line.forEach((p, x) => {
            if (p === (color === "black" ? "k" : "K")){
                king_pos = {x: x, y: y}
            }
        });
    });

    return get_all_moves(color === "black" ? "white" : "black").some(move => move.x === king_pos.x && move.y === king_pos.y);
}

function get_legal_moves_for_piece(x, y, board2=board, legal=true){
    let piece_type = board2[y][x].toLowerCase()
    let piece_is_white = board2[y][x].toUpperCase() === board2[y][x]
    var moves = []
    function is_enemy(x2, y2){
        if (board2[y2][x2] === ""){
            return false
        }
        
        return board2[y][x].toUpperCase() === board2[y][x] ? board2[y2][x2].toLowerCase() === board2[y2][x2] : board2[y2][x2].toUpperCase() === board2[y2][x2]
    }
    function is_empty_or_enemy(x2, y2){
        if (board2[y2][x2] === ""){
            return true
        }
        
        return board2[y][x].toUpperCase() === board2[y][x] ? board2[y2][x2].toLowerCase() === board2[y2][x2] : board2[y2][x2].toUpperCase() === board2[y2][x2]
    }
    if (piece_type === "p" && !piece_is_white){
        if (y+1 <= 7 && board2[y+1][x] === ""){
            moves.push({x: x, y: y+1})
            if (y === 1 && y+2 <= 7 && board2[y+2][x] === ""){
                moves.push({x: x, y: y+2})
            }
        }

        if (y+1 >= 0 && y+1 <= 7 && x+1 >= 0 && x+1 <= 7 && is_enemy(x+1, y+1)){
            moves.push({x: x+1, y: y+1})
        }
        else if (y === 4 && x+1 <= 7 && whydidthefrenchhavetoinventenpassant[x+9]){
            moves.push({x: x+1, y: y+1, special: enpassant})
        }
        if (y+1 >= 0 && y+1 <= 7 && x-1 >= 0 && x-1 <= 7 && is_enemy(x-1, y+1)){
            moves.push({x: x-1, y: y+1})
        } else if (y === 4 && x-1 >= 0 && whydidthefrenchhavetoinventenpassant[x+7]){
            moves.push({x: x-1, y: y+1, special: enpassant})
        }
    }
    else if (piece_type === "p" && piece_is_white){
        if (y-1 >= 0 && board2[y-1][x] === ""){
            moves.push({x: x, y: y-1})
            if (y === 6 && y-2 >= 0 && board2[y-2][x] === ""){
                moves.push({x: x, y: y-2})
            }
        }

        if (y-1 >= 0 && y-1 <= 7 && x+1 >= 0 && x+1 <= 7 && is_enemy(x+1, y-1)){
            moves.push({x: x+1, y: y-1})
        } else if (y === 3 && x+1 <= 7 && whydidthefrenchhavetoinventenpassant[x+1]){
            moves.push({x: x+1, y: y-1, special: enpassant})
        }
        if (y-1 >= 0 && y-1 <= 7 && x-1 >= 0 && x-1 <= 7 && is_enemy(x-1, y-1)){
            moves.push({x: x-1, y: y-1})
        } else if (y === 3 && x-1 >= 0 && whydidthefrenchhavetoinventenpassant[x-1]){
            moves.push({x: x-1, y: y-1, special: enpassant})
        }
    }
    
    if (piece_type === "r" || piece_type === "q"){
        for(let i = 1; i <= 8; i++){
            if (y+i >= 0 && y+i <= 7){
                if (board2[y+i][x] === ""){
                    moves.push({x: x, y: y+i})
                }
                else if (is_enemy(x, y+i)){
                    moves.push({x: x, y: y+i})
                    break;
                }
                else{
                    break;
                }
            }
        }
        for(let i = -1; i >= -7; i--){
            if (y+i >= 0 && y+i <= 7){
                if (board2[y+i][x] === ""){
                    moves.push({x: x, y: y+i})
                }
                else if (is_enemy(x, y+i)){
                    moves.push({x: x, y: y+i})
                    break;
                }
                else{
                    break;
                }
            }
        }
        for(let i = 1; i <= 8; i++){
            if (x+i >= 0 && x+i <= 7){
                if (board2[y][x+i] === ""){
                    moves.push({x: x+i, y: y})
                }
                else if (is_enemy(x+i, y)){
                    moves.push({x: x+i, y: y})
                    break;
                }
                else{
                    break;
                }
            }
        }
        for(let i = -1; i >= -7; i--){
            if (x+i >= 0 && x+i <= 7){
                if (board2[y][x+i] === ""){
                    moves.push({x: x+i, y: y})
                }
                else if (is_enemy(x+i, y)){
                    moves.push({x: x+i, y: y})
                    break;
                }
                else{
                    break;
                }
            }
        }
    }
    if (piece_type == "b" || piece_type === "q"){
        for(let i = 1; i <= 8; i++){
            if (y+i >= 0 && y+i <= 7 && x+i >= 0 && x+i <= 7){
                if (board2[y+i][x+i] === ""){
                    moves.push({x: x+i, y: y+i})
                }
                else if (is_enemy(x+i, y+i)){
                    moves.push({x: x+i, y: y+i})
                    break;
                }
                else{
                    break;
                }
            }
        }
        for(let i = -1; i >= -7; i--){
            if (y+i >= 0 && y+i <= 7 && x+i >= 0 && x+i <= 7){
                if (board2[y+i][x+i] === ""){
                    moves.push({x: x+i, y: y+i})
                }
                else if (is_enemy(x+i, y+i)){
                    moves.push({x: x+i, y: y+i})
                    break;
                }
                else{
                    break;
                }
            }
        }
        for(let i = 1; i <= 8; i++){
            if (y+i >= 0 && y+i <= 7 && x-i >= 0 && x-i <= 7){
                if (board2[y+i][x-i] === ""){
                    moves.push({x: x-i, y: y+i})
                }
                else if (is_enemy(x-i, y+i)){
                    moves.push({x: x-i, y: y+i})
                    break;
                }
                else{
                    break;
                }
            }
        }
        for(let i = -1; i >= -7; i--){
            if (y+i >= 0 && y+i <= 7 && x-i >= 0 && x-i <= 7){
                if (board2[y+i][x-i] === ""){
                    moves.push({x: x-i, y: y+i})
                }
                else if (is_enemy(x-i, y+i)){
                    moves.push({x: x-i, y: y+i})
                    break;
                }
                else{
                    break;
                }
            }
        }
    }
    if (piece_type == "n"){
        if (y+1 >= 0 && y+1 <= 7 && x+2 >= 0 && x+2 <= 7 && is_empty_or_enemy(x+2, y+1)){
            moves.push({x: x+2, y: y+1})
        }
        if (y+1 >= 0 && y+1 <= 7 && x-2 >= 0 && x-2 <= 7 && is_empty_or_enemy(x-2, y+1)){
            moves.push({x: x-2, y: y+1})
        }
        if (y-1 >= 0 && y-1 <= 7 && x+2 >= 0 && x+2 <= 7 && is_empty_or_enemy(x+2, y-1)){
            moves.push({x: x+2, y: y-1})
        }
        if (y-1 >= 0 && y-1 <= 7 && x-2 >= 0 && x-2 <= 7 && is_empty_or_enemy(x-2, y-1)){
            moves.push({x: x-2, y: y-1})
        }
        if (y+2 >= 0 && y+2 <= 7 && x+1 >= 0 && x+1 <= 7 && is_empty_or_enemy(x+1, y+2)){
            moves.push({x: x+1, y: y+2})
        }
        if (y+2 >= 0 && y+2 <= 7 && x-1 >= 0 && x-1 <= 7 && is_empty_or_enemy(x-1, y+2)){
            moves.push({x: x-1, y: y+2})
        }
        if (y-2 >= 0 && y-2 <= 7 && x+1 >= 0 && x+1 <= 7 && is_empty_or_enemy(x+1, y-2)){
            moves.push({x: x+1, y: y-2})
        }
        if (y-2 >= 0 && y-2 <= 7 && x-1 >= 0 && x-1 <= 7 && is_empty_or_enemy(x-1, y-2)){
            moves.push({x: x-1, y: y-2})
        }

    }
    if (piece_type === "k"){
        if (x+1 <= 7 && y+1 <= 7 && is_empty_or_enemy(x+1, y+1)){
            moves.push({x: x+1, y: y+1})
        }
        if (x-1 >= 0 && y+1 <= 7 && is_empty_or_enemy(x-1, y+1)){
            moves.push({x: x-1, y: y+1})
        }
        if (x+1 <= 7 && y-1 >= 0 && is_empty_or_enemy(x+1, y-1)){
            moves.push({x: x+1, y: y-1})
        }
        if (x-1 >= 0 && y-1 >= 0 && is_empty_or_enemy(x-1, y-1)){
            moves.push({x: x-1, y: y-1})
        }
        if (x+1 <= 7 && is_empty_or_enemy(x+1, y)){
            moves.push({x: x+1, y: y})
        }
        if (x-1 >= 0 && is_empty_or_enemy(x-1, y)){
            moves.push({x: x-1, y: y})
        }
        if (y-1 >= 0 && is_empty_or_enemy(x, y-1)){
            moves.push({x: x, y: y-1})
        }
        if (y+1 <= 7 && is_empty_or_enemy(x, y+1)){
            moves.push({x: x, y: y+1})
        }

        
        let queenside_caste = can_castle[piece_is_white ? 3 : 1];
        for(let i = 1; i <= 3; i++){
            if (x+i >= 0 && x+i <= 7){
                if (board2[y][x+i] !== "" || (piece_is_white ? all_legal_moves_black : all_legal_moves_white).some(move => move.x === x+i && move.y === y)){
                    queenside_caste = false;
                }
            }
        }
        if (queenside_caste && (piece_is_white && !white_in_check || !piece_is_white && !black_in_check)){
            moves.push({x: x+2, y: y, special: castle})
            moves.push({x: x+4, y: y, special: castle})
        }
        let kingside_caste = can_castle[piece_is_white ? 2 : 0];;
        for(let i = -1; i >= -2; i--){
            if (x+i >= 0 && x+i <= 7){
                if (board2[y][x+i] !== "" || (piece_is_white ? all_legal_moves_black : all_legal_moves_white).some(move => move.x === x+i && move.y === y)){
                    kingside_caste = false;
                }
            }
        }
        if (kingside_caste && (piece_is_white && !white_in_check || !piece_is_white && !black_in_check)){
            moves.push({x: x-2, y: y, special: castle})
            moves.push({x: x-3, y: y, special: castle})
        }
    }
    if (legal){
        moves = moves.filter(move => {
            board_copy = board2.map(function(arr) {
                return arr.map(function(arr2) {
                    return arr2.slice();
                });
            });
            if (move.special === enpassant){
                board_copy[move.y+(board_copy[y][x] === "P" ? 1 : -1)][move.x] = ""
            }
    
            board_copy[move.y][move.x] = board_copy[y][x];
            board_copy[y][x] = "";
            return !is_check_for(piece_is_white ? "white" : "black")
        })
    }
    return moves
}

function move_piece(x1, y1, x2, y2, piece){
    //console.log("from:", x1, y1);
    //console.log("to:", x2, y2);

    if (color === "black" && !overwrite && !castle_rook){
        y1 = 7-y1
        y2 = 7-y2
    }
    
    if (turn !== color && !overwrite || x1 === x2 && y1 === y2){
        return
    }
    
    selectedPieceLegalMoves = get_legal_moves_for_piece(x1, y1)
    
    if (!piece){
        piece = Array.from(document.getElementsByClassName("piece")).find((piece) => (piece.style.left.replace("px", ""))/64 == x1 && (color === "black" ? 7 : piece.style.top.replace("px", "")/32) - (piece.style.top.replace("px", ""))/64 == y1)
    }

    let has_castled;
    if (board[y1][x1].toLowerCase() === "k"){
        if (selectedPieceLegalMoves.some(move => move.x === x2 && move.y === y2 && move.special === castle)){
            if (x1-x2 > 0){
                x2 = x1-2
                castle_rook = true;
                if (board[y1][x1].toUpperCase() === board[y1][x1]){
                    move_piece(0, 7, 2, 7)
                } else{
                    move_piece(0, 0, 2, 0)
                }
                castle_rook = false;
            } else{
                x2 = x1+2
                castle_rook = true;
                if (board[y1][x1].toUpperCase() === board[y1][x1]){
                    move_piece(7, 7, 4, 7)
                } else{
                    move_piece(7, 0, 4, 0)
                }
                castle_rook = false;
            }
            has_castled = true;
        } else{
            if (board[y1][x1].toUpperCase() == board[y1][x1]){
                can_castle[2] = false;
                can_castle[3] = false;
            } else{
                can_castle[0] = false;
                can_castle[1] = false;
            }
        }
    }
    
    if (x1 === 0 && y1 === 0 || x2 === 0 && y2 === 0){
        can_castle[0] = false;
    }
    if (x1 === 7 && y1 === 0 || x2 === 7 && y2 === 0){
        can_castle[1] = false;
    }
    if (x1 === 0 && y1 === 7 || x2 === 0 && y2 === 7){
        can_castle[2] = false;
    }
    if (x1 === 7 && y1 === 7 || x2 === 7 && y2 === 7){
        can_castle[3] = false;
    }
    
    if (!castle_rook && !selectedPieceLegalMoves.some(move => move.x === x2 && move.y === y2 && move.special === enpassant)){
        if (board[y1][x1].toUpperCase() === board[y1][x1]){
            for (let i = 0; i <= 7; i++){
                whydidthefrenchhavetoinventenpassant[i] = false
            }
        } else{
            for (let i = 8; i <= 15; i++){
                whydidthefrenchhavetoinventenpassant[i] = false
            }
        }
    }
    
    if (board[y1][x2] === "P"){
        if (y1-y2 === 2){
            whydidthefrenchhavetoinventenpassant[x1+8] = true;
        }
        else if (y1 === 4){
            whydidthefrenchhavetoinventenpassant[x1+8] = false;
        }
    }
    else if (board[y1][x2] === "p"){
        if (y1-y2 === -2){
            whydidthefrenchhavetoinventenpassant[x1] = true;
        }
        else if (y1 === 3){
            whydidthefrenchhavetoinventenpassant[x1] = false;
        }
    }
    
    if (!castle_rook && selectedPieceLegalMoves.some(move => move.x === x2 && move.y === y2 && move.special === enpassant)){
        board[y2+(board[y1][x1] === "P" ? 1 : -1)][x2] = ""
        Array.from(document.getElementsByClassName("piece")).forEach(piece => {
            if ((piece.style.left.replace("px", ""))/64 == x2 && (color === "black" ? 7 : piece.style.top.replace("px", "")/32) - (piece.style.top.replace("px", ""))/64 - (board[y1][x1] === "P" ? 1 : -1) == y2){
                if (piece === selectedPiece){
                    clear_legal_move_indicators()
                }
                piece.remove();
            }
        })
    } else if (!castle_rook){
        Array.from(document.getElementsByClassName("piece")).forEach(piece => {
            if ((piece.style.left.replace("px", ""))/64 == x2 && (color === "black" ? 7 : piece.style.top.replace("px", "")/32) - (piece.style.top.replace("px", ""))/64 == y2){
                if (piece === selectedPiece){
                    clear_legal_move_indicators()
                }
                piece.remove();
            }
        })
    }
    
    let play_capture;
    if (board[y2][x2] !== ""){
        play_capture = true;
    }
    board[y2][x2] = board[y1][x1];
    board[y1][x1] = "";
    
    piece.style.left = x2*64 + 'px';
    piece.style.top  = (color === "black" ? 64*7 : y2*64*2) - y2*64 + 'px';
    piece.style.zIndex = "2"
    
    if (!overwrite && !castle_rook){
        clear_legal_move_indicators();
    } else{
        Array.from(document.getElementsByClassName("legal_move_indicator")).forEach(node => {
            if (node.style.background === "radial-gradient(transparent 0%, transparent 74%, rgba(200, 85, 0, 0.3) 75%)"){
                node.style.background = "radial-gradient(transparent 0%, transparent 74%, rgba(20, 85, 0, 0.3) 75%)"
            } else{
                node.style.background = "radial-gradient(rgba(22, 118, 36, 0.5) 19%, rgba(0, 0, 0, 0) 20%)"
            }
        });
    }
    
    if (turn === "white"){
        turn = "black"
    } else{
        turn = "white";
    }
    
    Array.from(document.getElementsByClassName("last_move_indicator")).forEach(node => {
        node.remove();
    });
    Array.from(document.getElementsByClassName("check")).forEach(node => {
        node.remove();
    });
    
    var node = document.createElement("div");
    node.classList.add("last_move_indicator");
    node.style.zIndex = "1";
    node.style.left = x1*64 + 'px';
    node.style.top  = (color === "black" ? 64*7 : y1*64*2) - y1*64 + 'px';
    board_html_table.appendChild(node);
    
    var node = document.createElement("div");
    node.classList.add("last_move_indicator");
    node.style.zIndex = "1";
    node.style.left = x2*64 + 'px';
    node.style.top  = (color === "black" ? 64*7 : y2*64*2) - y2*64 + 'px';
    board_html_table.appendChild(node);
    
    
    black_in_check = false;
    board_copy = board
    if (is_check_for("black")){
        let king_pos = null
        board_copy.forEach((line, y) => {
            line.forEach((p, x) => {
                if (p === "k"){
                    king_pos = {x: x, y: y}
                }
            });
        });
        black_in_check = true;
        check_sound.play()
        var node = document.createElement("div");
        node.classList.add("check");
        node.style.zIndex = "1";
        node.style.left = king_pos.x*64 + 'px';
        node.style.top  = (color === "black" ? 64*7 : king_pos.y*64*2) - king_pos.y*64 + 'px';
        board_html_table.appendChild(node);
    }
    white_in_check = false;
    if (is_check_for("white")){
        let king_pos = null
        board_copy.forEach((line, y) => {
            line.forEach((p, x) => {
                if (p === "K"){
                    king_pos = {x: x, y: y}
                }
            });
        });
        white_in_check = true;
        check_sound.play()
        var node = document.createElement("div");
        node.classList.add("check");
        node.style.zIndex = "1";
        node.style.left = king_pos.x*64 + 'px';
        node.style.top  = (color === "black" ? 64*7 : king_pos.y*64*2) - king_pos.y*64 + 'px';
        board_html_table.appendChild(node);
    }
    
    all_legal_moves_white = get_all_legal_moves("white")
    all_legal_moves_black = get_all_legal_moves("black")
    if (emit && !castle_rook){
        if (turn === "white" && all_legal_moves_white.length === 0){
            if (white_in_check){
                emit_move("move", x1, y1, x2, y2, user, id, "white checkmate");
            } else{
                emit_move("move", x1, y1, x2, y2, user, id, "stalemate");
            }
            gameover_sound.play();
            return;
        }
        else if (turn === "black" && all_legal_moves_black.length === 0){
            if (black_in_check){
                emit_move("move", x1, y1, x2, y2, user, id, "black checkmate");
            } else{
                emit_move("move", x1, y1, x2, y2, user, id, "stalemate");
            }
            gameover_sound.play();
            return;
        }
    }
    if (!black_in_check && !white_in_check && !has_castled){
        if (castle_rook){
            castle_sound.play()
        } else if (play_capture){
            capture_sound.play()
        } else{
            move_sound.play()
        }
    }

    if (!castle_rook && emit){
        board_history.push(board.map(function(arr) {
            return arr.map(function(arr2) {
                return arr2.slice();
            })
        }))

        let counts = {};
        for (let pos of board_history) {
            counts[pos] = counts[pos] ? counts[pos] + 1 : 1;
        }
        Object.values(counts).forEach(x => {
            if (x === 3){
                emit_move("move", x1, y1, x2, y2, user, id, "repetition");
                gameover_sound.play();
                return;
            }
        })
        emit_move("move", x1, y1, x2, y2, user, id);
    }
}

function clear_legal_move_indicators(){
    Array.from(document.getElementsByClassName("legal_move_indicator")).forEach(x => x.remove());
    selectedPiece = null;
    selectedPieceLegalMoves = null;
}

function get_all_legal_moves(color){
    if (color !== "black" && color !== "white"){
        throw new Error('"' + color + '" is not a valid color')
    }
    let moves = []
    board.forEach((line, y) => {
        line.forEach((p, x) => {
            if (p !== "" && (color === "white" ? p.toUpperCase() === p : p.toLowerCase() === p)){
                moves.push(...get_legal_moves_for_piece(x, y))
            }
        });
    });
    return moves
}

function create_piece_clicked_event_function(piece){
    return function (event){
        if (event.button !== 0){
            return;
        }
        clear_legal_move_indicators();

        selectedPiece = piece;
        var gridX = Math.floor((event.clientX-board_offset.x)/64);
        var gridY = Math.floor((event.clientY-board_offset.y)/64);
        selectedPieceLegalMoves = get_legal_moves_for_piece(gridX, (color === "black" ? 7 : gridY*2) - gridY);
        
        selectedPieceLegalMoves.forEach((pos) => {
            var node = document.createElement("div");
            node.classList.add("legal_move_indicator");

            if (board[pos.y][pos.x] !== ""){
                if (turn === color){
                    node.style.background = "radial-gradient(transparent 0%, transparent 74%, rgba(20, 85, 0, 0.3) 75%)";
                } else{
                    node.style.background = "radial-gradient(transparent 0%, transparent 74%, rgba(200, 85, 0, 0.3) 75%)";
                }
            } else if (turn === color){
                node.style.background = "radial-gradient(rgba(22, 118, 36, 0.5) 19%, rgba(0, 0, 0, 0) 20%)";
            } else{
                node.style.background = "radial-gradient(rgb(202 158 29 / 50%) 19%, rgba(0, 0, 0, 0) 20%)";
            }
            node.style.zIndex = "3";
            node.style.left = pos.x*64 + 'px';
            node.style.top  = (color === "black" ? 64*7 : pos.y*64*2) - pos.y*64 + 'px';
            
            node.addEventListener("mousedown", function(event){
                var gridX = Math.floor((event.clientX-board_offset.x)/64)
                var gridY = Math.floor((event.clientY-board_offset.y)/64)
                
                emit = true;
                move_piece(Math.floor(orgPos.x.replace("px", "")/64), Math.floor(orgPos.y.replace("px", "")/64), gridX, gridY)
            });

            board_html_table.appendChild(node)
        });
        
        heldPiece = piece;
        heldPiece.style.zIndex = "4";
        orgPos = {x: heldPiece.style.left, y: heldPiece.style.top}
        heldPiece.style.left = (event.clientX - offset.x) + 'px';
        heldPiece.style.top  = (event.clientY - offset.y) + 'px';
    }
}

function initialize_board(){
    board.forEach((line, y) => {
        line.forEach((p, x) => {
            if (board[y][x] !== ""){
                var piece = document.createElement("img");
                piece.classList.add("piece");
                piece.src = "assets/" + (p === p.toUpperCase() ? "w" : "b") + p.toLowerCase() + ".png";
                board_html_table.appendChild(piece)
    
                piece.style.left = x*64 + "px";
                piece.style.top  = (color === "black" ? 64*7 : y*64*2) - y*64 + "px";
                piece.style.zIndex = "2";
                
                if (p === p.toUpperCase() && color === "white" || p === p.toLowerCase() && color === "black"){
                    let clicked_event_function = create_piece_clicked_event_function(piece);
                    event_function_map.set(piece, clicked_event_function)
                    piece.addEventListener('mousedown', clicked_event_function, true);
                }
            }
        });
    });
    all_legal_moves_white = get_all_legal_moves("white")
    all_legal_moves_black = get_all_legal_moves("black")
    
    document.addEventListener('mouseup', function(event){
        if (heldPiece){
            var gridX = Math.floor((event.clientX-board_offset.x)/64)
            var gridY = Math.floor((event.clientY-board_offset.y)/64)
            if (color === turn && gridX >= 0 && gridX <= 7 && gridY >= 0 && gridY <= 7 && selectedPieceLegalMoves.some(move => move.x === gridX && move.y === Math.floor((color === "black" ? 8 : (event.clientY-board_offset.y)/32) - (event.clientY-board_offset.y)/64))){
                emit = true;
                move_piece(Math.floor(orgPos.x.replace("px", "")/64), Math.floor(orgPos.y.replace("px", "")/64), gridX, gridY, heldPiece)
            }
            else{
                heldPiece.style.left = orgPos.x;
                heldPiece.style.top  = orgPos.y;
            }
            heldPiece.style.zIndex = "2";
            heldPiece = null;
        }
    }, true);
    
    document.addEventListener('mousemove', function(event){
        event.preventDefault();
        if (heldPiece){
            heldPiece.style.left = (event.clientX - offset.x) + 'px';
            heldPiece.style.top  = (event.clientY - offset.y) + 'px';
        }
    }, true);
    
    board_html_table.addEventListener("mousedown", function(event){
        if (event.target.tagName === "TD"){
            clear_legal_move_indicators()
        }
    })
}