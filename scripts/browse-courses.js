document.addEventListener('DOMContentLoaded', () => {
    const session = JSON.parse(localStorage.getItem('session'));
    
    if (!session || !session.loggedIn) {
        window.location.replace('login.html');
        return;
    }
    
    document.getElementById('userName').textContent = session.user.fullName || 'User';
    
    
    loadUserAvatar(session.user.id);
    
    
    loadCoursesFromDatabase();

    
    const urlParams = new URLSearchParams(window.location.search);
    const q = urlParams.get('q');
    if (q) {
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.value = q;
            
            setTimeout(() => filterCourses(), 800);
        }
    }
});

let allCourses = [];
let enrolledCourseIds = new Set();
let searchTimeout = null;

function showLoadingSpinner() {
    const grid = document.getElementById('coursesGrid');
    grid.innerHTML = `
        <div class="loading-spinner-container">
            <div class="loading-spinner"></div>
            <p>Loading courses...</p>
        </div>
    `;
}

function loadCoursesFromDatabase() {
    showLoadingSpinner();

    const session = JSON.parse(localStorage.getItem('session'));
    const userId = session && session.user ? session.user.id : null;

    const coursesFetch = fetch('/api/courses', { method: 'GET', cache: 'no-cache' }).then(r => r.json());
    const enrollFetch = userId
        ? fetch('/api/courses/enrollments/' + userId).then(r => r.json()).catch(() => ({ success: false }))
        : Promise.resolve({ success: false });

    Promise.all([coursesFetch, enrollFetch])
        .then(([data, enrollData]) => {
            if (enrollData.success && enrollData.enrollments) {
                enrolledCourseIds = new Set(enrollData.enrollments.map(e => e.course_id));
            }
            if (data.success && data.courses) {
                allCourses = data.courses.map(course => ({
                    ...course,
                    level: course.difficulty_level.toLowerCase(),
                    category: getCategoryFromTitle(course.title),
                    icon: getCourseIcon(course.title),
                    instructor: course.instructor_name,
                    students: course.total_students,
                    duration: course.duration_hours,
                    lessons: course.total_lessons
                }));
                loadCourses();
            } else {
                throw new Error('Invalid response format');
            }
        })
        .catch(error => {
            console.error('Error loading courses:', error);
            const grid = document.getElementById('coursesGrid');
            grid.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #666;">
                    <h3>Error loading courses</h3>
                    <p>${error.message}</p>
                    <p>Make sure the backend server is running on port 3001</p>
                    <button onclick="loadCoursesFromDatabase()" style="margin-top: 20px; padding: 10px 20px; background: #6B7280; color: white; border: none; border-radius: 6px; cursor: pointer;">Retry</button>
                </div>
            `;
        });
}

function getCategoryFromTitle(title) {
    if (title.includes('Web') || title.includes('React') || title.includes('Node')) return 'web';
    if (title.includes('Data') || title.includes('Python')) return 'data';
    if (title.includes('AI') || title.includes('Machine Learning')) return 'ai';
    if (title.includes('Mobile') || title.includes('App')) return 'mobile';
    return 'web';
}

function getCourseIcon(title) {
    let iconName = 'book-open';
    let colorClass = 'icon-blue';

    if (title.includes('Web') || title.includes('Full Stack')) { iconName = 'monitor'; colorClass = 'icon-indigo'; }
    else if (title.includes('Python')) { iconName = 'code-2'; colorClass = 'icon-blue'; }
    else if (title.includes('AI') || title.includes('Machine')) { iconName = 'bot'; colorClass = 'icon-purple'; }
    else if (title.includes('Mobile') || title.includes('App')) { iconName = 'smartphone'; colorClass = 'icon-grey-dark'; }
    else if (title.includes('React')) { iconName = 'atom'; colorClass = 'icon-indigo'; }
    else if (title.includes('Node')) { iconName = 'code'; colorClass = 'icon-blue'; }
    else if (title.includes('Database') || title.includes('SQL')) { iconName = 'database'; colorClass = 'icon-purple'; }
    else if (title.includes('Design') || title.includes('UI')) { iconName = 'palette'; colorClass = 'icon-grey-dark'; }
    else if (title.includes('Cloud')) { iconName = 'cloud'; colorClass = 'icon-blue'; }

    return `<span class="icon-3d-wrapper icon-lg ${colorClass}"><i data-lucide="${iconName}"></i></span>`;
}

function loadUserAvatar(userId) {
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

function loadCourses() {
    const grid = document.getElementById('coursesGrid');
    grid.innerHTML = '';
    
    allCourses.forEach(course => {
        const card = createCourseCard(course);
        grid.appendChild(card);
    });

    
    if (window.lucide) {
        lucide.createIcons();
    }
}

function createCourseCard(course) {
    const card = document.createElement('div');
    card.className = 'course-card';
    
    
    const formattedPrice = `₹${parseFloat(course.price).toLocaleString('en-IN')}`;
    
    
    const avgRating = parseFloat(course.average_rating) || parseFloat(course.rating) || 0;
    const totalReviews = parseInt(course.total_reviews) || 0;
    const ratingDisplay = avgRating > 0 ? avgRating.toFixed(1) : 'New';
    const reviewsText = totalReviews === 1 ? '1 review' : `${totalReviews} reviews`;
    
    const isEnrolled = enrolledCourseIds.has(course.id);
    const enrollBtn = isEnrolled
        ? `<button disabled style="width:100%;padding:12px;background:#e5e7eb;color:#9ca3af;border:none;border-radius:8px;font-weight:600;cursor:not-allowed;filter:blur(0.5px);opacity:0.7;position:relative;">
               ✓ Already Enrolled
           </button>`
        : `<button class="enroll-btn" onclick="showEnrollModal(${course.id}, '${course.title.replace(/'/g, "\\'")}', '${formattedPrice}')" style="width:100%;padding:12px;background:#4b5563;color:white;border:none;border-radius:8px;font-weight:600;cursor:pointer;transition:background 0.2s;">
               Enroll Now
           </button>`;

    card.innerHTML = `
        <div class="course-thumbnail" style="display: flex; justify-content: center; padding: 25px 0;">${course.icon}</div>
        <div class="course-content" style="padding: 20px;">
            <div class="course-title" style="font-size: 18px; font-weight: 700; color: #111827; margin-bottom: 8px;">${course.title}</div>
            <div class="course-instructor" style="color: #6B7280; font-size: 14px; margin-bottom: 12px;"><i data-lucide="user" style="width: 14px; height: 14px; display: inline-block; vertical-align: middle;"></i> By ${course.instructor}</div>
            <div class="course-meta" style="margin-bottom: 15px;">
                <div class="course-rating" style="display: flex; align-items: center; gap: 5px; margin-bottom: 8px;">
                    <span class="rating-stars" style="color: #f59e0b;">${generateStars(avgRating)}</span>
                    <span class="rating-value" style="font-weight: 700; color: #1f2937;">${ratingDisplay}</span>
                    <span class="rating-count" style="color: #9ca3af; font-size: 12px;">(${reviewsText})</span>
                </div>
                <div style="display: flex; justify-content: space-between; color: #6B7280; font-size: 13px;">
                    <span><i data-lucide="users" style="width: 13px; height: 13px; display: inline-block; vertical-align: middle;"></i> ${course.students.toLocaleString()}</span>
                    <span><i data-lucide="clock" style="width: 13px; height: 13px; display: inline-block; vertical-align: middle;"></i> ${course.duration}h</span>
                    <span><i data-lucide="book-open" style="width: 13px; height: 13px; display: inline-block; vertical-align: middle;"></i> ${course.lessons}</span>
                </div>
            </div>
            <div class="course-footer" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                <div class="course-price" style="font-size: 20px; font-weight: 800; color: #4b5563;">${formattedPrice}</div>
                <div class="course-level ${course.level}" style="padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; text-transform: uppercase;">${course.level}</div>
            </div>
            ${enrollBtn}
        </div>
    `;
    
    return card;
}

function generateStars(rating) {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    
    let stars = '';
    for (let i = 0; i < fullStars; i++) stars += '★';
    if (hasHalfStar) stars += '½';
    for (let i = 0; i < emptyStars; i++) stars += '☆';
    
    return stars;
}

function showEnrollModal(courseId, courseTitle, coursePrice) {
    const modal = document.getElementById('enrollModal');
    document.getElementById('modalCourseTitle').textContent = courseTitle;
    document.getElementById('modalCoursePrice').textContent = coursePrice;
    modal.style.display = 'flex';
    
    
    modal.dataset.courseId = courseId;
}

function closeEnrollModal() {
    document.getElementById('enrollModal').style.display = 'none';
}

function confirmEnrollment() {
    const session = JSON.parse(localStorage.getItem('session'));
    const modal = document.getElementById('enrollModal');
    const courseId = modal.dataset.courseId;
    
    if (!session || !session.user) {
        alert('Please login to enroll');
        window.location.href = 'login.html';
        return;
    }
    
    
    const confirmBtn = document.querySelector('.modal-confirm-btn');
    const originalText = confirmBtn.textContent;
    confirmBtn.innerHTML = '<div class="inline-spinner" style="width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3); border-top: 2px solid white; border-radius: 50%; animation: spin 0.8s linear infinite; display: inline-block; margin-right: 8px; vertical-align: middle;"></div>Enrolling...';
    confirmBtn.disabled = true;
    
    fetch('/api/courses/enroll', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            user_id: session.user.id,
            course_id: courseId
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            closeEnrollModal();
            showSuccessMessage('Successfully enrolled! Check "My Courses" to start learning.');
        } else {
            alert(data.message);
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Error enrolling in course');
    })
    .finally(() => {
        confirmBtn.textContent = originalText;
        confirmBtn.disabled = false;
    });
}

function showSuccessMessage(message) {
    const successDiv = document.createElement('div');
    successDiv.className = 'success-message';
    successDiv.textContent = message;
    document.body.appendChild(successDiv);
    
    setTimeout(() => {
        successDiv.remove();
    }, 3000);
}

function enrollCourse(courseId) {
    
    const course = allCourses.find(c => c.id === courseId);
    if (course) {
        showEnrollModal(courseId, course.title, course.price);
    }
}

function logout() {
    if (window.API) { window.API.logout(); return; }
    localStorage.clear();
    sessionStorage.clear();
    window.location.replace('login.html');
}


document.getElementById('searchInput').addEventListener('input', debounceSearch);
document.getElementById('categoryFilter').addEventListener('change', filterCourses);
document.getElementById('levelFilter').addEventListener('change', filterCourses);

function debounceSearch(e) {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        filterCourses();
    }, 300); 
}

function filterCourses() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const category = document.getElementById('categoryFilter').value;
    const level = document.getElementById('levelFilter').value;
    
    
    const grid = document.getElementById('coursesGrid');
    const originalContent = grid.innerHTML;
    
    
    if (searchTerm || category !== 'all' || level !== 'all') {
        grid.style.opacity = '0.6';
    }
    
    
    const filtered = allCourses.filter(course => {
        const matchesSearch = course.title.toLowerCase().includes(searchTerm) || 
                            course.instructor.toLowerCase().includes(searchTerm) ||
                            course.description.toLowerCase().includes(searchTerm);
        const matchesCategory = category === 'all' || course.category === category;
        const matchesLevel = level === 'all' || course.level === level;
        
        return matchesSearch && matchesCategory && matchesLevel;
    });
    
    
    setTimeout(() => {
        grid.innerHTML = '';
        grid.style.opacity = '1';
        
        if (filtered.length === 0) {
            grid.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px; color: #666;">
                    <div style="font-size: 48px; margin-bottom: 16px;">🔍</div>
                    <h3 style="margin-bottom: 8px;">No courses found</h3>
                    <p>Try adjusting your search or filters</p>
                </div>
            `;
        } else {
            filtered.forEach(course => {
                const card = createCourseCard(course);
                grid.appendChild(card);
            });
            
            
            if (window.lucide) {
                lucide.createIcons();
            }
            
            
            updateResultsCount(filtered.length, allCourses.length);
        }
    }, 100);
}

function updateResultsCount(filtered, total) {
    let countElement = document.getElementById('resultsCount');
    if (!countElement) {
        countElement = document.createElement('div');
        countElement.id = 'resultsCount';
        countElement.style.cssText = 'margin: 20px 0; color: #666; font-size: 14px;';
        const searchBar = document.querySelector('.search-bar');
        searchBar.parentNode.insertBefore(countElement, searchBar.nextSibling);
    }
    
    if (filtered === total) {
        countElement.textContent = `Showing all ${total} courses`;
    } else {
        countElement.textContent = `Showing ${filtered} of ${total} courses`;
    }
}
