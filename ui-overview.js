// Overview Screen UI Controller
class OverviewScreenUI {
    constructor(app) {
        this.app = app;
        this.currentPeriod = 'monthly';
        this.currentView = 'income';
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupChartInteractions();
    }

    setupEventListeners() {
        // Period selector
        const periodSelect = document.getElementById('periodSelect');
        if (periodSelect) {
            periodSelect.addEventListener('change', (e) => {
                this.currentPeriod = e.target.value;
                this.updateOverview();
            });
        }

        // Toggle buttons
        document.querySelectorAll('.toggle-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const type = e.currentTarget.dataset.type;
                if (type) {
                    this.currentView = type;
                    this.updateCategoriesList();
                }
            });
        });

        // Overview cards click
        document.querySelectorAll('.overview-card').forEach(card => {
            card.addEventListener('click', () => {
                this.showCardDetails(card);
            });
        });

        // Date range click
        const dateRange = document.getElementById('dateRange');
        if (dateRange) {
            dateRange.addEventListener('click', () => {
                this.showDateRangePicker();
            });
        }

        // Chart interactions
        this.setupChartInteractions();
    }

    setupChartInteractions() {
        // Add touch gestures for chart
        const chartContainer = document.querySelector('.chart-container');
        if (chartContainer) {
            let startX = 0;
            let currentX = 0;
            let isDragging = false;

            chartContainer.addEventListener('touchstart', (e) => {
                startX = e.touches[0].clientX;
                isDragging = true;
            });

            chartContainer.addEventListener('touchmove', (e) => {
                if (!isDragging) return;
                currentX = e.touches[0].clientX;
                const diff = currentX - startX;
                
                // Add visual feedback
                chartContainer.style.transform = `translateX(${diff * 0.1}px)`;
            });

            chartContainer.addEventListener('touchend', () => {
                chartContainer.style.transform = '';
                isDragging = false;
                
                // Swipe detection for period change
                const diff = currentX - startX;
                if (Math.abs(diff) > 50) {
                    if (diff > 0) {
                        this.previousPeriod();
                    } else {
                        this.nextPeriod();
                    }
                }
            });
        }
    }

    async updateOverview() {
        try {
            const dateRange = this.getDateRangeForPeriod(this.currentPeriod);
            const stats = await db.getStatistics(dateRange.start, dateRange.end);
            
            // Update overview cards
            this.updateOverviewCards(stats);
            
            // Update chart
            this.updateChart(stats);
            
            // Update categories list
            this.updateCategoriesList(stats);
            
            // Update date range display
            this.updateDateRangeDisplay(dateRange);
            
        } catch (error) {
            console.error('Error updating overview:', error);
        }
    }

    updateOverviewCards(stats) {
        const incomeCard = document.getElementById('overviewIncome');
        const expenseCard = document.getElementById('overviewExpenses');
        
        if (incomeCard) {
            incomeCard.textContent = this.app.formatCurrency(stats.totalIncome);
            this.animateValue(incomeCard, 0, stats.totalIncome, 1000);
        }
        
        if (expenseCard) {
            expenseCard.textContent = this.app.formatCurrency(stats.totalExpenses);
            this.animateValue(expenseCard, 0, stats.totalExpenses, 1000);
        }
    }

    animateValue(element, start, end, duration) {
        const startTime = performance.now();
        
        const updateValue = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            const current = start + (end - start) * this.easeOutQuart(progress);
            element.textContent = this.app.formatCurrency(current);
            
            if (progress < 1) {
                requestAnimationFrame(updateValue);
            }
        };
        
        requestAnimationFrame(updateValue);
    }

    easeOutQuart(t) {
        return 1 - Math.pow(1 - t, 4);
    }

    updateChart(stats) {
        const canvas = document.getElementById('statisticsChart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        
        // Destroy existing chart if it exists
        if (this.chartInstance) {
            this.chartInstance.destroy();
        }

        const chartData = this.prepareChartData(stats);
        
        this.chartInstance = new Chart(ctx, {
            type: 'bar',
            data: chartData,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            usePointStyle: true,
                            padding: 20
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        padding: 12,
                        cornerRadius: 8,
                        titleFont: {
                            size: 14,
                            weight: '600'
                        },
                        bodyFont: {
                            size: 13
                        },
                        callbacks: {
                            label: (context) => {
                                const label = context.dataset.label || '';
                                const value = this.app.formatCurrency(context.parsed.y);
                                return `${label}: ${value}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            font: {
                                size: 12
                            }
                        }
                    },
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        },
                        ticks: {
                            font: {
                                size: 12
                            },
                            callback: function(value) {
                                return '$' + value.toLocaleString();
                            }
                        }
                    }
                },
                animation: {
                    duration: 1000,
                    easing: 'easeOutQuart'
                }
            }
        });
    }

    prepareChartData(stats) {
        const labels = this.getLabelsForPeriod(this.currentPeriod);
        const incomeData = this.getDataForPeriod(stats.dailyData, labels, 'income');
        const expenseData = this.getDataForPeriod(stats.dailyData, labels, 'expense');

        return {
            labels,
            datasets: [
                {
                    label: 'Income',
                    data: incomeData,
                    backgroundColor: '#8B5CF6',
                    borderRadius: 8,
                    barPercentage: 0.7
                },
                {
                    label: 'Expenses',
                    data: expenseData,
                    backgroundColor: '#F97316',
                    borderRadius: 8,
                    barPercentage: 0.7
                }
            ]
        };
    }

    getLabelsForPeriod(period) {
        switch (period) {
            case 'weekly':
                return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
            case 'monthly':
                return ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
            case 'yearly':
                return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            default:
                return ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
        }
    }

    getDataForPeriod(dailyData, labels, type) {
        // Aggregate data based on period
        const data = labels.map(() => 0);
        
        Object.entries(dailyData).forEach(([date, dayData]) => {
            const value = type === 'income' ? dayData.income : dayData.expenses;
            const periodIndex = this.getPeriodIndex(date, this.currentPeriod);
            
            if (periodIndex !== -1 && periodIndex < data.length) {
                data[periodIndex] += value;
            }
        });
        
        return data;
    }

    getPeriodIndex(date, period) {
        const dateObj = new Date(date);
        
        switch (period) {
            case 'weekly':
                return dateObj.getDay();
            case 'monthly':
                const dayOfMonth = dateObj.getDate();
                return Math.min(Math.floor((dayOfMonth - 1) / 7), 3);
            case 'yearly':
                return dateObj.getMonth();
            default:
                return 0;
        }
    }

    getDateRangeForPeriod(period) {
        const now = new Date();
        let start, end;
        
        switch (period) {
            case 'weekly':
                const dayOfWeek = now.getDay();
                start = new Date(now);
                start.setDate(now.getDate() - dayOfWeek);
                end = new Date(start);
                end.setDate(start.getDate() + 6);
                break;
            case 'monthly':
                start = new Date(now.getFullYear(), now.getMonth(), 1);
                end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                break;
            case 'yearly':
                start = new Date(now.getFullYear(), 0, 1);
                end = new Date(now.getFullYear(), 11, 31);
                break;
            default:
                start = new Date(now.getFullYear(), now.getMonth(), 1);
                end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        }
        
        return {
            start: start.toISOString().slice(0, 10),
            end: end.toISOString().slice(0, 10)
        };
    }

    updateDateRangeDisplay(dateRange) {
        const dateRangeElement = document.getElementById('dateRange');
        if (dateRangeElement) {
            const start = new Date(dateRange.start);
            const end = new Date(dateRange.end);
            
            const options = { month: 'short', day: 'numeric' };
            if (start.getFullYear() !== end.getFullYear()) {
                options.year = 'numeric';
            }
            
            dateRangeElement.textContent = `${start.toLocaleDateString('zh-TW', options)} - ${end.toLocaleDateString('zh-TW', options)}`;
        }
    }

    updateCategoriesList(stats = null) {
        const container = document.getElementById('categoriesList');
        if (!container) return;

        container.innerHTML = '';

        const categories = this.currentView === 'income' ? 
            (stats?.incomeByCategory || {}) : 
            (stats?.expensesByCategory || {});

        // Sort categories by amount
        const sortedCategories = Object.entries(categories)
            .sort(([, a], [, b]) => b - a);

        if (sortedCategories.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #666;">
                    <div style="font-size: 48px; margin-bottom: 16px;">📊</div>
                    <p>${this.currentView === 'income' ? '尚無收入類別' : '尚無支出類別'}</p>
                </div>
            `;
            return;
        }

        sortedCategories.forEach(([category, amount], index) => {
            const item = document.createElement('div');
            item.className = 'category-item';
            item.style.animationDelay = `${index * 50}ms`;
            
            const percentage = this.calculatePercentage(amount, sortedCategories);
            
            item.innerHTML = `
                <div class="category-info">
                    <div class="category-icon">${this.app.getCategoryIcon(category, this.currentView)}</div>
                    <div class="category-details">
                        <div class="category-name">${category}</div>
                        <div class="category-percentage">${percentage.toFixed(1)}%</div>
                    </div>
                </div>
                <div class="category-amount">${this.app.formatCurrency(amount)}</div>
            `;

            item.addEventListener('click', () => {
                this.showCategoryDetails(category, amount);
            });

            container.appendChild(item);
        });

        // Add animations
        this.addCategoryAnimations();
    }

    calculatePercentage(amount, allCategories) {
        const total = allCategories.reduce((sum, [, catAmount]) => sum + catAmount, 0);
        return total > 0 ? (amount / total) * 100 : 0;
    }

    showCategoryDetails(category, amount) {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'flex';
        
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>${this.app.getCategoryIcon(category, this.currentView)} ${category}</h3>
                    <button class="close-btn" onclick="this.closest('.modal').remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="category-stats">
                        <div class="stat-item">
                            <span>總金額</span>
                            <span class="stat-amount">${this.app.formatCurrency(amount)}</span>
                        </div>
                        <div class="stat-item">
                            <span>筆數</span>
                            <span class="stat-count">載入中...</span>
                        </div>
                        <div class="stat-item">
                            <span>平均</span>
                            <span class="stat-average">載入中...</span>
                        </div>
                    </div>
                    <div class="category-chart">
                        <canvas id="categoryTrendChart" width="400" height="200"></canvas>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Load detailed data
        this.loadCategoryDetails(category, modal);
    }

    async loadCategoryDetails(category, modal) {
        try {
            const dateRange = this.getDateRangeForPeriod(this.currentPeriod);
            const transactions = await db.getTransactionsByDateRange(dateRange.start, dateRange.end);
            const categoryTransactions = transactions.filter(t => 
                t.category === category && t.type === this.currentView
            );

            // Update stats
            const countElement = modal.querySelector('.stat-count');
            const averageElement = modal.querySelector('.stat-average');
            
            countElement.textContent = categoryTransactions.length;
            averageElement.textContent = this.app.formatCurrency(
                categoryTransactions.length > 0 ? amount / categoryTransactions.length : 0
            );

            // Create trend chart
            this.createCategoryTrendChart(categoryTransactions, modal);

        } catch (error) {
            console.error('Error loading category details:', error);
        }
    }

    createCategoryTrendChart(transactions, modal) {
        const canvas = modal.querySelector('#categoryTrendChart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        
        // Group transactions by date
        const dailyData = {};
        transactions.forEach(transaction => {
            if (!dailyData[transaction.date]) {
                dailyData[transaction.date] = 0;
            }
            dailyData[transaction.date] += transaction.amount;
        });

        const labels = Object.keys(dailyData).sort();
        const data = labels.map(date => dailyData[date]);

        new Chart(ctx, {
            type: 'line',
            data: {
                labels,
                datasets: [{
                    label: 'Daily Trend',
                    data,
                    borderColor: '#8B5CF6',
                    backgroundColor: 'rgba(139, 92, 246, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 4,
                    pointBackgroundColor: '#8B5CF6',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    x: {
                        grid: {
                            display: false
                        }
                    },
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

    async showCardDetails(card) {
        const isIncome = card.querySelector('.income-icon');
        const type = isIncome ? 'income' : 'expense';
        const title = type === 'income' ? '💰 本月收入明細' : '💸 本月支出明細';
        const totalAmount = card.querySelector('.card-amount').textContent;
        
        // Get transactions for current period
        const dateRange = this.getDateRangeForPeriod(this.currentPeriod);
        const transactions = await db.getTransactionsByDateRange(dateRange.start, dateRange.end);
        const filteredTransactions = transactions.filter(t => t.type === type);
        
        // Group by category
        const categoryTotals = {};
        filteredTransactions.forEach(t => {
            if (!categoryTotals[t.category]) {
                categoryTotals[t.category] = { total: 0, count: 0, transactions: [] };
            }
            categoryTotals[t.category].total += t.amount;
            categoryTotals[t.category].count++;
            categoryTotals[t.category].transactions.push(t);
        });
        
        // Sort categories by total amount
        const sortedCategories = Object.entries(categoryTotals)
            .sort((a, b) => b[1].total - a[1].total);
        
        // Build category summary HTML
        const categorySummaryHTML = sortedCategories.map(([category, data]) => `
            <div class="category-summary-item" onclick="overviewUI.showCategoryTransactions('${category}', '${type}')" style="
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 12px;
                background: #f9fafb;
                border-radius: 8px;
                margin-bottom: 8px;
                cursor: pointer;
            ">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="font-size: 20px;">${this.app.getCategoryIcon(category, type)}</span>
                    <div>
                        <div style="font-weight: 500;">${category}</div>
                        <div style="font-size: 12px; color: #666;">${data.count} 筆</div>
                    </div>
                </div>
                <div style="font-weight: 600; color: ${type === 'income' ? '#10B981' : '#EF4444'};">
                    ${type === 'income' ? '+' : '-'}${this.app.formatCurrency(data.total)}
                </div>
            </div>
        `).join('');
        
        // Build transactions list HTML
        const transactionsHTML = filteredTransactions
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 10)
            .map(t => `
                <div style="
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 10px 0;
                    border-bottom: 1px solid #f0f0f0;
                ">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span style="font-size: 18px;">${this.app.getCategoryIcon(t.category, type)}</span>
                        <div>
                            <div style="font-weight: 500; font-size: 14px;">${t.category}</div>
                            <div style="font-size: 12px; color: #888;">${t.date}${t.note ? ' · ' + t.note : ''}</div>
                        </div>
                    </div>
                    <div style="font-weight: 600; color: ${type === 'income' ? '#10B981' : '#EF4444'};">
                        ${type === 'income' ? '+' : '-'}${this.app.formatCurrency(t.amount)}
                    </div>
                </div>
            `).join('');
        
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'flex';
        
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 420px; max-height: 85vh; overflow-y: auto;">
                <div class="modal-header">
                    <h3>${title}</h3>
                    <button class="close-btn" onclick="this.closest('.modal').remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <div style="text-align: center; padding: 16px 0; border-bottom: 1px solid #eee; margin-bottom: 16px;">
                        <div style="font-size: 28px; font-weight: 700; color: ${type === 'income' ? '#10B981' : '#EF4444'};">
                            ${totalAmount}
                        </div>
                        <div style="color: #666; font-size: 14px; margin-top: 4px;">
                            共 ${filteredTransactions.length} 筆交易
                        </div>
                    </div>
                    
                    <div style="margin-bottom: 20px;">
                        <h4 style="font-size: 14px; color: #333; margin-bottom: 12px;">📊 分類統計</h4>
                        ${categorySummaryHTML || '<div style="color: #999; text-align: center; padding: 20px;">暫無資料</div>'}
                    </div>
                    
                    <div>
                        <h4 style="font-size: 14px; color: #333; margin-bottom: 12px;">📝 最近交易</h4>
                        ${transactionsHTML || '<div style="color: #999; text-align: center; padding: 20px;">暫無交易</div>'}
                        ${filteredTransactions.length > 10 ? `
                            <div style="text-align: center; margin-top: 12px;">
                                <span style="color: #8B5CF6; font-size: 13px;">還有 ${filteredTransactions.length - 10} 筆交易...</span>
                            </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }
    
    async showCategoryTransactions(category, type) {
        // Close previous modal
        document.querySelectorAll('.modal').forEach(m => m.remove());
        
        const dateRange = this.getDateRangeForPeriod(this.currentPeriod);
        const transactions = await db.getTransactionsByDateRange(dateRange.start, dateRange.end);
        const categoryTransactions = transactions.filter(t => t.category === category && t.type === type);
        
        const total = categoryTransactions.reduce((sum, t) => sum + t.amount, 0);
        
        const transactionsHTML = categoryTransactions
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .map(t => `
                <div style="
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 12px;
                    background: #f9fafb;
                    border-radius: 8px;
                    margin-bottom: 8px;
                ">
                    <div>
                        <div style="font-weight: 500;">${t.date}</div>
                        <div style="font-size: 12px; color: #666;">${t.note || '無備註'}</div>
                    </div>
                    <div style="font-weight: 600; color: ${type === 'income' ? '#10B981' : '#EF4444'};">
                        ${type === 'income' ? '+' : '-'}${this.app.formatCurrency(t.amount)}
                    </div>
                </div>
            `).join('');
        
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'flex';
        
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 400px; max-height: 80vh; overflow-y: auto;">
                <div class="modal-header">
                    <h3>${this.app.getCategoryIcon(category, type)} ${category}</h3>
                    <button class="close-btn" onclick="this.closest('.modal').remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <div style="text-align: center; padding: 12px 0; border-bottom: 1px solid #eee; margin-bottom: 16px;">
                        <div style="font-size: 24px; font-weight: 700; color: ${type === 'income' ? '#10B981' : '#EF4444'};">
                            ${type === 'income' ? '+' : '-'}${this.app.formatCurrency(total)}
                        </div>
                        <div style="color: #666; font-size: 13px; margin-top: 4px;">
                            共 ${categoryTransactions.length} 筆
                        </div>
                    </div>
                    ${transactionsHTML || '<div style="color: #999; text-align: center; padding: 20px;">暫無交易</div>'}
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }

    createCardTrendChart(type, modal) {
        const canvas = modal.querySelector('#cardTrendChart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        
        // Generate sample trend data
        const labels = this.getLabelsForPeriod(this.currentPeriod);
        const data = labels.map(() => Math.random() * 1000 + 500);

        new Chart(ctx, {
            type: 'line',
            data: {
                labels,
                datasets: [{
                    label: type === 'income' ? 'Income Trend' : 'Expense Trend',
                    data,
                    borderColor: type === 'income' ? '#8B5CF6' : '#F97316',
                    backgroundColor: type === 'income' ? 'rgba(139, 92, 246, 0.1)' : 'rgba(249, 115, 22, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    x: {
                        grid: {
                            display: false
                        }
                    },
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

    showDateRangePicker() {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'flex';
        
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Select Date Range</h3>
                    <button class="close-btn" onclick="this.closest('.modal').remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="date-range-picker">
                        <div class="date-input-group">
                            <label>Start Date</label>
                            <input type="date" id="startDate" value="${this.getDateRangeForPeriod(this.currentPeriod).start}">
                        </div>
                        <div class="date-input-group">
                            <label>End Date</label>
                            <input type="date" id="endDate" value="${this.getDateRangeForPeriod(this.currentPeriod).end}">
                        </div>
                        <div class="quick-ranges">
                            <button class="quick-range-btn" data-days="7">Last 7 days</button>
                            <button class="quick-range-btn" data-days="30">Last 30 days</button>
                            <button class="quick-range-btn" data-days="90">Last 90 days</button>
                            <button class="quick-range-btn" data-days="365">Last year</button>
                        </div>
                    </div>
                    <div class="modal-actions">
                        <button class="cancel-btn" onclick="this.closest('.modal').remove()">Cancel</button>
                        <button class="apply-btn" onclick="overviewUI.applyCustomDateRange()">Apply</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Setup quick range buttons
        modal.querySelectorAll('.quick-range-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const days = parseInt(e.target.dataset.days);
                this.setQuickRange(days);
            });
        });
    }

    setQuickRange(days) {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - days);
        
        document.getElementById('startDate').value = startDate.toISOString().slice(0, 10);
        document.getElementById('endDate').value = endDate.toISOString().slice(0, 10);
    }

    async applyCustomDateRange() {
        const startDate = document.getElementById('startDate').value;
        const endDate = document.getElementById('endDate').value;
        
        if (startDate && endDate) {
            try {
                const stats = await db.getStatistics(startDate, endDate);
                this.updateOverviewCards(stats);
                this.updateChart(stats);
                
                // Update date range display
                document.getElementById('dateRange').textContent = 
                    `${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}`;
                
                // Close modal
                document.querySelector('.modal').remove();
                
            } catch (error) {
                console.error('Error applying custom date range:', error);
            }
        }
    }

    previousPeriod() {
        // Navigate to previous period
        console.log('Previous period');
    }

    nextPeriod() {
        // Navigate to next period
        console.log('Next period');
    }

    addCategoryAnimations() {
        const style = document.createElement('style');
        style.textContent = `
            .category-item {
                animation: slideInUp 0.3s ease-out forwards;
                opacity: 0;
            }
            
            .category-info {
                display: flex;
                align-items: center;
                gap: 12px;
                flex: 1;
            }
            
            .category-icon {
                width: 40px;
                height: 40px;
                border-radius: 10px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 20px;
                background: rgba(139, 92, 246, 0.1);
            }
            
            .category-details {
                display: flex;
                flex-direction: column;
                gap: 2px;
            }
            
            .category-percentage {
                font-size: 12px;
                color: #666;
            }
            
            .detail-summary {
                display: flex;
                flex-direction: column;
                gap: 16px;
                margin-bottom: 24px;
            }
            
            .summary-item {
                display: flex;
                justify-content: space-between;
                padding: 12px 0;
                border-bottom: 1px solid #f3f4f6;
            }
            
            .summary-item:last-child {
                border-bottom: none;
            }
            
            .change-positive {
                color: #10B981;
                font-weight: 600;
            }
            
            .change-negative {
                color: #EF4444;
                font-weight: 600;
            }
            
            .date-range-picker {
                display: flex;
                flex-direction: column;
                gap: 20px;
            }
            
            .date-input-group {
                display: flex;
                flex-direction: column;
                gap: 8px;
            }
            
            .date-input-group label {
                font-size: 14px;
                font-weight: 500;
                color: #333;
            }
            
            .date-input-group input {
                padding: 12px;
                border: 1px solid #e5e5e5;
                border-radius: 8px;
                font-size: 14px;
            }
            
            .quick-ranges {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 8px;
            }
            
            .quick-range-btn {
                padding: 8px 12px;
                border: 1px solid #e5e5e5;
                border-radius: 8px;
                background: white;
                font-size: 12px;
                cursor: pointer;
                transition: all 0.2s ease;
            }
            
            .quick-range-btn:hover {
                background: #f3f4f6;
                border-color: #8B5CF6;
            }
            
            .apply-btn {
                background: #8B5CF6;
                color: white;
                border: none;
                padding: 12px 24px;
                border-radius: 8px;
                font-weight: 500;
                cursor: pointer;
            }
        `;
        document.head.appendChild(style);
    }
}

// Initialize overview UI after app is ready
function initOverviewUI() {
    if (window.app) {
        window.overviewUI = new OverviewScreenUI(window.app);
        window.overviewUI.addCategoryAnimations();
    } else {
        setTimeout(initOverviewUI, 100);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(initOverviewUI, 50);
});
