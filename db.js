// IndexedDB Database Manager
class ExpenseDB {
    constructor() {
        this.dbName = 'ExpenseTrackerDB';
        this.dbVersion = 1;
        this.db = null;
    }

    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = (event) => {
                reject('Database error: ' + event.target.errorCode);
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Transactions store
                if (!db.objectStoreNames.contains('transactions')) {
                    const transactionStore = db.createObjectStore('transactions', { keyPath: 'id', autoIncrement: true });
                    transactionStore.createIndex('date', 'date', { unique: false });
                    transactionStore.createIndex('type', 'type', { unique: false });
                    transactionStore.createIndex('category', 'category', { unique: false });
                }

                // Categories store
                if (!db.objectStoreNames.contains('categories')) {
                    const categoryStore = db.createObjectStore('categories', { keyPath: 'id', autoIncrement: true });
                    categoryStore.createIndex('type', 'type', { unique: false });
                }

                // Settings store
                if (!db.objectStoreNames.contains('settings')) {
                    db.createObjectStore('settings', { keyPath: 'key' });
                }

                // Budget store
                if (!db.objectStoreNames.contains('budgets')) {
                    db.createObjectStore('budgets', { keyPath: 'id', autoIncrement: true });
                }

                // PIN store (for security)
                if (!db.objectStoreNames.contains('pin')) {
                    db.createObjectStore('pin', { keyPath: 'id', autoIncrement: true });
                }
            };
        });
    }

    // Transaction operations
    async addTransaction(transaction) {
        const transactionData = {
            ...transaction,
            createdAt: new Date().toISOString(),
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9)
        };

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['transactions'], 'readwrite');
            const store = transaction.objectStore('transactions');
            const request = store.add(transactionData);

            request.onsuccess = () => resolve(transactionData);
            request.onerror = () => reject(request.error);
        });
    }

    async updateTransaction(id, updates) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['transactions'], 'readwrite');
            const store = transaction.objectStore('transactions');
            
            const getRequest = store.get(id);
            getRequest.onsuccess = () => {
                const existing = getRequest.result;
                if (existing) {
                    const updated = { ...existing, ...updates };
                    const updateRequest = store.put(updated);
                    updateRequest.onsuccess = () => resolve(updated);
                    updateRequest.onerror = () => reject(updateRequest.error);
                } else {
                    reject('Transaction not found');
                }
            };
            getRequest.onerror = () => reject(getRequest.error);
        });
    }

    async deleteTransaction(id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['transactions'], 'readwrite');
            const store = transaction.objectStore('transactions');
            const request = store.delete(id);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async getTransactions(limit = null, offset = 0) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['transactions'], 'readonly');
            const store = transaction.objectStore('transactions');
            const index = store.index('date');
            const request = index.openCursor(null, 'prev'); // Get latest first

            const results = [];
            let count = 0;
            let skipped = 0;

            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor && (limit === null || count < limit)) {
                    if (skipped >= offset) {
                        results.push(cursor.value);
                        count++;
                    } else {
                        skipped++;
                    }
                    cursor.continue();
                } else {
                    resolve(results);
                }
            };

            request.onerror = () => reject(request.error);
        });
    }

    async getTransactionsByDateRange(startDate, endDate) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['transactions'], 'readonly');
            const store = transaction.objectStore('transactions');
            const index = store.index('date');
            const range = IDBKeyRange.bound(startDate, endDate);
            const request = index.getAll(range);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getTransactionsByDate(date) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['transactions'], 'readonly');
            const store = transaction.objectStore('transactions');
            const index = store.index('date');
            const request = index.getAll(date);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // Category operations
    async getCategories(type = null) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['categories'], 'readonly');
            const store = transaction.objectStore('categories');
            
            if (type) {
                const index = store.index('type');
                const request = index.getAll(type);
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            } else {
                const request = store.getAll();
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            }
        });
    }

    async addCategory(category) {
        const categoryData = {
            ...category,
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9)
        };

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['categories'], 'readwrite');
            const store = transaction.objectStore('categories');
            const request = store.add(categoryData);

            request.onsuccess = () => resolve(categoryData);
            request.onerror = () => reject(request.error);
        });
    }

    async updateCategory(id, updates) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['categories'], 'readwrite');
            const store = transaction.objectStore('categories');
            
            const getRequest = store.get(id);
            getRequest.onsuccess = () => {
                const existing = getRequest.result;
                if (existing) {
                    const updated = { ...existing, ...updates };
                    const updateRequest = store.put(updated);
                    updateRequest.onsuccess = () => resolve(updated);
                    updateRequest.onerror = () => reject(updateRequest.error);
                } else {
                    reject('Category not found');
                }
            };
            getRequest.onerror = () => reject(getRequest.error);
        });
    }

    async deleteCategory(id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['categories'], 'readwrite');
            const store = transaction.objectStore('categories');
            const request = store.delete(id);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    // Settings operations
    async getSetting(key) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['settings'], 'readonly');
            const store = transaction.objectStore('settings');
            const request = store.get(key);

            request.onsuccess = () => resolve(request.result ? request.result.value : null);
            request.onerror = () => reject(request.error);
        });
    }

    async setSetting(key, value) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['settings'], 'readwrite');
            const store = transaction.objectStore('settings');
            const request = store.put({ key, value });

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    // Budget operations
    async getBudget(month = null) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['budgets'], 'readonly');
            const store = transaction.objectStore('budgets');
            
            if (month) {
                const index = store.index('month');
                const request = index.get(month);
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            } else {
                const request = store.getAll();
                request.onsuccess = () => {
                    const budgets = request.result;
                    const currentMonth = new Date().toISOString().slice(0, 7);
                    const currentBudget = budgets.find(b => b.month === currentMonth);
                    resolve(currentBudget || { amount: 0, savingsGoal: 0 });
                };
                request.onerror = () => reject(request.error);
            }
        });
    }

    async setBudget(month, amount, savingsGoal = 0) {
        const budgetData = { month, amount, savingsGoal };

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['budgets'], 'readwrite');
            const store = transaction.objectStore('budgets');
            const request = store.put(budgetData);

            request.onsuccess = () => resolve(budgetData);
            request.onerror = () => reject(request.error);
        });
    }

    // PIN operations
    async getPin() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['pin'], 'readonly');
            const store = transaction.objectStore('pin');
            const request = store.getAll();

            request.onsuccess = () => {
                const pins = request.result;
                resolve(pins.length > 0 ? pins[0] : null);
            };
            request.onerror = () => reject(request.error);
        });
    }

    async setPin(hashedPin) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['pin'], 'readwrite');
            const store = transaction.objectStore('pin');
            
            // Clear existing PIN first
            const clearRequest = store.clear();
            clearRequest.onsuccess = () => {
                const pinData = { id: 1, hash: hashedPin, createdAt: new Date().toISOString() };
                const addRequest = store.add(pinData);
                addRequest.onsuccess = () => resolve(pinData);
                addRequest.onerror = () => reject(addRequest.error);
            };
            clearRequest.onerror = () => reject(clearRequest.error);
        });
    }

    async clearPin() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['pin'], 'readwrite');
            const store = transaction.objectStore('pin');
            const request = store.clear();

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    // Statistics operations
    async getStatistics(startDate, endDate) {
        const transactions = await this.getTransactionsByDateRange(startDate, endDate);
        
        const stats = {
            totalIncome: 0,
            totalExpenses: 0,
            incomeByCategory: {},
            expensesByCategory: {},
            dailyData: {}
        };

        transactions.forEach(transaction => {
            const amount = parseFloat(transaction.amount);
            
            if (transaction.type === 'income') {
                stats.totalIncome += amount;
                stats.incomeByCategory[transaction.category] = 
                    (stats.incomeByCategory[transaction.category] || 0) + amount;
            } else {
                stats.totalExpenses += amount;
                stats.expensesByCategory[transaction.category] = 
                    (stats.expensesByCategory[transaction.category] || 0) + amount;
            }

            // Daily data
            if (!stats.dailyData[transaction.date]) {
                stats.dailyData[transaction.date] = { income: 0, expenses: 0 };
            }
            
            if (transaction.type === 'income') {
                stats.dailyData[transaction.date].income += amount;
            } else {
                stats.dailyData[transaction.date].expenses += amount;
            }
        });

        return stats;
    }

    // Export/Import operations
    async exportData() {
        const transactions = await this.getTransactions();
        const categories = await this.getCategories();
        const settings = await this.getAllSettings();
        const budgets = await this.getAllBudgets();

        return {
            transactions,
            categories,
            settings,
            budgets,
            exportedAt: new Date().toISOString()
        };
    }

    async getAllSettings() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['settings'], 'readonly');
            const store = transaction.objectStore('settings');
            const request = store.getAll();

            request.onsuccess = () => {
                const settings = {};
                request.result.forEach(item => {
                    settings[item.key] = item.value;
                });
                resolve(settings);
            };
            request.onerror = () => reject(request.error);
        });
    }

    async getAllBudgets() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['budgets'], 'readonly');
            const store = transaction.objectStore('budgets');
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async importData(data) {
        return new Promise(async (resolve, reject) => {
            try {
                // Clear existing data
                await this.clearAllData();

                // Import transactions
                if (data.transactions && Array.isArray(data.transactions)) {
                    for (const transaction of data.transactions) {
                        await this.addTransaction(transaction);
                    }
                }

                // Import categories
                if (data.categories && Array.isArray(data.categories)) {
                    for (const category of data.categories) {
                        await this.addCategory(category);
                    }
                }

                // Import settings
                if (data.settings && typeof data.settings === 'object') {
                    for (const [key, value] of Object.entries(data.settings)) {
                        await this.setSetting(key, value);
                    }
                }

                // Import budgets
                if (data.budgets && Array.isArray(data.budgets)) {
                    for (const budget of data.budgets) {
                        await this.setBudget(budget.month, budget.amount, budget.savingsGoal);
                    }
                }

                resolve();
            } catch (error) {
                reject(error);
            }
        });
    }

    async clearAllData() {
        return new Promise((resolve, reject) => {
            const stores = ['transactions', 'categories', 'settings', 'budgets'];
            let completed = 0;
            let hasError = false;

            stores.forEach(storeName => {
                const transaction = this.db.transaction([storeName], 'readwrite');
                const store = transaction.objectStore(storeName);
                const request = store.clear();

                request.onsuccess = () => {
                    completed++;
                    if (completed === stores.length && !hasError) {
                        resolve();
                    }
                };

                request.onerror = () => {
                    if (!hasError) {
                        hasError = true;
                        reject(request.error);
                    }
                };
            });
        });
    }
}

// Initialize database
const db = new ExpenseDB();

// Default categories
const CATEGORY_NAME_MAP = {
    'Salary': '薪水',
    'Freelance': '接案',
    'Bonus': '獎金',
    'Investment': '投資',
    'Other Income': '其他收入',
    'Food & Dining': '餐飲',
    'Transportation': '交通',
    'Shopping': '購物',
    'Entertainment': '娛樂',
    'Bills & Utilities': '帳單',
    'Healthcare': '醫療',
    'Education': '教育',
    'Other Expense': '其他支出'
};

const defaultCategories = [
    // Income categories
    { name: '薪水', type: 'income', icon: '💰' },
    { name: '接案', type: 'income', icon: '💼' },
    { name: '獎金', type: 'income', icon: '🎁' },
    { name: '投資', type: 'income', icon: '📈' },
    { name: '其他收入', type: 'income', icon: '💵' },
    
    // Expense categories
    { name: '餐飲', type: 'expense', icon: '🍔' },
    { name: '交通', type: 'expense', icon: '🚗' },
    { name: '購物', type: 'expense', icon: '🛍️' },
    { name: '娛樂', type: 'expense', icon: '🎮' },
    { name: '帳單', type: 'expense', icon: '📱' },
    { name: '醫療', type: 'expense', icon: '🏥' },
    { name: '教育', type: 'expense', icon: '📚' },
    { name: '其他支出', type: 'expense', icon: '📝' }
];

// Initialize default categories if they don't exist
async function initializeDefaultCategories() {
    try {
        const existingCategories = await db.getCategories();
        if (existingCategories.length === 0) {
            for (const category of defaultCategories) {
                await db.addCategory(category);
            }
        } else {
            // Migrate existing English category names to Chinese
            const categories = existingCategories;
            for (const category of categories) {
                const mappedName = CATEGORY_NAME_MAP[category.name];
                if (mappedName && mappedName !== category.name) {
                    await db.updateCategory(category.id, { name: mappedName });
                }
            }

            const transactions = await db.getTransactions(null);
            for (const transaction of transactions) {
                const mappedCategory = CATEGORY_NAME_MAP[transaction.category];
                if (mappedCategory && mappedCategory !== transaction.category) {
                    await db.updateTransaction(transaction.id, { category: mappedCategory });
                }
            }
        }
    } catch (error) {
        console.error('Error initializing default categories:', error);
    }
}

// Initialize sample data if database is empty
async function initializeSampleData() {
    try {
        const transactions = await db.getTransactions(1);
        if (transactions.length === 0) {
            const sampleTransactions = [
                {
                    date: new Date().toISOString().slice(0, 10),
                    type: 'expense',
                    amount: 450,
                    category: '餐飲',
                    note: 'Money Transfer'
                },
                {
                    date: new Date().toISOString().slice(0, 10),
                    type: 'income',
                    amount: 1200,
                    category: '薪水',
                    note: 'Paypal'
                },
                {
                    date: new Date(Date.now() - 86400000).toISOString().slice(0, 10),
                    type: 'expense',
                    amount: 150,
                    category: '交通',
                    note: 'Uber'
                },
                {
                    date: new Date(Date.now() - 86400000).toISOString().slice(0, 10),
                    type: 'expense',
                    amount: 200,
                    category: '購物',
                    note: 'Bata Store'
                },
                {
                    date: new Date(Date.now() - 172800000).toISOString().slice(0, 10),
                    type: 'expense',
                    amount: 600,
                    category: '帳單',
                    note: 'Bank Transfer'
                }
            ];

            for (const transaction of sampleTransactions) {
                await db.addTransaction(transaction);
            }
        }
    } catch (error) {
        console.error('Error initializing sample data:', error);
    }
}
