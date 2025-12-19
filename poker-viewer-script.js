// poker-viewer-script.js
// All JavaScript for the viewer

var appData = null;
var charts = {};
var DATA_URL = 'https://api.github.com/repos/vibeforlife/poker-tracker/contents/poker-data.json?ref=main';

function loadData() {
  fetch(DATA_URL)
    .then(function(response) {
      if (!response.ok) throw new Error('Failed');
      return response.json();
    })
    .then(function(file) {
      appData = JSON.parse(atob(file.content));
      document.getElementById('loadingState').style.display = 'none';
      document.getElementById('appContent').style.display = 'block';
      
      var wrappedPlayerSelect = document.getElementById('wrappedPlayer');
      if (wrappedPlayerSelect) {
        wrappedPlayerSelect.innerHTML = '<option value="">All Players</option>';
        appData.players.forEach(function(p) {
          wrappedPlayerSelect.innerHTML += '<option value="' + p.id + '">' + p.name + '</option>';
        });
      }
      
      renderNights();
      renderLeaderboard();
    })
    .catch(function(error) {
      document.getElementById('loadingState').style.display = 'none';
      document.getElementById('errorState').style.display = 'block';
    });
}

function refreshData() {
  document.getElementById('loadingState').style.display = 'block';
  document.getElementById('appContent').style.display = 'none';
  loadData();
}

function switchTab(tab) {
  document.querySelectorAll('.tab').forEach(function(t) { t.classList.remove('active'); });
  document.querySelectorAll('.tab-content').forEach(function(c) { c.classList.remove('active'); });
  event.target.classList.add('active');
  document.getElementById(tab).classList.add('active');
  if (tab === 'charts') renderCharts();
  if (tab === 'badges') renderBadges();
  if (tab === 'lifetime') renderLifetimeStats();
  if (tab === 'wrapped') renderWrapped();
}

function renderNights() {
  var nights = appData.nights.slice().sort(function(a, b) { return new Date(b.date) - new Date(a.date); });
  var html = '';
  
  nights.forEach(function(n) {
    html += '<div class="night-item" onclick="showNightDetail(' + n.id + ')">';
    html += '<h3>' + n.name + '</h3>';
    html += '<div style="font-size: 0.9em; color: #aaa; margin-top: 5px;">';
    html += '📅 ' + n.date + (n.time ? ' • 🕐 ' + n.time : '');
    if (n.location) html += '<br>📍 ' + n.location;
    html += '<br>👥 ' + n.attendees.length + ' attendees';
    html += '</div>';
    if (n.notes) html += '<div class="notes-display">📝 "' + n.notes + '"</div>';
    html += '</div>';
  });
  
  document.getElementById('nightsList').innerHTML = html || '<p style="color: #888;">No nights yet</p>';
}

function showNightDetail(nightId) {
  var night = appData.nights.find(function(n) { return n.id === nightId; });
  if (!night) return;
  
  document.getElementById('nightDetailName').textContent = night.name;
  
  var html = '<div style="background: #1a1a2e; padding: 15px; border-radius: 8px; margin-bottom: 15px;">';
  html += '<p><strong>📅 Date:</strong> ' + night.date + '</p>';
  if (night.time) html += '<p><strong>🕐 Time:</strong> ' + night.time + '</p>';
  if (night.location) html += '<p><strong>📍 Location:</strong> ' + night.location + '</p>';
  if (night.notes) html += '<p style="margin-top: 10px;"><strong>📝 Notes:</strong><br><em style="color: #aaa;">' + night.notes + '</em></p>';
  html += '</div>';
  
  if (night.expenses && (night.expenses.food > 0 || night.expenses.drinks > 0 || night.expenses.other > 0)) {
    var totalExp = (night.expenses.food || 0) + (night.expenses.drinks || 0) + (night.expenses.other || 0);
    html += '<div style="background: #1a1a2e; padding: 15px; border-radius: 8px; margin-bottom: 15px; border-left: 3px solid #2ecc71;">';
    html += '<h3 style="color: #2ecc71;">💰 Expenses</h3>';
    html += '<p><strong>Total:</strong> $' + totalExp.toFixed(2) + '</p>';
    if (night.expenses.notes) html += '<p style="font-style: italic; color: #aaa;">' + night.expenses.notes + '</p>';
    html += '<p style="font-size: 0.9em; color: #aaa;">Food: $' + (night.expenses.food || 0) + ' • Drinks: $' + (night.expenses.drinks || 0) + ' • Other: $' + (night.expenses.other || 0) + '</p>';
    if (night.expenses.paidBy) {
      var paidBy = appData.players.find(function(p) { return p.id === night.expenses.paidBy; });
      if (paidBy) html += '<p style="font-size: 0.9em; margin-top: 5px;"><strong>Paid by:</strong> ' + paidBy.name + '</p>';
    }
    html += '</div>';
  }
  
  html += '<h3>Results</h3>';
  var sorted = night.attendees.slice().sort(function(a, b) { return b.winnings - a.winnings; });
  sorted.forEach(function(a, i) {
    var player = appData.players.find(function(p) { return p.id === a.playerId; });
    if (!player) return;
    var rank = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : (i + 1) + '.';
    html += '<div style="display: flex; justify-content: space-between; padding: 10px; background: #2a2a40; margin: 5px 0; border-radius: 6px;">';
    html += '<span>' + rank + ' ' + player.name + '</span>';
    html += '<span style="font-weight: bold; color: ' + (a.winnings >= 0 ? '#2ecc71' : '#e74c3c') + '">$' + a.winnings.toFixed(2) + '</span>';
    html += '</div>';
  });
  
  document.getElementById('nightDetailContent').innerHTML = html;
  document.getElementById('nightDetailModal').classList.add('active');
}

function getPlayerStats(yearData) {
  var data = yearData || { players: appData.players, nights: appData.nights };
  return data.players.map(function(player) {
    var games = data.nights.filter(function(n) {
      return n.attendees.some(function(a) { return a.playerId === player.id; });
    }).length;
    var totalWinnings = data.nights.reduce(function(sum, night) {
      var attendee = night.attendees.find(function(a) { return a.playerId === player.id; });
      return sum + (attendee ? attendee.winnings : 0);
    }, 0);
    var avgWinnings = games > 0 ? totalWinnings / games : 0;
    return { id: player.id, name: player.name, games: games, totalWinnings: totalWinnings, avgWinnings: avgWinnings };
  });
}

function getAchievements(stats) {
  var achievements = [];
  var allStats = getPlayerStats();
  var maxWinnings = Math.max.apply(Math, allStats.map(function(s) { return s.totalWinnings; }));
  if (stats.totalWinnings === maxWinnings && maxWinnings > 0) achievements.push('🏆 Top Earner YTD');
  
  var playerNights = appData.nights.filter(function(n) {
    return n.attendees.some(function(a) { return a.playerId === stats.id; });
  }).sort(function(a, b) { return new Date(a.date) - new Date(b.date); });
  
  var streak = 0, maxStreak = 0;
  playerNights.forEach(function(night) {
    var attendee = night.attendees.find(function(a) { return a.playerId === stats.id; });
    if (attendee && attendee.winnings > 0) { 
      streak++; 
      maxStreak = Math.max(maxStreak, streak); 
    } else {
      streak = 0;
    }
  });
  if (maxStreak >= 3) achievements.push('🔥 Hot Streak');
  
  var wins = playerNights.map(function(n) {
    var a = n.attendees.find(function(at) { return at.playerId === stats.id; });
    return a ? a.winnings : -Infinity;
  });
  var maxWin = wins.length > 0 ? Math.max.apply(Math, wins) : 0;
  if (maxWin >= 100) achievements.push('💎 High Roller');
  
  if (stats.games >= 5) achievements.push('🎮 Regular Player');
  if (stats.games >= 20) achievements.push('🌟 Veteran');
  if (stats.games >= 50) achievements.push('💯 Half Century');
  if (stats.totalWinnings >= 100) achievements.push('💵 $100 Club');
  if (stats.totalWinnings >= 500) achievements.push('💎 $500 Club');
  
  return achievements;
}

function showPlayerProfile(playerId) {
  var player = appData.players.find(function(p) { return p.id === playerId; });
  var stats = getPlayerStats().find(function(s) { return s.id === playerId; });
  var achievements = getAchievements(stats);
  
  document.getElementById('playerProfileName').textContent = player.name;
  
  var html = '<div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin: 20px 0;">';
  html += '<div style="background: #1a1a2e; padding: 15px; border-radius: 8px; text-align: center;"><div style="font-size: 2em; font-weight: bold; color: #f39c12;">' + stats.games + '</div><div style="font-size: 0.9em; color: #aaa;">Games</div></div>';
  html += '<div style="background: #1a1a2e; padding: 15px; border-radius: 8px; text-align: center;"><div style="font-size: 2em; font-weight: bold; color: #f39c12;">$' + stats.totalWinnings.toFixed(2) + '</div><div style="font-size: 0.9em; color: #aaa;">Total</div></div>';
  html += '<div style="background: #1a1a2e; padding: 15px; border-radius: 8px; text-align: center;"><div style="font-size: 2em; font-weight: bold; color: #f39c12;">$' + stats.avgWinnings.toFixed(2) + '</div><div style="font-size: 0.9em; color: #aaa;">Avg</div></div>';
  html += '</div><h3>Achievements</h3><div style="margin: 15px 0;">';
  html += achievements.map(function(a) { return '<span class="achievement">' + a + '</span>'; }).join('');
  if (achievements.length === 0) html += '<p style="color: #888;">No achievements yet</p>';
  html += '</div>';
  
  document.getElementById('playerProfileContent').innerHTML = html;
  document.getElementById('playerProfileModal').classList.add('active');
}

function renderLeaderboard() {
  var stats = getPlayerStats().sort(function(a, b) { return b.totalWinnings - a.totalWinnings; });
  var html = '';
  
  stats.forEach(function(s, i) {
    var achievements = getAchievements(s);
    html += '<div class="item-card" onclick="showPlayerProfile(' + s.id + ')" style="cursor: pointer; display: flex; justify-content: space-between; align-items: center;">';
    html += '<div><strong style="font-size: 1.1em;">' + (i + 1) + '. ' + s.name + '</strong><div style="margin-top: 5px;">';
    html += achievements.map(function(a) { return '<span class="achievement">' + a + '</span>'; }).join('');
    html += '</div></div><div style="text-align: right;">';
    html += '<div style="font-size: 1.5em; font-weight: bold; color: ' + (s.totalWinnings >= 0 ? '#2ecc71' : '#e74c3c') + '">$' + s.totalWinnings.toFixed(2) + '</div>';
    html += '<div style="font-size: 0.9em; color: #aaa;">' + s.games + ' games • $' + s.avgWinnings.toFixed(2) + ' avg</div>';
    html += '</div></div>';
  });
  
  document.getElementById('leaderboardList').innerHTML = html;
}

function renderCharts() {
  var stats = getPlayerStats().sort(function(a, b) { return b.totalWinnings - a.totalWinnings; });
  
  var ctx1 = document.getElementById('totalWinningsChart');
  if (charts.total) charts.total.destroy();
  charts.total = new Chart(ctx1, {
    type: 'bar',
    data: { labels: stats.map(function(s) { return s.name; }), datasets: [{ data: stats.map(function(s) { return s.totalWinnings; }), backgroundColor: stats.map(function(s) { return s.totalWinnings >= 0 ? '#2ecc71' : '#e74c3c'; }) }]},
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
  });
  
  var ctx2 = document.getElementById('gamesPlayedChart');
  if (charts.games) charts.games.destroy();
  charts.games = new Chart(ctx2, {
    type: 'bar',
    data: { labels: stats.map(function(s) { return s.name; }), datasets: [{ data: stats.map(function(s) { return s.games; }), backgroundColor: '#f39c12' }]},
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
  });
  
  var ctx3 = document.getElementById('avgWinningsChart');
  if (charts.avg) charts.avg.destroy();
  charts.avg = new Chart(ctx3, {
    type: 'line',
    data: { labels: stats.map(function(s) { return s.name; }), datasets: [{ data: stats.map(function(s) { return s.avgWinnings; }), borderColor: '#9b59b6', tension: 0.4 }]},
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
  });
}

function renderBadges() {
  var badgeDefs = [
    { badge: '🏆 Top Earner YTD', desc: 'Highest total winnings this year', color: '#f39c12' },
    { badge: '🔥 Hot Streak', desc: 'Won 3 or more games in a row', color: '#e74c3c' },
    { badge: '💎 High Roller', desc: 'Single night win of $100 or more', color: '#3498db' },
    { badge: '🎮 Regular Player', desc: 'Played 5 or more games', color: '#9b59b6' },
    { badge: '🌟 Veteran', desc: 'Played 20 or more games', color: '#f39c12' },
    { badge: '💯 Half Century', desc: 'Played 50 or more games', color: '#2ecc71' },
    { badge: '💵 $100 Club', desc: 'Total winnings of $100 or more', color: '#27ae60' },
    { badge: '💎 $500 Club', desc: 'Total winnings of $500 or more', color: '#16a085' }
  ];
  
  var stats = getPlayerStats();
  var holders = {};
  stats.forEach(function(s) {
    getAchievements(s).forEach(function(badge) {
      if (!holders[badge]) holders[badge] = [];
      holders[badge].push(s.name);
    });
  });
  
  var html = '';
  badgeDefs.forEach(function(def) {
    var names = holders[def.badge] || [];
    html += '<div class="badge-card" style="border-left-color: ' + def.color + ';">';
    html += '<div class="badge-header">' + def.badge + '</div>';
    html += '<div class="badge-desc">' + def.desc + '</div>';
    html += '<div class="badge-divider"></div>';
    html += '<div style="font-size: 0.9em; color: #888; margin-bottom: 10px;">🏅 ' + names.length + ' player' + (names.length !== 1 ? 's' : '') + ' earned</div>';
    html += '<div class="badge-players">';
    html += names.length > 0 ? names.map(function(n) { return '<span class="badge-player-tag">👤 ' + n + '</span>'; }).join('') : '<span style="color: #666; font-style: italic;">No one yet</span>';
    html += '</div></div>';
  });
  
  document.getElementById('badgesList').innerHTML = html;
}

function renderLifetimeStats() {
  var lifetime = {};
  appData.players.forEach(function(p) { lifetime[p.id] = { name: p.name, games: 0, winnings: 0 }; });
  
  Object.values(appData.archivedYears || {}).forEach(function(year) {
    getPlayerStats(year).forEach(function(s) {
      if (lifetime[s.id]) {
        lifetime[s.id].games += s.games;
        lifetime[s.id].winnings += s.totalWinnings;
      }
    });
  });
  
  getPlayerStats().forEach(function(s) {
    if (lifetime[s.id]) {
      lifetime[s.id].games += s.games;
      lifetime[s.id].winnings += s.totalWinnings;
    }
  });
  
  var sorted = Object.values(lifetime).filter(function(s) { return s.games > 0; }).sort(function(a, b) { return b.winnings - a.winnings; });
  var html = '';
  sorted.forEach(function(s, i) {
    html += '<div class="item-card" style="display: flex; justify-content: space-between;">';
    html += '<div><strong style="font-size: 1.1em;">' + (i + 1) + '. ' + s.name + '</strong></div>';
    html += '<div style="text-align: right;"><div style="font-size: 1.5em; font-weight: bold; color: ' + (s.winnings >= 0 ? '#2ecc71' : '#e74c3c') + '">$' + s.winnings.toFixed(2) + '</div>';
    html += '<div style="font-size: 0.9em; color: #aaa;">' + s.games + ' games</div></div></div>';
  });
  document.getElementById('lifetimeLeaderboard').innerHTML = html;
  
  var years = Object.keys(appData.archivedYears || {}).concat([appData.currentYear.toString()]).sort(function(a, b) { return b - a; });
  var yearHtml = '';
  years.forEach(function(year) {
    var yearData = year == appData.currentYear ? { players: appData.players, nights: appData.nights } : appData.archivedYears[year];
    if (!yearData || !yearData.nights || yearData.nights.length === 0) return;
    var yearStats = getPlayerStats(yearData).sort(function(a, b) { return b.totalWinnings - a.totalWinnings; });
    var topPlayer = yearStats[0];
    
    yearHtml += '<div class="item-card" style="display: flex; justify-content: space-between;">';
    yearHtml += '<div><strong>' + year + '</strong><div style="font-size: 0.9em; color: #aaa;">Games: ' + yearData.nights.length + '</div></div>';
    if (topPlayer) {
      yearHtml += '<div style="text-align: right;"><div style="color: #f39c12;">' + topPlayer.name + '</div><div style="color: #2ecc71;">$' + topPlayer.totalWinnings.toFixed(2) + '</div></div>';
    }
    yearHtml += '</div>';
  });
  document.getElementById('yearByYearStats').innerHTML = yearHtml;
}

function renderWrapped() {
  var period = document.getElementById('wrappedPeriod').value;
  var selectedPlayer = document.getElementById('wrappedPlayer').value;
  var currentYear = appData.currentYear || new Date().getFullYear();
  
  var nights = period === 'lifetime' ? appData.nights.slice() : appData.nights;
  if (period === 'lifetime') {
    Object.values(appData.archivedYears || {}).forEach(function(year) {
      nights = nights.concat(year.nights || []);
    });
  }
  
  var players = appData.players;
  var allStats = [];
  
  players.forEach(function(player) {
    var playerNights = nights.filter(function(n) {
      return n.attendees.some(function(a) { return a.playerId === player.id; });
    });
    
    if (playerNights.length === 0) return;
    
    var games = playerNights.length;
    var totalWinnings = 0;
    var wins = 0;
    var winnings = [];
    
    playerNights.forEach(function(n) {
      var att = n.attendees.find(function(a) { return a.playerId === player.id; });
      if (att) {
        totalWinnings += att.winnings;
        winnings.push(att.winnings);
        if (att.winnings > 0) wins++;
      }
    });
    
    var biggestWin = winnings.length > 0 ? Math.max.apply(Math, winnings) : 0;
    var biggestLoss = winnings.length > 0 ? Math.min.apply(Math, winnings) : 0;
    var currentStreak = 0;
    
    for (var i = playerNights.length - 1; i >= 0; i--) {
      var w = playerNights[i].attendees.find(function(a) { return a.playerId === player.id; }).winnings;
      if (currentStreak === 0) {
        currentStreak = w > 0 ? 1 : (w < 0 ? -1 : 0);
      } else if ((currentStreak > 0 && w > 0) || (currentStreak < 0 && w < 0)) {
        currentStreak += (w > 0 ? 1 : -1);
      } else {
        break;
      }
    }
    
    allStats.push({
      id: player.id,
      name: player.name,
      games: games,
      totalWinnings: totalWinnings,
      avgWinnings: totalWinnings / games,
      winRate: (wins / games) * 100,
      biggestWin: biggestWin,
      biggestLoss: biggestLoss,
      currentStreak: currentStreak
    });
  });
  
  allStats.sort(function(a, b) { return b.totalWinnings - a.totalWinnings; });
  var statsToShow = selectedPlayer ? allStats.filter(function(s) { return s.id == selectedPlayer; }) : allStats;
  
  var fortunes = ["A bold bluff in your future will change the game. 🔮", "The cards you fold today will lead to riches tomorrow. 🎴", "Your next big win comes when you least expect it. ✨", "Patience at the table brings fortune to the wise. 🧘", "The river card holds secrets; trust your instincts. 🌊"];
  
  var html = '';
  statsToShow.forEach(function(stats) {
    var rank = allStats.findIndex(function(s) { return s.id === stats.id; }) + 1;
    var achievements = getAchievements(stats);
    var fortune = fortunes[Math.floor(Math.random() * fortunes.length)];
    var fid = 'f' + stats.id;
    
    html += '<div style="background: linear-gradient(135deg, #f39c12, #e74c3c); padding: 40px; border-radius: 16px; margin: 20px 0; color: white; text-align: center;">';
    html += '<h2 style="font-size: 2.5em; margin-bottom: 20px;">🎁 ' + stats.name + "'s Poker Wrapped</h2>";
    html += '<p style="font-size: 1.2em; margin-bottom: 30px;">' + (period === 'lifetime' ? 'All Time' : currentYear + ' YTD') + '</p>';
    html += '<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 30px 0;">';
    html += '<div style="background: rgba(0,0,0,0.3); padding: 30px; border-radius: 12px;"><div style="font-size: 4em; font-weight: bold;">' + stats.games + '</div><div style="font-size: 1.2em;">Games</div></div>';
    html += '<div style="background: rgba(0,0,0,0.3); padding: 30px; border-radius: 12px;"><div style="font-size: 4em; font-weight: bold;">$' + stats.totalWinnings.toFixed(0) + '</div><div style="font-size: 1.2em;">Total</div></div>';
    html += '<div style="background: rgba(0,0,0,0.3); padding: 30px; border-radius: 12px;"><div style="font-size: 4em; font-weight: bold;">' + stats.winRate.toFixed(0) + '%</div><div style="font-size: 1.2em;">Win Rate</div></div>';
    html += '<div style="background: rgba(0,0,0,0.3); padding: 30px; border-radius: 12px;"><div style="font-size: 4em; font-weight: bold;">#' + rank + '</div><div style="font-size: 1.2em;">Rank</div></div>';
    html += '</div>';
    html += '<div style="background: rgba(0,0,0,0.3); padding: 20px; border-radius: 12px; text-align: left;">';
    html += '<h3 style="text-align: center; margin-bottom: 15px;">✨ Highlights</h3>';
    html += '<p style="margin: 10px 0;">🎯 Biggest Win: $' + stats.biggestWin.toFixed(2) + '</p>';
    html += '<p style="margin: 10px 0;">📉 Biggest Loss: $' + Math.abs(stats.biggestLoss).toFixed(2) + '</p>';
    html += '<p style="margin: 10px 0;">🔥 Streak: ' + (stats.currentStreak > 0 ? '+' : '') + stats.currentStreak + '</p>';
    html += '<p style="margin: 10px 0;">💰 Average: $' + stats.avgWinnings.toFixed(2) + '</p>';
    html += '</div>';
    html += '<div style="background: rgba(0,0,0,0.3); padding: 20px; border-radius: 12px; margin-top: 20px;">';
    html += '<h3 style="margin-bottom: 15px;">🏆 Achievements</h3>';
    html += achievements.map(function(a) { return '<span class="achievement">' + a + '</span>'; }).join('');
    html += '</div>';
    html += '<div id="' + fid + '" style="background: rgba(0,0,0,0.4); padding: 40px; border-radius: 12px; margin: 20px 0; border: 2px dashed rgba(255,215,0,0.3); cursor: pointer;" onclick="openCookie(\'' + fid + '\', \'' + fortune.replace(/'/g, "\\'") + '\')">';
    html += '<div style="font-size: 5em; text-align: center;">🥠</div><p style="text-align: center; margin-top: 10px;">Click for your fortune</p></div></div>';
  });
  
  document.getElementById('wrappedContent').innerHTML = html || '<p style="text-align: center; color: #888;">No data yet</p>';
}

function openCookie(id, fortune) {
  var c = document.getElementById(id);
  if (!c) return;
  c.onclick = null;
  c.style.animation = 'shake 0.5s';
  setTimeout(function() {
    c.innerHTML = '<div style="animation: reveal 0.8s;"><div style="font-size: 3em; text-align: center;">✨</div><p style="font-size: 1.3em; font-style: italic; text-align: center; color: #ffd700; margin: 20px 0;">' + fortune + '</p><p style="text-align: center; opacity: 0.7;">— Ancient Poker Wisdom</p></div>';
    if (!document.getElementById('anim')) {
      var s = document.createElement('style');
      s.id = 'anim';
      s.textContent = '@keyframes shake{0%,100%{transform:rotate(0)}25%{transform:rotate(-10deg)}75%{transform:rotate(10deg)}}@keyframes reveal{0%{opacity:0;transform:scale(0.5) translateY(30px)}100%{opacity:1;transform:scale(1) translateY(0)}}';
      document.head.appendChild(s);
    }
  }, 500);
}

function closeModal(id) {
  document.getElementById(id).classList.remove('active');
}

function showHandRankings() {
  document.getElementById('handRankingsModal').classList.add('active');
}

loadData();
