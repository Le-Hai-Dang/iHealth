// Các biến quản lý trạng thái
let isAdmin = false;
let currentUser = null;
let myVideoStream;
let currentRoom = 'main-consultation-room'; // Phòng cố định cho admin
const waitingQueue = [];
const ADMIN_CREDENTIALS = {
    username: 'admin',
    password: '123456'
};

// DOM Elements
const loginSection = document.getElementById('login-section');
const waitingSection = document.getElementById('waiting-section');
const adminSection = document.getElementById('admin-section');
const meetingSection = document.getElementById('meeting-section');
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

// Thêm các biến điều khiển mới
const chatToggle = document.getElementById('chat-toggle');
const kickUser = document.getElementById('kick-user');
const endCall = document.getElementById('end-call');

// Xử lý đăng nhập
document.getElementById('login-button').addEventListener('click', () => {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    if (username === ADMIN_CREDENTIALS.username && 
        password === ADMIN_CREDENTIALS.password) {
        isAdmin = true;
        currentUser = 'admin';
        initializeAdminView();
    } else {
        alert('Thông tin đăng nhập không chính xác!');
    }
});

// Tham gia với tư cách khách
document.getElementById('guest-button').addEventListener('click', () => {
    const guestId = 'guest-' + Math.random().toString(36).substr(2, 9);
    currentUser = guestId;
    isAdmin = false;
    
    // Khởi tạo peer connection
    myPeer.on('open', (id) => {
        addToQueue({
            id: id,
            userId: guestId,
            timestamp: Date.now()
        });
        showWaitingSection();
    });
});

// Cập nhật hàm addToQueue
function addToQueue(user) {
    waitingQueue.push(user);
    updateWaitingList();
    
    // Gửi thông báo tới admin (nếu có)
    if (peers['admin']) {
        peers['admin'].send({
            type: 'queue-update',
            queue: waitingQueue
        });
    }
}

// Cập nhật hiển thị danh sách chờ
function updateWaitingList() {
    const waitingList = document.getElementById('waiting-list');
    if (waitingList && isAdmin) {
        waitingList.innerHTML = waitingQueue.map((user, index) => `
            <div class="queue-item">
                <span>Khách ${index + 1}: ${user.userId}</span>
                <button onclick="callUser('${user.id}')">Gọi vào</button>
            </div>
        `).join('');
    }
    
    // Cập nhật thông tin cho người đang chờ
    if (!isAdmin) {
        const queueNumber = document.getElementById('queue-number');
        const waitingCount = document.getElementById('waiting-count');
        if (queueNumber && waitingCount) {
            const position = waitingQueue.findIndex(u => u.userId === currentUser) + 1;
            queueNumber.textContent = position > 0 ? position : 'Đang xử lý';
            waitingCount.textContent = waitingQueue.length;
        }
    }
}

// Admin gọi user vào phòng
function callUser(peerId) {
    if (!isAdmin) return;
    
    initializeStream().then(() => {
        const call = myPeer.call(peerId, myVideoStream);
        const video = document.createElement('video');
        
        call.on('stream', userVideoStream => {
            addVideoStream(video, userVideoStream);
            // Xóa user khỏi hàng đợi
            waitingQueue = waitingQueue.filter(u => u.id !== peerId);
            updateWaitingList();
        });
        
        call.on('close', () => {
            video.remove();
        });
        
        peers[peerId] = call;
    });
}

// Khởi tạo luồng video
async function initializeStream() {
    try {
        myVideoStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true
        });
        const myVideo = document.createElement('video');
        myVideo.muted = true;
        addVideoStream(myVideo, myVideoStream);
    } catch (err) {
        console.error('Không thể truy cập thiết bị media:', err);
        alert('Vui lòng cho phép truy cập camera và microphone');
    }
}

// Thêm video stream
function addVideoStream(video, stream) {
    video.srcObject = stream;
    video.addEventListener('loadedmetadata', () => {
        video.play();
    });
    document.getElementById('video-grid').append(video);
}

// Xử lý kết thúc cuộc họp
document.getElementById('end-meeting-button')?.addEventListener('click', () => {
    if (isAdmin) {
        // Gọi người tiếp theo nếu còn trong hàng đợi
        if (waitingQueue.length > 0) {
            callUser(waitingQueue[0]);
        }
    } else {
        // Người dùng rời phòng
        leaveRoom();
    }
});

// Rời phòng họp
function leaveRoom() {
    if (myVideoStream) {
        myVideoStream.getTracks().forEach(track => track.stop());
    }
    meetingSection.style.display = 'none';
    if (!isAdmin) {
        window.location.reload(); // Reload để reset trạng thái
    }
}

// Hiển thị phần chờ đợi
function showWaitingSection() {
    waitingSection.style.display = 'block';
    updateWaitingList();
}

// Khởi tạo view cho admin
function initializeAdminView() {
    isAdmin = true;
    currentUser = 'admin';
    
    // Khởi tạo peer connection cho admin
    myPeer.on('open', (id) => {
        currentRoom = id; // Lưu ID phòng của admin
        loginSection.style.display = 'none';
        adminSection.style.display = 'block';
        meetingSection.style.display = 'block';
        
        // Khởi tạo stream
        initializeStream().then(() => {
            // Lắng nghe các kết nối mới
            myPeer.on('connection', (conn) => {
                conn.on('data', handlePeerData);
            });
        });
    });
}

// Xử lý dữ liệu từ peer
function handlePeerData(data) {
    if (data.type === 'queue-update') {
        waitingQueue.push(...data.queue);
        updateWaitingList();
    }
}

// Khởi tạo view cho khách
function initializeGuestView() {
    loginSection.style.display = 'none';
    addToQueue(currentUser);
    showWaitingSection();
}

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
    micToggle.classList.toggle('active');
    micToggle.querySelector('i').className = audioTrack.enabled ? 
        'fas fa-microphone' : 'fas fa-microphone-slash';
    micToggle.querySelector('span').textContent = audioTrack.enabled ? 
        'Tắt Mic' : 'Bật Mic';
});

cameraToggle.addEventListener('click', () => {
    const videoTrack = myVideoStream.getVideoTracks()[0];
    videoTrack.enabled = !videoTrack.enabled;
    cameraToggle.classList.toggle('active');
    cameraToggle.querySelector('i').className = videoTrack.enabled ? 
        'fas fa-video' : 'fas fa-video-slash';
    cameraToggle.querySelector('span').textContent = videoTrack.enabled ? 
        'Tắt Camera' : 'Bật Camera';
});

// Thêm tin nhắn vào khung chat
function addMessage(message) {
    const messageElement = document.createElement('div');
    messageElement.textContent = message;
    chatMessages.append(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
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
    if (!myVideoStream) {
        initializeStream().then(() => {
            answerCall(call);
        });
    } else {
        answerCall(call);
    }
});

function answerCall(call) {
    call.answer(myVideoStream);
    const video = document.createElement('video');
    
    call.on('stream', userVideoStream => {
        addVideoStream(video, userVideoStream);
    });
    
    // Lưu peer connection
    peers[call.peer] = call;
}

// Hiển thị nút kick chỉ cho admin
if (isAdmin) {
    kickUser.style.display = 'block';
}

// Xử lý toggle chat
chatToggle.addEventListener('click', () => {
    const chatSection = document.querySelector('.chat-section');
    const isVisible = chatSection.style.display !== 'none';
    chatSection.style.display = isVisible ? 'none' : 'flex';
    chatToggle.classList.toggle('active');
});

// Xử lý kick user (chỉ cho admin)
kickUser.addEventListener('click', () => {
    if (isAdmin && currentPeer) {
        const confirmKick = confirm('Bạn có chắc muốn kick người dùng này?');
        if (confirmKick) {
            // Đóng kết nối với peer hiện tại
            if (peers[currentPeer]) {
                peers[currentPeer].close();
                delete peers[currentPeer];
            }
            // Gửi thông báo cho user bị kick
            addMessage('System: Người dùng đã bị kick khỏi phòng');
        }
    }
});

// Xử lý kết thúc cuộc gọi
endCall.addEventListener('click', () => {
    const confirmEnd = confirm('Bạn có chắc muốn kết thúc cuộc gọi?');
    if (confirmEnd) {
        if (isAdmin) {
            // Admin kết thúc -> đóng tất cả kết nối
            Object.values(peers).forEach(peer => peer.close());
            peers = {};
        }
        leaveRoom();
    }
});