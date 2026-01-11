// Home Screen UI Controller
class HomeScreenUI {
    constructor(app) {
        this.app = app;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupPullToRefresh();
    }

    setupEventListeners() {
        // See All button
        const seeAllBtn = document.querySelector('.see-all-btn');
        if (seeAllBtn) {
            seeAllBtn.addEventListener('click', () => {
                this.showAllTransactions();
            });
        }

        // Transaction item clicks
        document.addEventListener('click', (e) => {
            const transactionItem = e.target.closest('.transaction-item');
            if (transactionItem) {
                this.handleTransactionClick(transactionItem);
            }
        });

        // Balance dropdown
        const balanceHeader = document.querySelector('.balance-header');
        if (balanceHeader) {
            balanceHeader.addEventListener('click', () => {
                this.showBalanceOptions();
            });
        }

        // Budget progress card click
        const budgetProgressCard = document.getElementById('budgetProgressCard');
        if (budgetProgressCard) {
            budgetProgressCard.addEventListener('click', () => {
                this.showBudgetDetails();
            });
        }
    }

    setupPullToRefresh() {
        let startY = 0;
        let isPulling = false;
        const pullThreshold = 100;

        const homeScreen = document.getElementById('homeScreen');
        
        homeScreen.addEventListener('touchstart', (e) => {
            if (window.scrollY === 0) {
                startY = e.touches[0].clientY;
                isPulling = true;
            }
        });

        homeScreen.addEventListener('touchmove', (e) => {
            if (!isPulling) return;
            
            const currentY = e.touches[0].clientY;
            const diff = currentY - startY;
            
            if (diff > 0 && diff < pullThreshold * 2) {
                homeScreen.style.transform = `translateY(${diff * 0.5}px)`;
            }
        });

        homeScreen.addEventListener('touchend', (e) => {
            if (!isPulling) return;
            
            const currentY = e.changedTouches[0].clientY;
            const diff = currentY - startY;
            
            homeScreen.style.transform = '';
            isPulling = false;
            
            if (diff > pullThreshold) {
                this.refreshData();
            }
        });
    }

    async refreshData() {
        // Show loading state
        this.showLoadingState();
        
        try {
            await this.app.updateAllData();
            this.showRefreshSuccess();
        } catch (error) {
            console.error('Error refreshing data:', error);
            this.showRefreshError();
        }
    }

    showLoadingState() {
        const transactionsList = document.getElementById('transactionsList');
        if (transactionsList) {
            transactionsList.innerHTML = `
                <div style="text-align: center; padding: 40px;">
                    <div style="width: 40px; height: 40px; border: 3px solid #f3f4f6; border-top: 3px solid #8B5CF6; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto;"></div>
                    <p style="color: #666; margin-top: 16px;">Loading...</p>
                </div>
            `;
        }
    }

    showRefreshSuccess() {
        // Show a brief success message
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: #10B981;
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 500;
            z-index: 1000;
            animation: slideDown 0.3s ease-out;
        `;
        toast.textContent = 'Data refreshed successfully';
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'slideUp 0.3s ease-out';
            setTimeout(() => document.body.removeChild(toast), 300);
        }, 2000);
    }

    showRefreshError() {
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: #EF4444;
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 500;
            z-index: 1000;
            animation: slideDown 0.3s ease-out;
        `;
        toast.textContent = 'Error refreshing data';
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'slideUp 0.3s ease-out';
            setTimeout(() => document.body.removeChild(toast), 300);
        }, 2000);
    }

    showAllTransactions() {
        // This would navigate to a full transactions list
        // For now, we'll just load more transactions
        this.loadMoreTransactions();
    }

    async loadMoreTransactions() {
        try {
            const transactions = await db.getTransactions(50);
            this.app.updateTransactionsList(transactions);
        } catch (error) {
            console.error('Error loading more transactions:', error);
        }
    }

    handleTransactionClick(transactionElement) {
        // Get transaction data from the element
        const transactionData = this.getTransactionDataFromElement(transactionElement);
        if (transactionData) {
            this.showTransactionDetails(transactionData);
        }
    }

    getTransactionDataFromElement(element) {
        // This would extract the full transaction data
        // For now, we'll return a placeholder
        return {
            id: 'temp-id',
            amount: 100,
            category: 'Sample',
            type: 'expense',
            date: new Date().toISOString().slice(0, 10),
            note: 'Sample transaction'
        };
    }

    showTransactionDetails(transaction) {
        // Create a modal to show transaction details
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'flex';
        
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>交易詳情</h3>
                    <button class="close-btn" onclick="this.closest('.modal').remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="transaction-detail-item">
                        <span>金額：</span>
                        <span class="${transaction.type === 'income' ? 'income' : 'expense'}">
                            ${transaction.type === 'income' ? '+' : '-'}${this.app.formatCurrency(transaction.amount)}
                        </span>
                    </div>
                    <div class="transaction-detail-item">
                        <span>類別：</span>
                        <span>${transaction.category}</span>
                    </div>
                    <div class="transaction-detail-item">
                        <span>日期：</span>
                        <span>${new Date(transaction.date + 'T00:00:00').toLocaleDateString('zh-TW')}</span>
                    </div>
                    <div class="transaction-detail-item">
                        <span>備註：</span>
                        <span>${transaction.note || ''}</span>
                    </div>
                    <div class="modal-actions">
                        <button class="edit-btn" onclick="homeUI.editTransaction('${transaction.id}')">編輯</button>
                        <button class="delete-btn" onclick="homeUI.deleteTransaction('${transaction.id}')">刪除</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }

    async editTransaction(transactionId) {
        try {
            // Get transaction data
            const transactions = await db.getTransactions();
            const transaction = transactions.find(t => t.id === transactionId);
            
            if (transaction) {
                // Populate the form with transaction data
                document.getElementById('transactionAmount').value = transaction.amount;
                document.getElementById('transactionCategory').value = transaction.category;
                document.getElementById('transactionNote').value = transaction.note || '';
                document.getElementById('transactionDate').value = transaction.date;
                
                // Set transaction type
                this.app.setTransactionType(transaction.type);
                
                // Open the bottom sheet
                openAddTransaction();
                
                // Store the transaction ID for updating
                window.editingTransactionId = transactionId;
            }
        } catch (error) {
            console.error('Error editing transaction:', error);
        }
    }

    async deleteTransaction(transactionId) {
        if (confirm('確定要刪除這筆交易嗎？')) {
            try {
                await db.deleteTransaction(transactionId);
                this.app.updateAllData();
                
                // Close modal if open
                const modal = document.querySelector('.modal');
                if (modal) {
                    modal.remove();
                }
                
                // Show success message
                this.showDeleteSuccess();
            } catch (error) {
                console.error('Error deleting transaction:', error);
                this.showDeleteError();
            }
        }
    }

    showDeleteSuccess() {
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: #10B981;
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 500;
            z-index: 1000;
            animation: slideDown 0.3s ease-out;
        `;
        toast.textContent = '已刪除交易';
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'slideUp 0.3s ease-out';
            setTimeout(() => document.body.removeChild(toast), 300);
        }, 2000);
    }

    showDeleteError() {
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: #EF4444;
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 500;
            z-index: 1000;
            animation: slideDown 0.3s ease-out;
        `;
        toast.textContent = '刪除交易失敗';
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'slideUp 0.3s ease-out';
            setTimeout(() => document.body.removeChild(toast), 300);
        }, 2000);
    }

    showBalanceOptions() {
        // Create a dropdown for balance options
        const dropdown = document.createElement('div');
        dropdown.className = 'balance-dropdown';
        dropdown.style.cssText = `
            position: absolute;
            top: 80px;
            right: 20px;
            background: white;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
            padding: 8px;
            z-index: 100;
            min-width: 200px;
        `;
        
        dropdown.innerHTML = `
            <button class="balance-option" onclick="homeUI.showBalanceDetails()">View Details</button>
            <button class="balance-option" onclick="homeUI.exportBalanceReport()">Export Report</button>
            <button class="balance-option" onclick="homeUI.showBalanceSettings()">Settings</button>
        `;
        
        document.body.appendChild(dropdown);
        
        // Close dropdown when clicking outside
        setTimeout(() => {
            document.addEventListener('click', (e) => {
                if (!dropdown.contains(e.target)) {
                    dropdown.remove();
                }
            }, { once: true });
        }, 100);
    }

    showBalanceDetails() {
        // Show detailed balance breakdown
        console.log('Show balance details');
    }

    exportBalanceReport() {
        // Export balance report
        this.app.exportData();
    }

    showBalanceSettings() {
        // Navigate to settings
        this.app.switchScreen('settings');
    }

    showBudgetDetails() {
        // Show detailed budget information
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'flex';
        
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Budget Details</h3>
                    <button class="close-btn" onclick="this.closest('.modal').remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="budget-detail-chart">
                        <canvas id="budgetDetailChart" width="400" height="200"></canvas>
                    </div>
                    <div class="budget-summary">
                        <div class="budget-summary-item">
                            <span>Daily Average:</span>
                            <span>$${(950 / 30).toFixed(2)}</span>
                        </div>
                        <div class="budget-summary-item">
                            <span>Remaining Days:</span>
                            <span>${30 - new Date().getDate()}</span>
                        </div>
                        <div class="budget-summary-item">
                            <span>Daily Budget:</span>
                            <span>$${(2000 / 30).toFixed(2)}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Create budget detail chart
        this.createBudgetDetailChart();
    }

    createBudgetDetailChart() {
        const canvas = document.getElementById('budgetDetailChart');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Spent', 'Remaining'],
                datasets: [{
                    data: [950, 1050],
                    backgroundColor: ['#EF4444', '#10B981'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }

    // Add CSS animations
    addAnimations() {
        const style = document.createElement('style');
        style.textContent = `
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
            
            @keyframes slideDown {
                from {
                    opacity: 0;
                    transform: translate(-50%, -20px);
                }
                to {
                    opacity: 1;
                    transform: translate(-50%, 0);
                }
            }
            
            @keyframes slideUp {
                from {
                    opacity: 1;
                    transform: translate(-50%, 0);
                }
                to {
                    opacity: 0;
                    transform: translate(-50%, -20px);
                }
            }
            
            .balance-dropdown {
                animation: slideDown 0.2s ease-out;
            }
            
            .balance-option {
                width: 100%;
                padding: 12px 16px;
                border: none;
                background: transparent;
                text-align: left;
                border-radius: 8px;
                cursor: pointer;
                transition: background 0.2s ease;
                font-size: 14px;
                color: #333;
            }
            
            .balance-option:hover {
                background: #f3f4f6;
            }
            
            .transaction-detail-item {
                display: flex;
                justify-content: space-between;
                padding: 12px 0;
                border-bottom: 1px solid #f3f4f6;
            }
            
            .transaction-detail-item:last-child {
                border-bottom: none;
            }
            
            .modal-actions {
                display: flex;
                gap: 12px;
                margin-top: 20px;
            }
            
            .edit-btn {
                flex: 1;
                padding: 12px;
                background: #8B5CF6;
                color: white;
                border: none;
                border-radius: 8px;
                font-weight: 500;
                cursor: pointer;
            }
            
            .delete-btn {
                flex: 1;
                padding: 12px;
                background: #EF4444;
                color: white;
                border: none;
                border-radius: 8px;
                font-weight: 500;
                cursor: pointer;
            }
            
            .budget-detail-chart {
                margin-bottom: 20px;
            }
            
            .budget-summary {
                display: flex;
                flex-direction: column;
                gap: 12px;
            }
            
            .budget-summary-item {
                display: flex;
                justify-content: space-between;
                padding: 8px 0;
                border-bottom: 1px solid #f3f4f6;
            }
            
            .budget-summary-item:last-child {
                border-bottom: none;
            }
        `;
        document.head.appendChild(style);
    }
}

// Initialize home UI when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.homeUI = new HomeScreenUI(window.app);
    window.homeUI.addAnimations();
});
