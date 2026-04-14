document.addEventListener('DOMContentLoaded', () => {
    const session = JSON.parse(localStorage.getItem('session'));
    
    if (!session || !session.loggedIn) {
        window.location.replace('login.html');
        return;
    }
    
    document.getElementById('userName').textContent = session.user.fullName || 'User';
    document.getElementById('emailInput').value = session.user.email || '';
    
    
    loadUserAvatar(session.user.id);
});

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

function showSection(sectionName) {
    
    document.querySelectorAll('.settings-section').forEach(section => {
        section.classList.remove('active');
    });
    
    
    document.querySelectorAll('.settings-nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    
    document.getElementById(sectionName + '-section').classList.add('active');
    
    
    event.currentTarget.classList.add('active');
}

function updateEmail() {
    const newEmail = document.getElementById('emailInput').value.trim();
    
    if (!newEmail || !newEmail.includes('@')) {
        alert('Please enter a valid email address');
        return;
    }
    
    const session = JSON.parse(localStorage.getItem('session'));
    const userId = session.user.id;
    
    fetch(`/api/profile/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newEmail })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            
            session.user.email = newEmail;
            localStorage.setItem('session', JSON.stringify(session));
            alert('Email updated successfully!');
        } else {
            alert('Error updating email: ' + data.message);
        }
    })
    .catch(err => {
        console.error('Error:', err);
        alert('Error updating email. Please try again.');
    });
}

function changePassword() {
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    if (!currentPassword || !newPassword || !confirmPassword) {
        alert('Please fill in all password fields');
        return;
    }
    
    if (newPassword.length < 8) {
        alert('New password must be at least 8 characters long');
        return;
    }
    
    if (newPassword !== confirmPassword) {
        alert('New passwords do not match');
        return;
    }
    
    
    const session = JSON.parse(localStorage.getItem('session'));
    const userId = session.user.id;
    
    fetch(`/api/profile/${userId}/password`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            current_password: currentPassword,
            new_password: newPassword
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert('Password changed successfully!');
            document.getElementById('currentPassword').value = '';
            document.getElementById('newPassword').value = '';
            document.getElementById('confirmPassword').value = '';
        } else {
            alert('Error changing password: ' + data.message);
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Error changing password');
    });
}

function deleteAccount() {
    const confirmation = prompt('Type "DELETE" to confirm account deletion:');
    
    if (confirmation === 'DELETE') {
        const finalConfirm = confirm('Are you absolutely sure? This action cannot be undone!');
        
        if (finalConfirm) {
            const session = JSON.parse(localStorage.getItem('session'));
            const userId = session.user.id;
            
            fetch(`/api/profile/${userId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ confirmation: 'DELETE' })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    localStorage.clear();
                    sessionStorage.clear();
                    alert('Your account has been deleted.');
                    window.location.replace('index.html');
                } else {
                    alert('Error deleting account: ' + data.message);
                }
            })
            .catch(error => {
                console.error('Error:', error);
                alert('Error deleting account');
            });
        }
    } else if (confirmation !== null) {
        alert('Account deletion cancelled. Please type "DELETE" exactly to confirm.');
    }
}

function setTheme(theme) {
    document.querySelectorAll('.theme-btn').forEach(btn => btn.classList.remove('active'));
    event.currentTarget.classList.add('active');
    localStorage.setItem('theme', theme);
    
}

function logout() {
    if (window.API) { window.API.logout(); return; }
    localStorage.clear();
    sessionStorage.clear();
    window.location.replace('login.html');
}
