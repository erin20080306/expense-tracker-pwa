// Main App Controller
class ExpenseTracker {
    constructor() {
        this.currentScreen = 'welcome';
        this.currentMonth = new Date();
        this.selectedDate = new Date();
        this.transactionType = 'expense';
        this.supabase = null;
        this.chartInstance = null;
        this.init();
    }

    async init() {
        try {
            // Initialize database
            await db.init();
            await initializeDefaultCategories();
            await initializeSampleData();
            
            // Initialize app
            this.setupEventListeners();
            this.loadSettings();
            this.checkPinLock();
            this.setupNotifications();
            
            console.log('Expense Tracker initialized successfully');
        } catch (error) {
            console.error('Error initializing app:', error);
        }
    }

    setupEventListeners() {
        // Bottom navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const screen = e.currentTarget.dataset.screen;
                this.switchScreen(screen);
            });
        });

        // Transaction type toggle
        document.querySelectorAll('.toggle-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const type = e.currentTarget.dataset.type;
                if (type) {
                    this.setTransactionType(type);
                }
            });
        });

        // Period selector
        const periodSelect = document.getElementById('periodSelect');
        if (periodSelect) {
            periodSelect.addEventListener('change', (e) => {
                this.updateOverviewChart(e.target.value);
            });
        }

        // Settings toggles
        this.setupSettingsListeners();

        // File input for receipt scanning
        const fileInput = document.getElementById('receiptFileInput');
        if (fileInput) {
            fileInput.addEventListener('change', (e) => {
                this.handleReceiptFile(e.target.files[0]);
            });
        }

        // PIN input
        const pinInput = document.getElementById('pinInput');
        if (pinInput) {
            pinInput.addEventListener('input', (e) => {
                if (e.target.value.length === 6) {
                    this.verifyPin(e.target.value);
                }
            });
        }
    }

    setupSettingsListeners() {
        // PIN Lock toggle
        const pinLockToggle = document.getElementById('pinLockToggle');
        if (pinLockToggle) {
            pinLockToggle.addEventListener('change', async (e) => {
                if (e.target.checked) {
                    this.showPinSetupDialog();
                } else {
                    await this.disablePinLock();
                }
            });
        }

        // Daily reminder toggle
        const dailyReminderToggle = document.getElementById('dailyReminderToggle');
        if (dailyReminderToggle) {
            dailyReminderToggle.addEventListener('change', async (e) => {
                await db.setSetting('dailyReminder', e.target.checked);
                if (e.target.checked) {
                    this.setupDailyReminder();
                }
            });
        }

        // Cloud sync toggle
        const cloudSyncToggle = document.getElementById('cloudSyncToggle');
        if (cloudSyncToggle) {
            cloudSyncToggle.addEventListener('change', async (e) => {
                await db.setSetting('cloudSync', e.target.checked);
                if (e.target.checked) {
                    this.enableCloudSync();
                } else {
                    this.disableCloudSync();
                }
            });
        }

        // Budget inputs
        const monthlyBudgetInput = document.getElementById('monthlyBudgetInput');
        if (monthlyBudgetInput) {
            monthlyBudgetInput.addEventListener('change', async (e) => {
                const amount = parseFloat(e.target.value) || 0;
                const currentMonth = new Date().toISOString().slice(0, 7);
                await db.setBudget(currentMonth, amount);
                this.updateBudgetProgress();
            });
        }

        const savingsGoalInput = document.getElementById('savingsGoalInput');
        if (savingsGoalInput) {
            savingsGoalInput.addEventListener('change', async (e) => {
                const goal = parseFloat(e.target.value) || 0;
                const currentMonth = new Date().toISOString().slice(0, 7);
                const budget = await db.getBudget(currentMonth);
                await db.setBudget(currentMonth, budget.amount, goal);
            });
        }
    }

    async loadSettings() {
        try {
            // Load PIN lock setting
            const pinLockEnabled = await db.getSetting('pinLock');
            const pinLockToggle = document.getElementById('pinLockToggle');
            if (pinLockToggle) {
                pinLockToggle.checked = pinLockEnabled || false;
            }

            // Load daily reminder setting
            const dailyReminder = await db.getSetting('dailyReminder');
            const dailyReminderToggle = document.getElementById('dailyReminderToggle');
            if (dailyReminderToggle) {
                dailyReminderToggle.checked = dailyReminder || false;
            }

            // Load cloud sync setting
            const cloudSync = await db.getSetting('cloudSync');
            const cloudSyncToggle = document.getElementById('cloudSyncToggle');
            if (cloudSyncToggle) {
                cloudSyncToggle.checked = cloudSync || false;
            }

            // Load Supabase settings
            const supabaseUrl = await db.getSetting('supabaseUrl');
            const supabaseKey = await db.getSetting('supabaseKey');
            const supabaseUrlInput = document.getElementById('supabaseUrlInput');
            const supabaseKeyInput = document.getElementById('supabaseKeyInput');
            
            if (supabaseUrlInput) supabaseUrlInput.value = supabaseUrl || '';
            if (supabaseKeyInput) supabaseKeyInput.value = supabaseKey || '';

            // Load budget settings
            const currentMonth = new Date().toISOString().slice(0, 7);
            const budget = await db.getBudget(currentMonth);
            const monthlyBudgetInput = document.getElementById('monthlyBudgetInput');
            const savingsGoalInput = document.getElementById('savingsGoalInput');
            
            if (monthlyBudgetInput) monthlyBudgetInput.value = budget.amount || '';
            if (savingsGoalInput) savingsGoalInput.value = budget.savingsGoal || '';

        } catch (error) {
            console.error('Error loading settings:', error);
        }
    }

    async checkPinLock() {
        try {
            const pinLockEnabled = await db.getSetting('pinLock');
            if (pinLockEnabled) {
                const pin = await db.getPin();
                if (pin) {
                    this.showPinScreen();
                    return;
                }
            }
            this.showMainApp();
        } catch (error) {
            console.error('Error checking PIN lock:', error);
            this.showMainApp();
        }
    }

    showPinScreen() {
        document.getElementById('welcomeScreen').style.display = 'none';
        document.getElementById('pinScreen').style.display = 'flex';
        document.getElementById('mainApp').style.display = 'none';
    }

    showMainApp() {
        document.getElementById('welcomeScreen').style.display = 'none';
        document.getElementById('pinScreen').style.display = 'none';
        document.getElementById('mainApp').style.display = 'block';
        this.switchScreen('home');
        this.updateAllData();
    }

    async verifyPin(pin) {
        try {
            const storedPin = await db.getPin();
            if (storedPin) {
                const isValid = await this.verifyPinHash(pin, storedPin.hash);
                if (isValid) {
                    this.showMainApp();
                } else {
                    alert('PIN 錯誤，請再試一次');
                    document.getElementById('pinInput').value = '';
                }
            }
        } catch (error) {
            console.error('Error verifying PIN:', error);
        }
    }

    async verifyPinHash(pin, hash) {
        // Simple hash verification (in production, use proper crypto)
        const encoder = new TextEncoder();
        const data = encoder.encode(pin);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        return hashHex === hash;
    }

    switchScreen(screenName) {
        // Update navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelector(`[data-screen="${screenName}"]`).classList.add('active');

        // Update screens
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });

        switch(screenName) {
            case 'home':
                document.getElementById('homeScreen').classList.add('active');
                this.updateHomeScreen();
                break;
            case 'overview':
                document.getElementById('overviewScreen').classList.add('active');
                this.updateOverviewScreen();
                break;
            case 'calendar':
                document.getElementById('calendarScreen').classList.add('active');
                this.updateCalendarScreen();
                break;
            case 'settings':
                document.getElementById('settingsScreen').classList.add('active');
                break;
        }

        this.currentScreen = screenName;
    }

    setTransactionType(type) {
        this.transactionType = type;
        
        // Update toggle buttons
        document.querySelectorAll('.toggle-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`.toggle-btn[data-type="${type}"]`).classList.add('active');

        // Update category options
        this.updateCategoryOptions();
    }

    async updateCategoryOptions() {
        const categorySelect = document.getElementById('transactionCategory');
        if (!categorySelect) return;

        const categories = await db.getCategories(this.transactionType);
        categorySelect.innerHTML = '';

        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.name;
            option.textContent = `${category.icon} ${category.name}`;
            categorySelect.appendChild(option);
        });
    }

    async updateAllData() {
        await this.updateHomeScreen();
        await this.updateOverviewScreen();
        await this.updateCalendarScreen();
        await this.updateBudgetProgress();
    }

    async updateHomeScreen() {
        try {
            // Get current month data
            const currentMonth = new Date().toISOString().slice(0, 7);
            const startDate = currentMonth + '-01';
            const endDate = currentMonth + '-31';
            
            const stats = await db.getStatistics(startDate, endDate);
            
            // Update balance
            const totalBalance = stats.totalIncome - stats.totalExpenses;
            document.getElementById('totalBalance').textContent = this.formatCurrency(totalBalance);
            document.getElementById('totalIncome').textContent = this.formatCurrency(stats.totalIncome);
            document.getElementById('totalExpenses').textContent = this.formatCurrency(stats.totalExpenses);

            // Update transactions list
            const transactions = await db.getTransactions(10);
            this.updateTransactionsList(transactions);

        } catch (error) {
            console.error('Error updating home screen:', error);
        }
    }

    updateTransactionsList(transactions) {
        const container = document.getElementById('transactionsList');
        if (!container) return;

        container.innerHTML = '';

        if (transactions.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #666; padding: 20px;">尚無交易紀錄</p>';
            return;
        }

        // Group transactions by date
        const groupedByDate = {};
        transactions.forEach(transaction => {
            const dateKey = transaction.date;
            if (!groupedByDate[dateKey]) {
                groupedByDate[dateKey] = [];
            }
            groupedByDate[dateKey].push(transaction);
        });

        // Sort dates descending
        const sortedDates = Object.keys(groupedByDate).sort((a, b) => new Date(b) - new Date(a));

        sortedDates.forEach((dateKey, index) => {
            const dateTransactions = groupedByDate[dateKey];
            const dateGroup = document.createElement('div');
            dateGroup.className = 'transaction-date-group';
            
            // Calculate daily total
            const dailyIncome = dateTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
            const dailyExpense = dateTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
            
            // Format date in Chinese
            const date = new Date(dateKey);
            const chineseDate = this.formatChineseDate(date);
            
            dateGroup.innerHTML = `
                <div class="date-header" data-date="${dateKey}">
                    <div class="date-info">
                        <span class="date-text">${chineseDate}</span>
                        <span class="date-summary">
                            ${dailyIncome > 0 ? '<span class="income">+' + this.formatCurrency(dailyIncome) + '</span>' : ''}
                            ${dailyExpense > 0 ? '<span class="expense">-' + this.formatCurrency(dailyExpense) + '</span>' : ''}
                        </span>
                    </div>
                    <svg class="collapse-icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M4 6L8 10L12 6" stroke="#666" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                </div>
                <div class="date-transactions ${index === 0 ? 'expanded' : 'collapsed'}">
                    ${this.renderTransactionItems(dateTransactions)}
                </div>
            `;
            
            // Add click handler for collapse/expand
            const header = dateGroup.querySelector('.date-header');
            header.addEventListener('click', () => {
                const transactionsDiv = dateGroup.querySelector('.date-transactions');
                const icon = dateGroup.querySelector('.collapse-icon');
                transactionsDiv.classList.toggle('expanded');
                transactionsDiv.classList.toggle('collapsed');
                icon.classList.toggle('rotated');
            });
            
            container.appendChild(dateGroup);
        });
    }

    renderTransactionItems(transactions) {
        return transactions.map(transaction => {
            const categoryIcon = this.getCategoryIcon(transaction.category, transaction.type);
            const amountClass = transaction.type === 'income' ? 'income' : 'expense';
            const amountPrefix = transaction.type === 'income' ? '+' : '-';
            
            return `
                <div class="transaction-item" data-id="${transaction.id}" onclick="showTransactionActions('${transaction.id}')">
                    <div class="transaction-icon" style="background: ${this.getCategoryColor(transaction.category)}">
                        ${categoryIcon}
                    </div>
                    <div class="transaction-details">
                        <div class="transaction-name">${transaction.category}</div>
                        <div class="transaction-note">${transaction.note || ''}</div>
                    </div>
                    <div class="transaction-amount ${amountClass}">
                        ${amountPrefix}${this.formatCurrency(transaction.amount)}
                    </div>
                </div>
            `;
        }).join('');
    }

    formatChineseDate(date) {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
        const targetDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        
        if (targetDate.getTime() === today.getTime()) {
            return '今天';
        } else if (targetDate.getTime() === yesterday.getTime()) {
            return '昨天';
        } else {
            const month = date.getMonth() + 1;
            const day = date.getDate();
            const weekdays = ['週日', '週一', '週二', '週三', '週四', '週五', '週六'];
            const weekday = weekdays[date.getDay()];
            return `${month}月${day}日 ${weekday}`;
        }
    }

    async updateOverviewScreen() {
        try {
            // Delegate to overviewUI if it exists
            if (window.overviewUI && typeof window.overviewUI.updateOverview === 'function') {
                await window.overviewUI.updateOverview();
                return;
            }
        } catch (error) {
            console.error('Error updating overview screen:', error);
        }
    }

    updateOverviewChart(period) {
        // This would be implemented with Chart.js
        // For now, we'll create a placeholder
        const canvas = document.getElementById('statisticsChart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        
        // Destroy existing chart if it exists
        if (this.chartInstance) {
            this.chartInstance.destroy();
        }

        // Create new chart
        this.chartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
                datasets: [{
                    label: 'Income',
                    data: [2000, 1500, 2500, 1800],
                    backgroundColor: '#8B5CF6',
                    borderRadius: 8
                }, {
                    label: 'Expenses',
                    data: [1200, 1800, 1500, 2200],
                    backgroundColor: '#F97316',
                    borderRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return '$' + value.toLocaleString();
                            }
                        }
                    }
                }
            }
        });
    }

    updateCategoriesList(stats) {
        const container = document.getElementById('categoriesList');
        if (!container) return;

        container.innerHTML = '';

        const activeType = document.querySelector('.toggle-btn.active').dataset.type;
        const categories = activeType === 'income' ? stats.incomeByCategory : stats.expensesByCategory;

        Object.entries(categories).forEach(([category, amount]) => {
            const item = document.createElement('div');
            item.className = 'category-item';
            
            item.innerHTML = `
                <span class="category-name">${this.getCategoryIcon(category, activeType)} ${category}</span>
                <span class="category-amount">${this.formatCurrency(amount)}</span>
            `;

            container.appendChild(item);
        });

        if (Object.keys(categories).length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #666; padding: 20px;">尚無類別</p>';
        }
    }

    async updateCalendarScreen() {
        try {
            if (window.calendarUI && typeof window.calendarUI.updateCalendar === 'function') {
                await window.calendarUI.updateCalendar();
                return;
            }
        } catch (error) {
            console.error('Error updating calendar screen:', error);
        }
    }

    updateCalendarGrid() {
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

        // Update month display
        document.getElementById('currentMonth').textContent = 
            firstDay.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

        // Previous month days
        for (let i = startDate - 1; i >= 0; i--) {
            const day = prevEndDate - i;
            const dayElement = this.createCalendarDay(day, true, new Date(year, month - 1, day));
            container.appendChild(dayElement);
        }

        // Current month days
        for (let day = 1; day <= endDate; day++) {
            const date = new Date(year, month, day);
            const dayElement = this.createCalendarDay(day, false, date);
            container.appendChild(dayElement);
        }

        // Next month days
        const remainingDays = 42 - (startDate + endDate);
        for (let day = 1; day <= remainingDays; day++) {
            const dayElement = this.createCalendarDay(day, true, new Date(year, month + 1, day));
            container.appendChild(dayElement);
        }
    }

    async createCalendarDay(day, isOtherMonth, date) {
        const dayElement = document.createElement('div');
        dayElement.className = 'calendar-day';
        
        if (isOtherMonth) {
            dayElement.classList.add('other-month');
        }

        const today = new Date();
        if (date.toDateString() === today.toDateString()) {
            dayElement.classList.add('today');
        }

        // Get transactions for this date
        const dateStr = date.toISOString().slice(0, 10);
        const transactions = await db.getTransactionsByDate(dateStr);
        
        if (transactions.length > 0) {
            const income = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
            const expenses = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
            
            if (income > 0 && expenses > 0) {
                dayElement.classList.add('has-transactions');
                dayElement.classList.add('income');
                dayElement.classList.add('expense');
            } else if (income > 0) {
                dayElement.classList.add('has-transactions');
                dayElement.classList.add('income');
            } else if (expenses > 0) {
                dayElement.classList.add('has-transactions');
                dayElement.classList.add('expense');
            }

            const summary = document.createElement('div');
            summary.className = 'calendar-day-summary';
            
            if (income > 0 && expenses > 0) {
                summary.textContent = `+${this.formatCurrency(income)}/-${this.formatCurrency(expenses)}`;
            } else if (income > 0) {
                summary.textContent = `+${this.formatCurrency(income)}`;
            } else if (expenses > 0) {
                summary.textContent = `-${this.formatCurrency(expenses)}`;
            }
            
            dayElement.appendChild(summary);
        }

        dayElement.insertBefore(document.createTextNode(day), dayElement.firstChild);

        dayElement.addEventListener('click', () => {
            this.selectDate(date);
        });

        return dayElement;
    }

    selectDate(date) {
        this.selectedDate = date;
        this.openAddTransaction(date);
    }

    async updateBudgetProgress() {
        try {
            const currentMonth = new Date().toISOString().slice(0, 7);
            const budget = await db.getBudget(currentMonth);

            if (budget.amount > 0) {
                const startDate = currentMonth + '-01';
                const endDate = currentMonth + '-31';
                const stats = await db.getStatistics(startDate, endDate);

                const spent = stats.totalExpenses;
                const remaining = budget.amount - spent;
                const percentage = (spent / budget.amount) * 100;

                const progressCard = document.getElementById('budgetProgressCard');
                progressCard.style.display = 'block';

                const remainingEl = document.getElementById('budgetRemaining');
                remainingEl.textContent = '剩餘 ' + this.formatCurrency(remaining);

                document.getElementById('budgetSpent').textContent = '已用 ' + this.formatCurrency(spent);
                document.getElementById('budgetTotal').textContent = '總額 ' + this.formatCurrency(budget.amount);

                const progressFill = document.getElementById('budgetProgressFill');
                progressFill.style.width = Math.min(percentage, 100) + '%';

                if (percentage > 100) {
                    progressFill.classList.add('over-budget');
                    remainingEl.textContent = '超出預算 ' + this.formatCurrency(Math.abs(remaining));
                    remainingEl.style.color = '#EF4444';
                } else {
                    progressFill.classList.remove('over-budget');
                    remainingEl.style.color = '#10B981';
                }
            } else {
                document.getElementById('budgetProgressCard').style.display = 'none';
            }
        } catch (error) {
            console.error('Error updating budget progress:', error);
        }
    }

    // Utility functions
    formatCurrency(amount) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    }

    formatTime(dateStr) {
        const date = new Date(dateStr);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        if (date.toDateString() === today.toDateString()) {
            return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
        } else if (date.toDateString() === yesterday.toDateString()) {
            return '昨天';
        } else {
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        }
    }

    getCategoryIcon(categoryName, type) {
        const defaultIcons = {
            income: '💰',
            expense: '💸'
        };
        return defaultIcons[type] || '📝';
    }

    getCategoryColor(categoryName) {
        const colors = [
            '#8B5CF6', '#EC4899', '#3B82F6', '#10B981', '#F59E0B',
            '#EF4444', '#6366F1', '#14B8A6', '#F97316', '#06B6D4'
        ];
        let hash = 0;
        for (let i = 0; i < categoryName.length; i++) {
            hash = categoryName.charCodeAt(i) + ((hash << 5) - hash);
        }
        return colors[Math.abs(hash) % colors.length];
    }

    // Notification setup
    async setupNotifications() {
        if ('Notification' in window) {
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
                console.log('Notification permission granted');
            }
        }
    }

    setupDailyReminder() {
        // This would set up daily reminders
        // For now, we'll just log it
        console.log('Daily reminder setup');
    }

    // Cloud sync functions
    async enableCloudSync() {
        const supabaseUrl = await db.getSetting('supabaseUrl');
        const supabaseKey = await db.getSetting('supabaseKey');
        
        if (supabaseUrl && supabaseKey) {
            try {
                this.supabase = createClient(supabaseUrl, supabaseKey);
                console.log('Cloud sync enabled');
            } catch (error) {
                console.error('Error enabling cloud sync:', error);
            }
        }
    }

    disableCloudSync() {
        this.supabase = null;
        console.log('Cloud sync disabled');
    }

    // PIN functions
    async showPinSetupDialog() {
        const pin = prompt('設定 4-6 位數 PIN：');
        if (pin && pin.length >= 4 && pin.length <= 6 && /^\d+$/.test(pin)) {
            const encoder = new TextEncoder();
            const data = encoder.encode(pin);
            const hashBuffer = await crypto.subtle.digest('SHA-256', data);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
            
            await db.setPin(hashHex);
            console.log('PIN set successfully');
        } else {
            document.getElementById('pinLockToggle').checked = false;
        }
    }

    async disablePinLock() {
        await db.clearPin();
        console.log('PIN lock disabled');
    }

    // Receipt scanning
    async scanReceipt() {
        document.getElementById('receiptFileInput').click();
    }

    async handleReceiptFile(file) {
        if (!file) return;

        // Show loading indicator
        this.showScanningProgress();

        try {
            // Use Tesseract.js for OCR with Chinese + English
            const result = await Tesseract.recognize(file, 'chi_tra+eng', {
                logger: m => {
                    if (m.status === 'recognizing text') {
                        this.updateScanningProgress(Math.round(m.progress * 100));
                    }
                }
            });

            this.hideScanningProgress();

            const ocrText = result.data.text;
            console.log('OCR Result:', ocrText);

            // Extract all data from receipt
            const extractedData = this.extractReceiptData(ocrText);
            
            if (extractedData.amounts.length === 0) {
                alert('未能識別出金額，請手動輸入');
                return;
            }

            // Show selection modal
            this.showReceiptDataModal(extractedData);

        } catch (error) {
            this.hideScanningProgress();
            console.error('Error scanning receipt:', error);
            alert('掃描收據失敗，請重試');
        }
    }

    extractReceiptData(text) {
        const data = {
            amounts: [],
            date: null,
            invoiceNumber: null
        };

        // Extract amounts (Taiwan format: NT$, $, or just numbers)
        // Match patterns like: NT$100, $100, 100元, 100.00, 1,234
        const amountPatterns = [
            /NT\$\s*([\d,]+(?:\.\d{2})?)/gi,
            /\$\s*([\d,]+(?:\.\d{2})?)/g,
            /([\d,]+(?:\.\d{2})?)\s*元/g,
            /金額[\s:]*([\d,]+(?:\.\d{2})?)/gi,
            /總計[\s:]*([\d,]+(?:\.\d{2})?)/gi,
            /合計[\s:]*([\d,]+(?:\.\d{2})?)/gi,
            /Total[\s:]*([\d,]+(?:\.\d{2})?)/gi,
            /Amount[\s:]*([\d,]+(?:\.\d{2})?)/gi
        ];

        const foundAmounts = new Set();
        amountPatterns.forEach(pattern => {
            let match;
            while ((match = pattern.exec(text)) !== null) {
                const amount = parseFloat(match[1].replace(/,/g, ''));
                if (amount > 0 && amount < 1000000) { // Reasonable amount range
                    foundAmounts.add(amount);
                }
            }
        });

        // Also try to find standalone numbers that look like amounts
        const standaloneNumbers = text.match(/\b(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\b/g);
        if (standaloneNumbers) {
            standaloneNumbers.forEach(numStr => {
                const num = parseFloat(numStr.replace(/,/g, ''));
                if (num >= 10 && num < 100000) { // Likely amounts
                    foundAmounts.add(num);
                }
            });
        }

        data.amounts = Array.from(foundAmounts).sort((a, b) => b - a); // Sort descending

        // Extract date (Taiwan format: 113/01/11, 2024/01/11, 2024-01-11, 01/11)
        const datePatterns = [
            /(\d{3})[\/\-](\d{1,2})[\/\-](\d{1,2})/, // Taiwan year: 113/01/11
            /(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/, // Western: 2024/01/11
            /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/, // MM/DD/YYYY
        ];

        for (const pattern of datePatterns) {
            const match = text.match(pattern);
            if (match) {
                let year, month, day;
                if (match[1].length === 3) {
                    // Taiwan year (ROC)
                    year = parseInt(match[1]) + 1911;
                    month = match[2].padStart(2, '0');
                    day = match[3].padStart(2, '0');
                } else if (match[1].length === 4) {
                    year = match[1];
                    month = match[2].padStart(2, '0');
                    day = match[3].padStart(2, '0');
                } else {
                    month = match[1].padStart(2, '0');
                    day = match[2].padStart(2, '0');
                    year = match[3];
                }
                data.date = `${year}-${month}-${day}`;
                break;
            }
        }

        // Extract invoice number (Taiwan format: XX-12345678)
        const invoicePatterns = [
            /([A-Z]{2})[-\s]?(\d{8})/i, // Standard: AB-12345678
            /發票號碼[\s:]*([A-Z]{2}[-\s]?\d{8})/i,
            /Invoice[\s#:]*([A-Z0-9-]+)/i
        ];

        for (const pattern of invoicePatterns) {
            const match = text.match(pattern);
            if (match) {
                data.invoiceNumber = match[1].toUpperCase() + (match[2] ? match[2] : '');
                break;
            }
        }

        return data;
    }

    showScanningProgress() {
        const overlay = document.createElement('div');
        overlay.id = 'scanningOverlay';
        overlay.innerHTML = `
            <div style="
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0,0,0,0.7);
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                z-index: 10000;
            ">
                <div style="
                    background: white;
                    padding: 30px;
                    border-radius: 16px;
                    text-align: center;
                ">
                    <div style="font-size: 40px; margin-bottom: 16px;">📷</div>
                    <div style="font-size: 18px; font-weight: 600; margin-bottom: 12px;">正在掃描收據...</div>
                    <div style="
                        width: 200px;
                        height: 8px;
                        background: #e5e5e5;
                        border-radius: 4px;
                        overflow: hidden;
                    ">
                        <div id="scanProgress" style="
                            width: 0%;
                            height: 100%;
                            background: linear-gradient(90deg, #8B5CF6, #7C3AED);
                            transition: width 0.3s;
                        "></div>
                    </div>
                    <div id="scanProgressText" style="margin-top: 8px; color: #666;">0%</div>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
    }

    updateScanningProgress(percent) {
        const progress = document.getElementById('scanProgress');
        const text = document.getElementById('scanProgressText');
        if (progress) progress.style.width = percent + '%';
        if (text) text.textContent = percent + '%';
    }

    hideScanningProgress() {
        const overlay = document.getElementById('scanningOverlay');
        if (overlay) overlay.remove();
    }

    showReceiptDataModal(data) {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.id = 'receiptDataModal';
        modal.style.display = 'flex';

        const amountOptions = data.amounts.map((amount, index) => `
            <button class="amount-option ${index === 0 ? 'selected' : ''}" data-amount="${amount}" onclick="selectReceiptAmount(this, ${amount})">
                ${this.formatCurrency(amount)}
            </button>
        `).join('');

        modal.innerHTML = `
            <div class="modal-content" style="max-width: 400px;">
                <div class="modal-header">
                    <h3>📝 掃描結果</h3>
                    <button class="close-btn" onclick="closeReceiptModal()">&times;</button>
                </div>
                <div class="modal-body">
                    ${data.date ? `
                        <div style="margin-bottom: 16px;">
                            <label style="font-weight: 600; color: #333;">📅 日期</label>
                            <div style="margin-top: 4px; padding: 12px; background: #f3f4f6; border-radius: 8px;">
                                ${data.date}
                            </div>
                        </div>
                    ` : ''}
                    
                    ${data.invoiceNumber ? `
                        <div style="margin-bottom: 16px;">
                            <label style="font-weight: 600; color: #333;">🧾 發票號碼</label>
                            <div style="margin-top: 4px; padding: 12px; background: #f3f4f6; border-radius: 8px;">
                                ${data.invoiceNumber}
                            </div>
                        </div>
                    ` : ''}
                    
                    <div style="margin-bottom: 16px;">
                        <label style="font-weight: 600; color: #333;">💰 請選擇金額</label>
                        <div style="margin-top: 8px; display: flex; flex-wrap: wrap; gap: 8px;">
                            ${amountOptions}
                        </div>
                    </div>

                    <div style="margin-top: 20px; display: flex; gap: 12px;">
                        <button onclick="closeReceiptModal()" style="
                            flex: 1;
                            padding: 12px;
                            background: #e5e5e5;
                            color: #333;
                            border: none;
                            border-radius: 8px;
                            font-size: 14px;
                            cursor: pointer;
                        ">取消</button>
                        <button onclick="applyReceiptData()" style="
                            flex: 1;
                            padding: 12px;
                            background: #8B5CF6;
                            color: white;
                            border: none;
                            border-radius: 8px;
                            font-size: 14px;
                            font-weight: 600;
                            cursor: pointer;
                        ">套用</button>
                    </div>
                </div>
            </div>
        `;

        // Store data for later use
        modal.dataset.date = data.date || '';
        modal.dataset.invoiceNumber = data.invoiceNumber || '';
        modal.dataset.selectedAmount = data.amounts[0] || '';

        document.body.appendChild(modal);
        this.addReceiptModalStyles();
    }

    addReceiptModalStyles() {
        if (document.getElementById('receipt-modal-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'receipt-modal-styles';
        style.textContent = `
            .amount-option {
                padding: 10px 16px;
                background: #f3f4f6;
                border: 2px solid transparent;
                border-radius: 8px;
                font-size: 14px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s;
            }
            .amount-option:hover {
                background: #e5e7eb;
            }
            .amount-option.selected {
                background: #EDE9FE;
                border-color: #8B5CF6;
                color: #7C3AED;
            }
        `;
        document.head.appendChild(style);
    }

    // Export/Import functions
    async exportData() {
        try {
            const data = await db.exportData();
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `expense-tracker-backup-${new Date().toISOString().slice(0, 10)}.json`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error exporting data:', error);
        }
    }

    async importData() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (file) {
                try {
                    const text = await file.text();
                    const data = JSON.parse(text);
                    await db.importData(data);
                    this.updateAllData();
                    alert('已匯入資料');
                } catch (error) {
                    console.error('Error importing data:', error);
                    alert('匯入失敗，請確認檔案格式');
                }
            }
        };
        input.click();
    }
}

// Global functions for HTML event handlers
function startApp() {
    app.showMainApp();
}

function openAddTransaction(date = null) {
    const sheet = document.getElementById('addTransactionSheet');
    sheet.classList.add('open');
    
    // 如果不是編輯模式，清空表單
    if (!window.editingTransactionId) {
        document.getElementById('transactionAmount').value = '';
        document.getElementById('transactionNote').value = '';
    }
    
    if (date) {
        if (typeof date === 'string') {
            document.getElementById('transactionDate').value = date;
        } else {
            document.getElementById('transactionDate').value = date.toISOString().slice(0, 10);
        }
    } else if (!window.editingTransactionId) {
        document.getElementById('transactionDate').value = new Date().toISOString().slice(0, 10);
    }
    
    app.updateCategoryOptions();
}

function closeAddTransaction() {
    const sheet = document.getElementById('addTransactionSheet');
    sheet.classList.remove('open');
    
    // Clear form
    document.getElementById('transactionAmount').value = '';
    document.getElementById('transactionNote').value = '';
    document.getElementById('transactionCategory').selectedIndex = 0;
    
    // 清除編輯狀態
    window.editingTransactionId = null;
}

async function saveTransaction() {
    try {
        const amount = parseFloat(document.getElementById('transactionAmount').value);
        const category = document.getElementById('transactionCategory').value;
        const note = document.getElementById('transactionNote').value;
        const date = document.getElementById('transactionDate').value;
        const type = app.transactionType;

        if (!amount || !category || !date) {
            alert('請填寫所有必填欄位');
            return;
        }

        const transaction = {
            date,
            type,
            amount,
            category,
            note
        };

        // 檢查是否為編輯模式
        if (window.editingTransactionId) {
            await db.deleteTransaction(window.editingTransactionId);
            window.editingTransactionId = null;
        }
        
        await db.addTransaction(transaction);
        closeAddTransaction();
        await app.updateAllData();
        
        // Also update calendar UI if it exists
        if (window.calendarUI && typeof window.calendarUI.updateCalendar === 'function') {
            await window.calendarUI.updateCalendar();
        }
        
        console.log('Transaction saved successfully');
    } catch (error) {
        console.error('Error saving transaction:', error);
        alert('儲存失敗，請重試');
    }
}

function previousMonth() {
    app.currentMonth.setMonth(app.currentMonth.getMonth() - 1);
    app.updateCalendarScreen();
}

function nextMonth() {
    app.currentMonth.setMonth(app.currentMonth.getMonth() + 1);
    app.updateCalendarScreen();
}

function addPinDigit(digit) {
    const input = document.getElementById('pinInput');
    input.value += digit;
    if (input.value.length === 6) {
        app.verifyPin(input.value);
    }
}

function clearPin() {
    document.getElementById('pinInput').value = '';
}

function deletePinDigit() {
    const input = document.getElementById('pinInput');
    input.value = input.value.slice(0, -1);
}

function showCategoriesDialog() {
    document.getElementById('categoriesModal').style.display = 'flex';
    loadCategoriesForManagement();
}

function closeCategoriesDialog() {
    document.getElementById('categoriesModal').style.display = 'none';
}

function showChangePinDialog() {
    document.getElementById('changePinModal').style.display = 'flex';
}

function closeChangePinDialog() {
    document.getElementById('changePinModal').style.display = 'none';
    // Clear form
    document.getElementById('currentPin').value = '';
    document.getElementById('newPin').value = '';
    document.getElementById('confirmNewPin').value = '';
}

async function changePin() {
    const currentPin = document.getElementById('currentPin').value;
    const newPin = document.getElementById('newPin').value;
    const confirmNewPin = document.getElementById('confirmNewPin').value;

    if (!currentPin || !newPin || !confirmNewPin) {
        alert('Please fill in all fields');
        return;
    }

    if (newPin !== confirmNewPin) {
        alert('New PINs do not match');
        return;
    }

    if (newPin.length < 4 || newPin.length > 6 || !/^\d+$/.test(newPin)) {
        alert('PIN must be 4-6 digits');
        return;
    }

    try {
        const isValid = await app.verifyPinHash(currentPin, (await db.getPin()).hash);
        if (isValid) {
            const encoder = new TextEncoder();
            const data = encoder.encode(newPin);
            const hashBuffer = await crypto.subtle.digest('SHA-256', data);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
            
            await db.setPin(hashHex);
            closeChangePinDialog();
            alert('PIN changed successfully');
        } else {
            alert('Current PIN is incorrect');
        }
    } catch (error) {
        console.error('Error changing PIN:', error);
        alert('Error changing PIN. Please try again.');
    }
}

async function loadCategoriesForManagement() {
    try {
        const categories = await db.getCategories();
        const container = document.getElementById('categoriesListManagement');
        container.innerHTML = '';

        categories.forEach(category => {
            const item = document.createElement('div');
            item.className = 'category-management-item';
            item.innerHTML = `
                <span>${category.icon} ${category.name}</span>
                <button class="delete-category-btn" onclick="deleteCategory('${category.id}')">刪除</button>
            `;
            container.appendChild(item);
        });
    } catch (error) {
        console.error('Error loading categories for management:', error);
    }
}

async function addCategory() {
    const name = document.getElementById('newCategoryName').value;
    const activeTab = document.querySelector('.tab-btn.active').dataset.tab;
    
    if (!name) {
        alert('請輸入類別名稱');
        return;
    }

    try {
        const category = {
            name,
            type: activeTab,
            icon: activeTab === 'income' ? '💰' : '💸'
        };

        await db.addCategory(category);
        document.getElementById('newCategoryName').value = '';
        loadCategoriesForManagement();
        app.updateCategoryOptions();
    } catch (error) {
        console.error('Error adding category:', error);
        alert('新增類別失敗，請重試');
    }
}

async function deleteCategory(id) {
    if (confirm('確定要刪除此類別嗎？')) {
        try {
            await db.deleteCategory(id);
            loadCategoriesForManagement();
            app.updateCategoryOptions();
        } catch (error) {
            console.error('Error deleting category:', error);
            alert('刪除類別失敗，請重試');
        }
    }
}

function exportData() {
    app.exportData();
}

function importData() {
    app.importData();
}

// 查看全部交易
async function showAllTransactions() {
    try {
        const transactions = await db.getTransactions(100);
        
        const modal = document.createElement('div');
        modal.className = 'all-transactions-modal';
        modal.id = 'allTransactionsModal';
        
        // Group transactions by date
        const groupedByDate = {};
        transactions.forEach(transaction => {
            const dateKey = transaction.date;
            if (!groupedByDate[dateKey]) {
                groupedByDate[dateKey] = [];
            }
            groupedByDate[dateKey].push(transaction);
        });
        
        const sortedDates = Object.keys(groupedByDate).sort((a, b) => new Date(b) - new Date(a));
        
        let transactionsHTML = '';
        sortedDates.forEach(dateKey => {
            const dateTransactions = groupedByDate[dateKey];
            const dailyIncome = dateTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
            const dailyExpense = dateTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
            
            const date = new Date(dateKey);
            const chineseDate = app.formatChineseDate(date);
            
            transactionsHTML += `
                <div class="transaction-date-group">
                    <div class="date-header" onclick="this.nextElementSibling.classList.toggle('expanded'); this.nextElementSibling.classList.toggle('collapsed'); this.querySelector('.collapse-icon').classList.toggle('rotated');">
                        <div class="date-info">
                            <span class="date-text">${chineseDate}</span>
                            <span class="date-summary">
                                ${dailyIncome > 0 ? '<span class="income">+' + app.formatCurrency(dailyIncome) + '</span>' : ''}
                                ${dailyExpense > 0 ? '<span class="expense">-' + app.formatCurrency(dailyExpense) + '</span>' : ''}
                            </span>
                        </div>
                        <svg class="collapse-icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <path d="M4 6L8 10L12 6" stroke="#666" stroke-width="2" stroke-linecap="round"/>
                        </svg>
                    </div>
                    <div class="date-transactions expanded">
                        ${app.renderTransactionItems(dateTransactions)}
                    </div>
                </div>
            `;
        });
        
        modal.innerHTML = `
            <div class="all-transactions-header">
                <h3>所有交易紀錄</h3>
                <button class="close-btn" onclick="closeAllTransactions()">&times;</button>
            </div>
            <div class="all-transactions-content">
                ${transactions.length === 0 ? '<p style="text-align: center; color: #666; padding: 40px;">尚無交易紀錄</p>' : transactionsHTML}
            </div>
        `;
        
        document.body.appendChild(modal);
    } catch (error) {
        console.error('Error showing all transactions:', error);
    }
}

function closeAllTransactions() {
    const modal = document.getElementById('allTransactionsModal');
    if (modal) modal.remove();
}

// 顯示交易操作選單（編輯/刪除）
async function showTransactionActions(transactionId) {
    try {
        const transactions = await db.getTransactions();
        const transaction = transactions.find(t => t.id === transactionId);
        
        if (!transaction) return;
        
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.id = 'transactionActionsModal';
        modal.style.display = 'flex';
        
        const amountClass = transaction.type === 'income' ? 'income' : 'expense';
        const amountPrefix = transaction.type === 'income' ? '+' : '-';
        
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 350px;">
                <div class="modal-header">
                    <h3>交易詳情</h3>
                    <button class="close-btn" onclick="closeTransactionActions()">&times;</button>
                </div>
                <div class="modal-body">
                    <div style="text-align: center; padding: 16px 0;">
                        <div style="font-size: 24px; font-weight: 600;" class="${amountClass}">
                            ${amountPrefix}${app.formatCurrency(transaction.amount)}
                        </div>
                        <div style="color: #666; margin-top: 8px;">${transaction.category}</div>
                        <div style="color: #999; font-size: 12px; margin-top: 4px;">${transaction.date}</div>
                        ${transaction.note ? `<div style="color: #888; font-size: 13px; margin-top: 8px;">${transaction.note}</div>` : ''}
                    </div>
                    <div style="display: flex; gap: 12px; margin-top: 16px;">
                        <button onclick="editTransactionFromHome('${transactionId}')" style="flex: 1; padding: 12px; background: #8B5CF6; color: white; border: none; border-radius: 8px; font-size: 14px; cursor: pointer;">
                            編輯
                        </button>
                        <button onclick="deleteTransactionFromHome('${transactionId}')" style="flex: 1; padding: 12px; background: #EF4444; color: white; border: none; border-radius: 8px; font-size: 14px; cursor: pointer;">
                            刪除
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    } catch (error) {
        console.error('Error showing transaction actions:', error);
    }
}

function closeTransactionActions() {
    const modal = document.getElementById('transactionActionsModal');
    if (modal) modal.remove();
}

async function editTransactionFromHome(transactionId) {
    try {
        const transactions = await db.getTransactions();
        const transaction = transactions.find(t => t.id === transactionId);
        
        if (transaction) {
            closeTransactionActions();
            
            // 設定表單
            document.getElementById('transactionAmount').value = transaction.amount;
            document.getElementById('transactionCategory').value = transaction.category;
            document.getElementById('transactionNote').value = transaction.note || '';
            document.getElementById('transactionDate').value = transaction.date;
            
            // 設定交易類型
            app.setTransactionType(transaction.type);
            
            // 儲存編輯中的交易 ID
            window.editingTransactionId = transactionId;
            
            // 打開表單
            openAddTransaction();
        }
    } catch (error) {
        console.error('Error editing transaction:', error);
    }
}

async function deleteTransactionFromHome(transactionId) {
    if (confirm('確定要刪除這筆交易嗎？')) {
        try {
            await db.deleteTransaction(transactionId);
            closeTransactionActions();
            await app.updateAllData();
            
            // Also update calendar UI if it exists
            if (window.calendarUI && typeof window.calendarUI.updateCalendar === 'function') {
                await window.calendarUI.updateCalendar();
            }
        } catch (error) {
            console.error('Error deleting transaction:', error);
            alert('刪除失敗，請重試');
        }
    }
}

// Receipt scanning global functions
function scanReceipt() {
    app.scanReceipt();
}

function selectReceiptAmount(btn, amount) {
    document.querySelectorAll('.amount-option').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    const modal = document.getElementById('receiptDataModal');
    if (modal) modal.dataset.selectedAmount = amount;
}

function closeReceiptModal() {
    const modal = document.getElementById('receiptDataModal');
    if (modal) modal.remove();
}

function applyReceiptData() {
    const modal = document.getElementById('receiptDataModal');
    if (!modal) return;

    const amount = modal.dataset.selectedAmount;
    const date = modal.dataset.date;
    const invoiceNumber = modal.dataset.invoiceNumber;

    // Fill in the form
    if (amount) {
        document.getElementById('transactionAmount').value = amount;
    }
    if (date) {
        document.getElementById('transactionDate').value = date;
    }
    if (invoiceNumber) {
        document.getElementById('transactionNote').value = `發票: ${invoiceNumber}`;
    }

    // Close modal
    closeReceiptModal();
}

// Initialize app when DOM is loaded
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new ExpenseTracker();
    window.app = app;
});

// Service Worker registration
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js')
            .then(registration => {
                console.log('SW registered: ', registration);
            })
            .catch(registrationError => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}
