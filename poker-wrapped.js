// poker-wrapped.js
// Spotify Wrapped-style feature for Poker Tracker

console.log('Loading Poker Wrapped...');

if (typeof app === 'undefined') {
  console.error('ERROR: App not found!');
} else {
  
  // Add Wrapped tab rendering function
  app.renderWrapped = function() {
    console.log('Rendering Wrapped...');
    
    var period = document.getElementById('wrappedPeriod')?.value || 'ytd';
    var selectedPlayer = document.getElementById('wrappedPlayer')?.value;
    
    console.log('Period:', period, 'Player:', selectedPlayer);
    
    // Get data based on period
    var nights, players;
    if (period === 'lifetime') {
      // Combine all years
      nights = this.data.nights.slice();
      Object.values(this.data.archivedYears || {}).forEach(function(year) {
        nights = nights.concat(year.nights || []);
      });
      players = this.data.players;
    } else {
      // YTD or specific year - just use current data
      nights = this.data.nights;
      players = this.data.players;
    }
    
    console.log('Using', nights.length, 'nights and', players.length, 'players');
    
    // Calculate stats for all players
    var allStats = players.map(function(player) {
      var playerNights = nights.filter(function(n) {
        return n.attendees.some(function(a) { return a.playerId === player.id; });
      }).sort(function(a, b) { return new Date(a.date) - new Date(b.date); });
      
      var games = playerNights.length;
      var totalWinnings = playerNights.reduce(function(sum, night) {
        var att = night.attendees.find(function(a) { return a.playerId === player.id; });
        return sum + (att ? att.winnings : 0);
      }, 0);
      
      var wins = playerNights.filter(function(n) {
        var att = n.attendees.find(function(a) { return a.playerId === player.id; });
        return att && att.winnings > 0;
      }).length;
      
      var winnings = playerNights.map(function(n) {
        var att = n.attendees.find(function(a) { return a.playerId === player.id; });
        return att ? att.winnings : 0;
      });
      
      var biggestWin = winnings.length > 0 ? Math.max.apply(Math, winnings) : 0;
      var biggestLoss = winnings.length > 0 ? Math.min.apply(Math, winnings) : 0;
      
      // Current streak
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
      
      // Find favorite opponent (most games with)
      var opponents = {};
      playerNights.forEach(function(n) {
        n.attendees.forEach(function(a) {
          if (a.playerId !== player.id) {
            opponents[a.playerId] = (opponents[a.playerId] || 0) + 1;
          }
        });
      });
      var favOpponentId = Object.keys(opponents).sort(function(a, b) { 
        return opponents[b] - opponents[a]; 
      })[0];
      var favOpponent = favOpponentId ? players.find(function(p) { return p.id == favOpponentId; }) : null;
      
      // Best month
      var monthlyWinnings = {};
      playerNights.forEach(function(n) {
        var month = n.date.substring(0, 7);
        if (!monthlyWinnings[month]) monthlyWinnings[month] = 0;
        var att = n.attendees.find(function(a) { return a.playerId === player.id; });
        monthlyWinnings[month] += att ? att.winnings : 0;
      });
      var bestMonth = Object.keys(monthlyWinnings).sort(function(a, b) {
        return monthlyWinnings[b] - monthlyWinnings[a];
      })[0];
      
      return {
        id: player.id,
        name: player.name,
        games: games,
        totalWinnings: totalWinnings,
        avgWinnings: games > 0 ? totalWinnings / games : 0,
        wins: wins,
        winRate: games > 0 ? (wins / games * 100) : 0,
        biggestWin: biggestWin,
        biggestLoss: biggestLoss,
        currentStreak: currentStreak,
        favOpponent: favOpponent ? favOpponent.name : 'N/A',
        bestMonth: bestMonth || 'N/A',
        bestMonthWinnings: bestMonth ? monthlyWinnings[bestMonth] : 0
      };
    }).filter(function(s) { return s.games > 0; });
    
    console.log('All stats calculated:', allStats);
    
    // Sort by total winnings for ranking
    allStats.sort(function(a, b) { return b.totalWinnings - a.totalWinnings; });
    
    // If specific player selected, show only them, otherwise show all
    var statsToShow = selectedPlayer ? allStats.filter(function(s) { return s.id == selectedPlayer; }) : allStats;
    
    var html = '';
    
    statsToShow.forEach(function(stats, index) {
      var rank = allStats.findIndex(function(s) { return s.id === stats.id; }) + 1;
      var currentYear = app.data.currentYear || new Date().getFullYear();
      
      // Get achievements - need to pass proper yearData structure
      var yearData = { players: players, nights: nights };
      var achievements = app.getAchievements ? app.getAchievements(stats, yearData) : [];
      
      // Create wrapped card
      html += '<div style="background: linear-gradient(135deg, #f39c12 0%, #e74c3c 100%); padding: 40px; border-radius: 16px; margin: 20px 0; box-shadow: 0 8px 20px rgba(0,0,0,0.4); color: white; text-align: center;">';
      
      html += '<h2 style="font-size: 2.5em; margin-bottom: 20px;">🎁 ' + stats.name + "'s Poker Wrapped</h2>";
      html += '<p style="font-size: 1.2em; opacity: 0.9; margin-bottom: 30px;">' + (period === 'lifetime' ? 'All Time' : period === 'ytd' ? currentYear + ' Year to Date' : period) + '</p>';
      
      // Stats grid
      html += '<div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin: 30px 0;">';
      
      // Games played
      html += '<div style="background: rgba(0,0,0,0.3); padding: 30px; border-radius: 12px;">';
      html += '<div style="font-size: 4em; font-weight: bold; margin-bottom: 10px;">' + stats.games + '</div>';
      html += '<div style="font-size: 1.2em; opacity: 0.9;">Games Played</div>';
      html += '</div>';
      
      // Total winnings
      html += '<div style="background: rgba(0,0,0,0.3); padding: 30px; border-radius: 12px;">';
      html += '<div style="font-size: 4em; font-weight: bold; margin-bottom: 10px;">$' + stats.totalWinnings.toFixed(0) + '</div>';
      html += '<div style="font-size: 1.2em; opacity: 0.9;">' + (stats.totalWinnings >= 0 ? 'Total Winnings' : 'Total Losses') + '</div>';
      html += '</div>';
      
      // Win rate
      html += '<div style="background: rgba(0,0,0,0.3); padding: 30px; border-radius: 12px;">';
      html += '<div style="font-size: 4em; font-weight: bold; margin-bottom: 10px;">' + stats.winRate.toFixed(0) + '%</div>';
      html += '<div style="font-size: 1.2em; opacity: 0.9;">Win Rate</div>';
      html += '</div>';
      
      // Ranking
      html += '<div style="background: rgba(0,0,0,0.3); padding: 30px; border-radius: 12px;">';
      html += '<div style="font-size: 4em; font-weight: bold; margin-bottom: 10px;">#' + rank + '</div>';
      html += '<div style="font-size: 1.2em; opacity: 0.9;">Ranking</div>';
      html += '</div>';
      
      html += '</div>';
      
      // Highlights section
      html += '<div style="background: rgba(0,0,0,0.3); padding: 30px; border-radius: 12px; margin: 20px 0; text-align: left;">';
      html += '<h3 style="font-size: 1.8em; margin-bottom: 20px; text-align: center;">✨ Highlights</h3>';
      
      html += '<div style="margin: 15px 0; font-size: 1.1em;">';
      html += '<strong>🎯 Biggest Win:</strong> $' + stats.biggestWin.toFixed(2);
      html += '</div>';
      
      html += '<div style="margin: 15px 0; font-size: 1.1em;">';
      html += '<strong>📉 Biggest Loss:</strong> $' + Math.abs(stats.biggestLoss).toFixed(2);
      html += '</div>';
      
      html += '<div style="margin: 15px 0; font-size: 1.1em;">';
      html += '<strong>🔥 Current Streak:</strong> ';
      if (stats.currentStreak > 0) {
        html += stats.currentStreak + ' win' + (stats.currentStreak > 1 ? 's' : '') + ' in a row! 🔥';
      } else if (stats.currentStreak < 0) {
        html += Math.abs(stats.currentStreak) + ' loss' + (Math.abs(stats.currentStreak) > 1 ? 'es' : '') + ' in a row';
      } else {
        html += 'No active streak';
      }
      html += '</div>';
      
      html += '<div style="margin: 15px 0; font-size: 1.1em;">';
      html += '<strong>🎮 Favorite Opponent:</strong> ' + stats.favOpponent;
      html += '</div>';
      
      html += '<div style="margin: 15px 0; font-size: 1.1em;">';
      html += '<strong>📅 Best Month:</strong> ' + stats.bestMonth;
      if (stats.bestMonth !== 'N/A') {
        html += ' ($' + stats.bestMonthWinnings.toFixed(2) + ')';
      }
      html += '</div>';
      
      html += '<div style="margin: 15px 0; font-size: 1.1em;">';
      html += '<strong>💰 Average per Game:</strong> $' + stats.avgWinnings.toFixed(2);
      html += '</div>';
      
      html += '</div>';
      
      // Achievements
      html += '<div style="background: rgba(0,0,0,0.3); padding: 30px; border-radius: 12px; margin: 20px 0;">';
      html += '<h3 style="font-size: 1.8em; margin-bottom: 20px;">🏆 Achievements Unlocked</h3>';
      html += '<div style="display: flex; flex-wrap: wrap; gap: 10px; justify-content: center;">';
      achievements.forEach(function(a) {
        html += '<span style="background: rgba(255,255,255,0.2); padding: 10px 20px; border-radius: 25px; font-size: 1.1em;">' + a + '</span>';
      });
      if (achievements.length === 0) {
        html += '<p style="opacity: 0.7;">No achievements yet. Keep playing!</p>';
      }
      html += '</div>';
      html += '</div>';
      
      // Fun fact
      var fortunes = [
        "A bold bluff in your future will change the game. 🔮",
        "The cards you fold today will lead to riches tomorrow. 🎴",
        "Your next big win comes when you least expect it. ✨",
        "Patience at the table brings fortune to the wise. 🧘",
        "The river card holds secrets; trust your instincts. 🌊",
        "Three of a kind approaches in your near future. 🎰",
        "Your poker face will be tested soon—stay strong. 😎",
        "A straight draw awaits; know when to chase it. 🎯",
        "Fortune favors the aggressive player this month. 💪",
        "Your nemesis will fall before year's end. ⚔️",
        "The full house you seek is closer than you think. 🏠",
        "Beware the trap of pocket aces—humility wins. 🃏",
        "Your lucky seat is on the dealer's left. 🪑",
        "A royal flush dances in your destiny. 👑",
        "The best hand is the one you don't play. 🎭",
        "Your chip stack grows with every folded ego. 📈",
        "Bad beats today become lessons for tomorrow. 📚",
        "The poker gods smile upon the patient. 😇",
        "Your greatest victory comes from a conservative play. 🛡️",
        "Trust the odds, but never ignore the reads. 🎲",
        "The turn card will favor you in three games' time. 🔄",
        "A small pot today prevents a big loss tomorrow. 🎯",
        "Your biggest opponent is your own tilt. 🧠",
        "The chips will flow back to the disciplined. 💎",
        "A flush draw beckons, but kings lie in wait. ⚠️",
        "Your fortune changes with the shuffle of cards. 🔀",
        "The next session brings redemption for past losses. 🌅",
        "Slow play will trap the aggressive this week. 🪤",
        "Your reads sharpen with each hand observed. 👁️",
        "The flop will favor suited connectors soon. 🎪",
        "A cooler approaches—accept it with grace. ❄️",
        "Your stack doubles when you trust your gut. 🎰",
        "The button position is your friend tonight. 🔘",
        "A stone-cold bluff will work in your favor soon. 🗿",
        "Your continuation bet will be called—plan accordingly. 📞",
        "The check-raise is a weapon; wield it wisely. ⚔️",
        "Your range advantage grows with study. 📖",
        "A hero call will define your next session. 🦸",
        "The donkey bet will confuse and conquer. 🫏",
        "Your implied odds are better than you think. 💭",
        "A rainbow flop favors the prepared mind. 🌈",
        "Your position speaks louder than your cards. 📍",
        "The min-raise hides strength in your future. 💪",
        "A limp will cost you dearly this month. 🚶",
        "Your all-in will be met with a fold soon. 🎊",
        "The nuts are not always what they seem. 🥜",
        "Your equity realizes itself through aggression. ⚡",
        "A set will crack your overpair—tread carefully. 💔",
        "Your bankroll management ensures longevity. 💰",
        "The bad run ends with discipline, not desperation. 🎯",
        "Your next session favors early position raises. 🌄",
        "A polarized range will serve you well tonight. ⚖️",
        "Your value bets are too thin—size up! 📏",
        "The semi-bluff is your path to profit. 🌓",
        "Your opponents fear your tight image. 🔒",
        "A loose table calls for patient value. 🎣",
        "Your blockers matter more than you realize. 🚫",
        "The ICM pressure will test your resolve. ⏰",
        "Your fold equity increases with table image. 🖼️",
        "A double barrel will take down the pot. 🎯",
        "Your check-back induces a bluff tomorrow. 🎭",
        "The iso-raise will isolate the fish perfectly. 🐟",
        "Your 3-bet range needs more balance. ⚖️",
        "A delayed c-bet will maximize value soon. ⏳",
        "Your river decision makes or breaks the night. 🌊",
        "The board texture favors your holdings tonight. 🎨",
        "Your pot control will save chips this week. 🛡️",
        "A float play will win you an unexpected pot. 🎈",
        "Your squeeze play is coming—timing is key. 🤏",
        "The overbet will get called; proceed with caution. ⚠️",
        "Your hand reading improves with every showdown. 🔍",
        "A block bet will save you from a tough decision. 🧱",
        "Your probe bet will gather valuable information. 🔬",
        "The donk bet will confuse your next opponent. 🎪",
        "Your bet sizing tells a story—make it compelling. 📖",
        "A merge range will balance your strategy. 🔀",
        "Your c-bet frequency is predictable—mix it up! 🎲",
        "The double-suited hand will hit harder than expected. 💥",
        "Your gap concept needs refinement. 📐",
        "A well-timed check will induce maximum value. ✅",
        "Your aggression factor is your secret weapon. 🗡️",
        "The suited ace will betray you—play cautiously. 🃏",
        "Your continuation range is too wide; tighten up! 🎯",
        "A runner-runner will save you when hope seems lost. 🏃",
        "Your fold to 3-bet is too high—defend more! 🛡️",
        "The pocket pair will set mine successfully tonight. ⛏️",
        "Your steal attempts increase with stack depth. 📊",
        "A polarizing river bet will get paid. 💸",
        "Your opponents can't put you on a hand—good! 🎭",
        "The suited connector will flop a monster soon. 🐉",
        "Your GTO knowledge is a shield, not a sword. 🛡️",
        "A leveling war approaches—stay one step ahead. 🧠",
        "Your table selection matters more than card luck. 🎯",
        "The rake will take its toll—play bigger pots! 💰",
        "Your showdown value is underrated tonight. 💎",
        "A crying call will be correct in your next session. 😢",
        "Your range construction determines long-term success. 🏗️",
        "The variance will even out—trust the process. 📈",
        "Your mental game is your greatest asset. 🧘‍♂️",
        "A cooler is coming; don't let it tilt you. 🧊",
        "Your note-taking will pay dividends soon. 📝",
        "The Friday night game will test your skills. 🌙",
        "Your bankroll grows through smart game selection. 🎮"
      ];
      
      var randomFortune = fortunes[Math.floor(Math.random() * fortunes.length)];
      
      html += '<div style="background: rgba(0,0,0,0.3); padding: 25px; border-radius: 12px; margin: 20px 0; font-size: 1.2em;">';
      html += '<strong>🎲 Fun Fact:</strong> ';
      if (stats.games > 10) {
        html += 'You\'ve spent approximately ' + (stats.games * 4) + ' hours at the poker table!';
      } else if (stats.totalWinnings > 100) {
        html += 'Your poker skills have earned you enough for ' + Math.floor(stats.totalWinnings / 15) + ' pizzas! 🍕';
      } else if (stats.winRate > 60) {
        html += 'You\'re on fire with a ' + stats.winRate.toFixed(0) + '% win rate!';
      } else {
        html += 'Every game is a chance to improve. Keep grinding! 💪';
      }
      // Fortune cookie (interactive)
      var fortuneId = 'fortune_' + stats.id + '_' + Math.random().toString(36).substr(2, 9);
      html += '<div id="' + fortuneId + '" style="background: rgba(0,0,0,0.4); padding: 40px; border-radius: 12px; margin: 20px 0; border: 2px dashed rgba(255,215,0,0.3); cursor: pointer; transition: all 0.3s;" onclick="openFortuneCookie(\'' + fortuneId + '\', \'' + randomFortune.replace(/'/g, "\\'") + '\')">';
      html += '<div style="text-align: center;">';
      html += '<div style="font-size: 5em; margin-bottom: 10px; transition: transform 0.3s;" class="cookie-icon">🥠</div>';
      html += '<p style="font-size: 1.2em; opacity: 0.8;">Click to open your fortune cookie</p>';
      html += '</div>';
      html += '</div>';
      
      html += '</div>';
    });
    
    if (statsToShow.length === 0) {
      html = '<div style="text-align: center; padding: 60px; color: #aaa;">';
      html += '<h3 style="font-size: 2em; margin-bottom: 20px;">📊 No Data Yet</h3>';
      html += '<p>Play some games to see your Poker Wrapped!</p>';
      html += '</div>';
    }
    
    document.getElementById('wrappedContent').innerHTML = html;
  };
  
  // Add share wrapped function
  app.shareWrapped = function() {
    // For now, just show an alert. In future, could generate image
    alert('Share feature coming soon! Take a screenshot to share your stats.');
  };
  
  // Fortune cookie opening animation
  window.openFortuneCookie = function(fortuneId, fortune) {
    var container = document.getElementById(fortuneId);
    if (!container) return;
    
    // Add crack animation
    container.style.cursor = 'default';
    container.onclick = null;
    
    var cookieIcon = container.querySelector('.cookie-icon');
    
    // Shake animation
    cookieIcon.style.animation = 'shake 0.5s ease';
    
    setTimeout(function() {
      // Break open animation
      cookieIcon.style.transform = 'scale(1.5) rotate(20deg)';
      cookieIcon.style.opacity = '0';
      
      setTimeout(function() {
        // Show fortune with grand reveal
        container.innerHTML = '<div style="animation: fortuneReveal 0.8s ease;">' +
          '<div style="text-align: center; font-size: 3em; margin-bottom: 20px;">✨</div>' +
          '<p style="font-size: 1.3em; font-style: italic; text-align: center; line-height: 1.8; color: #ffd700; text-shadow: 0 2px 10px rgba(255,215,0,0.3);">' + fortune + '</p>' +
          '<p style="text-align: center; font-size: 1em; opacity: 0.7; margin-top: 20px;">— Ancient Poker Wisdom</p>' +
          '<div style="text-align: center; font-size: 2em; margin-top: 20px; opacity: 0.3;">🎴 ♠️ ♥️ ♦️ ♣️ 🎴</div>' +
          '</div>';
        
        // Add CSS for animations if not already added
        if (!document.getElementById('fortuneAnimationStyles')) {
          var style = document.createElement('style');
          style.id = 'fortuneAnimationStyles';
          style.textContent = '@keyframes shake { 0%, 100% { transform: rotate(0deg); } 25% { transform: rotate(-10deg); } 75% { transform: rotate(10deg); } }' +
            '@keyframes fortuneReveal { 0% { opacity: 0; transform: scale(0.5) translateY(30px); } 100% { opacity: 1; transform: scale(1) translateY(0); } }';
          document.head.appendChild(style);
        }
      }, 500);
    }, 500);
  };
  
  console.log('✅ Poker Wrapped loaded successfully!');
}
