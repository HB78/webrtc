let APP_ID = "765fe840d5b049d7bee6fb10c1a3004d";
let TOKEN = null;
let localStream;
let remoteStream;
let uid = String(Math.floor(Math.random() * 10000));
let client;
let channel;
let peerConnection;

const servers = {
    iceServers: [
        {
            urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302']
        }
    ]
};

async function init() {
    client = await AgoraRTM.createInstance(APP_ID);
    await client.login({ uid, TOKEN });

    channel = client.createChannel('main');
    await channel.join();

    channel.on('MemberJoined', handleJoined);
    channel.on('MemberLeft', handleUserLeft);

    client.on("MessageFromPeer", handleMessageFromPeer);

    localStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
    });

    let user1 = document.getElementById("user-1");
    user1.srcObject = localStream;
}

async function handleJoined(memberId) {
    console.log("A new user joined the channel", memberId);
    createStream(memberId);
}

async function handleMessageFromPeer(message, memberId) {
    console.log("Message:", message.text);
    if (message.type === 'offer') {
        createAnswer(memberId, message.offer);
    }

    if (message.type === 'answer') {
        addAnswer(message.answer);
    }

    if (message.type === 'candidate') {
        if (peerConnection) {
            peerConnection.onicecandidate = async (e) => {
                if (e.candidate) {
                    console.log("New ICE candidate:", e.candidate);
                    client.sendMessageToPeer({
                        text: JSON.stringify({ 'type': 'candidate', 'candidate': e.candidate }),
                        memberId
                    });
                }
            };
        }
    }
}

function handleUserLeft(memberId) {
    document.getElementById('user-2').style.display = "none";
    document.getElementById('user-1').classList.remove("smallFrame");
}

async function createPeerConnection(memberId) {
    peerConnection = new RTCPeerConnection(servers);
    remoteStream = new MediaStream();

    if (!localStream) {
        localStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false
        });
        let user1 = document.getElementById("user-1");
        user1.srcObject = localStream;
    }

    let user2 = document.getElementById("user-2");
    user1.srcObject = remoteStream;
    user2.style.display = 'block';

    user1.classList.add('smallFrame');

    localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStream);
    });

    peerConnection.ontrack = (e) => {
        e.streams[0].getTracks().forEach((track) => {
            remoteStream.addTrack(track);
        });
    };
}

async function createStream(memberId) {
    await createPeerConnection(memberId);

    let offer = await peerConnection.createOffer();

    await peerConnection.setLocalDescription(offer);
    client.sendMessageToPeer({ text: "I saw the robot", memberId });
}

async function createAnswer(memberId, offer) {
    await createPeerConnection(memberId);

    await peerConnection.setRemoteDescription(offer);

    let answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);

    client.sendMessageToPeer({
        text: JSON.stringify({ 'type': 'answer', 'answer': answer }),
        memberId
    });
}

async function addAnswer(answer) {
    if (!peerConnection.currentRemoteDescription) {
        peerConnection.setRemoteDescription(answer);
    }
}

async function leaveChannel() {
    await channel.leave();
    await client.logout();
}

async function toggleCamera() {
    let videoTrack = localStream.getTracks().find(track => track.kind === 'video');

    if (videoTrack.enabled) {
        videoTrack.enabled = false;
        document.getElementById('camera-btn').style.backgroundColor = 'rgb(255, 80, 80)';
    } else {
        videoTrack.enabled = true;
        document.getElementById('camera-btn').style.backgroundColor = 'rgb(179, 102, 249, .9)';
    }
}

async function toggleAudio() {
    let audioTrack = localStream.getTracks().find(track => track.kind === 'audio');

    if (audioTrack.enabled) {
        audioTrack.enabled = false;
        document.getElementById('mic-btn').style.backgroundColor = 'rgb(255, 80, 80)';
    } else {
        audioTrack.enabled = true;
        document.getElementById('mic-btn').style.backgroundColor = 'rgb(179, 102, 249, .9)';
    }
}

window.addEventListener("beforeunload", leaveChannel);
document.getElementById('camera-btn').addEventListener("click", toggleCamera);
document.getElementById('mic-btn').addEventListener("click", toggleAudio);

init();

// async function createPeerConnection(memberId) {
//     peerConnection = new RTCPeerConnection(servers);
//     remoteStream = new MediaStream();

//     if (!localStream) {
//         localStream = await navigator.mediaDevices.getUserMedia({
//             video: true,
//             audio: false
//         });
//         let user1 = document.getElementById("user-1");
//         user1.srcObject = localStream;
//     }

//     let user2 = document.getElementById("user-2"); // Utilisez user2 au lieu de userOne ici
//     user2.srcObject = remoteStream; // Utilisez user2 au lieu de userOne ici
//     user2.style.display = 'block';

//     user2.classList.add('smallFrame'); // Utilisez user2 au lieu de userOne ici

//     localStream.getTracks().forEach(track => {
//         peerConnection.addTrack(track, localStream);
//     });

//     peerConnection.ontrack = (e) => {
//         e.streams[0].getTracks().forEach((track) => {
//             remoteStream.addTrack(track);
//         });
//     };

//     peerConnection.onicecandidate = async (e) => {
//         if (e.candidate) {
//             console.log("New ICE candidate:", e.candidate);
//             client.sendMessageToPeer({
//                 text: JSON.stringify({ 'type': 'candidate', 'candidate': e.candidate }),
//                 memberId
//             });
//         }
//     };
// }
