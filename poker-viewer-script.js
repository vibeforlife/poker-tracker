// poker-viewer-script.js - Clean version
var appData = null;
var charts = {};

function loadData() {
  fetch('https://api.github.com/repos/vibeforlife/poker-tracker/contents/poker-data.json?ref=main')
    .then(function(r) { return r.json(); })
    .then(function(file) {
      appData = JSON.parse(atob(file.content));
      document.getElementById('loadingState').style.display = 'none';
      document.getElementById('appContent').style.display = 'block';
      
      var sel = document.getElementById('wrappedPlayer');
      if (sel) {
        sel.innerHTML = '<option value="">All Players</option>';
        appData.players.forEach(function(p) {
          sel.innerHTML += '<option value="' + p.id + '">' + p.name + '</option>';
        });
      }
      
      renderNights();
      renderLeaderboard();
    })
    .catch(function() {
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
    html += '<div class="night-item" onclick="showNightDetail(' + n.id + ')"><h3>' + n.name + '</h3>';
    html += '<div style="font-size: 0.9em; color: #aaa; margin-top: 5px;">📅 ' + n.date;
    if (n.time) html += ' • 🕐 ' + n.time;
    if (n.location) html += '<br>📍 ' + n.location;
    html += '<br>👥 ' + n.attendees.length + ' attendees</div>';
    if (n.notes) html += '<div class="notes-display">📝 "' + n.notes + '"</div>';
    html += '</div>';
  });
  document.getElementById('nightsList').innerHTML = html || '<p style="color: #888;">No nights yet</p>';
}

function showNightDetail(nid) {
  var night = appData.nights.find(function(n) { return n.id === nid; });
  if (!night) return;
  document.getElementById('nightDetailName').textContent = night.name;
  var html = '<div style="background: #1a1a2e; padding: 15px; border-radius: 8px; margin-bottom: 15px;">';
  html += '<p><strong>📅 Date:</strong> ' + night.date + '</p>';
  if (night.time) html += '<p><strong>🕐 Time:</strong> ' + night.time + '</p>';
  if (night.location) html += '<p><strong>📍 Location:</strong> ' + night.location + '</p>';
  if (night.notes) html += '<p style="margin-top: 10px;"><strong>📝 Notes:</strong><br><em style="color: #aaa;">' + night.notes + '</em></p>';
  html += '</div>';
  if (night.expenses && (night.expenses.food > 0 || night.expenses.drinks > 0 || night.expenses.other > 0)) {
    var te = (night.expenses.food || 0) + (night.expenses.drinks || 0) + (night.expenses.other || 0);
    html += '<div style="background: #1a1a2e; padding: 15px; border-radius: 8px; margin-bottom: 15px; border-left: 3px solid #2ecc71;">';
    html += '<h3 style="color: #2ecc71;">💰 Expenses</h3><p><strong>Total:</strong> $' + te.toFixed(2) + '</p>';
    if (night.expenses.notes) html += '<p style="font-style: italic; color: #aaa;">' + night.expenses.notes + '</p>';
    html += '<p style="font-size: 0.9em; color: #aaa;">Food: $' + (night.expenses.food || 0) + ' • Drinks: $' + (night.expenses.drinks || 0) + ' • Other: $' + (night.expenses.other || 0) + '</p>';
    if (night.expenses.paidBy) {
      var pb = appData.players.find(function(p) { return p.id === night.expenses.paidBy; });
      if (pb) html += '<p style="font-size: 0.9em; margin-top: 5px;"><strong>Paid by:</strong> ' + pb.name + '</p>';
    }
    html += '</div>';
  }
  html += '<h3>Results</h3>';
  night.attendees.slice().sort(function(a, b) { return b.winnings - a.winnings; }).forEach(function(a, i) {
    var pl = appData.players.find(function(p) { return p.id === a.playerId; });
    if (!pl) return;
    var rk = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : (i + 1) + '.';
    html += '<div style="display: flex; justify-content: space-between; padding: 10px; background: #2a2a40; margin: 5px 0; border-radius: 6px;"><span>' + rk + ' ' + pl.name + '</span><span style="font-weight: bold; color: ' + (a.winnings >= 0 ? '#2ecc71' : '#e74c3c') + '">$' + a.winnings.toFixed(2) + '</span></div>';
  });
  html += '<h3 style="margin-top: 30px;">💸 Settlement</h3><div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; margin-top: 15px;">';
  var pt = [], et = [];
  var bal = night.attendees.map(function(a) { return { p: appData.players.find(function(p) { return p.id === a.playerId; }).name, b: a.winnings }; }).sort(function(a, b) { return a.b - b.b; });
  var deb = bal.filter(function(b) { return b.b < 0; }).map(function(b) { return { p: b.p, a: -b.b }; });
  var cre = bal.filter(function(b) { return b.b > 0; }).map(function(b) { return { p: b.p, a: b.b }; });
  deb.forEach(function(d) {
    var rem = d.a;
    cre.forEach(function(c) {
      if (rem > 0.01 && c.a > 0.01) {
        var am = Math.min(rem, c.a);
        pt.push({ f: d.p, t: c.p, a: am });
        rem -= am;
        c.a -= am;
      }
    });
  });
  if (night.expenses && night.expenses.paidBy && night.expenses.splitAmong && night.expenses.splitAmong.length > 0) {
    var tx = (night.expenses.food || 0) + (night.expenses.drinks || 0) + (night.expenses.other || 0);
    if (tx > 0) {
      var pp = tx / night.expenses.splitAmong.length;
      var pby = appData.players.find(function(p) { return p.id === night.expenses.paidBy; });
      night.expenses.splitAmong.forEach(function(pid) {
        if (pid !== night.expenses.paidBy) {
          var px = appData.players.find(function(p) { return p.id === pid; });
          if (px) et.push({ f: px.name, t: pby.name, a: pp });
        }
      });
    }
  }
  var all = pt.concat(et);
  var nb = {};
  all.forEach(function(t) {
    if (!nb[t.f]) nb[t.f] = 0;
    if (!nb[t.t]) nb[t.t] = 0;
    nb[t.f] -= t.a;
    nb[t.t] += t.a;
  });
  var fd = [], fc = [];
  Object.keys(nb).forEach(function(p) {
    var b = Math.round(nb[p] * 100) / 100;
    if (b < -0.01) fd.push({ p: p, a: -b });
    else if (b > 0.01) fc.push({ p: p, a: b });
  });
  fd.sort(function(a, b) { return b.a - a.a; });
  fc.sort(function(a, b) { return b.a - a.a; });
  var opt = [];
  var ix = 0, jx = 0;
  while (ix < fd.length && jx < fc.length) {
    var am = Math.min(fd[ix].a, fc[jx].a);
    if (am > 0.01) opt.push({ f: fd[ix].p, t: fc[jx].p, a: Math.round(am * 100) / 100 });
    fd[ix].a -= am;
    fc[jx].a -= am;
    if (fd[ix].a < 0.01) ix++;
    if (fc[jx].a < 0.01) jx++;
  }
  html += '<div style="background: #1a1a2e; padding: 12px; border-radius: 8px;"><h4 style="color: #f39c12; text-align: center; margin-bottom: 10px;">🃏 Poker</h4>';
  if (pt.length > 0) {
    pt.forEach(function(t) { html += '<p style="font-size: 0.9em; padding: 5px; background: #2a2a40; margin: 3px 0; border-radius: 4px;">' + t.f + ' → ' + t.t + '<br><strong style="color: #f39c12;">$' + t.a.toFixed(2) + '</strong></p>'; });
  } else {
    html += '<p style="color: #888; text-align: center; font-size: 0.9em;">Settled</p>';
  }
  html += '</div>';
  html += '<div style="background: #1a1a2e; padding: 12px; border-radius: 8px;"><h4 style="color: #2ecc71; text-align: center; margin-bottom: 10px;">💰 Expenses</h4>';
  if (et.length > 0) {
    et.forEach(function(t) { html += '<p style="font-size: 0.9em; padding: 5px; background: #2a2a40; margin: 3px 0; border-radius: 4px;">' + t.f + ' → ' + t.t + '<br><strong style="color: #2ecc71;">$' + t.a.toFixed(2) + '</strong></p>'; });
  } else {
    html += '<p style="color: #888; text-align: center; font-size: 0.9em;">None</p>';
  }
  html += '</div>';
  html += '<div style="background: #1a1a2e; padding: 12px; border-radius: 8px; border: 2px solid #9b59b6;"><h4 style="color: #9b59b6; text-align: center; margin-bottom: 10px;">📊 Optimized</h4>';
  html += '<p style="font-size: 0.8em; color: #aaa; text-align: center; margin-bottom: 8px;">' + opt.length + ' payment' + (opt.length !== 1 ? 's' : '') + '</p>';
  if (opt.length > 0) {
    opt.forEach(function(t) { html += '<p style="font-size: 0.9em; padding: 6px; background: #2a2a40; margin: 3px 0; border-radius: 4px; border-left: 2px solid #9b59b6;">' + t.f + ' → ' + t.t + '<br><strong style="color: #9b59b6;">$' + t.a.toFixed(2) + '</strong></p>'; });
  } else {
    html += '<p style="color: #888; text-align: center; font-size: 0.9em;">Settled</p>';
  }
  html += '</div></div>';
  document.getElementById('nightDetailContent').innerHTML = html;
  document.getElementById('nightDetailModal').classList.add('active');
}

function getPlayerStats(yd) {
  var d = yd || { players: appData.players, nights: appData.nights };
  return d.players.map(function(player) {
    var g = d.nights.filter(function(n) { return n.attendees.some(function(a) { return a.playerId === player.id; }); }).length;
    var tw = d.nights.reduce(function(sum, night) {
      var att = night.attendees.find(function(a) { return a.playerId === player.id; });
      return sum + (att ? att.winnings : 0);
    }, 0);
    return { id: player.id, name: player.name, games: g, totalWinnings: tw, avgWinnings: g > 0 ? tw / g : 0 };
  });
}

function getAchievements(stats) {
  var ach = [];
  var all = getPlayerStats();
  var max = Math.max.apply(Math, all.map(function(s) { return s.totalWinnings; }));
  if (stats.totalWinnings === max && max > 0) ach.push('🏆 Top Earner YTD');
  var pn = appData.nights.filter(function(n) { return n.attendees.some(function(a) { return a.playerId === stats.id; }); }).sort(function(a, b) { return new Date(a.date) - new Date(b.date); });
  var str = 0, mstr = 0;
  pn.forEach(function(n) {
    var att = n.attendees.find(function(a) { return a.playerId === stats.id; });
    if (att && att.winnings > 0) { str++; mstr = Math.max(mstr, str); } else str = 0;
  });
  if (mstr >= 3) ach.push('🔥 Hot Streak');
  var wins = pn.map(function(n) { var a = n.attendees.find(function(at) { return at.playerId === stats.id; }); return a ? a.winnings : -Infinity; });
  var mw = wins.length > 0 ? Math.max.apply(Math, wins) : 0;
  if (mw >= 100) ach.push('💎 High Roller');
  if (stats.games >= 5) ach.push('🎮 Regular Player');
  if (stats.games >= 20) ach.push('🌟 Veteran');
  if (stats.games >= 50) ach.push('💯 Half Century');
  if (stats.totalWinnings >= 100) ach.push('💵 $100 Club');
  if (stats.totalWinnings >= 500) ach.push('💎 $500 Club');
  return ach;
}

function showPlayerProfile(pid) {
  var p = appData.players.find(function(pl) { return pl.id === pid; });
  var s = getPlayerStats().find(function(st) { return st.id === pid; });
  var ach = getAchievements(s);
  document.getElementById('playerProfileName').textContent = p.name;
  var html = '<div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin: 20px 0;">';
  html += '<div style="background: #1a1a2e; padding: 15px; border-radius: 8px; text-align: center;"><div style="font-size: 2em; font-weight: bold; color: #f39c12;">' + s.games + '</div><div style="font-size: 0.9em; color: #aaa;">Games</div></div>';
  html += '<div style="background: #1a1a2e; padding: 15px; border-radius: 8px; text-align: center;"><div style="font-size: 2em; font-weight: bold; color: #f39c12;">$' + s.totalWinnings.toFixed(2) + '</div><div style="font-size: 0.9em; color: #aaa;">Total</div></div>';
  html += '<div style="background: #1a1a2e; padding: 15px; border-radius: 8px; text-align: center;"><div style="font-size: 2em; font-weight: bold; color: #f39c12;">$' + s.avgWinnings.toFixed(2) + '</div><div style="font-size: 0.9em; color: #aaa;">Avg</div></div>';
  html += '</div><h3>Achievements</h3><div style="margin: 15px 0;">' + ach.map(function(a) { return '<span class="achievement">' + a + '</span>'; }).join('');
  if (ach.length === 0) html += '<p style="color: #888;">No achievements yet</p>';
  html += '</div>';
  document.getElementById('playerProfileContent').innerHTML = html;
  document.getElementById('playerProfileModal').classList.add('active');
}

function renderLeaderboard() {
  var stats = getPlayerStats().sort(function(a, b) { return b.totalWinnings - a.totalWinnings; });
  var html = '';
  stats.forEach(function(s, i) {
    var ach = getAchievements(s);
    html += '<div class="item-card" onclick="showPlayerProfile(' + s.id + ')" style="cursor: pointer; display: flex; justify-content: space-between; align-items: center;"><div><strong style="font-size: 1.1em;">' + (i + 1) + '. ' + s.name + '</strong><div style="margin-top: 5px;">' + ach.map(function(a) { return '<span class="achievement">' + a + '</span>'; }).join('') + '</div></div><div style="text-align: right;"><div style="font-size: 1.5em; font-weight: bold; color: ' + (s.totalWinnings >= 0 ? '#2ecc71' : '#e74c3c') + '">$' + s.totalWinnings.toFixed(2) + '</div><div style="font-size: 0.9em; color: #aaa;">' + s.games + ' games • $' + s.avgWinnings.toFixed(2) + ' avg</div></div></div>';
  });
  document.getElementById('leaderboardList').innerHTML = html;
}

function renderCharts() {
  var stats = getPlayerStats().sort(function(a, b) { return b.totalWinnings - a.totalWinnings; });
  if (charts.total) charts.total.destroy();
  charts.total = new Chart(document.getElementById('totalWinningsChart'), {
    type: 'bar',
    data: { labels: stats.map(function(s) { return s.name; }), datasets: [{ data: stats.map(function(s) { return s.totalWinnings; }), backgroundColor: stats.map(function(s) { return s.totalWinnings >= 0 ? '#2ecc71' : '#e74c3c'; }) }]},
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
  });
  if (charts.games) charts.games.destroy();
  charts.games = new Chart(document.getElementById('gamesPlayedChart'), {
    type: 'bar',
    data: { labels: stats.map(function(s) { return s.name; }), datasets: [{ data: stats.map(function(s) { return s.games; }), backgroundColor: '#f39c12' }]},
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
  });
  if (charts.avg) charts.avg.destroy();
  charts.avg = new Chart(document.getElementById('avgWinningsChart'), {
    type: 'line',
    data: { labels: stats.map(function(s) { return s.name; }), datasets: [{ data: stats.map(function(s) { return s.avgWinnings; }), borderColor: '#9b59b6', tension: 0.4 }]},
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
  });
}

function renderBadges() {
  var defs = [
    { b: '🏆 Top Earner YTD', d: 'Highest total winnings this year', c: '#f39c12' },
    { b: '🔥 Hot Streak', d: 'Won 3 or more games in a row', c: '#e74c3c' },
    { b: '💎 High Roller', d: 'Single night win of $100 or more', c: '#3498db' },
    { b: '🎮 Regular Player', d: 'Played 5 or more games', c: '#9b59b6' },
    { b: '🌟 Veteran', d: 'Played 20 or more games', c: '#f39c12' },
    { b: '💯 Half Century', d: 'Played 50 or more games', c: '#2ecc71' },
    { b: '💵 $100 Club', d: 'Total winnings of $100 or more', c: '#27ae60' },
    { b: '💎 $500 Club', d: 'Total winnings of $500 or more', c: '#16a085' }
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
  defs.forEach(function(def) {
    var names = holders[def.b] || [];
    html += '<div class="badge-card" style="border-left-color: ' + def.c + ';"><div class="badge-header">' + def.b + '</div><div class="badge-desc">' + def.d + '</div><div class="badge-divider"></div><div style="font-size: 0.9em; color: #888; margin-bottom: 10px;">🏅 ' + names.length + ' player' + (names.length !== 1 ? 's' : '') + ' earned</div><div class="badge-players">' + (names.length > 0 ? names.map(function(n) { return '<span class="badge-player-tag">👤 ' + n + '</span>'; }).join('') : '<span style="color: #666; font-style: italic;">No one yet</span>') + '</div></div>';
  });
  document.getElementById('badgesList').innerHTML = html;
}

function renderLifetimeStats() {
  var lt = {};
  appData.players.forEach(function(p) { lt[p.id] = { name: p.name, games: 0, winnings: 0 }; });
  Object.values(appData.archivedYears || {}).forEach(function(year) {
    getPlayerStats(year).forEach(function(s) {
      if (lt[s.id]) { lt[s.id].games += s.games; lt[s.id].winnings += s.totalWinnings; }
    });
  });
  getPlayerStats().forEach(function(s) {
    if (lt[s.id]) { lt[s.id].games += s.games; lt[s.id].winnings += s.totalWinnings; }
  });
  var sorted = Object.values(lt).filter(function(s) { return s.games > 0; }).sort(function(a, b) { return b.winnings - a.winnings; });
  var html = '';
  sorted.forEach(function(s, i) {
    html += '<div class="item-card" style="display: flex; justify-content: space-between;"><div><strong style="font-size: 1.1em;">' + (i + 1) + '. ' + s.name + '</strong></div><div style="text-align: right;"><div style="font-size: 1.5em; font-weight: bold; color: ' + (s.winnings >= 0 ? '#2ecc71' : '#e74c3c') + '">$' + s.winnings.toFixed(2) + '</div><div style="font-size: 0.9em; color: #aaa;">' + s.games + ' games</div></div></div>';
  });
  document.getElementById('lifetimeLeaderboard').innerHTML = html;
  var years = Object.keys(appData.archivedYears || {}).concat([appData.currentYear.toString()]).sort(function(a, b) { return b - a; });
  var yhtml = '';
  years.forEach(function(year) {
    var yd = year == appData.currentYear ? { players: appData.players, nights: appData.nights } : appData.archivedYears[year];
    if (!yd || !yd.nights || yd.nights.length === 0) return;
    var ys = getPlayerStats(yd).sort(function(a, b) { return b.totalWinnings - a.totalWinnings; });
    var top = ys[0];
    yhtml += '<div class="item-card" style="display: flex; justify-content: space-between;"><div><strong>' + year + '</strong><div style="font-size: 0.9em; color: #aaa;">Games: ' + yd.nights.length + '</div></div>';
    if (top) yhtml += '<div style="text-align: right;"><div style="color: #f39c12;">' + top.name + '</div><div style="color: #2ecc71;">$' + top.totalWinnings.toFixed(2) + '</div></div>';
    yhtml += '</div>';
  });
  document.getElementById('yearByYearStats').innerHTML = yhtml;
}

function renderWrapped() {
  var per = document.getElementById('wrappedPeriod').value;
  var selp = document.getElementById('wrappedPlayer').value;
  var cy = appData.currentYear || new Date().getFullYear();
  var nts = per === 'lifetime' ? appData.nights.slice() : appData.nights;
  if (per === 'lifetime') {
    Object.values(appData.archivedYears || {}).forEach(function(y) { nts = nts.concat(y.nights || []); });
  }
  var allst = [];
  appData.players.forEach(function(player) {
    var pn = nts.filter(function(n) { return n.attendees.some(function(a) { return a.playerId === player.id; }); });
    if (pn.length === 0) return;
    var g = pn.length, tw = 0, w = 0, wns = [];
    pn.forEach(function(n) {
      var at = n.attendees.find(function(a) { return a.playerId === player.id; });
      if (at) { tw += at.winnings; wns.push(at.winnings); if (at.winnings > 0) w++; }
    });
    var bw = wns.length > 0 ? Math.max.apply(Math, wns) : 0;
    var bl = wns.length > 0 ? Math.min.apply(Math, wns) : 0;
    var cs = 0;
    for (var i = pn.length - 1; i >= 0; i--) {
      var wx = pn[i].attendees.find(function(a) { return a.playerId === player.id; }).winnings;
      if (cs === 0) cs = wx > 0 ? 1 : (wx < 0 ? -1 : 0);
      else if ((cs > 0 && wx > 0) || (cs < 0 && wx < 0)) cs += (wx > 0 ? 1 : -1);
      else break;
    }
    allst.push({ id: player.id, name: player.name, games: g, totalWinnings: tw, avgWinnings: tw / g, winRate: (w / g) * 100, biggestWin: bw, biggestLoss: bl, currentStreak: cs });
  });
  allst.sort(function(a, b) { return b.totalWinnings - a.totalWinnings; });
  var show = selp ? allst.filter(function(s) { return s.id == selp; }) : allst;
  var forts = ["A bold bluff in your future will change the game", "The cards you fold today will lead to riches tomorrow", "Your next big win comes when you least expect it", "Patience at the table brings fortune to the wise", "The river card holds secrets; trust your instincts"];
  var html = '';
  show.forEach(function(st) {
    var rk = allst.findIndex(function(s) { return s.id === st.id; }) + 1;
    var ach = getAchievements(st);
    var fort = forts[Math.floor(Math.random() * forts.length)];
    var fid = 'fc' + st.id;
    html += '<div style="background: linear-gradient(135deg, #f39c12, #e74c3c); padding: 40px; border-radius: 16px; margin: 20px 0; color: white; text-align: center;"><h2 style="font-size: 2.5em; margin-bottom: 20px;">🎁 ' + st.name + ' Poker Wrapped</h2><p style="font-size: 1.2em; margin-bottom: 30px;">' + (per === 'lifetime' ? 'All Time' : cy + ' YTD') + '</p>';
    html += '<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 30px 0;"><div style="background: rgba(0,0,0,0.3); padding: 30px; border-radius: 12px;"><div style="font-size: 4em; font-weight: bold;">' + st.games + '</div><div style="font-size: 1.2em;">Games</div></div><div style="background: rgba(0,0,0,0.3); padding: 30px; border-radius: 12px;"><div style="font-size: 4em; font-weight: bold;">$' + st.totalWinnings.toFixed(0) + '</div><div style="font-size: 1.2em;">Total</div></div><div style="background: rgba(0,0,0,0.3); padding: 30px; border-radius: 12px;"><div style="font-size: 4em; font-weight: bold;">' + st.winRate.toFixed(0) + '%</div><div style="font-size: 1.2em;">Win Rate</div></div><div style="background: rgba(0,0,0,0.3); padding: 30px; border-radius: 12px;"><div style="font-size: 4em; font-weight: bold;">#' + rk + '</div><div style="font-size: 1.2em;">Rank</div></div></div>';
    html += '<div style="background: rgba(0,0,0,0.3); padding: 20px; border-radius: 12px; text-align: left;"><h3 style="text-align: center; margin-bottom: 15px;">✨ Highlights</h3><p style="margin: 10px 0;">🎯 Biggest Win: $' + st.biggestWin.toFixed(2) + '</p><p style="margin: 10px 0;">📉 Biggest Loss: $' + Math.abs(st.biggestLoss).toFixed(2) + '</p><p style="margin: 10px 0;">🔥 Streak: ' + (st.currentStreak > 0 ? '+' : '') + st.currentStreak + '</p><p style="margin: 10px 0;">💰 Average: $' + st.avgWinnings.toFixed(2) + '</p></div>';
    html += '<div style="background: rgba(0,0,0,0.3); padding: 20px; border-radius: 12px; margin-top: 20px;"><h3 style="margin-bottom: 15px;">🏆 Achievements</h3>' + ach.map(function(a) { return '<span class="achievement">' + a + '</span>'; }).join('') + '</div>';
    html += '<div id="' + fid + '" class="fortune-cookie" data-fortune="' + fort + '" style="background: rgba(0,0,0,0.4); padding: 40px; border-radius: 12px; margin: 20px 0; border: 2px dashed rgba(255,215,0,0.3); cursor: pointer;"><div style="font-size: 5em; text-align: center;">🥠</div><p style="text-align: center; margin-top: 10px;">Click for your fortune</p></div></div>';
  });
  document.getElementById('wrappedContent').innerHTML = html || '<p style="text-align: center; color: #888;">No data yet</p>';
  document.querySelectorAll('.fortune-cookie').forEach(function(el) {
    el.addEventListener('click', function() { openCookie(el.id, el.dataset.fortune); });
  });
}

function openCookie(id, fort) {
  var c = document.getElementById(id);
  if (!c) return;
  c.style.animation = 'shake 0.5s';
  setTimeout(function() {
    c.innerHTML = '<div style="animation: reveal 0.8s;"><div style="font-size: 3em; text-align: center;">✨</div><p style="font-size: 1.3em; font-style: italic; text-align: center; color: gold; margin: 20px 0;">' + fort + '</p><p style="text-align: center; opacity: 0.7;">— Ancient Poker Wisdom</p></div>';
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
