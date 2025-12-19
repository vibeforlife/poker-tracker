// poker-enhancements.js - CLEAN VERSION
// Expense tracking with smart settlement optimization

console.log('Loading poker enhancements...');

// Wait for DOM and app to be ready
if (typeof app === 'undefined') {
  console.error('ERROR: App not found!');
} else {
  console.log('App found, applying enhancements...');
  
  // ==========================================
  // 1. MODIFY addNight to include expenses
  // ==========================================
  
  app.addNight = function() {
    const name = document.getElementById('newNightName').value.trim() || 'Poker Night';
    const date = document.getElementById('newNightDate').value;
    const time = document.getElementById('newNightTime').value || '19:00';
    const location = document.getElementById('newNightLocation').value.trim();
    if (!date) { alert('Select date'); return; }
    
    this.saveState();
    this.data.nights.push({ 
      id: Date.now(), 
      name: name,
      date: date,
      time: time,
      location: location,
      notes: '',
      attendees: [], 
      buyIn: 20,
      expenses: {
        food: 0,
        drinks: 0,
        other: 0,
        paidBy: null,
        splitAmong: [],
        notes: ''
      }
    });
    
    document.getElementById('newNightName').value = '';
    document.getElementById('newNightDate').value = '';
    document.getElementById('newNightTime').value = '';
    document.getElementById('newNightLocation').value = '';
    
    this.saveData();
    this.sortNights(this.currentSort);
    this.render();
  };
  
  // ==========================================
  // 2. MODIFY editNight to show expense fields
  // ==========================================
  
  app.editNight = function(id) {
    const night = this.data.nights.find(function(n) { return n.id === id; });
    if (!night.notes) night.notes = '';
    if (!night.expenses) {
      night.expenses = { food: 0, drinks: 0, other: 0, paidBy: null, splitAmong: [], notes: '' };
    }
    if (!night.expenses.splitAmong) {
      night.expenses.splitAmong = [];
    }
    
    var html = '';
    html += '<label>Name:</label><input type="text" id="editNightName" value="' + night.name + '">';
    html += '<div class="form-row">';
    html += '<div><label>Date:</label><input type="date" id="editNightDate" value="' + night.date + '"></div>';
    html += '<div><label>Time:</label><input type="time" id="editNightTime" value="' + (night.time || '19:00') + '"></div>';
    html += '</div>';
    html += '<label>Location:</label><input type="text" id="editNightLocation" value="' + (night.location || '') + '">';
    html += '<label>Notes:</label><textarea id="editNightNotes" placeholder="Add notes...">' + night.notes + '</textarea>';
    
    // EXPENSE SECTION
    html += '<div style="background: #1a1a2e; padding: 20px; border-radius: 12px; margin: 20px 0; border: 2px solid #f39c12;">';
    html += '<h3 style="color: #f39c12; margin-bottom: 15px;">💰 Expenses</h3>';
    html += '<div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px;">';
    html += '<div><label>Food $:</label><input type="number" step="0.01" id="expenseFood" value="' + (night.expenses.food || 0) + '"></div>';
    html += '<div><label>Drinks $:</label><input type="number" step="0.01" id="expenseDrinks" value="' + (night.expenses.drinks || 0) + '"></div>';
    html += '<div><label>Other $:</label><input type="number" step="0.01" id="expenseOther" value="' + (night.expenses.other || 0) + '"></div>';
    html += '</div>';
    html += '<label style="margin-top: 10px;">Paid by:</label><select id="expensePaidBy"><option value="">Select player</option>';
    
    this.data.players.forEach(function(p) {
      var selected = night.expenses.paidBy === p.id ? 'selected' : '';
      html += '<option value="' + p.id + '" ' + selected + '>' + p.name + '</option>';
    });
    
    html += '</select>';
    html += '<label style="margin-top: 10px;">Split among:</label>';
    html += '<div style="max-height: 150px; overflow-y: auto; background: #2a2a40; padding: 10px; border-radius: 8px; margin: 10px 0;">';
    
    this.data.players.forEach(function(p) {
      var checked = night.expenses.splitAmong.indexOf(p.id) !== -1 ? 'checked' : '';
      html += '<div style="display: flex; justify-content: space-between; padding: 5px;">';
      html += '<label for="expSplit_' + p.id + '" style="cursor: pointer; margin: 0;">' + p.name + '</label>';
      html += '<input type="checkbox" id="expSplit_' + p.id + '" ' + checked + ' style="width: auto; cursor: pointer;">';
      html += '</div>';
    });
    
    html += '</div>';
    html += '<label>Expense Notes:</label><input type="text" id="expenseNotes" value="' + (night.expenses.notes || '') + '" placeholder="Pizza, beer...">';
    html += '</div>';
    
    html += '<label>Buy-In:</label><input type="number" id="editBuyIn" value="' + night.buyIn + '">';
    html += '<h3>Attendees</h3>';
    html += '<input type="text" id="playerSearch" placeholder="Search..." onkeyup="app.filterPlayers()">';
    html += '<div class="checkbox-list" id="attendeeCheckboxes"></div>';
    html += '<h3>Results</h3>';
    html += '<div id="attendeeResults"></div>';
    html += '<button class="btn btn-primary" onclick="app.saveNight(' + id + ')">Save</button>';
    html += '<button class="btn btn-secondary" onclick="app.calculateSettlement(' + id + ')">Settlement</button>';
    
    document.getElementById('editNightContent').innerHTML = html;
    
    var checkboxContainer = document.getElementById('attendeeCheckboxes');
    this.data.players.forEach(function(player) {
      var checked = night.attendees.some(function(a) { return a.playerId === player.id; });
      var div = document.createElement('div');
      div.className = 'checkbox-item';
      div.innerHTML = '<label for="player_' + player.id + '">' + player.name + '</label><input type="checkbox" id="player_' + player.id + '" ' + (checked ? 'checked' : '') + '>';
      checkboxContainer.appendChild(div);
    });
    
    this.updateAttendeeResults(night);
    document.getElementById('editNightModal').classList.add('active');
  };
  
  // ==========================================
  // 3. MODIFY saveNight to save expenses
  // ==========================================
  
  app.saveNight = function(id) {
    this.saveState();
    var night = this.data.nights.find(function(n) { return n.id === id; });
    
    night.name = document.getElementById('editNightName').value.trim() || 'Poker Night';
    night.date = document.getElementById('editNightDate').value;
    night.time = document.getElementById('editNightTime').value || '19:00';
    night.location = document.getElementById('editNightLocation').value.trim();
    night.notes = document.getElementById('editNightNotes').value.trim();
    night.buyIn = parseFloat(document.getElementById('editBuyIn').value) || 20;
    
    // Save expenses
    var splitAmong = [];
    this.data.players.forEach(function(player) {
      var checkbox = document.getElementById('expSplit_' + player.id);
      if (checkbox && checkbox.checked) {
        splitAmong.push(player.id);
      }
    });
    
    night.expenses = {
      food: parseFloat(document.getElementById('expenseFood').value) || 0,
      drinks: parseFloat(document.getElementById('expenseDrinks').value) || 0,
      other: parseFloat(document.getElementById('expenseOther').value) || 0,
      paidBy: parseInt(document.getElementById('expensePaidBy').value) || null,
      splitAmong: splitAmong,
      notes: document.getElementById('expenseNotes').value.trim()
    };
    
    // Save attendees
    var selectedIds = [];
    this.data.players.forEach(function(player) {
      var checkbox = document.getElementById('player_' + player.id);
      if (checkbox && checkbox.checked) {
        selectedIds.push(player.id);
        var exists = night.attendees.some(function(a) { return a.playerId === player.id; });
        if (!exists) {
          night.attendees.push({ playerId: player.id, winnings: -night.buyIn });
        }
      }
    });
    night.attendees = night.attendees.filter(function(a) { return selectedIds.indexOf(a.playerId) !== -1; });
    
    this.saveData();
    this.updateAttendeeResults(night);
  };
  
  // ==========================================
  // 4. MODIFY updateAttendeeResults to show expenses
  // ==========================================
  
  app.updateAttendeeResults = function(night) {
    var html = '';
    
    night.attendees.forEach(function(attendee) {
      var player = app.data.players.find(function(p) { return p.id === attendee.playerId; });
      if (!player) return;
      
      html += '<div class="attendee-input">';
      html += '<span>' + player.name + '</span>';
      html += '<input type="number" value="' + attendee.winnings + '" onchange="app.updateWinnings(' + night.id + ', ' + attendee.playerId + ', this.value)">';
      html += '<button class="btn btn-danger" onclick="app.removeAttendee(' + night.id + ', ' + attendee.playerId + ')">Remove</button>';
      html += '</div>';
    });
    
    var total = night.attendees.reduce(function(sum, a) { return sum + parseFloat(a.winnings || 0); }, 0);
    html += '<p><strong>Total: $' + total.toFixed(2) + '</strong></p>';
    
    // Show expense summary
    if (night.expenses && (night.expenses.food > 0 || night.expenses.drinks > 0 || night.expenses.other > 0)) {
      var totalExp = (night.expenses.food || 0) + (night.expenses.drinks || 0) + (night.expenses.other || 0);
      var splitCount = night.expenses.splitAmong ? night.expenses.splitAmong.length : 0;
      
      if (splitCount > 0 && night.expenses.paidBy) {
        var perPerson = totalExp / splitCount;
        var paidBy = app.data.players.find(function(p) { return p.id === night.expenses.paidBy; });
        
        if (paidBy) {
          html += '<div style="margin-top: 15px; padding: 15px; background: #1a1a2e; border-radius: 8px; border-left: 3px solid #2ecc71;">';
          html += '<strong style="color: #2ecc71;">💰 Expenses: $' + totalExp.toFixed(2) + '</strong><br>';
          if (night.expenses.notes) html += '<em style="color: #aaa;">' + night.expenses.notes + '</em><br>';
          html += '<span style="font-size: 0.9em; color: #aaa;">Food: $' + (night.expenses.food || 0) + ' • Drinks: $' + (night.expenses.drinks || 0) + ' • Other: $' + (night.expenses.other || 0) + '</span><br>';
          html += '<strong style="color: #2ecc71;">Each owes ' + paidBy.name + ': $' + perPerson.toFixed(2) + '</strong>';
          html += '</div>';
        }
      }
    }
    
    document.getElementById('attendeeResults').innerHTML = html;
  };
  
  // ==========================================
  // 5. REPLACE calculateSettlement completely
  // ==========================================
  
  app.calculateSettlement = function(nightId) {
    console.log('>>> Enhanced settlement called for night:', nightId);
    
    var night = this.data.nights.find(function(n) { return n.id === nightId; });
    if (!night) {
      console.error('Night not found!');
      return;
    }
    
    console.log('Night:', night);
    
    // === POKER SETTLEMENT ===
    var pokerTrans = [];
    var balances = night.attendees.map(function(a) {
      return {
        playerId: a.playerId,
        player: app.data.players.find(function(p) { return p.id === a.playerId; }).name,
        balance: a.winnings
      };
    }).sort(function(a, b) { return a.balance - b.balance; });
    
    var debtors = balances.filter(function(b) { return b.balance < 0; }).map(function(b) { return { player: b.player, amount: -b.balance }; });
    var creditors = balances.filter(function(b) { return b.balance > 0; }).map(function(b) { return { player: b.player, amount: b.balance }; });
    
    debtors.forEach(function(debtor) {
      var remaining = debtor.amount;
      creditors.forEach(function(creditor) {
        if (remaining > 0.01 && creditor.amount > 0.01) {
          var amount = Math.min(remaining, creditor.amount);
          pokerTrans.push({ from: debtor.player, to: creditor.player, amount: amount });
          remaining -= amount;
          creditor.amount -= amount;
        }
      });
    });
    
    console.log('Poker transactions:', pokerTrans);
    
    // === EXPENSE SETTLEMENT ===
    var expenseTrans = [];
    
    if (night.expenses && night.expenses.paidBy && night.expenses.splitAmong && night.expenses.splitAmong.length > 0) {
      var totalExp = (night.expenses.food || 0) + (night.expenses.drinks || 0) + (night.expenses.other || 0);
      
      if (totalExp > 0) {
        var perPerson = totalExp / night.expenses.splitAmong.length;
        var paidByPlayer = app.data.players.find(function(p) { return p.id === night.expenses.paidBy; });
        
        night.expenses.splitAmong.forEach(function(playerId) {
          if (playerId !== night.expenses.paidBy) {
            var player = app.data.players.find(function(p) { return p.id === playerId; });
            if (player) {
              expenseTrans.push({ from: player.name, to: paidByPlayer.name, amount: perPerson });
            }
          }
        });
      }
    }
    
    console.log('Expense transactions:', expenseTrans);
    
    // === OPTIMIZE (NET OUT OPPOSITE TRANSACTIONS) ===
    var allTrans = pokerTrans.concat(expenseTrans);
    console.log('All transactions:', allTrans);
    
    // Build net balances
    var netBalances = {};
    
    allTrans.forEach(function(t) {
      if (!netBalances[t.from]) netBalances[t.from] = 0;
      if (!netBalances[t.to]) netBalances[t.to] = 0;
      netBalances[t.from] -= t.amount;
      netBalances[t.to] += t.amount;
    });
    
    console.log('Net balances:', netBalances);
    
    // Split into debtors and creditors
    var finalDebtors = [];
    var finalCreditors = [];
    
    Object.keys(netBalances).forEach(function(person) {
      var balance = Math.round(netBalances[person] * 100) / 100;
      if (balance < -0.01) {
        finalDebtors.push({ person: person, amount: -balance });
      } else if (balance > 0.01) {
        finalCreditors.push({ person: person, amount: balance });
      }
    });
    
    finalDebtors.sort(function(a, b) { return b.amount - a.amount; });
    finalCreditors.sort(function(a, b) { return b.amount - a.amount; });
    
    console.log('Final debtors:', finalDebtors);
    console.log('Final creditors:', finalCreditors);
    
    // Generate optimized transactions
    var optimized = [];
    var i = 0;
    var j = 0;
    
    while (i < finalDebtors.length && j < finalCreditors.length) {
      var debtor = finalDebtors[i];
      var creditor = finalCreditors[j];
      var amount = Math.min(debtor.amount, creditor.amount);
      
      if (amount > 0.01) {
        optimized.push({ 
          from: debtor.person, 
          to: creditor.person, 
          amount: Math.round(amount * 100) / 100 
        });
      }
      
      debtor.amount -= amount;
      creditor.amount -= amount;
      
      if (debtor.amount < 0.01) i++;
      if (creditor.amount < 0.01) j++;
    }
    
    console.log('OPTIMIZED FINAL:', optimized);
    
    // === BUILD 3-COLUMN HTML ===
    var html = '<div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px;">';
    
    // COLUMN 1: Poker
    html += '<div style="background: #1a1a2e; padding: 15px; border-radius: 8px;">';
    html += '<h3 style="color: #f39c12; margin-bottom: 10px; text-align: center;">🃏 Poker</h3>';
    if (pokerTrans.length > 0) {
      pokerTrans.forEach(function(t) {
        html += '<div style="padding: 8px; background: #2a2a40; margin: 5px 0; border-radius: 6px;">';
        html += '<div style="font-size: 0.9em; color: #aaa;">' + t.from + ' →</div>';
        html += '<div><strong>' + t.to + '</strong></div>';
        html += '<div style="color: #f39c12; font-weight: bold;">$' + t.amount.toFixed(2) + '</div>';
        html += '</div>';
      });
    } else {
      html += '<p style="color: #888; text-align: center;">Settled</p>';
    }
    html += '</div>';
    
    // COLUMN 2: Expenses
    html += '<div style="background: #1a1a2e; padding: 15px; border-radius: 8px;">';
    html += '<h3 style="color: #2ecc71; margin-bottom: 10px; text-align: center;">💰 Expenses</h3>';
    if (expenseTrans.length > 0) {
      var totalExp = (night.expenses.food || 0) + (night.expenses.drinks || 0) + (night.expenses.other || 0);
      html += '<p style="font-size: 0.85em; color: #aaa; text-align: center; margin-bottom: 10px;">Total: $' + totalExp.toFixed(2) + '</p>';
      expenseTrans.forEach(function(t) {
        html += '<div style="padding: 8px; background: #2a2a40; margin: 5px 0; border-radius: 6px;">';
        html += '<div style="font-size: 0.9em; color: #aaa;">' + t.from + ' →</div>';
        html += '<div><strong>' + t.to + '</strong></div>';
        html += '<div style="color: #2ecc71; font-weight: bold;">$' + t.amount.toFixed(2) + '</div>';
        html += '</div>';
      });
    } else {
      html += '<p style="color: #888; text-align: center;">No expenses</p>';
    }
    html += '</div>';
    
    // COLUMN 3: Optimized
    html += '<div style="background: #1a1a2e; padding: 15px; border-radius: 8px; border: 2px solid #9b59b6;">';
    html += '<h3 style="color: #9b59b6; margin-bottom: 10px; text-align: center;">📊 Optimized</h3>';
    html += '<p style="font-size: 0.85em; color: #aaa; text-align: center; margin-bottom: 10px;">Reduced to ' + optimized.length + ' payment' + (optimized.length !== 1 ? 's' : '') + '</p>';
    
    if (optimized.length > 0) {
      optimized.forEach(function(t) {
        html += '<div style="padding: 10px; background: #2a2a40; margin: 5px 0; border-radius: 6px; border-left: 3px solid #9b59b6;">';
        html += '<div style="font-size: 0.9em; color: #aaa;">' + t.from + ' →</div>';
        html += '<div><strong>' + t.to + '</strong></div>';
        html += '<div style="color: #9b59b6; font-weight: bold; font-size: 1.1em;">$' + t.amount.toFixed(2) + '</div>';
        html += '</div>';
      });
      html += '<p style="margin-top: 15px; padding: 10px; background: #2a2a40; border-radius: 6px; font-size: 0.85em; color: #bbb; text-align: center;">✨ Use these payments</p>';
    } else {
      html += '<p style="color: #888; text-align: center;">All settled!</p>';
    }
    html += '</div>';
    html += '</div>';
    
    // Explanation
    html += '<div style="margin-top: 20px; padding: 15px; background: #1a1a2e; border-radius: 8px; font-size: 0.9em; color: #aaa;">';
    html += '<strong>💡 Smart Optimization:</strong> Combines poker + expenses and nets out opposite transactions. ';
    html += 'Example: If Alice owes Bob $20 but Bob owes Alice $30, optimized shows Bob → Alice $10.';
    html += '</div>';
    
    document.getElementById('settlementContent').innerHTML = html;
    document.getElementById('settlementModal').classList.add('active');
  };
  
  console.log('✅ Enhancements loaded: Expense tracking + Smart settlement');
}
