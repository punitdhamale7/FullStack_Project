let cachedProfile = {};


document.addEventListener('DOMContentLoaded', () => {
    loadProfileData();
});

function loadProfileData() {
    const session = JSON.parse(localStorage.getItem('session'));
    
    if (!session || !session.loggedIn) {
        window.location.replace('login.html');
        return;
    }
    
    const userId = session.user.id;
    
    fetch(`/api/profile/${userId}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                cachedProfile = data.profile;
                renderProfile(data.profile, session);
            }
        })
        .catch(error => console.error('Error loading profile:', error));

    
    loadProfileStats(userId);
}

function renderProfile(profile, session) {
    
    document.getElementById('profileName').textContent = profile.full_name || 'User';
    const usernameEl = document.querySelector('.profile-username');
    if (usernameEl) usernameEl.textContent = '@' + (profile.username || 'user');
    const emailEl = document.querySelector('.profile-email');
    if (emailEl) emailEl.textContent = profile.email || '';

    
    const topbarName = document.getElementById('topbarUserName') || document.getElementById('userName');
    if (topbarName) topbarName.textContent = profile.full_name || 'User';

    
    document.getElementById('displayFullName').textContent = profile.full_name || 'Not set';
    document.getElementById('displayEmail').textContent = profile.email || 'Not set';
    document.getElementById('displayPhone').textContent = profile.phone || 'Not set';
    document.getElementById('displayDOB').textContent = profile.date_of_birth ? new Date(profile.date_of_birth).toLocaleDateString() : 'Not set';
    document.getElementById('displayGender').textContent = profile.gender || 'Not set';

    
    document.getElementById('displayCollege').textContent = profile.college || 'Not set';
    document.getElementById('displayDegree').textContent = profile.degree || 'Not set';
    document.getElementById('displayBranch').textContent = profile.branch || 'Not set';
    document.getElementById('displaySpecialization').textContent = profile.specialization || 'Not set';
    document.getElementById('displayYear').textContent = profile.year_of_study || 'Not set';
    document.getElementById('displayGradYear').textContent = profile.graduation_year || 'Not set';

    
    document.getElementById('displayBio').textContent = profile.bio || 'Write something about yourself...';

    
    setSocialLink('displayLinkedIn', profile.linkedin_url);
    setSocialLink('displayGithub', profile.github_url);
    setSocialLink('displayTwitter', profile.twitter_url);
    setSocialLink('displayWebsite', profile.website_url);

    
    if (profile.avatar_url) {
        document.getElementById('profileAvatar').src = profile.avatar_url;
        const topbarAvatar = document.getElementById('topbarAvatar');
        if (topbarAvatar) topbarAvatar.src = profile.avatar_url;
        const dropdownAvatar = document.getElementById('dropdownAvatar');
        if (dropdownAvatar) dropdownAvatar.src = profile.avatar_url;
        document.getElementById('avatarRequirements').style.display = 'none';
    }

    if (profile.cover_url) {
        const coverImg = document.getElementById('profileCoverImg');
        if (coverImg) { coverImg.src = profile.cover_url; coverImg.style.display = 'block'; }
    }

    
    const dropdownName = document.getElementById('dropdownName');
    const dropdownEmail = document.getElementById('dropdownEmail');
    if (dropdownName) dropdownName.textContent = profile.full_name || 'User';
    if (dropdownEmail) dropdownEmail.textContent = profile.email || '';

    
    if (profile.skills && profile.skills.length > 0) {
        const skillsContainer = document.getElementById('skillsContainer');
        skillsContainer.innerHTML = '';
        profile.skills.forEach(skill => {
            const skillTag = document.createElement('span');
            skillTag.className = 'skill-tag';
            skillTag.innerHTML = `${skill} <button onclick="removeSkill(this)">×</button>`;
            skillsContainer.appendChild(skillTag);
        });
    }
}

function setSocialLink(elementId, url) {
    const el = document.getElementById(elementId);
    if (!el) return;
    if (url) {
        el.innerHTML = `<a href="${url}" target="_blank" rel="noopener" style="color:#4b5563;text-decoration:none;">${url}</a>`;
    } else {
        el.textContent = 'Not set';
    }
}

function loadProfileStats(userId) {
    
    fetch(`/api/courses/enrollments/${userId}`)
        .then(r => r.json())
        .then(data => {
            if (data.success) {
                const enrollments = data.enrollments || [];
                const completed = enrollments.filter(e => parseFloat(e.progress_percentage) >= 100).length;
                const stats = document.querySelectorAll('.profile-stats .stat strong');
                if (stats[0]) stats[0].textContent = enrollments.length;
                if (stats[1]) stats[1].textContent = completed;
            }
        })
        .catch(() => {});

    
    fetch(`/api/certificates/user/${userId}`)
        .then(r => r.json())
        .then(data => {
            if (data.success) {
                const stats = document.querySelectorAll('.profile-stats .stat strong');
                if (stats[2]) stats[2].textContent = (data.certificates || []).length;
            }
        })
        .catch(() => {});
}



function changeAvatar() {
    document.getElementById('avatarInput').click();
}

function handleAvatarChange(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
            const canvas = document.createElement('canvas');
            const maxSize = 800;
            let w = img.width, h = img.height;
            if (w > h) { if (w > maxSize) { h *= maxSize / w; w = maxSize; } }
            else { if (h > maxSize) { w *= maxSize / h; h = maxSize; } }
            canvas.width = w; canvas.height = h;
            canvas.getContext('2d').drawImage(img, 0, 0, w, h);
            const compressed = canvas.toDataURL('image/jpeg', 0.7);

            document.getElementById('profileAvatar').src = compressed;
            const topbarAvatar = document.getElementById('topbarAvatar');
            if (topbarAvatar) topbarAvatar.src = compressed;
            document.getElementById('avatarRequirements').style.display = 'none';

            const session = JSON.parse(localStorage.getItem('session'));
            fetch(`/api/profile/${session.user.id}/avatar`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ avatar_url: compressed })
            })
            .then(r => r.json())
            .then(data => {
                if (!data.success) alert('Error saving avatar: ' + data.message);
            })
            .catch(() => alert('Error saving avatar'));
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

function editCover() {
    document.getElementById('coverInput').click();
}

function handleCoverChange(event) {
    const file = event.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { alert('Please select an image file'); return; }

    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
            const canvas = document.createElement('canvas');
            canvas.width = 1200;
            canvas.height = 300;
            const ctx = canvas.getContext('2d');
            const scale = Math.max(canvas.width / img.width, canvas.height / img.height);
            const x = (canvas.width - img.width * scale) / 2;
            const y = (canvas.height - img.height * scale) / 2;
            ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
            const compressed = canvas.toDataURL('image/jpeg', 0.8);

            document.getElementById('profileCoverImg').src = compressed;
            document.getElementById('profileCoverImg').style.display = 'block';

            const session = JSON.parse(localStorage.getItem('session'));
            const xhr = new XMLHttpRequest();
            xhr.open('PUT', '/api/profile/' + session.user.id + '/cover');
            xhr.setRequestHeader('Content-Type', 'application/json');
            xhr.onload = function() {
                try {
                    const d = JSON.parse(xhr.responseText);
                    if (d.success) showToast('Cover photo updated!');
                    else alert('Error saving cover: ' + d.message);
                } catch(e) { alert('Error saving cover'); }
            };
            xhr.send(JSON.stringify({ cover_url: compressed }));
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}



function editPersonalInfo() {
    document.getElementById('personalInfoView').style.display = 'none';
    document.getElementById('personalInfoForm').style.display = 'block';

    document.getElementById('editFullName').value = cachedProfile.full_name || '';
    document.getElementById('editPhone').value = cachedProfile.phone || '';
    
    if (cachedProfile.date_of_birth) {
        document.getElementById('editDOB').value = cachedProfile.date_of_birth.split('T')[0];
    } else {
        document.getElementById('editDOB').value = '';
    }
    document.getElementById('editGender').value = cachedProfile.gender || '';
}

function savePersonalInfo() {
    const session = JSON.parse(localStorage.getItem('session'));
    const payload = {
        full_name: document.getElementById('editFullName').value.trim(),
        phone: document.getElementById('editPhone').value.trim(),
        date_of_birth: document.getElementById('editDOB').value || null,
        gender: document.getElementById('editGender').value || null
    };

    fetch(`/api/profile/${session.user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    })
    .then(r => r.json())
    .then(data => {
        if (data.success) {
            session.user.fullName = payload.full_name;
            localStorage.setItem('session', JSON.stringify(session));
            cancelEdit('personalInfo');
            loadProfileData();
            showToast('Personal information updated!');
        } else {
            alert('Error: ' + data.message);
        }
    })
    .catch(() => alert('Error updating personal info'));
}



function editEducation() {
    document.getElementById('educationView').style.display = 'none';
    document.getElementById('educationForm').style.display = 'block';

    document.getElementById('editCollege').value = cachedProfile.college || '';
    document.getElementById('editDegree').value = cachedProfile.degree || '';
    document.getElementById('editBranch').value = cachedProfile.branch || '';
    document.getElementById('editSpecialization').value = cachedProfile.specialization || '';
    document.getElementById('editYear').value = cachedProfile.year_of_study || '';
    document.getElementById('editGradYear').value = cachedProfile.graduation_year || '';
}

function saveEducation() {
    const session = JSON.parse(localStorage.getItem('session'));
    const payload = {
        college: document.getElementById('editCollege').value.trim(),
        degree: document.getElementById('editDegree').value,
        branch: document.getElementById('editBranch').value.trim(),
        specialization: document.getElementById('editSpecialization').value.trim(),
        year_of_study: document.getElementById('editYear').value,
        graduation_year: document.getElementById('editGradYear').value || null
    };

    fetch(`/api/profile/${session.user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    })
    .then(r => r.json())
    .then(data => {
        if (data.success) {
            cancelEdit('education');
            loadProfileData();
            showToast('Education updated!');
        } else {
            alert('Error: ' + data.message);
        }
    })
    .catch(() => alert('Error updating education'));
}



function editBio() {
    document.getElementById('bioView').style.display = 'none';
    document.getElementById('bioForm').style.display = 'block';
    document.getElementById('editBioText').value = cachedProfile.bio || '';
}

function saveBio() {
    const session = JSON.parse(localStorage.getItem('session'));
    const payload = { bio: document.getElementById('editBioText').value.trim() };

    fetch(`/api/profile/${session.user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    })
    .then(r => r.json())
    .then(data => {
        if (data.success) {
            cancelEdit('bio');
            loadProfileData();
            showToast('Bio updated!');
        } else {
            alert('Error: ' + data.message);
        }
    })
    .catch(() => alert('Error updating bio'));
}



function editSocial() {
    document.getElementById('socialView').style.display = 'none';
    document.getElementById('socialForm').style.display = 'block';

    document.getElementById('editLinkedIn').value = cachedProfile.linkedin_url || '';
    document.getElementById('editGithub').value = cachedProfile.github_url || '';
    document.getElementById('editTwitter').value = cachedProfile.twitter_url || '';
    document.getElementById('editWebsite').value = cachedProfile.website_url || '';
}

function saveSocial() {
    const session = JSON.parse(localStorage.getItem('session'));
    const payload = {
        linkedin_url: document.getElementById('editLinkedIn').value.trim(),
        github_url: document.getElementById('editGithub').value.trim(),
        twitter_url: document.getElementById('editTwitter').value.trim(),
        website_url: document.getElementById('editWebsite').value.trim()
    };

    fetch(`/api/profile/${session.user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    })
    .then(r => r.json())
    .then(data => {
        if (data.success) {
            cancelEdit('social');
            loadProfileData();
            showToast('Social links updated!');
        } else {
            alert('Error: ' + data.message);
        }
    })
    .catch(() => alert('Error updating social links'));
}



function cancelEdit(section) {
    const map = {
        personalInfo: ['personalInfoView', 'personalInfoForm'],
        education:    ['educationView',    'educationForm'],
        bio:          ['bioView',          'bioForm'],
        social:       ['socialView',       'socialForm']
    };
    if (map[section]) {
        document.getElementById(map[section][0]).style.display = 'block';
        document.getElementById(map[section][1]).style.display = 'none';
    }
}



function addSkill() {
    document.getElementById('addSkillForm').style.display = 'flex';
    document.getElementById('newSkill').focus();
}

function saveSkill() {
    const skillName = document.getElementById('newSkill').value.trim();
    if (!skillName) { alert('Please enter a skill name'); return; }

    const session = JSON.parse(localStorage.getItem('session'));
    fetch(`/api/profile/${session.user.id}/skills`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skill_name: skillName })
    })
    .then(r => r.json())
    .then(data => {
        if (data.success) {
            document.getElementById('newSkill').value = '';
            cancelAddSkill();
            loadProfileData();
            showToast('Skill added!');
        } else {
            alert('Error: ' + data.message);
        }
    })
    .catch(() => alert('Error adding skill'));
}

function cancelAddSkill() {
    document.getElementById('addSkillForm').style.display = 'none';
    document.getElementById('newSkill').value = '';
}

function removeSkill(button) {
    const skillTag = button.parentElement;
    const skillName = skillTag.textContent.replace('×', '').trim();

    if (!confirm(`Remove "${skillName}" from your skills?`)) return;

    const session = JSON.parse(localStorage.getItem('session'));
    fetch(`/api/profile/${session.user.id}/skills/${encodeURIComponent(skillName)}`, {
        method: 'DELETE'
    })
    .then(r => r.json())
    .then(data => {
        if (data.success) {
            skillTag.remove();
            showToast('Skill removed');
        } else {
            alert('Error: ' + data.message);
        }
    })
    .catch(() => alert('Error removing skill'));
}



function changePassword() {
    
    const modal = document.createElement('div');
    modal.id = 'passwordModal';
    modal.style.cssText = `position:fixed;inset:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:9999;`;
    modal.innerHTML = `
        <div style="background:#fff;border-radius:16px;padding:32px;width:100%;max-width:400px;box-shadow:0 20px 60px rgba(0,0,0,0.3);">
            <h3 style="margin:0 0 20px;font-size:18px;">Change Password</h3>
            <div style="margin-bottom:14px;">
                <label style="display:block;font-size:13px;font-weight:600;margin-bottom:6px;color:#374151;">Current Password</label>
                <input type="password" id="cpCurrent" style="width:100%;padding:10px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:14px;box-sizing:border-box;" placeholder="Enter current password">
            </div>
            <div style="margin-bottom:14px;">
                <label style="display:block;font-size:13px;font-weight:600;margin-bottom:6px;color:#374151;">New Password</label>
                <input type="password" id="cpNew" style="width:100%;padding:10px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:14px;box-sizing:border-box;" placeholder="Min 8 characters">
            </div>
            <div style="margin-bottom:20px;">
                <label style="display:block;font-size:13px;font-weight:600;margin-bottom:6px;color:#374151;">Confirm New Password</label>
                <input type="password" id="cpConfirm" style="width:100%;padding:10px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:14px;box-sizing:border-box;" placeholder="Repeat new password">
            </div>
            <div style="display:flex;gap:10px;">
                <button onclick="submitPasswordChange()" style="flex:1;padding:10px;background:#4b5563;color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;">Save</button>
                <button onclick="document.getElementById('passwordModal').remove()" style="flex:1;padding:10px;background:#f3f4f6;color:#374151;border:none;border-radius:8px;font-size:14px;cursor:pointer;">Cancel</button>
            </div>
        </div>`;
    document.body.appendChild(modal);
}

function submitPasswordChange() {
    const current = document.getElementById('cpCurrent').value;
    const newPwd = document.getElementById('cpNew').value;
    const confirm = document.getElementById('cpConfirm').value;

    if (!current || !newPwd || !confirm) { alert('Please fill all fields'); return; }
    if (newPwd.length < 8) { alert('New password must be at least 8 characters'); return; }
    if (newPwd !== confirm) { alert('Passwords do not match'); return; }

    const session = JSON.parse(localStorage.getItem('session'));
    fetch(`/api/profile/${session.user.id}/password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current_password: current, new_password: newPwd })
    })
    .then(r => r.json())
    .then(data => {
        if (data.success) {
            document.getElementById('passwordModal').remove();
            showToast('Password changed successfully!');
        } else {
            alert('Error: ' + data.message);
        }
    })
    .catch(() => alert('Error changing password'));
}

function changeEmail() {
    const modal = document.createElement('div');
    modal.id = 'emailModal';
    modal.style.cssText = `position:fixed;inset:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:9999;`;
    modal.innerHTML = `
        <div style="background:#fff;border-radius:16px;padding:32px;width:100%;max-width:400px;box-shadow:0 20px 60px rgba(0,0,0,0.3);">
            <h3 style="margin:0 0 20px;font-size:18px;">Change Email</h3>
            <div style="margin-bottom:20px;">
                <label style="display:block;font-size:13px;font-weight:600;margin-bottom:6px;color:#374151;">New Email Address</label>
                <input type="email" id="ceEmail" style="width:100%;padding:10px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:14px;box-sizing:border-box;" placeholder="Enter new email" value="${cachedProfile.email || ''}">
            </div>
            <div style="display:flex;gap:10px;">
                <button onclick="submitEmailChange()" style="flex:1;padding:10px;background:#4b5563;color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;">Save</button>
                <button onclick="document.getElementById('emailModal').remove()" style="flex:1;padding:10px;background:#f3f4f6;color:#374151;border:none;border-radius:8px;font-size:14px;cursor:pointer;">Cancel</button>
            </div>
        </div>`;
    document.body.appendChild(modal);
}

function submitEmailChange() {
    const newEmail = document.getElementById('ceEmail').value.trim();
    if (!newEmail || !newEmail.includes('@')) { alert('Please enter a valid email'); return; }

    const session = JSON.parse(localStorage.getItem('session'));
    fetch(`/api/profile/${session.user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newEmail })
    })
    .then(r => r.json())
    .then(data => {
        if (data.success) {
            session.user.email = newEmail;
            localStorage.setItem('session', JSON.stringify(session));
            document.getElementById('emailModal').remove();
            loadProfileData();
            showToast('Email updated successfully!');
        } else {
            alert('Error: ' + data.message);
        }
    })
    .catch(() => alert('Error updating email'));
}

function privacySettings() {
    window.location.href = 'settings.html';
}

function notificationSettings() {
    window.location.href = 'settings.html';
}



function toggleEditMode() {
    
    document.getElementById('personalInfoView').style.display = 'none';
    document.getElementById('personalInfoForm').style.display = 'block';
    document.getElementById('editFullName').value = cachedProfile.full_name || '';
    document.getElementById('editPhone').value = cachedProfile.phone || '';
    if (cachedProfile.date_of_birth) {
        document.getElementById('editDOB').value = cachedProfile.date_of_birth.split('T')[0];
    }
    document.getElementById('editGender').value = cachedProfile.gender || '';
    document.getElementById('personalInfoForm').scrollIntoView({ behavior: 'smooth', block: 'center' });
}



function deleteAccount() {
    const confirmation = prompt('Type "DELETE" to confirm account deletion:');
    if (confirmation !== 'DELETE') {
        if (confirmation !== null) alert('Cancelled. Type "DELETE" exactly to confirm.');
        return;
    }
    if (!confirm('Are you absolutely sure? This cannot be undone!')) return;

    const session = JSON.parse(localStorage.getItem('session'));
    fetch(`/api/profile/${session.user.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmation: 'DELETE' })
    })
    .then(r => r.json())
    .then(data => {
        if (data.success) {
            localStorage.clear();
            sessionStorage.clear();
            window.location.replace('index.html');
        } else {
            alert('Error: ' + data.message);
        }
    })
    .catch(() => alert('Error deleting account'));
}



function shareProfile() {
    const url = window.location.href;
    if (navigator.share) {
        navigator.share({ title: 'My LearnAI Profile', url }).catch(() => {});
    } else {
        navigator.clipboard.writeText(url).then(() => showToast('Profile link copied!'));
    }
}



function showToast(message) {
    const existing = document.getElementById('profileToast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'profileToast';
    toast.style.cssText = `
        position:fixed;bottom:30px;right:30px;background:#10b981;color:#fff;
        padding:12px 20px;border-radius:10px;font-size:14px;font-weight:600;
        box-shadow:0 4px 20px rgba(0,0,0,0.2);z-index:10000;
        animation:slideInUp 0.3s ease;
    `;
    toast.textContent = '✓ ' + message;
    document.body.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; toast.style.transition = 'opacity 0.3s'; setTimeout(() => toast.remove(), 300); }, 3000);
}


const toastStyle = document.createElement('style');
toastStyle.textContent = `@keyframes slideInUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`;
document.head.appendChild(toastStyle);

function logout() {
    if (window.API) { window.API.logout(); return; }
    localStorage.clear();
    sessionStorage.clear();
    window.location.replace('login.html');
}
