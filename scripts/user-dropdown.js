function toggleUserMenu() {
    const dropdown = document.getElementById('userDropdown');
    if (dropdown) {
        dropdown.classList.toggle('show');
    }
}


document.addEventListener('click', (e) => {
    const dropdown = document.getElementById('userDropdown');
    const userProfile = document.querySelector('.user-profile');
    
    if (dropdown && !dropdown.contains(e.target) && userProfile && !userProfile.contains(e.target)) {
        dropdown.classList.remove('show');
    }
});


function loadUserDropdown(session) {
    if (!session || !session.user) return;
    
    const userId = session.user.id;
    
    fetch(`/api/profile/${userId}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                
                const dropdownAvatar = document.getElementById('dropdownAvatar');
                if (dropdownAvatar && data.profile.avatar_url) {
                    dropdownAvatar.src = data.profile.avatar_url;
                }
                
                
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
            console.error('Error loading dropdown data:', error);
        });
}


function hideCurrentPageLink() {
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    const dropdown = document.getElementById('userDropdown');
    
    if (!dropdown) return;
    
    const links = dropdown.querySelectorAll('.dropdown-menu li a');
    
    links.forEach(link => {
        const href = link.getAttribute('href');
        if (href === currentPage || (currentPage === '' && href === 'index.html')) {
            link.parentElement.style.display = 'none';
        }
    });
}


document.addEventListener('DOMContentLoaded', () => {
    hideCurrentPageLink();
});
