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
    } else if (period === 'ytd') {
      // Year to date (current year only)
      nights = this.data.nights;
      players = this.data.players;
    } else {
      // Specific archived year
      var yearData = this.data.archivedYears[period];
      nights = yearData ? yearData.nights : [];
      players = yearData ? yearData.players : this.data.players;
    }
    
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
    
    // Sort by total winnings for ranking
    allStats.sort(function(a, b) { return b.totalWinnings - a.totalWinnings; });
    
    // If specific player selected, show only them, otherwise show all
    var statsToShow = selectedPlayer ? allStats.filter(function(s) { return s.id == selectedPlayer; }) : allStats;
    
    var html = '';
    
    statsToShow.forEach(function(stats, index) {
      var rank = allStats.findIndex(function(s) { return s.id === stats.id; }) + 1;
      var achievements = app.getAchievements(stats, period === 'ytd' ? null : { players: players, nights: nights });
      
      // Create wrapped card
      html += '<div style="background: linear-gradient(135deg, #f39c12 0%, #e74c3c 100%); padding: 40px; border-radius: 16px; margin: 20px 0; box-shadow: 0 8px 20px rgba(0,0,0,0.4); color: white; text-align: center;">';
      
      html += '<h2 style="font-size: 2.5em; margin-bottom: 20px;">🎁 ' + stats.name + "'s Poker Wrapped</h2>";
      html += '<p style="font-size: 1.2em; opacity: 0.9; margin-bottom: 30px;">' + (period === 'lifetime' ? 'All Time' : period === 'ytd' ? this.data.currentYear + ' Year to Date' : period) + '</p>';
      
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
  
  console.log('✅ Poker Wrapped loaded successfully!');
}
