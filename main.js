let myVideoStream;
const videoGrid = document.getElementById('video-grid');
const myPeer = new Peer(undefined, {
    host: '/',
    port: '3001'
});

const myVideo = document.createElement('video');
myVideo.muted = true;

// Khởi tạo các biến điều khiển
const micToggle = document.getElementById('mic-toggle');
const cameraToggle = document.getElementById('camera-toggle');
const chatInput = document.getElementById('chat-input');
const sendButton = document.getElementById('send-button');
const chatMessages = document.getElementById('chat-messages');

// Mảng lưu các peer connections
const peers = {};

// Khởi tạo stream
navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true
}).then(stream => {
    myVideoStream = stream;
    addVideoStream(myVideo, stream);

    myPeer.on('call', call => {
        call.answer(stream);
        const video = document.createElement('video');
        call.on('stream', userVideoStream => {
            addVideoStream(video, userVideoStream);
        });
    });

    // Xử lý khi có người dùng mới kết nối
    socket.on('user-connected', userId => {
        connectToNewUser(userId, stream);
    });
});

// Xử lý chat
sendButton.addEventListener('click', () => {
    const message = chatInput.value;
    if (message.trim()) {
        addMessage('Bạn: ' + message);
        socket.emit('send-chat-message', message);
        chatInput.value = '';
    }
});

// Hàm thêm video stream
function addVideoStream(video, stream) {
    video.srcObject = stream;
    video.addEventListener('loadedmetadata', () => {
        video.play();
    });
    videoGrid.append(video);
}

// Xử lý điều khiển mic và camera
micToggle.addEventListener('click', () => {
    const audioTrack = myVideoStream.getAudioTracks()[0];
    audioTrack.enabled = !audioTrack.enabled;
    micToggle.textContent = audioTrack.enabled ? 'Tắt Mic' : 'Bật Mic';
});

cameraToggle.addEventListener('click', () => {
    const videoTrack = myVideoStream.getVideoTracks()[0];
    videoTrack.enabled = !videoTrack.enabled;
    cameraToggle.textContent = videoTrack.enabled ? 'Tắt Camera' : 'Bật Camera';
});

// Hàm thêm tin nhắn vào khung chat
function addMessage(message) {
    const messageElement = document.createElement('div');
    messageElement.textContent = message;
    chatMessages.append(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}
