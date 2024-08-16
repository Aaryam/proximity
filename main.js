
const main = document.getElementById('main');
const board = document.getElementById('board');

const peer = new Peer(window.location.href.split("?")[1]);
const bounds = 13;

const audioEmitter = document.getElementById('audioEmitter');

var isHost = peer.id == 'host';

var allIDs = [];
var allConnections = [];

function generateBoard(boardSize) {
    for (let y = 0; y < boardSize; y++) {
        let row = document.createElement('div');
        
        row.classList.add('row');

        for (let x = 0; x < boardSize; x++) {
            let cell = document.createElement('div');

            cell.classList.add('cell');
            cell.id = x + "," + y;
            row.appendChild(cell);
        }

        board.appendChild(row);
    }
}

generateBoard(bounds);

// player movement

document.body.addEventListener('keydown', function (e) {
    let currentPlayerPosition = getPlayerPosition(peer.id);
    let playerIntegerPosition = parsePositionToArray(currentPlayerPosition);

    console.log(playerIntegerPosition);

    if (e.key == 'a' && (playerIntegerPosition[0] - 1 >= 0)) {
        let newPosition = (playerIntegerPosition[0] - 1) + "," + playerIntegerPosition[1];
        movePlayer(peer.id, newPosition);
    }
    else if (e.key == 'd' && (playerIntegerPosition[0] + 1 < bounds)) {
        let newPosition = (playerIntegerPosition[0] + 1) + "," + playerIntegerPosition[1];
        movePlayer(peer.id, newPosition);
    }

    if (e.key == 'w' && (playerIntegerPosition[1] - 1 >= 0)) {
        let newPosition = playerIntegerPosition[0] + "," + (playerIntegerPosition[1] - 1);
        movePlayer(peer.id, newPosition);
    }
    else if (e.key == 's' && (playerIntegerPosition[1] + 1 < bounds)) {
        let newPosition = playerIntegerPosition[0] + "," + (playerIntegerPosition[1] + 1);
        movePlayer(peer.id, newPosition);
    }

    broadcastMessage(getPlayerPosition(peer.id), 'updatePos');
});

// net stuff

peer.on('open', async function () {
    console.log(peer.id);

    // initialize player at 0,0

    document.getElementById('0,0').classList.add(peer.id);

    // handle p2p connections

    peer.on('connection', function (conn) {
        if (!allConnections.includes(conn)) {
            allConnections.push(conn);

            if (isHost) {
                // broadcastMessage(getPlayerPosition(peer.id), 'updatePos');
            }
        }

        conn.on('open', function() {
            conn.on('data', function(data) {
                if (data.type == 'updatePos') {
                    movePlayer(conn.peer, data.content);
                }
            })
        })

        peer.on('call', async function(call) {
            call.answer(await navigator.mediaDevices.getUserMedia({video: false, audio: true}));

            call.on('stream', function(stream) {
                audioEmitter.srcObject = stream;
            });
        });
    });

    // if not host

    if (!isHost) {
        let conn = peer.connect('host');
        allConnections.push(conn);

        // broadcastMessage(getPlayerPosition(peer.id), 'updatePos');
        let call = peer.call('host', await navigator.mediaDevices.getUserMedia({video: false, audio: true}));

        call.on('stream', function(stream) {
            audioEmitter.srcObject = stream;
        });

        conn.on('open', function() {
            conn.on('data', function(data) {
                if (data.type == 'updatePos') {
                    movePlayer(conn.peer, data.content);
                }
            })
        })
    }
})

function getPlayerPosition(id) {
    let allCells = document.getElementsByClassName('cell');

    for (let i = 0; i < allCells.length; i++) {
        let cell = allCells[i];

        if (cell.classList.contains(id)) {
            return cell.id;
        }
    }
}

function movePlayer(id, position) {
    let allCells = document.getElementsByClassName('cell');

    for (let i = 0; i < allCells.length; i++) {
        let cell = allCells[i];

        if (cell.classList.contains(id)) {
            cell.classList.remove(id);
        }

        if (cell.id == position) {
            cell.classList.add(id);
        }
    }
    
    if (getPlayerPosition('player') != undefined && getPlayerPosition('host') != undefined) {
        calculateAudio(getPlayerPosition('host'), getPlayerPosition('player'));
    }
}

// network code

function broadcastMessage(content, type) {
    for (let c = 0; c < allConnections.length; c++) {
        let conn = allConnections[c];

        conn.send({content: content, type: type});
    }
}

function calculateAudio(sourcePos, observerPos) {
    let rawVolume = 1 - (calculateDistanceBetweenPositions(sourcePos, observerPos) / bounds);

    if (rawVolume > 0) {
        audioEmitter.volume = rawVolume;
    }
    else {
        audioEmitter.volume = 0;
    }
}

// helper functions

function parsePositionToArray(position) {
    let stringArray = position.split(",");
    let integerArray = [parseInt(stringArray[0]), parseInt(stringArray[1])];

    return integerArray;
}

function calculateDistanceBetweenPositions(pos1, pos2) {
    console.log(pos1)
    let numPos1 = parsePositionToArray(pos1);
    let numPos2 = parsePositionToArray(pos2);

    return Math.sqrt((numPos1[0] - numPos2[0])**2 + (numPos1[1] - numPos2[1])**2);
}
