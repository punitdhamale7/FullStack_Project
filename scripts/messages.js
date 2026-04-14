const API = '/api';

let session = null;
let currentUserId = null;
let currentConversationId = null;
let currentReceiverId = null;
let allConversations = [];
let pollInterval = null;

document.addEventListener('DOMContentLoaded', function() {
    session = JSON.parse(localStorage.getItem('session'));
    if (!session || !session.loggedIn || !session.user) {
        window.location.replace('login.html');
        return;
    }
    currentUserId = session.user.id;

    document.getElementById('userName').textContent = session.user.fullName || session.user.username || 'User';
    document.getElementById('dropdownName').textContent = session.user.fullName || session.user.username || 'User';
    document.getElementById('dropdownEmail').textContent = session.user.email || '';

    loadAvatar();
    loadConversations();
    loadUserDropdown(session);

    document.getElementById('messageInput').addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
    });

    if (window.lucide) lucide.createIcons();
});

function logout() {
    if (window.API) { window.API.logout(); return; }
    localStorage.removeItem('session');
    window.location.replace('login.html');
}

function loadAvatar() {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', API + '/profile/' + currentUserId);
    xhr.onload = function() {
        try {
            var d = JSON.parse(xhr.responseText);
            if (d.success && d.profile.avatar_url) {
                var url = d.profile.avatar_url;
                var t = document.getElementById('topbarAvatar');
                var dr = document.getElementById('dropdownAvatar');
                if (t) t.src = url;
                if (dr) dr.src = url;
            }
        } catch(e) {}
    };
    xhr.send();
}

function loadConversations() {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', API + '/messages/conversations/' + currentUserId);
    xhr.onload = function() {
        try {
            var d = JSON.parse(xhr.responseText);
            if (d.success) {
                allConversations = d.conversations;
                renderConversations(allConversations);
            }
        } catch(e) {}
    };
    xhr.send();
}

function renderConversations(list) {
    var el = document.getElementById('conversationsList');
    if (!list.length) {
        el.innerHTML = '<div style="text-align:center;padding:40px 20px;color:#667781;"><p>No conversations yet.</p><p style="font-size:13px;margin-top:8px;">Click "+ New" to start chatting.</p></div>';
        return;
    }
    el.innerHTML = list.map(function(c) {
        var avatar = c.other_user_avatar || 'assets/default-avatar.png';
        var time = c.last_message_time ? formatTime(c.last_message_time) : '';
        var unread = c.unread_count > 0 ? '<span class="unread-badge">' + c.unread_count + '</span>' : '';
        var lastMsg = c.last_message ? (c.last_message.length > 35 ? c.last_message.substring(0, 35) + '…' : c.last_message) : 'No messages yet';
        var active = currentConversationId === c.conversation_id ? ' active' : '';
        return '<div class="conversation-item' + active + '" onclick="openConversation(' + c.conversation_id + ',' + c.other_user_id + ',\'' + escJs(c.other_user_name) + '\',\'' + escJs(avatar) + '\')">'
            + '<img src="' + avatar + '" class="conv-avatar" onerror="this.src=\'assets/default-avatar.png\'">'
            + '<div class="conv-info">'
            + '<div class="conv-header"><span class="conv-name">' + c.other_user_name + '</span><span class="conv-time">' + time + '</span></div>'
            + '<div class="conv-preview">' + lastMsg + unread + '</div>'
            + '</div></div>';
    }).join('');
}

function searchConversations(q) {
    var filtered = allConversations.filter(function(c) {
        return c.other_user_name.toLowerCase().includes(q.toLowerCase());
    });
    renderConversations(filtered);
}

function openConversation(conversationId, receiverId, receiverName, receiverAvatar) {
    currentConversationId = conversationId;
    currentReceiverId = receiverId;

    document.getElementById('noConversation').style.display = 'none';
    document.getElementById('chatArea').style.display = 'flex';
    document.getElementById('chatUserName').textContent = receiverName;
    document.getElementById('chatUserAvatar').src = receiverAvatar || 'assets/default-avatar.png';
    document.getElementById('chatUserStatus').textContent = 'online';

    renderConversations(allConversations);
    loadMessages(conversationId);
    markRead(conversationId);

    clearInterval(pollInterval);
    pollInterval = setInterval(function() { loadMessages(conversationId); }, 3000);
}

function loadMessages(conversationId) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', API + '/messages/conversation/' + conversationId);
    xhr.onload = function() {
        try {
            var d = JSON.parse(xhr.responseText);
            if (d.success) renderMessages(d.messages);
        } catch(e) {}
    };
    xhr.send();
}

function renderMessages(messages) {
    var container = document.getElementById('messagesContainer');
    var wasAtBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 60;

    container.innerHTML = messages.map(function(m) {
        var isMine = m.sender_id === currentUserId;
        var time = formatTime(m.created_at);
        return '<div class="message-bubble ' + (isMine ? 'mine' : 'theirs') + '">'
            + (!isMine ? '<img src="' + (m.sender_avatar || 'assets/default-avatar.png') + '" class="msg-avatar" onerror="this.src=\'assets/default-avatar.png\'">' : '')
            + '<div class="bubble-content">'
            + '<p>' + escHtml(m.message_text) + '</p>'
            + '<span class="msg-time">' + time + (isMine ? (m.is_read ? ' ✓✓' : ' ✓') : '') + '</span>'
            + '</div></div>';
    }).join('');

    if (wasAtBottom) container.scrollTop = container.scrollHeight;
}

function sendMessage() {
    var input = document.getElementById('messageInput');
    var text = input.value.trim();
    if (!text || !currentReceiverId) return;
    input.value = '';

    var xhr = new XMLHttpRequest();
    xhr.open('POST', API + '/messages/send');
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.onload = function() {
        try {
            var d = JSON.parse(xhr.responseText);
            if (d.success) {
                loadMessages(d.conversation_id || currentConversationId);
                loadConversations();
            }
        } catch(e) {}
    };
    xhr.send(JSON.stringify({ sender_id: currentUserId, receiver_id: currentReceiverId, message_text: text }));
}

function markRead(conversationId) {
    var xhr = new XMLHttpRequest();
    xhr.open('PUT', API + '/messages/mark-read/' + conversationId + '/' + currentUserId);
    xhr.send();
}

function showNewMessageModal() {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', API + '/users/all/' + currentUserId);
    xhr.onload = function() {
        try {
            var d = JSON.parse(xhr.responseText);
            if (!d.success) return;
            var users = d.users;
            var existing = document.getElementById('newMsgModal');
            if (existing) existing.remove();

            var modal = document.createElement('div');
            modal.id = 'newMsgModal';
            modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;';
            modal.innerHTML = '<div style="background:#fff;border-radius:16px;padding:24px;width:380px;max-height:80vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,0.3);">'
                + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">'
                + '<h3 style="margin:0;font-size:18px;">New Message</h3>'
                + '<button onclick="document.getElementById(\'newMsgModal\').remove()" style="background:none;border:none;font-size:22px;cursor:pointer;color:#6b7280;">×</button>'
                + '</div>'
                + '<input type="text" id="userSearchInput" placeholder="Search users…" oninput="filterModalUsers(this.value)" style="width:100%;padding:10px 14px;border:1px solid #e5e7eb;border-radius:10px;font-size:14px;margin-bottom:12px;box-sizing:border-box;">'
                + '<div id="usersList">'
                + users.map(function(u) {
                    return '<div class="user-select-item" onclick="startNewChat(' + u.id + ',\'' + escJs(u.full_name) + '\',\'' + escJs(u.avatar_url || 'assets/default-avatar.png') + '\')" style="display:flex;align-items:center;gap:12px;padding:10px;border-radius:10px;cursor:pointer;transition:background .15s;" onmouseover="this.style.background=\'#f3f4f6\'" onmouseout="this.style.background=\'none\'">'
                        + '<img src="' + (u.avatar_url || 'assets/default-avatar.png') + '" style="width:38px;height:38px;border-radius:50%;object-fit:cover;" onerror="this.src=\'assets/default-avatar.png\'">'
                        + '<div><p style="margin:0;font-weight:600;font-size:14px;">' + u.full_name + '</p><p style="margin:0;font-size:12px;color:#9ca3af;">@' + (u.username || '') + '</p></div>'
                        + '</div>';
                }).join('')
                + '</div></div>';
            document.body.appendChild(modal);
            modal.addEventListener('click', function(e) { if (e.target === modal) modal.remove(); });
        } catch(e) {}
    };
    xhr.send();
}

function filterModalUsers(q) {
    var items = document.querySelectorAll('#usersList .user-select-item');
    items.forEach(function(item) {
        item.style.display = item.textContent.toLowerCase().includes(q.toLowerCase()) ? '' : 'none';
    });
}

function startNewChat(receiverId, receiverName, receiverAvatar) {
    var modal = document.getElementById('newMsgModal');
    if (modal) modal.remove();
    currentReceiverId = receiverId;

    var existing = allConversations.find(function(c) { return c.other_user_id === receiverId; });
    if (existing) {
        openConversation(existing.conversation_id, receiverId, receiverName, receiverAvatar);
        return;
    }

    document.getElementById('noConversation').style.display = 'none';
    document.getElementById('chatArea').style.display = 'flex';
    document.getElementById('chatUserName').textContent = receiverName;
    document.getElementById('chatUserAvatar').src = receiverAvatar;
    document.getElementById('chatUserStatus').textContent = 'online';
    document.getElementById('messagesContainer').innerHTML = '<div style="text-align:center;padding:40px;color:#9ca3af;font-size:14px;">Say hello! 👋</div>';
    currentConversationId = null;
    clearInterval(pollInterval);
}

function formatTime(dt) {
    var d = new Date(dt), now = new Date();
    var diff = now - d;
    if (diff < 60000) return 'now';
    if (diff < 3600000) return Math.floor(diff / 60000) + 'm';
    if (diff < 86400000) return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

function escHtml(s) { return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function escJs(s) { return (s || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'"); }
