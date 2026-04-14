document.addEventListener('DOMContentLoaded', () => {
    const session = JSON.parse(localStorage.getItem('session'));
    
    if (!session || !session.loggedIn) {
        window.location.replace('login.html');
        return;
    }
    
    document.getElementById('userName').textContent = session.user.fullName || 'User';
    
    loadUserAvatar(session.user.id);
    loadProgressData(session.user.id);
});

function loadUserAvatar(userId) {
    fetch(`/api/profile/${userId}`)
        .then(response => response.json())
        .then(data => {
            if (data.success && data.profile.avatar_url) {
                document.querySelectorAll('#topbarAvatar, .user-profile img, #dropdownAvatar')
                    .forEach(avatar => { avatar.src = data.profile.avatar_url; });
            }
            const session = JSON.parse(localStorage.getItem('session'));
            loadUserDropdown(session);
        })
        .catch(err => console.error('Error loading avatar:', err));
}

function loadProgressData(userId) {
    const progressList = document.getElementById('progressList');
    progressList.innerHTML = '<div style="text-align:center;padding:40px;color:#666;">Loading your progress...</div>';

    
    Promise.all([
        fetch(`/api/courses/enrollments/${userId}`).then(r => r.json()),
        fetch(`/api/achievements/stats/${userId}`).then(r => r.json())
    ]).then(([enrollData, statsData]) => {
        
        if (statsData.success) {
            const s = statsData.stats;
            const totalEl = document.getElementById('totalCourses');
            const completedEl = document.getElementById('completedCourses');
            const streakEl = document.getElementById('streak');
            if (totalEl) totalEl.textContent = s.total_enrollments || 0;
            if (completedEl) completedEl.textContent = s.total_lessons_completed || 0;
            if (streakEl) streakEl.textContent = s.current_streak_days || 0;
        }

        if (!enrollData.success || enrollData.enrollments.length === 0) {
            progressList.innerHTML = `
                <div style="text-align:center;padding:60px 20px;color:#666;">
                    <p style="font-size:18px;margin-bottom:12px;">No courses enrolled yet</p>
                    <a href="browse-courses.html" style="color:#4b5563;text-decoration:underline;">Browse Courses</a>
                </div>`;
            return;
        }

        
        const progressPromises = enrollData.enrollments.map(enrollment =>
            fetch(`/api/courses/${enrollment.course_id}/progress/${userId}`)
                .then(r => r.json())
                .then(p => ({ ...enrollment, realProgress: p.success ? p.progress : null }))
                .catch(() => ({ ...enrollment, realProgress: null }))
        );

        Promise.all(progressPromises).then(enrollments => {
            progressList.innerHTML = '';
            let totalHours = 0;

            enrollments.forEach(course => {
                const progress = course.realProgress;
                const pct = progress ? Math.round(parseFloat(progress.progress_percentage) || 0) : Math.round(parseFloat(course.progress_percentage) || 0);
                const completed = progress ? (progress.completed_lessons || 0) : (course.completed_lessons || 0);
                const total = progress ? (progress.total_lessons || course.total_lessons || 0) : (course.total_lessons || 0);
                totalHours += parseFloat(course.duration_hours || 0);

                const item = document.createElement('div');
                item.className = 'progress-item';
                item.innerHTML = `
                    <div class="progress-header">
                        <div class="progress-title">${course.title}</div>
                        <div class="progress-percentage">${pct}%</div>
                    </div>
                    <div class="progress-bar-container">
                        <div class="progress-bar-fill" style="width: ${pct}%"></div>
                    </div>
                    <div class="progress-details">
                        <span>${completed}/${total} lessons completed</span>
                        <span>${course.duration_hours || 0} hours</span>
                    </div>
                `;
                progressList.appendChild(item);
            });

            
            const hoursEl = document.getElementById('totalHours');
            if (hoursEl) hoursEl.textContent = Math.round(totalHours);

            if (window.lucide) lucide.createIcons();
        });
    }).catch(err => {
        console.error('Error loading progress:', err);
        progressList.innerHTML = '<div style="text-align:center;padding:40px;color:#e74c3c;">Failed to load progress. Please try again.</div>';
    });
}

function logout() {
    if (window.API) { window.API.logout(); return; }
    localStorage.clear();
    sessionStorage.clear();
    window.location.replace('login.html');
}
