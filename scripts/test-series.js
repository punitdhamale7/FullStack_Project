const API_BASE = (window.LEARNAI_API_URL || '/api').replace(/\/$/, '');

let currentUser = null;
let currentTestId = null;
let currentTestData = null;
let userAnswers = {};
let timerInterval = null;
let testStartTime = null;
let _resultData = null;

document.addEventListener('DOMContentLoaded', () => {
    const session = JSON.parse(localStorage.getItem('session'));
    if (!session || !session.loggedIn || !session.user) {
        window.location.replace('login.html');
        return;
    }
    currentUser = session.user;
    if (window.lucide) lucide.createIcons();
    loadTestList();
});

function loadTestList() {
    showView('mainView');
    var xhr = new XMLHttpRequest();
    xhr.open('GET', API_BASE + '/test-series/list');
    xhr.onload = function() {
        try {
            var d = JSON.parse(xhr.responseText);
            if (!d.success) {
                document.getElementById('testSeriesCards').innerHTML = '<p style="color:#ef4444;text-align:center;padding:40px;">Error loading tests.</p>';
                return;
            }
            renderTestCards(d.tests);
        } catch(e) {
            document.getElementById('testSeriesCards').innerHTML = '<p style="color:#ef4444;text-align:center;padding:40px;">Error loading tests.</p>';
        }
    };
    xhr.onerror = function() {
        document.getElementById('testSeriesCards').innerHTML = '<p style="color:#ef4444;text-align:center;padding:40px;">Could not connect to server.</p>';
    };
    xhr.send();
}

function renderTestCards(tests) {
    const container = document.getElementById('testSeriesCards');
    const banner = document.getElementById('notificationBanner');
    const now = new Date();

    const upcoming = tests.filter(t => new Date(t.start_datetime) > now);
    if (upcoming.length) {
        const next = upcoming[0];
        banner.style.display = 'flex';
        banner.innerHTML = '<i data-lucide="bell" style="width:18px;height:18px;flex-shrink:0;"></i> &nbsp;Upcoming: <strong style="margin:0 6px;">' + next.title + '</strong> starts on ' + formatTsDate(next.start_datetime);
        if (window.lucide) lucide.createIcons();
    } else {
        banner.style.display = 'none';
    }

    if (!tests.length) {
        container.innerHTML = '<div class="ts-empty-state"><i data-lucide="clipboard-list" style="width:56px;height:56px;color:#d1d5db;"></i><h3>No tests available</h3><p>Check back later for upcoming test series.</p></div>';
        if (window.lucide) lucide.createIcons();
        return;
    }

    var html = '';
    tests.forEach(function(t) {
        const start = new Date(t.start_datetime);
        const end = new Date(start.getTime() + t.duration_minutes * 60000);
        var statusHtml = '', actionHtml = '';

        if (now < start) {
            const diff = start - now;
            statusHtml = '<span class="ts-badge ts-badge-upcoming">Upcoming</span>';
            actionHtml = '<div class="ts-countdown" data-target="' + start.toISOString() + '" id="cd-' + t.id + '">Starts in ' + formatCountdown(diff) + '</div>'
                       + '<button class="btn-primary ts-action-btn" disabled>Not Started Yet</button>';
        } else if (now >= start && now <= end) {
            statusHtml = '<span class="ts-badge ts-badge-live">🔴 Live Now</span>';
            actionHtml = '<div class="ts-time-left">Ends in <span class="ts-countdown-live" data-end="' + end.toISOString() + '" id="live-' + t.id + '">' + formatCountdown(end - now) + '</span></div>'
                       + '<button class="btn-primary ts-action-btn ts-btn-live" onclick="startTest(' + t.id + ')">Start Test →</button>';
        } else {
            statusHtml = '<span class="ts-badge ts-badge-ended">Ended</span>';
            actionHtml = '<button class="btn-secondary ts-action-btn" onclick="viewLeaderboardOnly(' + t.id + ', \'' + escJs(t.title) + '\')">🏆 View Leaderboard</button>';
        }

        html += '<div class="ts-card">'
            + '<div class="ts-card-header">'
            + '<div class="ts-card-icon"><i data-lucide="clipboard-list"></i></div>'
            + '<div style="flex:1"><h3 class="ts-card-title">' + t.title + '</h3>' + statusHtml + '</div>'
            + '</div>'
            + '<p class="ts-card-desc">' + (t.description || '') + '</p>'
            + '<div class="ts-card-meta">'
            + '<span><i data-lucide="calendar" class="icon-inline"></i> ' + formatTsDate(t.start_datetime) + '</span>'
            + '<span><i data-lucide="clock" class="icon-inline"></i> ' + t.duration_minutes + ' min</span>'
            + '<span><i data-lucide="help-circle" class="icon-inline"></i> ' + t.total_questions + ' questions</span>'
            + '</div>'
            + '<div class="ts-card-footer">' + actionHtml + '</div>'
            + '</div>';
    });

    container.innerHTML = html;
    if (window.lucide) lucide.createIcons();
    startCountdownTimers();
}

function startCountdownTimers() {
    clearInterval(window._cdInterval);
    window._cdInterval = setInterval(function() {
        const now = new Date();
        document.querySelectorAll('.ts-countdown').forEach(function(el) {
            const target = new Date(el.dataset.target);
            const diff = target - now;
            if (diff <= 0) { loadTestList(); clearInterval(window._cdInterval); return; }
            el.textContent = 'Starts in ' + formatCountdown(diff);
        });
        document.querySelectorAll('.ts-countdown-live').forEach(function(el) {
            const end = new Date(el.dataset.end);
            const diff = end - now;
            if (diff <= 0) { loadTestList(); clearInterval(window._cdInterval); return; }
            el.textContent = formatCountdown(diff);
        });
    }, 1000);
}

function formatCountdown(ms) {
    if (ms <= 0) return '0s';
    const h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000), s = Math.floor((ms % 60000) / 1000);
    if (h > 0) return h + 'h ' + m + 'm';
    if (m > 0) return m + 'm ' + s + 's';
    return s + 's';
}

function formatTsDate(dt) {
    return new Date(dt).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function escJs(s) { return (s || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'"); }

function startTest(testId) {
    currentTestId = testId;
    userAnswers = {};
    var xhr = new XMLHttpRequest();
    xhr.open('GET', API_BASE + '/test-series/' + testId + '/questions');
    xhr.setRequestHeader('user-id', currentUser.id);
    xhr.onload = function() {
        try {
            var d = JSON.parse(xhr.responseText);
            if (!d.success) { alert(d.message || 'Cannot start test'); return; }
            currentTestData = d;
            renderTestView(d);
        } catch(e) { alert('Error loading questions'); }
    };
    xhr.send();
}

function renderTestView(data) {
    showView('testView');
    document.getElementById('testViewTitle').textContent = data.test ? data.test.title || '' : '';
    document.getElementById('testViewMeta').textContent = data.questions.length + ' questions · ' + (data.test ? data.test.duration_minutes : 0) + ' minutes';

    var html = '';
    data.questions.forEach(function(q, i) {
        html += '<div class="ts-question-card" id="qcard-' + q.id + '">'
            + '<div class="ts-q-num">Q' + (i + 1) + ' <span class="ts-q-total">of ' + data.questions.length + '</span></div>'
            + '<p class="ts-q-text">' + q.question_text + '</p>'
            + '<div class="ts-options">';
        ['A', 'B', 'C', 'D'].forEach(function(opt) {
            const val = q['option_' + opt.toLowerCase()];
            if (!val) return;
            html += '<label class="ts-option-label" id="opt-' + q.id + '-' + opt + '">'
                + '<input type="radio" name="q' + q.id + '" value="' + opt + '" onchange="selectAnswer(' + q.id + ',\'' + opt + '\')">'
                + '<span class="ts-option-key">' + opt + '</span>'
                + '<span class="ts-option-text">' + val + '</span>'
                + '</label>';
        });
        html += '</div></div>';
    });
    document.getElementById('testQuestionsContainer').innerHTML = html;
    if (window.lucide) lucide.createIcons();

    const end = new Date(new Date(data.test.start_datetime).getTime() + data.test.duration_minutes * 60000);
    testStartTime = Date.now();
    startTestTimer(end);
}

function selectAnswer(qId, opt) {
    userAnswers[qId] = opt;
    document.querySelectorAll('[id^="opt-' + qId + '-"]').forEach(function(el) { el.classList.remove('selected'); });
    const sel = document.getElementById('opt-' + qId + '-' + opt);
    if (sel) sel.classList.add('selected');
}

function startTestTimer(endTime) {
    clearInterval(timerInterval);
    timerInterval = setInterval(function() {
        const remaining = endTime - Date.now();
        if (remaining <= 0) { clearInterval(timerInterval); submitTest(true); return; }
        const m = Math.floor(remaining / 60000), s = Math.floor((remaining % 60000) / 1000);
        document.getElementById('timerDisplay').textContent = String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
        const timerBox = document.getElementById('timerBox');
        if (remaining < 60000) timerBox.classList.add('ts-timer-urgent');
        else timerBox.classList.remove('ts-timer-urgent');
    }, 500);
}

function submitTest(auto) {
    if (!auto && !confirm('Submit test? You cannot change answers after submission.')) return;
    clearInterval(timerInterval);
    const timeTaken = Math.floor((Date.now() - testStartTime) / 1000);
    var xhr = new XMLHttpRequest();
    xhr.open('POST', API_BASE + '/test-series/' + currentTestId + '/submit');
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.onload = function() {
        try {
            var d = JSON.parse(xhr.responseText);
            if (!d.success) { alert(d.message || 'Error submitting'); return; }
            showResultView(d.score, d.total, timeTaken);
        } catch(e) { alert('Error submitting test'); }
    };
    xhr.send(JSON.stringify({ user_id: currentUser.id, answers: userAnswers, time_taken_seconds: timeTaken }));
}

function showResultView(score, total, timeTaken) {
    showView('resultView');
    const pct = total > 0 ? Math.round(score / total * 100) : 0;
    const icon = pct >= 80 ? '🏆' : pct >= 60 ? '🎉' : pct >= 40 ? '👍' : '📚';
    const msg = pct >= 80 ? 'Excellent work!' : pct >= 60 ? 'Good job!' : pct >= 40 ? 'Keep practicing!' : 'Better luck next time!';
    document.getElementById('resultIcon').textContent = icon;
    document.getElementById('resultTitle').textContent = msg;
    document.getElementById('resultScore').innerHTML = '<span class="ts-score-num">' + score + '</span><span class="ts-score-sep">/</span><span class="ts-score-total">' + total + '</span><span class="ts-score-pct">' + pct + '%</span>';
    document.getElementById('resultMessage').textContent = 'Time taken: ' + formatTimeTaken(timeTaken);
    document.getElementById('reviewSection').style.display = 'none';
}

function showReview() {
    const reviewEl = document.getElementById('reviewSection');
    if (reviewEl.style.display !== 'none') { reviewEl.style.display = 'none'; return; }
    var xhr = new XMLHttpRequest();
    xhr.open('GET', API_BASE + '/test-series/' + currentTestId + '/result/' + currentUser.id);
    xhr.onload = function() {
        try {
            var d = JSON.parse(xhr.responseText);
            if (!d.success) { alert(d.message); return; }
            _resultData = d;
            reviewEl.style.display = 'block';
            var html = '<h3 style="margin-bottom:16px;font-size:18px;">Answer Review</h3>';
            d.questions.forEach(function(q, i) {
                html += '<div class="ts-review-card ' + (q.is_correct ? 'ts-review-correct' : 'ts-review-wrong') + '">'
                    + '<div class="ts-review-q-header"><span class="ts-review-num">Q' + (i + 1) + '</span>'
                    + '<span class="ts-review-status">' + (q.is_correct ? '✓ Correct' : '✗ Wrong') + '</span></div>'
                    + '<p class="ts-review-q-text">' + q.question_text + '</p>'
                    + '<div class="ts-review-options">';
                ['A', 'B', 'C', 'D'].forEach(function(opt) {
                    var val = q['option_' + opt.toLowerCase()];
                    if (!val) return;
                    var cls = 'ts-review-opt';
                    if (opt === q.correct_answer) cls += ' ts-review-opt-correct';
                    if (opt === q.selected_answer && !q.is_correct) cls += ' ts-review-opt-wrong';
                    html += '<div class="' + cls + '"><span class="ts-opt-key">' + opt + '</span> ' + val + '</div>';
                });
                html += '</div>';
                if (q.explanation) html += '<div class="ts-review-explanation">' + q.explanation + '</div>';
                html += '</div>';
            });
            reviewEl.innerHTML = html;
            reviewEl.scrollIntoView({ behavior: 'smooth' });
        } catch(e) { alert('Error loading review'); }
    };
    xhr.send();
}

function showLeaderboard(testId) {
    currentTestId = testId;
    var xhr = new XMLHttpRequest();
    xhr.open('GET', API_BASE + '/test-series/' + testId + '/leaderboard');
    xhr.onload = function() {
        try {
            var d = JSON.parse(xhr.responseText);
            showView('leaderboardView');
            document.getElementById('lbTitle').textContent = '🏆 Leaderboard';
            renderLeaderboard(d.leaderboard || []);
        } catch(e) {}
    };
    xhr.send();
}

function viewLeaderboardOnly(testId, title) {
    currentTestId = testId;
    var xhr = new XMLHttpRequest();
    xhr.open('GET', API_BASE + '/test-series/' + testId + '/leaderboard');
    xhr.onload = function() {
        try {
            var d = JSON.parse(xhr.responseText);
            showView('leaderboardView');
            document.getElementById('lbTitle').textContent = '🏆 ' + title;
            renderLeaderboard(d.leaderboard || []);
        } catch(e) {}
    };
    xhr.send();
}

function renderLeaderboard(lb) {
    const el = document.getElementById('leaderboardContent');
    if (!lb.length) { el.innerHTML = '<p style="color:#9ca3af;text-align:center;padding:40px;">No submissions yet.</p>'; return; }
    const myName = currentUser.fullName || currentUser.full_name || '';
    const myRank = lb.find(function(r) { return r.full_name === myName; });
    var html = myRank
        ? '<div class="ts-my-rank">Your rank: <strong>#' + myRank.rank_pos + '</strong> — ' + myRank.score + '/' + myRank.total_questions + ' (' + Math.round(myRank.score / myRank.total_questions * 100) + '%)</div>'
        : '';
    html += '<div class="ts-lb-list">';
    lb.forEach(function(r) {
        const isMine = r.full_name === myName;
        const medal = r.rank_pos <= 3 ? ['🥇', '🥈', '🥉'][r.rank_pos - 1] : '#' + r.rank_pos;
        html += '<div class="ts-lb-row' + (isMine ? ' ts-lb-mine' : '') + '">'
            + '<div class="ts-lb-rank">' + medal + '</div>'
            + '<img src="' + (r.avatar_url || 'assets/default-avatar.png') + '" class="ts-lb-avatar">'
            + '<div class="ts-lb-info"><span class="ts-lb-name">' + r.full_name + '</span><span class="ts-lb-time">' + formatTimeTaken(r.time_taken_seconds) + '</span></div>'
            + '<div class="ts-lb-score">' + r.score + '/' + r.total_questions + ' <span class="ts-lb-pct">' + Math.round(r.score / r.total_questions * 100) + '%</span></div>'
            + '</div>';
    });
    html += '</div>';
    el.innerHTML = html;
}

function backFromLeaderboard() {
    if (document.getElementById('resultView').style.display !== 'none') showView('resultView');
    else backToList();
}

function backToList() { clearInterval(timerInterval); loadTestList(); }

function showView(id) {
    ['mainView', 'testView', 'resultView', 'leaderboardView'].forEach(function(v) {
        document.getElementById(v).style.display = v === id ? '' : 'none';
    });
}

function formatTimeTaken(secs) {
    if (!secs) return '—';
    const m = Math.floor(secs / 60), s = secs % 60;
    return m > 0 ? m + 'm ' + s + 's' : s + 's';
}
