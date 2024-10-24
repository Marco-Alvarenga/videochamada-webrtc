let localStream;
let remoteStream;
let peerConnection;
const socket = new WebSocket('wss://websocket-86o9.onrender.com'); // Insira a URL correta do WebSocket

const servers = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' } // STUN server para mediação de NAT
    ]
};

const localVideo = document.getElementById('video-local');
const remoteVideo = document.getElementById('video-remote');
const startCallButton = document.getElementById('start-call');
const endCallButton = document.getElementById('end-call');

socket.onmessage = async (message) => {
    const data = JSON.parse(message.data);

    if (data.type === 'offer') {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);

        socket.send(JSON.stringify({ type: 'answer', answer }));
    } else if (data.type === 'answer') {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
    } else if (data.type === 'ice-candidate') {
        if (data.candidate) {
            await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
        }
    }
};

// Inicia a chamada de vídeo
startCallButton.addEventListener('click', async () => {
    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    localVideo.srcObject = localStream;

    peerConnection = new RTCPeerConnection(servers);
    
    // Adiciona as tracks locais ao peerConnection
    localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStream);
    });

    // Recebe a stream remota
    peerConnection.ontrack = (event) => {
        if (!remoteStream) {
            remoteStream = new MediaStream();
            remoteVideo.srcObject = remoteStream;
        }
        remoteStream.addTrack(event.track);
    };

    // Negociação de ICE
    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            socket.send(JSON.stringify({ type: 'ice-candidate', candidate: event.candidate }));
        }
    };

    // Cria uma oferta de conexão
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);

    socket.send(JSON.stringify({ type: 'offer', offer }));
});

// Finaliza a chamada de vídeo
endCallButton.addEventListener('click', () => {
    if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
    }
    localVideo.srcObject = null;
    remoteVideo.srcObject = null;
});
