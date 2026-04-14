document.addEventListener('DOMContentLoaded', () => {
    const session = JSON.parse(localStorage.getItem('session'));
    
    if (!session || !session.loggedIn) {
        window.location.replace('login.html');
        return;
    }
    
    document.getElementById('userName').textContent = session.user.fullName || 'User';
    
    
    loadUserAvatar(session.user.id);
    
    
    loadAchievements();
    loadUserStats();
    
    
    checkNewAchievements();
});

let userId = null;

function loadUserAvatar(id) {
    userId = id;
    
    fetch(`/api/profile/${userId}`)
        .then(response => response.json())
        .then(data => {
            if (data.success && data.profile.avatar_url) {
                const avatars = document.querySelectorAll('#topbarAvatar, .user-profile img, #dropdownAvatar');
                avatars.forEach(avatar => {
                    avatar.src = data.profile.avatar_url;
                });
            }
            
            
            const session = JSON.parse(localStorage.getItem('session'));
            loadUserDropdown(session);
        })
        .catch(error => {
            console.error('Error loading avatar:', error);
        });
}

function loadAchievements() {
    fetch(`/api/achievements/${userId}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                displayAchievements(data.achievements);
            }
        })
        .catch(error => {
            console.error('Error loading achievements:', error);
        });
}

function displayAchievements(achievements) {
    
    const grouped = {
        courses: [],
        lessons: [],
        streak: [],
        social: [],
        special: []
    };
    
    achievements.forEach(achievement => {
        if (grouped[achievement.category]) {
            grouped[achievement.category].push(achievement);
        }
    });
    
    
    displayCategory('coursesGrid', grouped.courses);
    displayCategory('lessonsGrid', grouped.lessons);
    displayCategory('streakGrid', grouped.streak);
    displayCategory('socialGrid', grouped.social);
    displayCategory('specialGrid', grouped.special);
}

function displayCategory(gridId, achievements) {
    const grid = document.getElementById(gridId);
    if (!grid) return;
    
    grid.innerHTML = '';
    
    if (achievements.length === 0) {
        grid.innerHTML = '<p style="color: #666; text-align: center; padding: 20px;">No achievements in this category yet</p>';
        return;
    }
    
    achievements.forEach(achievement => {
        const card = document.createElement('div');
        card.className = `achievement-card ${achievement.is_unlocked ? 'unlocked' : 'locked'} ${achievement.rarity}`;
        
        const rarityColor = {
            'common': '#9ca3af',
            'rare': '#6b7280',
            'epic': '#4b5563',
            'legendary': '#1f2937'
        };
        
        const iconMarkup = get3DIcon(achievement);
        
        card.innerHTML = `
            <div class="achievement-icon" style="filter: ${achievement.is_unlocked ? 'none' : 'grayscale(100%) opacity(0.5)'}; display: flex; justify-content: center; margin-bottom: 10px;">
                ${iconMarkup}
            </div>
            <div class="achievement-info">
                <h3 style="margin: 10px 0 5px 0; font-size: 16px; color: ${achievement.is_unlocked ? '#111827' : '#9ca3af'};">
                    ${achievement.name}
                </h3>
                <p style="margin: 0 0 10px 0; font-size: 13px; color: #6B7280;">
                    ${achievement.description}
                </p>
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span class="achievement-rarity" style="font-size: 11px; padding: 3px 8px; border-radius: 12px; background: ${rarityColor[achievement.rarity]}20; color: ${rarityColor[achievement.rarity]}; font-weight: 600; text-transform: uppercase;">
                        ${achievement.rarity}
                    </span>
                    <span style="font-size: 13px; color: #6B7280; font-weight: 600;">
                        ${achievement.points} pts
                    </span>
                </div>
                ${achievement.is_unlocked ? `
                    <div style="margin-top: 10px; font-size: 11px; color: #10b981;">
                        ✓ Unlocked ${formatDate(achievement.unlocked_at)}
                    </div>
                ` : ''}
            </div>
        `;
        
        grid.appendChild(card);
    });
    
    
    if (window.lucide) {
        lucide.createIcons();
    }
}

function get3DIcon(achievement) {
    const iconMap = {
        '🎓': { name: 'graduation-cap', color: 'indigo' },
        '🏆': { name: 'trophy', color: 'blue' },
        '🎯': { name: 'target', color: 'grey-dark' },
        '💡': { name: 'lightbulb', color: 'blue' },
        '🔥': { name: 'flame', color: 'grey-dark' },
        '🚀': { name: 'rocket', color: 'purple' },
        '⭐': { name: 'star', color: 'blue' },
        '📚': { name: 'book-open', color: 'indigo' },
        '📖': { name: 'book', color: 'indigo' },
        '📝': { name: 'file-text', color: 'grey-dark' },
        '💬': { name: 'message-square', color: 'grey-dark' },
        '👤': { name: 'user', color: 'blue' },
        '🛠️': { name: 'wrench', color: 'grey-dark' },
        '⚡': { name: 'zap', color: 'blue' },
        '🎉': { name: 'party-popper', color: 'purple' },
        '💻': { name: 'monitor', color: 'indigo' },
        '🔬': { name: 'microscope', color: 'indigo' },
        '🧠': { name: 'brain', color: 'purple' },
        '🥇': { name: 'medal', color: 'blue' },
        '🥈': { name: 'medal', color: 'indigo' },
        '🥉': { name: 'medal', color: 'grey-dark' }
    };

    const config = iconMap[achievement.icon] || { name: 'award', color: 'purple' };
    return `<span class="icon-3d-wrapper icon-lg icon-${config.color}"><i data-lucide="${config.name}"></i></span>`;
}

function loadUserStats() {
    fetch(`/api/achievements/stats/${userId}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                displayStats(data.stats);
            }
        })
        .catch(error => {
            console.error('Error loading stats:', error);
        });
}

function displayStats(stats) {
    
    document.getElementById('totalPoints').textContent = stats.total_points || 0;
    document.getElementById('achievementsUnlocked').textContent = `${stats.total_achievements_unlocked || 0}/${stats.total_achievements || 0}`;
    document.getElementById('coursesCompleted').textContent = stats.total_courses_completed || 0;
    document.getElementById('lessonsCompleted').textContent = stats.total_lessons_completed || 0;
    document.getElementById('currentStreak').textContent = `${stats.current_streak_days || 0} days`;
    document.getElementById('longestStreak').textContent = `${stats.longest_streak_days || 0} days`;
    
    
    const percentage = stats.total_achievements ? (stats.total_achievements_unlocked / stats.total_achievements) * 100 : 0;
    const progressBar = document.querySelector('.progress-fill');
    if (progressBar) {
        progressBar.style.width = `${percentage}%`;
    }
    
    
    const progressText = document.querySelector('.progress-text');
    if (progressText) {
        progressText.textContent = `${Math.round(percentage)}% Complete`;
    }
}

function checkNewAchievements() {
    fetch(`/api/achievements/${userId}/unnotified`)
        .then(response => response.json())
        .then(data => {
            if (data.success && data.achievements.length > 0) {
                showAchievementNotifications(data.achievements);
            }
        })
        .catch(error => {
            console.error('Error checking new achievements:', error);
        });
}

function showAchievementNotifications(achievements) {
    const achievementIds = achievements.map(a => a.id);
    
    achievements.forEach((achievement, index) => {
        setTimeout(() => {
            showAchievementPopup(achievement);
        }, index * 3000); 
    });
    
    
    fetch(`/api/achievements/${userId}/mark-notified`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            achievement_ids: achievementIds
        })
    });
}

function showAchievementPopup(achievement) {
    const popup = document.createElement('div');
    popup.className = 'achievement-popup';
    popup.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #4b5563 0%, #1f2937 100%);
        color: white;
        padding: 20px;
        border-radius: 12px;
        box-shadow: 0 10px 25px rgba(0,0,0,0.3);
        z-index: 10000;
        min-width: 300px;
        animation: slideInRight 0.5s ease;
    `;
    
    const iconMarkup = get3DIcon(achievement);
    
    popup.innerHTML = `
        <div style="display: flex; align-items: center; gap: 15px;">
            <div style="flex-shrink: 0;">${iconMarkup}</div>
            <div style="flex: 1;">
                <div style="font-size: 12px; opacity: 0.9; margin-bottom: 5px;">🎉 Achievement Unlocked!</div>
                <div style="font-size: 18px; font-weight: 700; margin-bottom: 5px;">${achievement.name}</div>
                <div style="font-size: 13px; opacity: 0.9;">${achievement.description}</div>
                <div style="margin-top: 8px; font-size: 14px; font-weight: 600;">+${achievement.points} points</div>
            </div>
        </div>
    `;
    
    document.body.appendChild(popup);
    
    
    if (window.lucide) {
        lucide.createIcons();
    }
    
    
    playAchievementSound();
    
    
    setTimeout(() => {
        popup.style.animation = 'slideOutRight 0.5s ease';
        setTimeout(() => popup.remove(), 500);
    }, 5000);
}

function playAchievementSound() {
    
    
    
}

function formatDate(dateString) {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'today';
    if (diffDays === 1) return 'yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return date.toLocaleDateString();
}

function filterAchievements(filter) {
    
    document.querySelectorAll('.filter-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    event.target.classList.add('active');
    
    
    const cards = document.querySelectorAll('.achievement-card');
    cards.forEach(card => {
        if (filter === 'all') {
            card.style.display = 'block';
        } else if (filter === 'unlocked') {
            card.style.display = card.classList.contains('unlocked') ? 'block' : 'none';
        } else if (filter === 'locked') {
            card.style.display = card.classList.contains('locked') ? 'block' : 'none';
        }
    });
}

function logout() {
    if (window.API) { window.API.logout(); return; }
    localStorage.clear();
    sessionStorage.clear();
    window.location.replace('login.html');
}


const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);
