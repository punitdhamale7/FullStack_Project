const API = '/api';

let session = null;
let allEnrollments = [];
let currentFilter = 'all';

document.addEventListener('DOMContentLoaded', () => {
    session = JSON.parse(localStorage.getItem('session'));
    if (!session || !session.loggedIn || !session.user) {
        window.location.replace('login.html');
        return;
    }

    const user = session.user;
    document.getElementById('userName').textContent = user.fullName || user.username || 'User';
    document.getElementById('dropdownName').textContent = user.fullName || user.username || 'User';
    document.getElementById('dropdownEmail').textContent = user.email || '';

    loadUserDropdown(session);
    loadAvatar(session.user.id);
    loadMyCourses();

    document.getElementById('searchInput').addEventListener('input', applyFilters);
    document.getElementById('sortSelect').addEventListener('change', applyFilters);

    if (window.lucide) lucide.createIcons();
});

function logout() {
    if (window.API) { window.API.logout(); return; }
    localStorage.removeItem('session');
    window.location.replace('login.html');
}

function loadMyCourses() {
    const grid = document.getElementById('coursesGrid');
    grid.innerHTML = '<div class="loading-state"><div class="spinner"></div><p>Loading your courses…</p></div>';

    const userId = session.user.id;
    var xhr = new XMLHttpRequest();
    xhr.open('GET', API + '/courses/enrollments/' + userId);
    xhr.onload = function() {
        try {
            var d = JSON.parse(xhr.responseText);
            if (!d.success) { showError('Failed to load courses.'); return; }
            allEnrollments = d.enrollments || [];
            applyFilters();
        } catch(e) { showError('Error loading courses.'); }
    };
    xhr.onerror = function() { showError('Could not connect to server.'); };
    xhr.send();
}

function filterCourses(filter) {
    currentFilter = filter;
    document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
    event.target.classList.add('active');
    applyFilters();
}

function applyFilters() {
    const search = (document.getElementById('searchInput').value || '').toLowerCase();
    const sort = document.getElementById('sortSelect').value;

    let list = allEnrollments.slice();

    if (currentFilter === 'in-progress') {
        list = list.filter(e => parseFloat(e.progress_percentage) < 100);
    } else if (currentFilter === 'completed') {
        list = list.filter(e => parseFloat(e.progress_percentage) >= 100);
    }

    if (search) {
        list = list.filter(e => e.title.toLowerCase().includes(search) || (e.instructor_name || '').toLowerCase().includes(search));
    }

    if (sort === 'progress') {
        list.sort((a, b) => parseFloat(b.progress_percentage) - parseFloat(a.progress_percentage));
    } else if (sort === 'name') {
        list.sort((a, b) => a.title.localeCompare(b.title));
    }

    renderCourses(list);
}

function renderCourses(list) {
    const grid = document.getElementById('coursesGrid');

    if (!list.length) {
        grid.innerHTML = '<div class="empty-state">'
            + '<div class="empty-icon"><i data-lucide="book-open" style="width:56px;height:56px;color:#d1d5db;"></i></div>'
            + '<h3>No courses found</h3>'
            + '<p>' + (allEnrollments.length === 0 ? 'You haven\'t enrolled in any courses yet.' : 'No courses match your filter.') + '</p>'
            + (allEnrollments.length === 0 ? '<a href="browse-courses.html" class="btn-browse">Browse Courses</a>' : '')
            + '</div>';
        if (window.lucide) lucide.createIcons();
        return;
    }

    grid.innerHTML = list.map(e => {
        const pct = parseFloat(e.progress_percentage) || 0;
        const isCompleted = pct >= 100;
        const statusBadge = isCompleted
            ? '<span class="course-status completed"><i data-lucide="check-circle" style="width:13px;height:13px;display:inline-block;vertical-align:middle;margin-right:3px;"></i> Completed</span>'
            : '<span class="course-status in-progress"><i data-lucide="loader" style="width:13px;height:13px;display:inline-block;vertical-align:middle;margin-right:3px;"></i> In Progress</span>';
        const icon = getCourseIcon(e.title);

        return '<div class="course-card" onclick="openCourse(' + e.course_id + ')">'
            + '<div class="course-card-header">'
            + '<div class="course-icon-wrap">' + icon + '</div>'
            + '<div class="course-card-meta">'
            + '<span class="difficulty-badge diff-' + (e.difficulty_level || 'beginner').toLowerCase() + '">' + (e.difficulty_level || 'Beginner') + '</span>'
            + statusBadge
            + '</div>'
            + '</div>'
            + '<div class="course-card-body">'
            + '<h3 class="course-title">' + e.title + '</h3>'
            + '<p class="course-instructor"><i data-lucide="user" class="icon-inline"></i> ' + (e.instructor_name || '') + '</p>'
            + '<div class="progress-section">'
            + '<div class="progress-header"><span>Progress</span><span class="progress-pct">' + Math.round(pct) + '%</span></div>'
            + '<div class="progress-bar-wrap"><div class="progress-bar-fill" style="width:' + Math.round(pct) + '%;background:' + (isCompleted ? '#10b981' : '#4b5563') + ';"></div></div>'
            + '</div>'
            + '<div class="course-card-stats">'
            + '<span><i data-lucide="clock" class="icon-inline"></i> ' + (e.duration_hours || 0) + 'h</span>'
            + '<span><i data-lucide="book" class="icon-inline"></i> ' + (e.total_lessons || 0) + ' lessons</span>'
            + '<span><i data-lucide="star" class="icon-inline"></i> ' + (parseFloat(e.rating) || 0).toFixed(1) + '</span>'
            + '</div>'
            + '</div>'
            + '<div class="course-card-footer">'
            + '<button class="btn-continue" onclick="event.stopPropagation();openCourse(' + e.course_id + ')">' 
            + (isCompleted
                ? '<i data-lucide="rotate-ccw" style="width:15px;height:15px;display:inline-block;vertical-align:middle;margin-right:6px;"></i> Review Course'
                : '<i data-lucide="play" style="width:15px;height:15px;display:inline-block;vertical-align:middle;margin-right:6px;"></i> Continue Learning')
            + '</button>'
            + (isCompleted ? '<button class="btn-certificate" onclick="event.stopPropagation();downloadCertificate(' + e.course_id + ')" title="Download Certificate"><i data-lucide="award" style="width:15px;height:15px;display:inline-block;vertical-align:middle;margin-right:6px;"></i> Certificate</button>' : '')
            + '</div>'
            + '</div>';
    }).join('');

    if (window.lucide) lucide.createIcons();
}

function openCourse(courseId) {
    window.location.href = 'course-player.html?courseId=' + courseId;
}

function getCourseIcon(title) {
    const t = (title || '').toLowerCase();
    let iconName = 'book-open';
    let colorClass = 'icon-blue';
    if (t.includes('python')) { iconName = 'terminal'; colorClass = 'icon-blue'; }
    else if (t.includes('javascript') || t.includes('js')) { iconName = 'zap'; colorClass = 'icon-indigo'; }
    else if (t.includes('react')) { iconName = 'layers'; colorClass = 'icon-blue'; }
    else if (t.includes('node')) { iconName = 'server'; colorClass = 'icon-blue'; }
    else if (t.includes('web') || t.includes('html') || t.includes('css')) { iconName = 'globe'; colorClass = 'icon-indigo'; }
    else if (t.includes('ai') || t.includes('machine') || t.includes('ml')) { iconName = 'cpu'; colorClass = 'icon-purple'; }
    else if (t.includes('data')) { iconName = 'bar-chart-2'; colorClass = 'icon-grey-dark'; }
    else if (t.includes('mobile') || t.includes('android') || t.includes('ios')) { iconName = 'smartphone'; colorClass = 'icon-blue'; }
    else if (t.includes('c++') || t.includes('cpp')) { iconName = 'settings-2'; colorClass = 'icon-grey-dark'; }
    else if (t.includes('java')) { iconName = 'coffee'; colorClass = 'icon-grey-light'; }
    return '<span class="icon-3d-wrapper icon-md ' + colorClass + '"><i data-lucide="' + iconName + '"></i></span>';
}

function showError(msg) {
    document.getElementById('coursesGrid').innerHTML = '<div class="empty-state"><p style="color:#ef4444;">' + msg + '</p><button onclick="loadMyCourses()" class="btn-browse">Retry</button></div>';
}

function downloadCertificate(courseId) {
    var userId = session.user.id;
    var btn = event.target;
    btn.innerHTML = '<i data-lucide="loader" style="width:15px;height:15px;display:inline-block;vertical-align:middle;margin-right:6px;animation:spin 1s linear infinite;"></i> Generating...';
    btn.disabled = true;
    if (window.lucide) lucide.createIcons();
    var a = document.createElement('a');
    a.href = '/api/certificates/generate/' + userId + '/' + courseId;
    a.download = 'Certificate.pdf';
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function() { btn.innerHTML = '<i data-lucide="award" style="width:15px;height:15px;display:inline-block;vertical-align:middle;margin-right:6px;"></i> Certificate'; btn.disabled = false; if (window.lucide) lucide.createIcons(); }, 2000);
}

function loadAvatar(userId) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', API + '/profile/' + userId);
    xhr.onload = function() {
        try {
            var d = JSON.parse(xhr.responseText);
            if (d.success && d.profile.avatar_url) {
                var url = d.profile.avatar_url;
                var topbar = document.getElementById('topbarAvatar');
                var dropdown = document.getElementById('dropdownAvatar');
                if (topbar) topbar.src = url;
                if (dropdown) dropdown.src = url;
            }
        } catch(e) {}
    };
    xhr.send();
}
