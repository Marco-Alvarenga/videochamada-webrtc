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

// Tratamento de eventos do WebSocket
socket.onopen = () => {
    console.log('Conectado ao servidor WebSocket');
};

socket.onclose = () => {
    console.log('Conexão WebSocket fechada');
};

socket.onerror = (error) => {
    console.error('Erro na conexão WebSocket:', error);
};

// Tratamento de mensagens recebidas do WebSocket
socket.onmessage = async (message) => {
    try {
        const data = JSON.parse(message.data); // Tente fazer o parse da mensagem
        console.log('Mensagem recebida do WebSocket:', data); // Log da mensagem recebida

        if (data.type === 'offer') {
            console.log('Recebendo oferta...');
            await peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
            const answer = await peerConnection.createAnswer();
            await peerConnection.setLocalDescription(answer);
            socket.send(JSON.stringify({ type: 'answer', answer }));
        } else if (data.type === 'answer') {
            console.log('Recebendo resposta...');
            await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
        } else if (data.type === 'ice-candidate') {
            console.log('Recebendo candidato ICE...');
            if (data.candidate) {
                await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
                console.log('Candidato ICE adicionado:', data.candidate); // Log do candidato
            }
        }
    } catch (error) {
        console.error("Erro ao processar mensagem do WebSocket: ", error);
    }
};

// Inicia a chamada de vídeo
startCallButton.addEventListener('click', async () => {
    try {
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
                console.log('Candidato ICE gerado:', event.candidate); // Log do candidato gerado
                socket.send(JSON.stringify({ type: 'ice-candidate', candidate: event.candidate }));
            }
        };

        // Cria uma oferta de conexão
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);

        console.log('Enviando oferta...');
        socket.send(JSON.stringify({ type: 'offer', offer }));
    } catch (error) {
        console.error('Erro ao iniciar a chamada:', error);
    }
});

// Finaliza a chamada de vídeo
endCallButton.addEventListener('click', () => {
    if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
    }
    localVideo.srcObject = null;
    remoteVideo.srcObject = null;
    console.log('Chamada finalizada.');
});
