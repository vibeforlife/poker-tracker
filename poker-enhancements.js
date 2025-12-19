// poker-enhancements.js
// Additional features for Poker Tracker
// Include this file AFTER the main app loads

(function() {
  'use strict';

  // Wait for app to be ready
  if (typeof app === 'undefined') {
    console.error('App not loaded yet');
    return;
  }

  // ============================================
  // EXPENSE TRACKING
  // ============================================

  // Override addNight to include expenses
  const originalAddNight = app.addNight;
  app.addNight = function() {
    const name = document.getElementById('newNightName').value.trim() || 'Poker Night';
    const date = document.getElementById('newNightDate').value;
    const time = document.getElementById('newNightTime').value || '19:00';
    const location = document.getElementById('newNightLocation').value.trim();
    if (!date) { alert('Select date'); return; }
    this.saveState();
    this.data.nights.push({ 
      id: Date.now(), 
      name, 
      date, 
      time, 
      location, 
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

  // Override editNight to include expense fields
  const originalEditNight = app.editNight;
  app.editNight = function(id) {
    const night = this.data.nights.find(n => n.id === id);
    if (!night.notes) night.notes = '';
    if (!night.expenses) {
      night.expenses = { food: 0, drinks: 0, other: 0, paidBy: null, splitAmong: [], notes: '' };
    }
    
    let html = '<label>Name:</label><input type="text" id="editNightName" value="' + night.name + '">';
    html += '<div class="form-row">';
    html += '<div><label>Date:</label><input type="date" id="editNightDate" value="' + night.date + '"></div>';
    html += '<div><label>Time:</label><input type="time" id="editNightTime" value="' + (night.time || '19:00') + '"></div>';
    html += '</div>';
    html += '<label>Location:</label><input type="text" id="editNightLocation" value="' + (night.location || '') + '">';
    html += '<label>Notes:</label><textarea id="editNightNotes" placeholder="Add notes about this game...">' + night.notes + '</textarea>';
    
    // Expense section
    html += '<div style="background: #1a1a2e; padding: 20px; border-radius: 12px; margin: 20px 0; border: 2px solid #f39c12;">';
    html += '<h3 style="color: #f39c12; margin-bottom: 15px;">💰 Expenses</h3>';
    html += '<div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin-bottom: 15px;">';
    html += '<div><label>Food $:</label><input type="number" id="expenseFood" value="' + (night.expenses.food || 0) + '"></div>';
    html += '<div><label>Drinks $:</label><input type="number" id="expenseDrinks" value="' + (night.expenses.drinks || 0) + '"></div>';
    html += '<div><label>Other $:</label><input type="number" id="expenseOther" value="' + (night.expenses.other || 0) + '"></div>';
    html += '</div>';
    html += '<label>Paid by:</label><select id="expensePaidBy">';
    html += '<option value="">Select player</option>';
    this.data.players.forEach(p => {
      html += '<option value="' + p.id + '" ' + (night.expenses.paidBy === p.id ? 'selected' : '') + '>' + p.name + '</option>';
    });
    html += '</select>';
    html += '<label style="margin-top: 10px;">Split among:</label>';
    html += '<div style="max-height: 150px; overflow-y: auto; background: #2a2a40; padding: 10px; border-radius: 8px; margin-top: 5px;">';
    this.data.players.forEach(p => {
      const checked = night.expenses.splitAmong && night.expenses.splitAmong.includes(p.id);
      html += '<div style="display: flex; justify-content: space-between; align-items: center; margin: 5px 0; padding: 5px;">';
      html += '<label for="expenseSplit_' + p.id + '" style="cursor: pointer; flex: 1; margin: 0;">' + p.name + '</label>';
      html += '<input type="checkbox" id="expenseSplit_' + p.id + '" ' + (checked ? 'checked' : '') + ' style="width: auto; cursor: pointer;">';
      html += '</div>';
    });
    html += '</div>';
    html += '<label style="margin-top: 10px;">Expense Notes:</label>';
    html += '<input type="text" id="expenseNotes" value="' + (night.expenses.notes || '') + '" placeholder="Pizza, beer, etc.">';
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
    
    const checkboxContainer = document.getElementById('attendeeCheckboxes');
    this.data.players.forEach(player => {
      const checked = night.attendees.some(a => a.playerId === player.id);
      const div = document.createElement('div');
      div.className = 'checkbox-item';
      div.innerHTML = '<label for="player_' + player.id + '">' + player.name + '</label>' +
        '<input type="checkbox" id="player_' + player.id + '" ' + (checked ? 'checked' : '') + '>';
      checkboxContainer.appendChild(div);
    });
    
    this.updateAttendeeResults(night);
    document.getElementById('editNightModal').classList.add('active');
  };

  // Override saveNight to save expenses
  const originalSaveNight = app.saveNight;
  app.saveNight = function(id) {
    this.saveState();
    const night = this.data.nights.find(n => n.id === id);
    night.name = document.getElementById('editNightName').value.trim() || 'Poker Night';
    night.date = document.getElementById('editNightDate').value;
    night.time = document.getElementById('editNightTime').value || '19:00';
    night.location = document.getElementById('editNightLocation').value.trim();
    night.notes = document.getElementById('editNightNotes').value.trim();
    night.buyIn = parseFloat(document.getElementById('editBuyIn').value) || 20;
    
    // Save expenses
    const splitAmong = [];
    this.data.players.forEach(player => {
      const checkbox = document.getElementById('expenseSplit_' + player.id);
      if (checkbox && checkbox.checked) splitAmong.push(player.id);
    });
    
    night.expenses = {
      food: parseFloat(document.getElementById('expenseFood').value) || 0,
      drinks: parseFloat(document.getElementById('expenseDrinks').value) || 0,
      other: parseFloat(document.getElementById('expenseOther').value) || 0,
      paidBy: parseInt(document.getElementById('expensePaidBy').value) || null,
      splitAmong: splitAmong,
      notes: document.getElementById('expenseNotes').value.trim()
    };
    
    const selectedIds = [];
    this.data.players.forEach(player => {
      const checkbox = document.getElementById('player_' + player.id);
      if (checkbox && checkbox.checked) {
        selectedIds.push(player.id);
        if (!night.attendees.some(a => a.playerId === player.id)) {
          night.attendees.push({ playerId: player.id, winnings: -night.buyIn });
        }
      }
    });
    night.attendees = night.attendees.filter(a => selectedIds.includes(a.playerId));
    this.saveData();
    this.updateAttendeeResults(night);
  };

  // Override updateAttendeeResults to show expenses
  const originalUpdateAttendeeResults = app.updateAttendeeResults;
  app.updateAttendeeResults = function(night) {
    let html = '';
    night.attendees.forEach(attendee => {
      const player = this.data.players.find(p => p.id === attendee.playerId);
      if (!player) return;
      html += '<div class="attendee-input">';
      html += '<span>' + player.name + '</span>';
      html += '<input type="number" value="' + attendee.winnings + '" onchange="app.updateWinnings(' + night.id + ', ' + attendee.playerId + ', this.value)">';
      html += '<button class="btn btn-danger" onclick="app.removeAttendee(' + night.id + ', ' + attendee.playerId + ')">Remove</button>';
      html += '</div>';
    });
    const total = night.attendees.reduce((sum, a) => sum + parseFloat(a.winnings || 0), 0);
    html += '<p><strong>Total: $' + total.toFixed(2) + '</strong></p>';
    
    // Show expense split
    if (night.expenses && (night.expenses.food > 0 || night.expenses.drinks > 0 || night.expenses.other > 0)) {
      const totalExpenses = (night.expenses.food || 0) + (night.expenses.drinks || 0) + (night.expenses.other || 0);
      const splitCount = night.expenses.splitAmong ? night.expenses.splitAmong.length : 0;
      if (splitCount > 0) {
        const perPerson = totalExpenses / splitCount;
        const paidBy = night.expenses.paidBy ? this.data.players.find(p => p.id === night.expenses.paidBy) : null;
        if (paidBy) {
          html += '<div style="margin-top: 15px; padding: 15px; background: #1a1a2e; border-radius: 8px; border-left: 3px solid #2ecc71;">';
          html += '<strong>💰 Expenses: $' + totalExpenses.toFixed(2) + '</strong><br>';
          if (night.expenses.notes) html += '<em style="color: #aaa;">' + night.expenses.notes + '</em><br>';
          html += '<span style="font-size: 0.9em; color: #aaa;">Food: $' + night.expenses.food + ' • Drinks: $' + night.expenses.drinks + ' • Other: $' + night.expenses.other + '</span><br>';
          html += '<strong style="color: #2ecc71;">Each person owes ' + paidBy.name + ': $' + perPerson.toFixed(2) + '</strong>';
          html += '</div>';
        }
      }
    }
    
    document.getElementById('attendeeResults').innerHTML = html;
  };

  // Override calculateSettlement to include expenses
  const originalCalculateSettlement = app.calculateSettlement;
  app.calculateSettlement = function(nightId) {
    const night = this.data.nights.find(n => n.id === nightId);
    const balances = night.attendees.map(a => ({
      playerId: a.playerId,
      player: this.data.players.find(p => p.id === a.playerId).name,
      balance: a.winnings
    })).sort((a, b) => a.balance - b.balance);
    
    const pokerTrans = [];
    const debtors = balances.filter(b => b.balance < 0).map(b => ({...b}));
    const creditors = balances.filter(b => b.balance > 0).map(b => ({...b}));
    
    debtors.forEach(debtor => {
      let remaining = -debtor.balance;
      creditors.forEach(creditor => {
        if (remaining > 0 && creditor.balance > 0) {
          const amount = Math.min(remaining, creditor.balance);
          pokerTrans.push({ from: debtor.player, to: creditor.player, amount });
          remaining -= amount;
          creditor.balance -= amount;
        }
      });
    });
    
    // Expense settlement
    const expenseTrans = [];
    if (night.expenses && night.expenses.paidBy && night.expenses.splitAmong && night.expenses.splitAmong.length > 0) {
      const totalExp = (night.expenses.food || 0) + (night.expenses.drinks || 0) + (night.expenses.other || 0);
      if (totalExp > 0) {
        const perPerson = totalExp / night.expenses.splitAmong.length;
        const paidBy = this.data.players.find(p => p.id === night.expenses.paidBy);
        night.expenses.splitAmong.forEach(playerId => {
          if (playerId !== night.expenses.paidBy) {
            const player = this.data.players.find(p => p.id === playerId);
            expenseTrans.push({ from: player.name, to: paidBy.name, amount: perPerson });
          }
        });
      }
    }
    
    // Consolidated
    const consolidated = {};
    pokerTrans.forEach(t => {
      const key = t.from + '-' + t.to;
      if (!consolidated[key]) consolidated[key] = { from: t.from, to: t.to, amount: 0 };
      consolidated[key].amount += t.amount;
    });
    expenseTrans.forEach(t => {
      const key = t.from + '-' + t.to;
      if (!consolidated[key]) consolidated[key] = { from: t.from, to: t.to, amount: 0 };
      consolidated[key].amount += t.amount;
    });
    
    // Display 3 columns
    let html = '<div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px;">';
    
    html += '<div><h3 style="color: #f39c12; margin-bottom: 10px;">🃏 Poker</h3>';
    if (pokerTrans.length > 0) {
      pokerTrans.forEach(t => {
        html += '<p>' + t.from + ' → ' + t.to + '<br><strong>$' + t.amount.toFixed(2) + '</strong></p>';
      });
    } else {
      html += '<p style="color: #888;">All settled!</p>';
    }
    html += '</div>';
    
    html += '<div><h3 style="color: #2ecc71; margin-bottom: 10px;">💰 Expenses</h3>';
    if (expenseTrans.length > 0) {
      const totalExp = (night.expenses.food || 0) + (night.expenses.drinks || 0) + (night.expenses.other || 0);
      html += '<p style="font-size: 0.9em; color: #aaa; margin-bottom: 10px;">Total: $' + totalExp.toFixed(2) + '</p>';
      expenseTrans.forEach(t => {
        html += '<p>' + t.from + ' → ' + t.to + '<br><strong>$' + t.amount.toFixed(2) + '</strong></p>';
      });
    } else {
      html += '<p style="color: #888;">No expenses</p>';
    }
    html += '</div>';
    
    html += '<div><h3 style="color: #9b59b6; margin-bottom: 10px;">📊 Total</h3>';
    const consArray = Object.values(consolidated);
    if (consArray.length > 0) {
      consArray.forEach(t => {
        html += '<p>' + t.from + ' → ' + t.to + '<br><strong style="color: #9b59b6;">$' + t.amount.toFixed(2) + '</strong></p>';
      });
    } else {
      html += '<p style="color: #888;">All settled!</p>';
    }
    html += '</div>';
    
    html += '</div>';
    document.getElementById('settlementContent').innerHTML = html;
    document.getElementById('settlementModal').classList.add('active');
  };

  console.log('✅ Poker enhancements loaded successfully');
  console.log('✅ Features added: Expense tracking, Enhanced settlement');

})();
