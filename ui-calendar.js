// Calendar Screen UI Controller
class CalendarScreenUI {
    constructor(app) {
        this.app = app;
        this.currentMonth = new Date();
        this.selectedDate = new Date();
        this.viewMode = 'month';
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupCalendarInteractions();
        this.setupGestures();
    }

    setupEventListeners() {
        // Month navigation
        const prevBtn = document.querySelector('.calendar-nav:first-child');
        const nextBtn = document.querySelector('.calendar-nav:last-child');
        
        if (prevBtn) {
            prevBtn.addEventListener('click', () => this.previousMonth());
        }
        
        if (nextBtn) {
            nextBtn.addEventListener('click', () => this.nextMonth());
        }

        // Month header click
        const monthHeader = document.getElementById('currentMonth');
        if (monthHeader) {
            monthHeader.addEventListener('click', () => {
                this.showMonthPicker();
            });
        }

        // Calendar day clicks
        document.addEventListener('click', (e) => {
            const dayElement = e.target.closest('.calendar-day');
            if (dayElement && !dayElement.classList.contains('other-month')) {
                this.handleDayClick(dayElement);
            }
        });

        // Touch events for swipe navigation
        this.setupSwipeGestures();
    }

    setupCalendarInteractions() {
        // Long press for quick add
        let pressTimer;
        
        document.addEventListener('touchstart', (e) => {
            const dayElement = e.target.closest('.calendar-day');
            if (dayElement && !dayElement.classList.contains('other-month')) {
                pressTimer = setTimeout(() => {
                    this.quickAddTransaction(dayElement);
                }, 500);
            }
        });

        document.addEventListener('touchend', () => {
            clearTimeout(pressTimer);
        });

        document.addEventListener('touchmove', () => {
            clearTimeout(pressTimer);
        });
    }

    setupGestures() {
        const calendarGrid = document.querySelector('.calendar-grid');
        if (!calendarGrid) return;

        let startX = 0;
        let startY = 0;
        let isSwiping = false;

        calendarGrid.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
            isSwiping = true;
        });

        calendarGrid.addEventListener('touchmove', (e) => {
            if (!isSwiping) return;
            
            const currentX = e.touches[0].clientX;
            const currentY = e.touches[0].clientY;
            const diffX = currentX - startX;
            const diffY = currentY - startY;
            
            // Only swipe horizontally
            if (Math.abs(diffX) > Math.abs(diffY)) {
                e.preventDefault();
            }
        });

        calendarGrid.addEventListener('touchend', (e) => {
            if (!isSwiping) return;
            
            const currentX = e.changedTouches[0].clientX;
            const diffX = currentX - startX;
            
            isSwiping = false;
            
            // Check for swipe
            if (Math.abs(diffX) > 50) {
                if (diffX > 0) {
                    this.previousMonth();
                } else {
                    this.nextMonth();
                }
            }
        });
    }

    setupSwipeGestures() {
        const calendarScreen = document.getElementById('calendarScreen');
        if (!calendarScreen) return;

        let startX = 0;
        let isSwiping = false;

        calendarScreen.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
            isSwiping = true;
        });

        calendarScreen.addEventListener('touchmove', (e) => {
            if (!isSwiping) return;
            
            const currentX = e.touches[0].clientX;
            const diffX = currentX - startX;
            
            // Add visual feedback
            calendarScreen.style.transform = `translateX(${diffX * 0.1}px)`;
        });

        calendarScreen.addEventListener('touchend', (e) => {
            calendarScreen.style.transform = '';
            isSwiping = false;
            
            const currentX = e.changedTouches[0].clientX;
            const diffX = currentX - startX;
            
            if (Math.abs(diffX) > 100) {
                if (diffX > 0) {
                    this.previousMonth();
                } else {
                    this.nextMonth();
                }
            }
        });
    }

    async updateCalendar() {
        try {
            await this.renderCalendar();
            this.updateMonthHeader();
            this.animateCalendarTransition();
        } catch (error) {
            console.error('Error updating calendar:', error);
        }
    }

    async renderCalendar() {
        const container = document.getElementById('calendarDays');
        if (!container) return;

        container.innerHTML = '';

        const year = this.currentMonth.getFullYear();
        const month = this.currentMonth.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const prevLastDay = new Date(year, month, 0);

        const startDate = firstDay.getDay();
        const endDate = lastDay.getDate();
        const prevEndDate = prevLastDay.getDate();

        // Get transactions for the month
        const monthStart = new Date(year, month, 1).toISOString().slice(0, 10);
        const monthEnd = new Date(year, month + 1, 0).toISOString().slice(0, 10);
        const monthTransactions = await db.getTransactionsByDateRange(monthStart, monthEnd);

        // Previous month days
        for (let i = startDate - 1; i >= 0; i--) {
            const day = prevEndDate - i;
            const dayElement = await this.createDayElement(day, true, new Date(year, month - 1, day), monthTransactions);
            container.appendChild(dayElement);
        }

        // Current month days
        for (let day = 1; day <= endDate; day++) {
            const date = new Date(year, month, day);
            const dayElement = await this.createDayElement(day, false, date, monthTransactions);
            container.appendChild(dayElement);
        }

        // Next month days
        const totalCells = 42; // 6 weeks * 7 days
        const currentCells = startDate + endDate;
        const nextCells = totalCells - currentCells;

        for (let day = 1; day <= nextCells; day++) {
            const dayElement = await this.createDayElement(day, true, new Date(year, month + 1, day), monthTransactions);
            container.appendChild(dayElement);
        }
    }

    async createDayElement(day, isOtherMonth, date, monthTransactions) {
        const dayElement = document.createElement('div');
        dayElement.className = 'calendar-day';
        dayElement.dataset.date = date.toISOString().slice(0, 10);
        
        if (isOtherMonth) {
            dayElement.classList.add('other-month');
        }

        const today = new Date();
        if (date.toDateString() === today.toDateString()) {
            dayElement.classList.add('today');
        }

        // Get transactions for this specific date
        const dateStr = date.toISOString().slice(0, 10);
        const dayTransactions = monthTransactions.filter(t => t.date === dateStr);
        
        if (dayTransactions.length > 0) {
            const income = dayTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
            const expenses = dayTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
            
            this.addTransactionIndicators(dayElement, income, expenses);
        }

        // Add day number
        const dayNumber = document.createElement('div');
        dayNumber.className = 'day-number';
        dayNumber.textContent = day;
        dayElement.appendChild(dayNumber);

        // Add special day indicators
        this.addSpecialDayIndicators(dayElement, date);

        return dayElement;
    }

    addTransactionIndicators(element, income, expenses) {
        if (income > 0 && expenses > 0) {
            element.classList.add('has-transactions');
            element.classList.add('mixed');
        } else if (income > 0) {
            element.classList.add('has-transactions');
            element.classList.add('income-only');
        } else if (expenses > 0) {
            element.classList.add('has-transactions');
            element.classList.add('expense-only');
        }

        // Add summary
        const summary = document.createElement('div');
        summary.className = 'day-summary';
        
        if (income > 0 && expenses > 0) {
            summary.innerHTML = `
                <span class="income-summary">+${this.app.formatCurrency(income)}</span>
                <span class="expense-summary">-${this.app.formatCurrency(expenses)}</span>
            `;
        } else if (income > 0) {
            summary.innerHTML = `<span class="income-summary">+${this.app.formatCurrency(income)}</span>`;
        } else if (expenses > 0) {
            summary.innerHTML = `<span class="expense-summary">-${this.app.formatCurrency(expenses)}</span>`;
        }
        
        element.appendChild(summary);
    }

    addSpecialDayIndicators(element, date) {
        // Add indicators for special days
        const today = new Date();
        const isToday = date.toDateString() === today.toDateString();
        const isWeekend = date.getDay() === 0 || date.getDay() === 6;
        const isPayday = date.getDate() === 1 || date.getDate() === 15; // Common payday
        
        if (isToday) {
            const todayIndicator = document.createElement('div');
            todayIndicator.className = 'today-indicator';
            element.appendChild(todayIndicator);
        }
        
        if (isWeekend) {
            element.classList.add('weekend');
        }
        
        if (isPayday) {
            const paydayIndicator = document.createElement('div');
            paydayIndicator.className = 'payday-indicator';
            paydayIndicator.innerHTML = '💰';
            element.appendChild(paydayIndicator);
        }
    }

    updateMonthHeader() {
        const monthHeader = document.getElementById('currentMonth');
        if (monthHeader) {
            const year = this.currentMonth.getFullYear();
            const month = this.currentMonth.getMonth() + 1;
            monthHeader.textContent = `${year}年${month}月`;
        }
    }

    animateCalendarTransition() {
        const days = document.querySelectorAll('.calendar-day');
        days.forEach((day, index) => {
            day.style.opacity = '0';
            day.style.transform = 'translateY(20px)';
            
            setTimeout(() => {
                day.style.transition = 'all 0.3s ease-out';
                day.style.opacity = '1';
                day.style.transform = 'translateY(0)';
            }, index * 20);
        });
    }

    handleDayClick(dayElement) {
        const dateStr = dayElement.dataset.date;
        const date = new Date(dateStr);
        
        this.selectedDate = date;
        this.showDayDetails(date, dayElement);
    }

    async showDayDetails(date, dayElement) {
        try {
            const transactions = await db.getTransactionsByDate(date.toISOString().slice(0, 10));
            // Always show day details modal (with or without transactions)
            this.showDayTransactions(date, transactions);
        } catch (error) {
            console.error('Error showing day details:', error);
        }
    }

    openAddTransactionForDate(date) {
        // Set the date in the transaction form
        document.getElementById('transactionDate').value = date.toISOString().slice(0, 10);
        
        // Open the bottom sheet
        openAddTransaction();
    }

    showDayTransactions(date, transactions) {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'flex';
        
        const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
        const totalExpenses = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
        const netAmount = totalIncome - totalExpenses;
        
        // Format date in Chinese
        const month = date.getMonth() + 1;
        const day = date.getDate();
        const weekdays = ['週日', '週一', '週二', '週三', '週四', '週五', '週六'];
        const weekday = weekdays[date.getDay()];
        const chineseDate = `${month}月${day}日 ${weekday}`;
        
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>${chineseDate}</h3>
                    <button class="close-btn" onclick="this.closest('.modal').remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="day-summary-cards">
                        <div class="summary-card income-card">
                            <div class="summary-icon">📈</div>
                            <div class="summary-info">
                                <span class="summary-label">收入</span>
                                <span class="summary-amount income">+${this.app.formatCurrency(totalIncome)}</span>
                            </div>
                        </div>
                        <div class="summary-card expense-card">
                            <div class="summary-icon">📉</div>
                            <div class="summary-info">
                                <span class="summary-label">支出</span>
                                <span class="summary-amount expense">-${this.app.formatCurrency(totalExpenses)}</span>
                            </div>
                        </div>
                        <div class="summary-card net-card">
                            <div class="summary-icon">💰</div>
                            <div class="summary-info">
                                <span class="summary-label">淨額</span>
                                <span class="summary-amount ${netAmount >= 0 ? 'income' : 'expense'}">
                                    ${netAmount >= 0 ? '+' : '-'}${this.app.formatCurrency(Math.abs(netAmount))}
                                </span>
                            </div>
                        </div>
                    </div>
                    <div class="transactions-list-header">
                        <h4>交易明細</h4>
                        <button class="add-transaction-btn" onclick="calendarUI.openAddTransactionForDate(new Date('${date.toISOString()}'))">
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                <path d="M8 2V14M2 8H14" stroke="white" stroke-width="2" stroke-linecap="round"/>
                            </svg>
                            新增
                        </button>
                    </div>
                    <div class="day-transactions-list">
                        ${this.renderDayTransactions(transactions)}
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        this.addModalStyles();
    }

    renderDayTransactions(transactions) {
        if (transactions.length === 0) {
            return '<p style="text-align: center; color: #999; padding: 20px;">當日無交易紀錄</p>';
        }
        return transactions.map(transaction => `
            <div class="day-transaction-item" data-id="${transaction.id}">
                <div class="transaction-icon" style="background: ${this.app.getCategoryColor(transaction.category)}">
                    ${this.app.getCategoryIcon(transaction.category, transaction.type)}
                </div>
                <div class="transaction-details">
                    <div class="transaction-name">${transaction.category}</div>
                    <div class="transaction-note">${transaction.note || ''}</div>
                </div>
                <div class="transaction-amount ${transaction.type}">
                    ${transaction.type === 'income' ? '+' : '-'}${this.app.formatCurrency(transaction.amount)}
                </div>
                <div class="transaction-actions">
                    <button class="action-btn edit-btn" onclick="calendarUI.editTransaction('${transaction.id}')">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <path d="M11.5 2.5L13.5 4.5M4.5 11.5L2.5 13.5L4.5 13.5L4.5 11.5Z" stroke="#666" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                            <path d="M2.5 11.5L11.5 2.5L13.5 4.5L4.5 13.5L2.5 13.5L2.5 11.5Z" stroke="#666" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </button>
                    <button class="action-btn delete-btn" onclick="calendarUI.deleteTransaction('${transaction.id}')">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <path d="M2 4H3.33333H14" stroke="#EF4444" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                            <path d="M5.33333 4V2.66667C5.33333 2.29848 5.46548 1.94544 5.69883 1.68394C5.93218 1.42244 6.24638 1.27273 6.57143 1.27273H9.42857C9.75362 1.27273 10.0678 1.42244 10.3012 1.68394C10.5345 1.94544 10.6667 2.29848 10.6667 2.66667V4M12.5714 4V13.0909C12.5714 13.4591 12.4393 13.8121 12.2059 14.0736C11.9725 14.3351 11.6583 14.4848 11.3333 14.4848H4.66667C4.34162 14.4848 4.02742 14.3351 3.79407 14.0736C3.56072 13.8121 3.42857 13.4591 3.42857 13.0909V4H12.5714Z" stroke="#EF4444" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </button>
                </div>
            </div>
        `).join('');
    }

    async editTransaction(transactionId) {
        try {
            const transactions = await db.getTransactions();
            const transaction = transactions.find(t => t.id === transactionId);
            
            if (transaction) {
                // Populate the form
                document.getElementById('transactionAmount').value = transaction.amount;
                document.getElementById('transactionCategory').value = transaction.category;
                document.getElementById('transactionNote').value = transaction.note || '';
                document.getElementById('transactionDate').value = transaction.date;
                
                // Set transaction type
                this.app.setTransactionType(transaction.type);
                
                // Open the bottom sheet
                openAddTransaction();
                
                // Store for editing
                this.editingTransactionId = transactionId;
                
                // Close modal
                document.querySelector('.modal').remove();
            }
        } catch (error) {
            console.error('Error editing transaction:', error);
        }
    }

    async deleteTransaction(transactionId) {
        if (confirm('Are you sure you want to delete this transaction?')) {
            try {
                await db.deleteTransaction(transactionId);
                
                // Refresh the modal
                const modal = document.querySelector('.modal');
                if (modal) {
                    const date = new Date(modal.querySelector('h3').textContent);
                    const transactions = await db.getTransactionsByDate(date.toISOString().slice(0, 10));
                    
                    if (transactions.length === 0) {
                        modal.remove();
                    } else {
                        // Refresh the transactions list
                        const listContainer = modal.querySelector('.day-transactions-list');
                        listContainer.innerHTML = this.renderDayTransactions(transactions);
                        
                        // Update summary cards
                        this.updateSummaryCards(modal, transactions);
                    }
                }
                
                // Update calendar
                this.updateCalendar();
                
            } catch (error) {
                console.error('Error deleting transaction:', error);
            }
        }
    }

    updateSummaryCards(modal, transactions) {
        const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
        const totalExpenses = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
        const netAmount = totalIncome - totalExpenses;
        
        // Update summary amounts
        const incomeAmount = modal.querySelector('.income-card .summary-amount');
        const expenseAmount = modal.querySelector('.expense-card .summary-amount');
        const netAmountElement = modal.querySelector('.net-card .summary-amount');
        
        if (incomeAmount) incomeAmount.textContent = `+${this.app.formatCurrency(totalIncome)}`;
        if (expenseAmount) expenseAmount.textContent = `-${this.app.formatCurrency(totalExpenses)}`;
        if (netAmountElement) {
            netAmountElement.textContent = `${netAmount >= 0 ? '+' : '-'}${this.app.formatCurrency(Math.abs(netAmount))}`;
            netAmountElement.className = `summary-amount ${netAmount >= 0 ? 'income' : 'expense'}`;
        }
    }

    quickAddTransaction(dayElement) {
        const dateStr = dayElement.dataset.date;
        const date = new Date(dateStr);
        
        // Show quick add dialog
        this.showQuickAddDialog(date);
    }

    showQuickAddDialog(date) {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'flex';
        
        modal.innerHTML = `
            <div class="modal-content quick-add-modal">
                <div class="modal-header">
                    <h3>Quick Add - ${date.toLocaleDateString()}</h3>
                    <button class="close-btn" onclick="this.closest('.modal').remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="quick-add-options">
                        <button class="quick-add-option income" onclick="calendarUI.quickAddAmount('${date.toISOString()}', 'income')">
                            <div class="option-icon">💰</div>
                            <div class="option-text">
                                <div class="option-title">Add Income</div>
                                <div class="option-subtitle">Quick income entry</div>
                            </div>
                        </button>
                        <button class="quick-add-option expense" onclick="calendarUI.quickAddAmount('${date.toISOString()}', 'expense')">
                            <div class="option-icon">💸</div>
                            <div class="option-text">
                                <div class="option-title">Add Expense</div>
                                <div class="option-subtitle">Quick expense entry</div>
                            </div>
                        </button>
                    </div>
                    <div class="quick-amounts">
                        <div class="amount-suggestions">
                            <button class="amount-btn" onclick="calendarUI.setQuickAmount(10)">$10</button>
                            <button class="amount-btn" onclick="calendarUI.setQuickAmount(25)">$25</button>
                            <button class="amount-btn" onclick="calendarUI.setQuickAmount(50)">$50</button>
                            <button class="amount-btn" onclick="calendarUI.setQuickAmount(100)">$100</button>
                            <button class="amount-btn" onclick="calendarUI.setQuickAmount(500)">$500</button>
                        </div>
                        <input type="number" id="quickAmount" placeholder="Custom amount" class="quick-amount-input">
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        this.addQuickAddStyles();
    }

    quickAddAmount(dateStr, type) {
        const amount = document.getElementById('quickAmount').value;
        if (!amount) {
            alert('Please enter an amount');
            return;
        }
        
        this.saveQuickTransaction(dateStr, type, parseFloat(amount));
    }

    setQuickAmount(amount) {
        document.getElementById('quickAmount').value = amount;
    }

    async saveQuickTransaction(dateStr, type, amount) {
        try {
            const transaction = {
                date: dateStr,
                type,
                amount,
                category: type === 'income' ? 'Other Income' : 'Other Expense',
                note: 'Quick add'
            };
            
            await db.addTransaction(transaction);
            
            // Close modal
            document.querySelector('.modal').remove();
            
            // Update calendar
            this.updateCalendar();
            
            // Show success message
            this.showQuickAddSuccess();
            
        } catch (error) {
            console.error('Error saving quick transaction:', error);
        }
    }

    showQuickAddSuccess() {
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            bottom: 100px;
            left: 50%;
            transform: translateX(-50%);
            background: #10B981;
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 500;
            z-index: 1000;
            animation: slideUp 0.3s ease-out;
        `;
        toast.textContent = 'Transaction added successfully';
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'slideDown 0.3s ease-out';
            setTimeout(() => document.body.removeChild(toast), 300);
        }, 2000);
    }

    showMonthPicker() {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'flex';
        
        const currentYear = new Date().getFullYear();
        const years = Array.from({ length: 10 }, (_, i) => currentYear - 5 + i);
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Select Month</h3>
                    <button class="close-btn" onclick="this.closest('.modal').remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="month-picker">
                        <div class="year-selector">
                            <select id="yearSelect">
                                ${years.map(year => `<option value="${year}" ${year === this.currentMonth.getFullYear() ? 'selected' : ''}>${year}</option>`).join('')}
                            </select>
                        </div>
                        <div class="month-grid">
                            ${months.map((month, index) => `
                                <button class="month-option ${index === this.currentMonth.getMonth() ? 'selected' : ''}" 
                                        data-month="${index}" onclick="calendarUI.selectMonth(${index})">
                                    ${month}
                                </button>
                            `).join('')}
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        this.addMonthPickerStyles();
    }

    selectMonth(monthIndex) {
        const yearSelect = document.getElementById('yearSelect');
        const year = parseInt(yearSelect.value);
        
        this.currentMonth = new Date(year, monthIndex, 1);
        this.updateCalendar();
        
        // Close modal
        document.querySelector('.modal').remove();
    }

    previousMonth() {
        this.currentMonth.setMonth(this.currentMonth.getMonth() - 1);
        this.updateCalendar();
    }

    nextMonth() {
        this.currentMonth.setMonth(this.currentMonth.getMonth() + 1);
        this.updateCalendar();
    }

    addModalStyles() {
        if (document.getElementById('calendar-modal-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'calendar-modal-styles';
        style.textContent = `
            .day-summary-cards {
                display: grid;
                grid-template-columns: 1fr;
                gap: 12px;
                margin-bottom: 20px;
            }
            
            .summary-card {
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 16px;
                background: #f9fafb;
                border-radius: 12px;
            }
            
            .summary-icon {
                width: 40px;
                height: 40px;
                border-radius: 10px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 20px;
            }
            
            .income-card .summary-icon {
                background: rgba(16, 185, 129, 0.1);
            }
            
            .expense-card .summary-icon {
                background: rgba(239, 68, 68, 0.1);
            }
            
            .net-card .summary-icon {
                background: rgba(139, 92, 246, 0.1);
            }
            
            .summary-info {
                display: flex;
                flex-direction: column;
                gap: 4px;
            }
            
            .summary-label {
                font-size: 12px;
                color: #666;
            }
            
            .summary-amount {
                font-size: 18px;
                font-weight: 600;
            }
            
            .transactions-list-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 16px;
            }
            
            .add-transaction-btn {
                display: flex;
                align-items: center;
                gap: 6px;
                padding: 8px 12px;
                background: #8B5CF6;
                color: white;
                border: none;
                border-radius: 8px;
                font-size: 12px;
                font-weight: 500;
                cursor: pointer;
            }
            
            .day-transactions-list {
                display: flex;
                flex-direction: column;
                gap: 8px;
            }
            
            .day-transaction-item {
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 12px;
                background: white;
                border-radius: 8px;
                border: 1px solid #f3f4f6;
            }
            
            .transaction-actions {
                display: flex;
                gap: 8px;
            }
            
            .action-btn {
                width: 32px;
                height: 32px;
                border: none;
                border-radius: 6px;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                transition: all 0.2s ease;
            }
            
            .edit-btn {
                background: #f3f4f6;
            }
            
            .edit-btn:hover {
                background: #e5e7eb;
            }
            
            .delete-btn {
                background: rgba(239, 68, 68, 0.1);
            }
            
            .delete-btn:hover {
                background: rgba(239, 68, 68, 0.2);
            }
            
            .day-summary {
                font-size: 10px;
                margin-top: 2px;
                display: flex;
                flex-direction: column;
                gap: 1px;
            }
            
            .income-summary {
                color: #10B981;
                font-weight: 600;
            }
            
            .expense-summary {
                color: #EF4444;
                font-weight: 600;
            }
            
            .day-number {
                font-size: 14px;
                font-weight: 500;
            }
            
            .today-indicator {
                position: absolute;
                top: 2px;
                right: 2px;
                width: 6px;
                height: 6px;
                background: #8B5CF6;
                border-radius: 50%;
            }
            
            .payday-indicator {
                position: absolute;
                top: 2px;
                left: 2px;
                font-size: 10px;
            }
            
            .weekend {
                color: #666;
            }
            
            @keyframes slideUp {
                from {
                    opacity: 0;
                    transform: translate(-50%, 20px);
                }
                to {
                    opacity: 1;
                    transform: translate(-50%, 0);
                }
            }
            
            @keyframes slideDown {
                from {
                    opacity: 1;
                    transform: translate(-50%, 0);
                }
                to {
                    opacity: 0;
                    transform: translate(-50%, 20px);
                }
            }
        `;
        document.head.appendChild(style);
    }

    addQuickAddStyles() {
        if (document.getElementById('quick-add-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'quick-add-styles';
        style.textContent = `
            .quick-add-modal {
                max-width: 400px;
            }
            
            .quick-add-options {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 12px;
                margin-bottom: 20px;
            }
            
            .quick-add-option {
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 16px;
                border: 2px solid #f3f4f6;
                border-radius: 12px;
                background: white;
                cursor: pointer;
                transition: all 0.2s ease;
            }
            
            .quick-add-option:hover {
                border-color: #8B5CF6;
                transform: translateY(-2px);
            }
            
            .quick-add-option.income:hover {
                border-color: #10B981;
            }
            
            .quick-add-option.expense:hover {
                border-color: #EF4444;
            }
            
            .option-icon {
                width: 40px;
                height: 40px;
                border-radius: 10px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 20px;
            }
            
            .quick-add-option.income .option-icon {
                background: rgba(16, 185, 129, 0.1);
            }
            
            .quick-add-option.expense .option-icon {
                background: rgba(239, 68, 68, 0.1);
            }
            
            .option-text {
                display: flex;
                flex-direction: column;
                gap: 2px;
            }
            
            .option-title {
                font-size: 14px;
                font-weight: 600;
                color: #333;
            }
            
            .option-subtitle {
                font-size: 12px;
                color: #666;
            }
            
            .quick-amounts {
                display: flex;
                flex-direction: column;
                gap: 12px;
            }
            
            .amount-suggestions {
                display: flex;
                gap: 8px;
                flex-wrap: wrap;
            }
            
            .amount-btn {
                padding: 8px 12px;
                border: 1px solid #e5e5e5;
                border-radius: 8px;
                background: white;
                font-size: 12px;
                cursor: pointer;
                transition: all 0.2s ease;
            }
            
            .amount-btn:hover {
                background: #f3f4f6;
                border-color: #8B5CF6;
            }
            
            .quick-amount-input {
                width: 100%;
                padding: 12px;
                border: 1px solid #e5e5e5;
                border-radius: 8px;
                font-size: 16px;
            }
        `;
        document.head.appendChild(style);
    }

    addMonthPickerStyles() {
        if (document.getElementById('month-picker-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'month-picker-styles';
        style.textContent = `
            .month-picker {
                display: flex;
                flex-direction: column;
                gap: 20px;
            }
            
            .year-selector select {
                width: 100%;
                padding: 12px;
                border: 1px solid #e5e5e5;
                border-radius: 8px;
                font-size: 16px;
            }
            
            .month-grid {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 8px;
            }
            
            .month-option {
                padding: 12px;
                border: 1px solid #e5e5e5;
                border-radius: 8px;
                background: white;
                font-size: 14px;
                cursor: pointer;
                transition: all 0.2s ease;
            }
            
            .month-option:hover {
                background: #f3f4f6;
            }
            
            .month-option.selected {
                background: #8B5CF6;
                color: white;
                border-color: #8B5CF6;
            }
        `;
        document.head.appendChild(style);
    }
}

// Initialize calendar UI when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.calendarUI = new CalendarScreenUI(window.app);
    window.calendarUI.addModalStyles();
});
