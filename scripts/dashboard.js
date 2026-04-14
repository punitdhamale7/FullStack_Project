function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('active');
    
    let overlay = document.getElementById('sidebarOverlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'sidebarOverlay';
        overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.4);z-index:999;display:none;';
        overlay.onclick = () => { sidebar.classList.remove('active'); overlay.style.display='none'; };
        document.body.appendChild(overlay);
    }
    overlay.style.display = sidebar.classList.contains('active') ? 'block' : 'none';
}


function toggleUserMenu() {
    const dropdown = document.getElementById('userDropdown');
    dropdown.classList.toggle('show');
}


document.addEventListener('click', (e) => {
    const dropdown = document.getElementById('userDropdown');
    const userProfile = document.querySelector('.user-profile');
    
    if (dropdown && !dropdown.contains(e.target) && !userProfile.contains(e.target)) {
        dropdown.classList.remove('show');
    }
});


document.addEventListener('DOMContentLoaded', () => {
    const session = JSON.parse(localStorage.getItem('session'));
    
    if (!session || !session.loggedIn) {
        
        window.location.href = 'login.html';
        return;
    }
    
    
    const userName = document.querySelector('.user-name');
    const welcomeHeading = document.querySelector('.welcome-content h1');
    
    if (userName && session.user) {
        userName.textContent = session.user.fullName || session.user.username;
    }
    
    if (welcomeHeading && session.user) {
        const firstName = session.user.fullName ? session.user.fullName.split(' ')[0] : session.user.username;
        welcomeHeading.textContent = `Welcome back, ${firstName}! 👋`;
    }
    
    
    const userId = session.user.id;
    fetch(`/api/profile/${userId}`)
        .then(response => response.json())
        .then(data => {
            if (data.success && data.profile.avatar_url) {
                
                const profileImgs = document.querySelectorAll('.user-profile img, #dropdownAvatar');
                profileImgs.forEach(img => {
                    img.src = data.profile.avatar_url;
                });
            }
            
            
            if (data.success) {
                const dropdownName = document.getElementById('dropdownName');
                const dropdownEmail = document.getElementById('dropdownEmail');
                
                if (dropdownName) {
                    dropdownName.textContent = data.profile.full_name || session.user.fullName || 'User';
                }
                if (dropdownEmail) {
                    dropdownEmail.textContent = data.profile.email || session.user.email;
                }
            }
        })
        .catch(error => {
            console.error('Error loading avatar:', error);
        });
    
    
    loadAIRecommendations(userId);
});


document.addEventListener('click', (e) => {
    const sidebar = document.getElementById('sidebar');
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const sidebarToggle = document.querySelector('.sidebar-toggle');
    
    if (window.innerWidth <= 768) {
        if (!sidebar.contains(e.target) && 
            e.target !== mobileMenuBtn && 
            e.target !== sidebarToggle) {
            sidebar.classList.remove('active');
        }
    }
});


const observerOptions = {
    threshold: 0.5
};

const progressObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const progressFill = entry.target.querySelector('.progress-fill');
            if (progressFill) {
                const width = progressFill.style.width;
                progressFill.style.width = '0';
                setTimeout(() => {
                    progressFill.style.width = width;
                }, 100);
            }
        }
    });
}, observerOptions);

document.addEventListener('DOMContentLoaded', () => {
    const courseCards = document.querySelectorAll('.course-card-dash');
    courseCards.forEach(card => {
        progressObserver.observe(card);
    });
});


document.querySelector('.notification-btn')?.addEventListener('click', () => {
    alert('Notifications:\n\n1. New course available: Advanced JavaScript\n2. Quiz due tomorrow: Python Basics\n3. Certificate ready for download');
});


function doSearch() {
    const searchInput = document.querySelector('.search-bar input');
    const searchTerm = searchInput?.value?.trim();
    if (searchTerm) {
        window.location.href = `browse-courses.html?q=${encodeURIComponent(searchTerm)}`;
    }
}

document.querySelector('.search-bar input')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') doSearch();
});

document.querySelector('.search-btn')?.addEventListener('click', doSearch);



function logout() {
    if (window.API) { window.API.logout(); return; }
    localStorage.clear();
    sessionStorage.clear();
    window.location.replace('login.html');
}


(function() {
    const session = JSON.parse(localStorage.getItem('session'));
    
    if (!session || !session.loggedIn) {
        
        window.location.replace('login.html');
    }
})();



function loadAIRecommendations(userId) {
    const recommendedList = document.querySelector('#recommendedList');
    
    if (!recommendedList) return;
    
    fetch(`/api/recommendations/${userId}`)
        .then(response => response.json())
        .then(data => {
            if (data.success && data.recommendations.length > 0) {
                recommendedList.innerHTML = '';
                data.recommendations.slice(0, 3).forEach(course => {
                    recommendedList.appendChild(createRecommendationItem(course));
                });
                if (window.lucide) lucide.createIcons();
            } else {
                recommendedList.innerHTML = `
                    <div style="text-align:center;padding:30px 20px;color:#9ca3af;">
                        <p style="font-size:13px;">🎯 Enroll in courses to get personalized recommendations!</p>
                        <a href="browse-courses.html" style="display:inline-block;margin-top:10px;font-size:13px;color:#6366f1;text-decoration:none;font-weight:500;">Browse Courses →</a>
                    </div>`;
            }
        })
        .catch(() => {
            recommendedList.innerHTML = '<div style="text-align:center;padding:20px;color:#9ca3af;font-size:13px;">Unable to load recommendations</div>';
        });
}

function createRecommendationItem(course) {
    const item = document.createElement('div');
    item.className = 'recommended-item';
    
    const emoji = getCourseIcon(course.title);
    const price = `₹${parseFloat(course.price).toLocaleString('en-IN')}`;
    const rating = parseFloat(course.average_rating).toFixed(1);
    const matchScore = Math.round(course.recommendation_score * 10);
    
    item.innerHTML = `
        <div class="rec-emoji">${emoji}</div>
        <div class="rec-info">
            <h4>${course.title}</h4>
            <p class="rec-reason">${course.recommendation_reason}</p>
            <div class="rec-meta">
                <span class="rec-match">🤖 ${matchScore}% match</span>
                <span class="rec-rating">⭐ ${rating}</span>
                <span class="rec-price">${price}</span>
            </div>
        </div>
        <button class="btn-small" onclick="enrollInCourse(${course.id})">Enroll</button>
    `;
    return item;
}

function getCourseIcon(title) {
    if (title.includes('Web') || title.includes('Full Stack')) return '💻';
    if (title.includes('Python')) return '🐍';
    if (title.includes('AI') || title.includes('Machine')) return '🤖';
    if (title.includes('Mobile') || title.includes('App')) return '📱';
    if (title.includes('React')) return '⚛️';
    if (title.includes('Node')) return '🟢';
    if (title.includes('Database') || title.includes('SQL')) return '🗄️';
    if (title.includes('Design') || title.includes('UI')) return '🎨';
    if (title.includes('Cloud')) return '☁️';
    return '📚';
}

function enrollInCourse(courseId) {
    const session = JSON.parse(localStorage.getItem('session'));
    
    if (!session || !session.loggedIn) {
        alert('Please login to enroll in courses');
        window.location.href = 'login.html';
        return;
    }
    
    
    window.location.href = `browse-courses.html?highlight=${courseId}`;
}
