let myVideoStream;
let currentRoom = null;
const videoGrid = document.getElementById('video-grid');
const myPeer = new Peer(undefined, {
    host: 'peerjs-server.herokuapp.com',
    secure: true,
    port: 443
});

// DOM Elements
const joinSection = document.getElementById('join-section');
const roomInfo = document.getElementById('room-info');
const mainGrid = document.querySelector('.main-grid');
const controls = document.querySelector('.controls');
const roomIdDisplay = document.getElementById('room-id');
const joinButton = document.getElementById('join-button');
const createButton = document.getElementById('create-button');
const copyButton = document.getElementById('copy-button');
const leaveButton = document.getElementById('leave-button');
const roomInput = document.getElementById('room-input');

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

// Tạo phòng mới
createButton.addEventListener('click', () => {
    initializeStream().then(() => {
        currentRoom = myPeer.id;
        showRoom();
    });
});

// Tham gia phòng
joinButton.addEventListener('click', () => {
    const roomId = roomInput.value.trim();
    if (roomId) {
        currentRoom = roomId;
        initializeStream().then(() => {
            connectToRoom(roomId);
            showRoom();
        });
    }
});

// Copy room ID
copyButton.addEventListener('click', () => {
    navigator.clipboard.writeText(currentRoom);
    alert('Đã sao chép ID phòng!');
});

// Rời phòng
leaveButton.addEventListener('click', () => {
    if (myVideoStream) {
        myVideoStream.getTracks().forEach(track => track.stop());
    }
    Object.values(peers).forEach(call => call.close());
    myPeer.disconnect();
    resetUI();
});

// Khởi tạo stream
async function initializeStream() {
    try {
        myVideoStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true
        });
        addVideoStream(myVideo, myVideoStream);
    } catch (err) {
        console.error('Không thể truy cập thiết bị media:', err);
        alert('Vui lòng cho phép truy cập camera và microphone');
    }
}

// Kết nối đến phòng
function connectToRoom(roomId) {
    const call = myPeer.call(roomId, myVideoStream);
    const video = document.createElement('video');
    
    call.on('stream', userVideoStream => {
        addVideoStream(video, userVideoStream);
    });
    
    call.on('close', () => {
        video.remove();
    });

    peers[call.peer] = call;
}

// Xử lý cuộc gọi đến
myPeer.on('call', call => {
    call.answer(myVideoStream);
    const video = document.createElement('video');
    
    call.on('stream', userVideoStream => {
        addVideoStream(video, userVideoStream);
    });
});

// Hiển thị giao diện phòng
function showRoom() {
    joinSection.style.display = 'none';
    roomInfo.style.display = 'block';
    mainGrid.style.display = 'grid';
    controls.style.display = 'flex';
    roomIdDisplay.textContent = currentRoom;
}

// Reset giao diện
function resetUI() {
    joinSection.style.display = 'block';
    roomInfo.style.display = 'none';
    mainGrid.style.display = 'none';
    controls.style.display = 'none';
    videoGrid.innerHTML = '';
    chatMessages.innerHTML = '';
    roomInput.value = '';
    currentRoom = null;
}

// Thêm video stream
function addVideoStream(video, stream) {
    video.srcObject = stream;
    video.addEventListener('loadedmetadata', () => {
        video.play();
    });
    videoGrid.append(video);
}

// Xử lý chat
sendButton.addEventListener('click', () => {
    const message = chatInput.value.trim();
    if (message) {
        addMessage('Bạn: ' + message);
        // Trong phiên bản này, chat chỉ hiển thị locally
        chatInput.value = '';
    }
});

// Điều khiển mic và camera
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

// Thêm tin nhắn vào khung chat
function addMessage(message) {
    const messageElement = document.createElement('div');
    messageElement.textContent = message;
    chatMessages.append(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}