// Show/Hide consultation section
function showLoginSection() {
    document.getElementById('consultation-section').style.display = 'block';
    // Scroll to consultation section
    document.getElementById('consultation-section').scrollIntoView({ behavior: 'smooth' });
}

// Smooth scrolling for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        document.querySelector(this.getAttribute('href')).scrollIntoView({
            behavior: 'smooth'
        });
    });
});

// Header scroll effect
window.addEventListener('scroll', () => {
    const header = document.querySelector('.header');
    if (header) {
        if (window.scrollY > 100) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    }
});

document.addEventListener('DOMContentLoaded', () => {
    // Xử lý nút tư vấn trực tuyến
    const consultBtn = document.querySelector('.cta-button');
    if (consultBtn) {
        // Xóa onclick attribute từ HTML
        consultBtn.removeAttribute('onclick');
        
        consultBtn.addEventListener('click', () => {
            const consultationPopup = document.getElementById('consultation-popup');
            if (consultationPopup) {
                consultationPopup.style.display = 'block';
                
                // Khởi tạo view dựa trên vai trò
                if (!isAdmin) {
                    const guestId = 'guest-' + Math.random().toString(36).substr(2, 9);
                    currentUser = guestId;
                    document.getElementById('waiting-section').style.display = 'block';
                }
            }
        });
    }

    // Xử lý nút đăng nhập
    const loginBtn = document.getElementById('login-popup-btn');
    if (loginBtn) {
        loginBtn.addEventListener('click', () => {
            document.getElementById('login-popup').style.display = 'block';
        });
    }

    // Xử lý đóng popup
    const closeButtons = document.querySelectorAll('.close-popup');
    closeButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            const popup = button.closest('.popup');
            if (popup) {
                popup.style.display = 'none';
            }
        });
    });

    // Đóng popup khi click bên ngoài
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('popup')) {
            e.target.style.display = 'none';
        }
    });
});
