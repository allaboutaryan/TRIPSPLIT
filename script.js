// Global variables
let trips = JSON.parse(localStorage.getItem('trips')) || [];
let currentTripId = null;

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    renderTrips();
    updateDashboardStats();
    
    // Form event listeners
    document.getElementById('createGroupForm').addEventListener('submit', createGroup);
    document.getElementById('addExpenseForm').addEventListener('submit', addExpense);
});

// Trip Management
function createGroup(e) {
    e.preventDefault();
    
    const groupName = document.getElementById('groupName').value.trim();
    const memberNames = document.getElementById('memberNames').value.trim();
    
    if (!groupName || !memberNames) {
        showToast('Please fill all fields', 'error');
        return;
    }
    
    const members = memberNames.split(',').map(name => ({
        name: name.trim(),
        balance: 0
    }));
    
    const newTrip = {
        id: Date.now().toString(),
        name: groupName,
        members: members,
        expenses: [],
        totalAmount: 0,
        createdAt: new Date().toISOString()
    };
    
    trips.push(newTrip);
    saveTrips();
    renderTrips();
    updateDashboardStats();
    hideCreateGroup();
    showToast('Trip created successfully!');
    
    // Reset form
    document.getElementById('createGroupForm').reset();
}

function addExpense(e) {
    e.preventDefault();
    
    const description = document.getElementById('expenseDescription').value.trim();
    const amount = parseFloat(document.getElementById('expenseAmount').value);
    const category = document.getElementById('expenseCategory').value;
    const paidBy = document.getElementById('paidBy').value;
    
    // Get selected members for splitting
    const splitMemberCheckboxes = document.querySelectorAll('#splitMembers input[type="checkbox"]:checked');
    const splitMembers = Array.from(splitMemberCheckboxes).map(cb => cb.value);
    
    if (!description || !amount || !category || !paidBy || splitMembers.length === 0) {
        showToast('Please fill all fields and select members', 'error');
        return;
    }
    
    const trip = trips.find(t => t.id === currentTripId);
    if (!trip) return;
    
    const expense = {
        id: Date.now().toString(),
        description,
        amount,
        category,
        paidBy,
        splitMembers,
        date: new Date().toISOString()
    };
    
    trip.expenses.push(expense);
    
    // Update balances
    const splitAmount = amount / splitMembers.length;
    
    splitMembers.forEach(memberName => {
        const member = trip.members.find(m => m.name === memberName);
        if (member) {
            if (memberName === paidBy) {
                member.balance += (amount - splitAmount);
            } else {
                member.balance -= splitAmount;
            }
        }
    });
    
    trip.totalAmount += amount;
    
    saveTrips();
    renderTripDetails(currentTripId);
    updateDashboardStats();
    hideAddExpense();
    showToast('Expense added successfully!');
    
    // Reset form
    document.getElementById('addExpenseForm').reset();
}

// Rendering functions
function renderTrips() {
    const container = document.getElementById('tripsContainer');
    
    if (trips.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #666;">
                <i class="fas fa-map" style="font-size: 3rem; margin-bottom: 20px; opacity: 0.5;"></i>
                <h3>No trips yet</h3>
                <p>Create your first trip to start tracking expenses with friends!</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = trips.map(trip => {
        const memberCount = trip.members.length;
        const userBalance = trip.members.reduce((sum, member) => sum + Math.abs(member.balance), 0);
        
        return `
            <div class="trip-card" onclick="showTripDetails('${trip.id}')">
                <h3>${trip.name}</h3>
                <div class="trip-info">
                    <span class="members">${memberCount} members</span>
                    <span class="amount">₹${trip.totalAmount.toFixed(2)}</span>
                </div>
                <div style="font-size: 0.8rem; color: #999; margin-top: 10px;">
                    ${trip.expenses.length} expenses
                </div>
            </div>
        `;
    }).join('');
}

function renderTripDetails(tripId) {
    const trip = trips.find(t => t.id === tripId);
    if (!trip) return;
    
    currentTripId = tripId;
    
    // Update trip header
    document.getElementById('tripTitle').textContent = trip.name;
    
    // Calculate user's balance
    const userBalance = trip.members.reduce((sum, member) => sum + member.balance, 0);
    document.getElementById('tripBalance').textContent = `₹${userBalance.toFixed(2)}`;
    document.getElementById('tripTotal').textContent = `₹${trip.totalAmount.toFixed(2)}`;
    
    // Render members
    const membersContainer = document.getElementById('membersContainer');
    membersContainer.innerHTML = trip.members.map(member => `
        <div class="member-card">
            <div class="name">${member.name}</div>
            <div class="balance ${member.balance >= 0 ? 'positive' : 'negative'}">
                ${member.balance >= 0 ? 'Gets back' : 'Owes'} ₹${Math.abs(member.balance).toFixed(2)}
            </div>
        </div>
    `).join('');
    
    // Render expenses
    const expensesContainer = document.getElementById('expensesContainer');
    if (trip.expenses.length === 0) {
        expensesContainer.innerHTML = `
            <div style="text-align: center; padding: 20px; color: #666;">
                <i class="fas fa-receipt" style="font-size: 2rem; margin-bottom: 10px; opacity: 0.5;"></i>
                <p>No expenses yet. Add your first expense!</p>
            </div>
        `;
    } else {
        expensesContainer.innerHTML = trip.expenses.slice(-10).reverse().map(expense => `
            <div class="expense-item ${expense.category}">
                <div class="expense-details">
                    <h4>${expense.description}</h4>
                    <p>Paid by ${expense.paidBy} • ${new Date(expense.date).toLocaleDateString('en-IN')}</p>
                    <p>Split between: ${expense.splitMembers.join(', ')}</p>
                </div>
                <div class="expense-amount">₹${expense.amount.toFixed(2)}</div>
            </div>
        `).join('');
    }
    
    // Populate add expense form
    populateAddExpenseForm(trip);
}

function populateAddExpenseForm(trip) {
    const paidBySelect = document.getElementById('paidBy');
    const splitMembersContainer = document.getElementById('splitMembers');
    
    // Populate paid by dropdown
    paidBySelect.innerHTML = trip.members.map(member => 
        `<option value="${member.name}">${member.name}</option>`
    ).join('');
    
    // Populate split members checkboxes
    splitMembersContainer.innerHTML = trip.members.map(member => `
        <label>
            <input type="checkbox" value="${member.name}" checked>
            ${member.name}
        </label>
    `).join('');
}

function updateDashboardStats() {
    let totalOwed = 0;
    let totalOwedTo = 0;
    
    trips.forEach(trip => {
        trip.members.forEach(member => {
            if (member.balance < 0) {
                totalOwed += Math.abs(member.balance);
            } else {
                totalOwedTo += member.balance;
            }
        });
    });
    
    document.getElementById('totalOwed').textContent = `₹${totalOwed.toFixed(2)}`;
    document.getElementById('totalOwedTo').textContent = `₹${totalOwedTo.toFixed(2)}`;
}

// Navigation functions
function showDashboard() {
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });
    document.getElementById('dashboard').classList.add('active');
    currentTripId = null;
}

function showTripDetails(tripId) {
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });
    document.getElementById('tripDetails').classList.add('active');
    renderTripDetails(tripId);
}

// Modal functions
function showCreateGroup() {
    document.getElementById('createGroupModal').style.display = 'block';
}

function hideCreateGroup() {
    document.getElementById('createGroupModal').style.display = 'none';
}

function showAddExpense() {
    if (!currentTripId) {
        showToast('Please select a trip first', 'error');
        return;
    }
    document.getElementById('addExpenseModal').style.display = 'block';
}

function hideAddExpense() {
    document.getElementById('addExpenseModal').style.display = 'none';
}

// Utility functions
function saveTrips() {
    localStorage.setItem('trips', JSON.stringify(trips));
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');
    
    toastMessage.textContent = message;
    toast.className = `toast ${type}`;
    toast.style.display = 'flex';
    
    setTimeout(() => {
        toast.style.display = 'none';
    }, 3000);
}

// Format currency for Indian format
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR'
    }).format(amount);
}

// Close modals when clicking outside
window.onclick = function(event) {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });
};
