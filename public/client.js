let action = "host";

function show_error_code(data){
    if (data) {
        document.getElementById("error").textContent = data.message
    }
}

function send(){
    fetch("https://odd-red-zebra-tie.cyclic.app/lobby", { //fetch('http://10.56.176.186:3507/lobby', {
        method: 'POST', // or 'GET'
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: action == "host" ? "create server" : "join server", id: document.getElementById("inputField").value}), // data can be `string` or {object}!
    })
    .then(response => {
        if (response.redirected) {
            window.location.href = response.url;
        } else {
            return response.json();
        }
    })
    .then(response => show_error_code(response))
    .catch((error) => {
        console.error('Error:', error);
    });
}

function host(){
    var element = document.getElementById('idk');
    if (element.classList.contains('hidden')) {
        element.classList.remove('hidden');
    }
    document.getElementById("text").textContent = ""
    document.getElementById("confirmbutton").textContent = "Create Game"
    document.getElementById("inputField").classList.add("hidden");
    document.getElementById("error").textContent = ""
    action = "host"
}

function join(){
    var element = document.getElementById('idk');
    if (element.classList.contains('hidden')) {
        element.classList.remove('hidden');
    }
    document.getElementById("text").textContent = "Game ID:"
    document.getElementById("confirmbutton").textContent = "Join"
    document.getElementById("inputField").classList.remove("hidden");
    document.getElementById("error").textContent = ""
    action = "join"

}