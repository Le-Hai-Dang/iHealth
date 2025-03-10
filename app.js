// Constants
const ADMIN_CREDENTIALS = {
    username: 'admin',
    password: '123456'
};

// Global variables
let isAdmin = false;
let currentUser = null;
let myVideoStream;
let currentRoom = null;
const waitingQueue = [];

// DOM Elements
const loginSection = document.getElementById('login-section');
const waitingSection = document.getElementById('waiting-section');
const adminSection = document.getElementById('admin-section');
const meetingSection = document.getElementById('meeting-section');
const videoGrid = document.getElementById('video-grid');

// DOM Elements
const joinSection = document.getElementById('join-section');
const roomInfo = document.getElementById('room-info');
const mainGrid = document.querySelector('.main-grid');
const controls = document.querySelector('.controls');
const roomIdDisplay = document.getElementById('room-id');
const joinButton = document.getElementById('join-button');
const createButton = document.getElementById('create-button');
const copyButton = document.getElementById('copy-button');
const roomInput = document.getElementById('room-input');

const myVideo = document.createElement('video');
myVideo.muted = true;

// Khởi tạo các biến điều khiển
let micToggle;
let cameraToggle;
let endCallButton;

// Mảng lưu các peer connections
const peers = {};

// Popup handling
const loginPopup = document.getElementById('login-popup');
const consultationPopup = document.getElementById('consultation-popup');
const loginPopupBtn = document.getElementById('login-popup-btn');

// Khởi tạo các biến chat
const chatInput = document.getElementById('chat-input');
const sendButton = document.getElementById('send-button');
const chatMessages = document.getElementById('chat-messages');
const chatSection = document.querySelector('.chat-section');
const chatToggleBtn = document.getElementById('chat-toggle');

// Khởi tạo Socket.IO
const socket = io('https://your-server.com');
let myPeer;

// Khởi tạo PeerJS
function initializePeer() {
    console.log('1. Đang khởi tạo PeerJS...');
    if (checkAdminCookie()) {
        myPeer = new Peer('admin', {
            host: '0.peerjs.com',
            port: 443,
            secure: true
        });
        console.log('2. Đã tạo kết nối PeerJS cho admin');
        isAdmin = true;
    } else {
        myPeer = new Peer(undefined, {
            host: '0.peerjs.com',
            port: 443,
            secure: true
        });
        console.log('2. Đã tạo kết nối PeerJS cho khách');
    }

    myPeer.on('open', (id) => {
        console.log('3. Kết nối PeerJS đã mở với ID:', id);
    });

    myPeer.on('error', (err) => {
        console.error('Lỗi PeerJS:', err);
    });
}

// Khởi tạo video stream
async function initializeStream() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true
        });
        myVideoStream = stream;
        addVideoStream(myVideo, stream);
        
        myPeer.on('call', call => {
            call.answer(stream);
            const video = document.createElement('video');
            
            call.on('stream', userVideoStream => {
                addVideoStream(video, userVideoStream);
            });
        });

        return stream;
    } catch (err) {
        console.error('Failed to get media stream:', err);
    }
}

// Khởi tạo view cho khách
async function initializeGuestView() {
    try {
        console.log('1. Bắt đầu khởi tạo giao diện khách...');
        
        // Khởi tạo media stream
        console.log('2. Đang yêu cầu quyền truy cập camera và mic...');
        myVideoStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true
        });
        console.log('3. Đã nhận được stream từ thiết bị');

        // Hiển thị UI
        console.log('4. Hiển thị popup tư vấn và phòng chờ');
        consultationPopup.style.display = 'block';
        document.getElementById('waiting-section').style.display = 'block';
        
        // Thêm vào queue
        console.log('5. Thêm vào hàng đợi với PeerID:', myPeer.id);
        waitingQueue.push({
            id: myPeer.id,
            joinTime: new Date()
        });
        updateQueuePosition();

        // Lắng nghe cuộc gọi từ admin
        console.log('6. Thiết lập lắng nghe cuộc gọi');
        myPeer.on('call', call => {
            console.log('7. Nhận cuộc gọi từ admin');
            call.answer(myVideoStream);
            
            const adminVideo = document.createElement('video');
            call.on('stream', adminStream => {
                console.log('8. Đã nhận được stream của admin, hiển thị phòng họp');
                document.getElementById('waiting-section').style.display = 'none';
                document.getElementById('meeting-section').style.display = 'block';
                addVideoStream(adminVideo, adminStream);
            });
        });

    } catch (err) {
        console.error('Lỗi khởi tạo giao diện khách:', err);
    }
}

// Kiểm tra cookie admin khi load trang
function checkAdminCookie() {
    const adminCookie = document.cookie
        .split('; ')
        .find(row => row.startsWith('adminProfile='));
    if (adminCookie) {
        const adminProfile = JSON.parse(decodeURIComponent(adminCookie.split('=')[1]));
        return adminProfile.username === ADMIN_CREDENTIALS.username;
    }
    return false;
}

// Set cookie cho admin
function setAdminCookie(username) {
    const adminProfile = {
        username: username,
        role: 'admin',
        timestamp: Date.now()
    };
    document.cookie = `adminProfile=${encodeURIComponent(JSON.stringify(adminProfile))}; path=/; max-age=86400`;
}

document.addEventListener('DOMContentLoaded', () => {
    // Khởi tạo controls
    micToggle = document.getElementById('mic-toggle');
    cameraToggle = document.getElementById('camera-toggle');
    endCallButton = document.getElementById('end-call');
    
    // Nút tư vấn
    const consultBtn = document.querySelector('.cta-button');
    if (consultBtn && consultationPopup) {
        consultBtn.addEventListener('click', async () => {
            try {
                console.log('Consultation button clicked');
                consultationPopup.style.display = 'block';
                
                if (!checkAdminCookie()) {
                    // Khởi tạo view cho khách
                    document.getElementById('waiting-section').style.display = 'block';
                    document.getElementById('meeting-section').style.display = 'none';
                    await initializeGuestView();
                }
            } catch (err) {
                console.error('Error initializing consultation:', err);
            }
        });
    }

    // Thêm xử lý cho nút "Gọi bệnh nhân tiếp theo"
    const nextPatientBtn = document.getElementById('next-patient-button');
    if (nextPatientBtn) {
        nextPatientBtn.addEventListener('click', async () => {
            if (waitingQueue.length > 0) {
                const nextUser = waitingQueue[0];
                await callUser(nextUser.id);
                waitingQueue.shift();
                updateQueuePosition();
            }
        });
    }

    // Nút đăng nhập
    const loginBtn = document.getElementById('login-button');
    if (loginBtn) {
        loginBtn.addEventListener('click', () => {
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;

            if (username === ADMIN_CREDENTIALS.username && 
                password === ADMIN_CREDENTIALS.password) {
                setAdminCookie(username);
                isAdmin = true;
                currentUser = 'admin';
                
                // Đóng popup đăng nhập
                document.getElementById('login-popup').style.display = 'none';
                
                // Mở popup tư vấn với view admin
                const consultationPopup = document.getElementById('consultation-popup');
                document.getElementById('admin-section').style.display = 'block';
                document.getElementById('meeting-section').style.display = 'block';
                consultationPopup.style.display = 'block';
                
                // Khởi tạo stream video
                initializeAdminRoom();
                updateLoginStatus();
            } else {
                alert('Thông tin đăng nhập không chính xác!');
            }
        });
    }

    // Hiển thị popup đăng nhập
    const loginPopupBtn = document.getElementById('login-popup-btn');
    if (loginPopupBtn) {
        loginPopupBtn.addEventListener('click', () => {
            document.getElementById('login-popup').style.display = 'block';
        });
    }

    // Đóng popup
    const closeButtons = document.querySelectorAll('.close-popup');
    closeButtons.forEach(button => {
        button.addEventListener('click', () => {
            consultationPopup.style.display = 'none';
        });
    });

    // Click outside để đóng popup
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('popup')) {
            e.target.style.display = 'none';
        }
    });

    // Xử lý hiển thị/ẩn chat khi click vào icon chat
    chatToggleBtn.addEventListener('click', () => {
        const chatSection = document.querySelector('.chat-section');
        if (chatSection) {
            if (chatSection.style.display === 'none' || !chatSection.style.display) {
                chatSection.style.display = 'flex';
                chatToggleBtn.classList.add('active');
            } else {
                chatSection.style.display = 'none';
                chatToggleBtn.classList.remove('active');
            }
        }
    });

    // Chỉ khởi tạo các button khi DOM đã load xong
    if (createButton) {
        createButton.addEventListener('click', () => {
            initializeStream().then(() => {
                currentRoom = myPeer.id;
                showRoom();
            });
        });
    }

    if (joinButton) {
        joinButton.addEventListener('click', () => {
            const roomId = roomInput?.value.trim();
            if (roomId) {
                currentRoom = roomId;
                initializeStream().then(() => {
                    connectToRoom(roomId);
                    showRoom();
                });
            }
        });
    }

    if (copyButton) {
        copyButton.addEventListener('click', () => {
            navigator.clipboard.writeText(currentRoom);
            alert('Đã sao chép ID phòng!');
        });
    }
});

// Khởi tạo các controls
function initializeControls() {
    // Đảm bảo các elements tồn tại trước khi thêm event listener
    const micToggle = document.getElementById('mic-toggle');
    const cameraToggle = document.getElementById('camera-toggle');
    const endCallButton = document.getElementById('end-call');
    const chatToggleBtn = document.getElementById('chat-toggle');
    const leaveButton = document.getElementById('leave-queue-button');

    if (micToggle) {
        micToggle.addEventListener('click', () => {
            if (myVideoStream) {
                const audioTrack = myVideoStream.getAudioTracks()[0];
                if (audioTrack) {
                    audioTrack.enabled = !audioTrack.enabled;
                    micToggle.classList.toggle('active');
                    const micIcon = micToggle.querySelector('i');
                    if (micIcon) {
                        micIcon.className = audioTrack.enabled ? 
                            'fas fa-microphone' : 
                            'fas fa-microphone-slash';
                    }
                }
            }
        });
    }

    if (cameraToggle) {
        cameraToggle.addEventListener('click', () => {
            if (myVideoStream) {
                const videoTrack = myVideoStream.getVideoTracks()[0];
                if (videoTrack) {
                    videoTrack.enabled = !videoTrack.enabled;
                    cameraToggle.classList.toggle('active');
                    const videoIcon = cameraToggle.querySelector('i');
                    if (videoIcon) {
                        videoIcon.className = videoTrack.enabled ? 
                            'fas fa-video' : 
                            'fas fa-video-slash';
                    }
                }
            }
        });
    }

    if (endCallButton) {
        endCallButton.addEventListener('click', () => {
            if (confirm('Bạn có chắc muốn kết thúc cuộc gọi?')) {
                endCall();
            }
        });
    }

    console.log('Controls initialized');
}

// Hàm kết thúc cuộc gọi
function endCall() {
    // Tắt camera và microphone
    if (myVideoStream) {
        myVideoStream.getTracks().forEach(track => {
            track.stop();
        });
    }
    
    // Đóng kết nối peer
    Object.values(peers).forEach(call => call.close());
    
    // Reset UI
    document.getElementById('meeting-section').style.display = 'none';
    document.getElementById('consultation-popup').style.display = 'none';
    
    // Hiển thị section tương ứng
    if (isAdmin) {
        document.getElementById('admin-section').style.display = 'block';
    } else {
        document.getElementById('waiting-section').style.display = 'none';
    }
    
    // Reset video grid
    const videoGrid = document.getElementById('video-grid');
    videoGrid.innerHTML = '';
}

// Khởi tạo phòng cho admin
async function initializeAdminRoom() {
    try {
        console.log('Initializing admin room...');
        
        // Khởi tạo media stream
        myVideoStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true
        });
        console.log('Admin stream created');
        
        // Hiển thị video của admin trong video grid
        const videoGrid = document.getElementById('video-grid');
        if (videoGrid) {
            videoGrid.innerHTML = ''; // Clear grid
            addVideoStream(myVideo, myVideoStream);
            console.log('Admin video added to grid');
        } else {
            console.error('Video grid element not found');
        }

        // Hiển thị meeting section
        const meetingSection = document.getElementById('meeting-section');
        if (meetingSection) {
            meetingSection.style.display = 'block';
            console.log('Meeting section displayed');
        }

        // Khởi tạo controls
        initializeControls();
        console.log('Controls initialized');

    } catch (err) {
        console.error('Admin room error:', err);
        alert('Không thể khởi tạo camera và microphone. Vui lòng kiểm tra quyền truy cập.');
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

// Hàm để admin gọi cho user
async function callUser(userId) {
    try {
        console.log('1. Admin bắt đầu gọi cho user:', userId);
        
        if (!myVideoStream) {
            console.log('2. Đang lấy stream của admin...');
            myVideoStream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: true
            });
        }

        console.log('3. Đang gọi cho user...');
        const call = myPeer.call(userId, myVideoStream);
        
        const userVideo = document.createElement('video');
        call.on('stream', userVideoStream => {
            console.log('4. Đã nhận được stream của user');
            document.getElementById('meeting-section').style.display = 'block';
            addVideoStream(userVideo, userVideoStream);
        });

        peers[userId] = call;
        console.log('5. Cuộc gọi đã được thiết lập');

    } catch (err) {
        console.error('Lỗi khi gọi cho user:', err);
    }
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

function updateQueuePosition() {
    const queueNumber = document.getElementById('queue-number');
    const waitingCount = document.getElementById('waiting-count');
    
    if (queueNumber && waitingCount) {
        // Tìm vị trí của user hiện tại trong queue
        const position = waitingQueue.findIndex(u => u.id === myPeer.id) + 1;
        queueNumber.textContent = position || '0';
        waitingCount.textContent = waitingQueue.length - 1; // Trừ đi user hiện tại
    }
}

// Rời phòng
const leaveButton = document.getElementById('leave-queue-button');
if (leaveButton) {
    leaveButton.addEventListener('click', () => {
        if (myVideoStream) {
            myVideoStream.getTracks().forEach(track => track.stop());
        }
        Object.values(peers).forEach(call => call.close());
        myPeer.disconnect();
        resetUI();
    });
}

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
function sendMessage() {
    const message = chatInput.value.trim();
    if (message) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message sent';
        messageDiv.innerHTML = `
            <div class="message-content">
                <p>${message}</p>
                <span class="time">${new Date().toLocaleTimeString()}</span>
            </div>
        `;
        
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        chatInput.value = '';
    }
}

// Sự kiện click nút gửi
sendButton.addEventListener('click', sendMessage);

// Sự kiện nhấn Enter
chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        sendMessage();
    }
});

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

// Hiển thị nút kick chỉ cho admin
if (isAdmin) {
    const kickUser = document.getElementById('kick-user');
    kickUser.style.display = 'block';
}

// Show consultation popup
function showConsultationPopup() {
    consultationPopup.style.display = 'block';
}

// Start consultation
document.getElementById('start-consultation').addEventListener('click', () => {
    consultationPopup.style.display = 'none';
    if (isAdmin) {
        initializeAdminRoom();
    } else {
        initializeGuestView();
    }
    document.getElementById('consultation-section').style.display = 'block';
});

// Update login status and show appropriate view
function updateLoginStatus() {
    const loginBtn = document.getElementById('login-popup-btn');
    loginPopup.style.display = 'none';
    if (isAdmin) {
        loginBtn.textContent = 'Admin';
        loginBtn.classList.add('logged-in');
        initializeAdminRoom();
    }
}

document.getElementById('leave-queue-button').addEventListener('click', () => {
    // Xóa khỏi hàng đợi
    const index = waitingQueue.findIndex(u => u.userId === currentUser);
    if (index > -1) {
        waitingQueue.splice(index, 1);
    }
    
    // Đóng popup và reset view
    document.getElementById('consultation-popup').style.display = 'none';
    document.getElementById('waiting-section').style.display = 'none';
});

const express = require('express');
const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server);

io.on('connection', socket => {
    socket.on('join-room', (roomId, userId) => {
        socket.join(roomId);
        socket.broadcast.to(roomId).emit('user-connected', userId);
        
        socket.on('disconnect', () => {
            socket.broadcast.to(roomId).emit('user-disconnected', userId);
        });
    });
    
    socket.on('add-to-queue', userId => {
        waitingQueue.push(userId);
        io.emit('queue-updated', waitingQueue);
    });
});

server.listen(3001);
