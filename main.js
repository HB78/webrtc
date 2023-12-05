let APP_ID = "765fe840d5b049d7bee6fb10c1a3004d"
let TOKEN = null
//le stream de la caméra local video et son
let localStream;

//le stream de la caméra du contact qui parle avec moi
let remoteStream;

//id de la personne qui se connecte est generer de maniere aleatoire
let uid = String(Math.floor(Math.random() * 10000))

let client;
let channel;

// let queryString = window.location.search
// let urlParams = new URLSearchParams(queryString)
// let roomId = urlParams.get('room')

// if(!roomId) {
//     window.location = "lobby.html"
// }

//la connexion peer to peer
let peerConnexion;

//creation de servers stun pour contourner les pares feux
const servers = {
    iceServers: [
        {
            urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302']
        }
    ]
}
let init = async () => {
    client = await AgoraRTM.createInstance(APP_ID)
    await client.login({ uid, TOKEN })

    channel = client.createChannel('main')
    await channel.join()

    channel.on('Memberjoined', handleJoined)
    channel.on('MemberLeft', handleUserLeft)

    client.on("MessageFromPeer", handleMessageFromPeer)
    //on crée la fonction qui va demander l'accès à la camera et à la vidéo du pc
    localStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
    })
    document.getElementById("user-1").srcObject = localStream
}

async function handleJoined(memberId) {
    console.log("a new user joined the channel", memberId)
    createStream(memberId)

}
async function handleMessageFromPeer(message, memberId) {
    message = JSON.parse(message.text)
    // console.log("message:", message)
    if(message.type === 'offer'){
        createAnswer(memberId, message.offer)
    }

    if(message.type === 'answer'){
        addAnswer(message.answer)
    }

    if(message.type === 'candidat'){
       if(peerConnexion){
        peerConnexion.addIceCandidate(message.candidate)
       }
    }

}

function handleUserLeft(){
    document.getElementById('user-2').style.display = "none"
    document.getElementById('user-1').classList.remove("smallFrame")
}

async function createPeerConnexion(memberId) {
    //on crée une nouvelle peer connexion pour enregistrer les données entre nous et l'autre personne
    peerConnexion = new RTCPeerConnection(servers)

    //le flux que le user 1 va envoyer au user 2
    remoteStream = new MediaStream()
    document.getElementById("user-2").srcObject = remoteStream
    document.getElementById("user-2").style.display = 'block'
    document.getElementById("user-1").srcObject = localStream


     //le petite encadré dans la video
     document.getElementById("user-1").classList.add('smallFrame')

    if (!localStream) {
        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false})
        document.getElementById("user-1").srcObject = localStream
    }

    // let userTwo = document.getElementById("user-2")
    // userOne.srcObject = remoteStream
    // userTwo.style.display = 'block'
    

    localStream.getTracks().forEach(track => {
        //on loope sur track ou bande passante du son et de la video
        peerConnexion.addTrack(track, localStream)
    });

    peerConnexion.ontrack = (e) => {
        e.streams[0].getTracks().forEach((track) => {
            remoteStream.addTrack(track)
        })

    }
    //a voir ici c'est quoi
    peerConnexion.onicecandidate = async (e) => {
        if (e.candidate) {
            console.log("new ice candidat:", e.candidate)
            client.sendMessageToPeer({
                text: JSON.stringify({'type':'candidat', 'candidat': e.candidat}),
                memberId
            })
        }
    }
}

//on va créer la connexion peer to peer pour lier les deux personnes
let createStream = async (memberId) => {
    await createPeerConnexion(memberId)
    //on crée l'offre cad le flux que l'interlocuteur va offrir à celui qui a créer l'appel

    //Une offre (offer) est créée en utilisant peerConnexion.createOffer(). Cette offre représente les paramètres de communication vidéo que l'utilisateur actuel est prêt à fournir à l'autre personne. Par exemple, cela pourrait inclure des informations sur les codecs vidéo pris en charge, la résolution vidéo, etc.
    let offer = await peerConnexion.createOffer()

    // Cela signifie que mon côté de la connexion (l'utilisateur actuel) est prêt à envoyer cette offre à l'autre personne pour établir la communication.
    //en gros cela crée le candidat
    await peerConnexion.setLocalDescription(offer)
    client.sendMessageToPeer({ text: JSON.stringify({
        'type': 'offer', 
        'offer': offer
    })}, memberId )

}

//fonction pour creer la reponse
async function createAnswer(memberId, offer) {
    await createPeerConnexion(memberId)

    await peerConnexion.setRemoteDescription(offer)

    //pour repondre au user 1
    let answer = await peerConnexion.createAnswer()
    //jeter un oeil a en dessous
    await peerConnexion.setLocalDescription(answer)

    client.sendMessageToPeer({
        text: JSON.stringify({'type':'answer', 'answer': answer}),
        memberId
    })
}

async function addAnswer(answer){
    if(!peerConnexion.currentRemoteDescription){
        peerConnexion.setRemoteDescription(answer)
    }
}

async function leaveChannel(){
    await channel.leave()
    await client.logout()
}
//les boutons de la camera
async function toggleCamera(){
    //on recherche le contenu video
    let videoTrack = localStream.getTracks().find(track => track.kind === 'video')

    //si la caméra n'est pas désactivée on la désactive
    if(videoTrack.enabled){
        videoTrack.enabled = false
        document.getElementById('camera-btn').style.backgroundColor = 'rgb(255, 80, 80)'
    }else {
        videoTrack.enabled = true
        document.getElementById('camera-btn').style.backgroundColor = 'rgb(179, 102, 249, .9)'
    }
}
async function toggleAudio(){
    //on recherche le contenu video
    let audioTrack = localStream.getTracks().find(track => track.kind === 'audio')

    //si la caméra n'est pas désactivée on la désactive
    if(audioTrack.enabled){
        audioTrack.enabled = false
        document.getElementById('mic-btn').style.backgroundColor = 'rgb(255, 80, 80)'
    }else {
        audioTrack.enabled = true
        document.getElementById('mic-btn').style.backgroundColor = 'rgb(179, 102, 249, .9)'
    }
}
window.addEventListener("beforeunload", leaveChannel)
document.getElementById('camera-btn').addEventListener("click", toggleCamera)
document.getElementById('mic-btn').addEventListener("click", toggleAudio)


init()