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

// Khởi tạo PeerJS ngay khi load trang
let myPeer;
initializePeer();

function initializePeer() {
    if (checkAdminCookie()) {
        myPeer = new Peer('admin', {
            host: '0.peerjs.com',
            port: 443,
            secure: true,
            path: '/',
            debug: 3
        });
    } else {
        myPeer = new Peer(undefined, {
            host: '0.peerjs.com',
            port: 443,
            secure: true,
            path: '/',
            debug: 3
        });
    }

    // Add error handler
    myPeer.on('error', (err) => {
        console.error('PeerJS error:', err);
    });
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
                
                if (checkAdminCookie()) {
                    isAdmin = true;
                    currentUser = 'admin';
                    // Hiển thị admin section và meeting section
                    document.getElementById('admin-section').style.display = 'block';
                    document.getElementById('meeting-section').style.display = 'block';
                    consultationPopup.style.display = 'block';
                    
                    console.log('Admin view initialized');
                    await initializeAdminRoom();
                } else {
                    const guestId = 'guest-' + Math.random().toString(36).substr(2, 9);
                    currentUser = guestId;
                    document.getElementById('waiting-section').style.display = 'block';
                    consultationPopup.style.display = 'block';
                    
                    console.log('Guest view initialized');
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
            document.getElementById('meeting-section').style.display = 'block';
            await initializeAdminRoom();
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
    const closePopupBtn = document.querySelector('.close-popup');
    if (closePopupBtn && consultationPopup) {
        closePopupBtn.addEventListener('click', () => {
            consultationPopup.style.display = 'none';
        });
    }

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

// Khởi tạo stream
async function initializeStream() {
    try {
        console.log('Requesting media access...');
        myVideoStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true
        });
        console.log('Media access granted');
        addVideoStream(myVideo, myVideoStream);
        return myVideoStream;
    } catch (err) {
        console.error('Media access error:', err);
        alert('Vui lòng cho phép truy cập camera và microphone');
    }
}

// Thêm video stream vào grid
function addVideoStream(video, stream) {
    video.srcObject = stream;
    video.style.width = '100%';
    video.style.height = '100%';
    video.style.objectFit = 'cover';
    
    video.addEventListener('loadedmetadata', () => {
        video.play().catch(err => {
            console.error('Error playing video:', err);
        });
        console.log('Video playing');
    });

    const videoGrid = document.getElementById('video-grid');
    if (videoGrid) {
        videoGrid.style.display = 'grid';
        videoGrid.style.gridTemplateColumns = '1fr';
        videoGrid.style.gap = '10px';
        videoGrid.append(video);
        console.log('Video appended to grid');
    }
}

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

// Khởi tạo view cho khách
async function initializeGuestView() {
    try {
        // Khởi tạo media stream trước
        myVideoStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true
        });
        
        // Hiển thị popup consultation
        consultationPopup.style.display = 'block';
        
        // Ẩn meeting section, hiển thị waiting section
        document.getElementById('meeting-section').style.display = 'none';
        document.getElementById('waiting-section').style.display = 'block';
        
        // Thêm video vào grid
        const videoGrid = document.getElementById('video-grid');
        videoGrid.innerHTML = ''; // Clear grid
        addVideoStream(myVideo, myVideoStream);

        // Sau đó mới kết nối PeerJS
        await new Promise((resolve) => {
            if (myPeer.open) {
                resolve();
            } else {
                myPeer.on('open', resolve);
            }
        });

        // Thêm vào waiting queue
        waitingQueue.push({
            id: myPeer.id,
            joinTime: new Date()
        });
        updateQueuePosition();
        initializeControls();

    } catch (err) {
        console.error('Guest view error:', err);
        alert('Không thể khởi tạo camera và microphone. Vui lòng kiểm tra quyền truy cập.');
    }
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

// Admin gọi user vào phòng
function callUser(peerId) {
    if (!isAdmin || !myVideoStream) return;
    
    console.log('Calling user:', peerId);
    const call = myPeer.call(peerId, myVideoStream);
    handleVideoCall(call);
    
    // Xóa user khỏi hàng đợi
    waitingQueue = waitingQueue.filter(u => u.id !== peerId);
    updateWaitingList();
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
    const position = waitingQueue.findIndex(u => u.userId === currentUser) + 1;
    document.getElementById('queue-number').textContent = position;
    document.getElementById('waiting-count').textContent = waitingQueue.length;
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