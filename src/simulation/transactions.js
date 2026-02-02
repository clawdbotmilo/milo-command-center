/**
 * Transaction System
 * Handles money transfers, item exchanges, and economic logging
 */

// Transaction types
export const TRANSACTION_TYPE = {
  PURCHASE: 'purchase',     // Buying items from another villager
  SALE: 'sale',             // Selling items to another villager
  GIFT: 'gift',             // Free transfer of items/money
  PAYMENT: 'payment',       // Payment for services
  LOAN: 'loan',             // Lending money
  REPAYMENT: 'repayment',   // Repaying a loan
  TRADE: 'trade',           // Item-for-item exchange
  DAILY_INCOME: 'daily_income', // Role-based income
  EXPENSE: 'expense'        // General expenses
};

// Item categories
export const ITEM_TYPE = {
  FOOD: 'food',
  TOOL: 'tool',
  MATERIAL: 'material',
  GOODS: 'goods',
  CURIOSITY: 'curiosity',
  KEEPSAKE: 'keepsake',
  CURRENCY: 'currency'
};

// Role-based item catalogs with base prices
export const ROLE_ITEMS = {
  herbalist: {
    'healing herbs': { price: 5, type: ITEM_TYPE.MATERIAL },
    'dried flowers': { price: 3, type: ITEM_TYPE.GOODS },
    'herb bundle': { price: 8, type: ITEM_TYPE.MATERIAL },
    'remedy potion': { price: 15, type: ITEM_TYPE.GOODS }
  },
  blacksmith: {
    'iron nails': { price: 4, type: ITEM_TYPE.MATERIAL },
    'small tool': { price: 12, type: ITEM_TYPE.TOOL },
    'metal charm': { price: 8, type: ITEM_TYPE.GOODS },
    'horseshoe': { price: 10, type: ITEM_TYPE.GOODS },
    'repaired item': { price: 20, type: ITEM_TYPE.GOODS }
  },
  baker: {
    'fresh bread': { price: 3, type: ITEM_TYPE.FOOD },
    'pastry': { price: 5, type: ITEM_TYPE.FOOD },
    'biscuits': { price: 4, type: ITEM_TYPE.FOOD },
    'cake slice': { price: 7, type: ITEM_TYPE.FOOD },
    'melon bread': { price: 6, type: ITEM_TYPE.FOOD },
    'red bean bun': { price: 5, type: ITEM_TYPE.FOOD }
  },
  messenger: {
    'interesting map': { price: 15, type: ITEM_TYPE.CURIOSITY },
    'letter': { price: 2, type: ITEM_TYPE.GOODS },
    'news scroll': { price: 5, type: ITEM_TYPE.GOODS },
    'curiosity from afar': { price: 20, type: ITEM_TYPE.CURIOSITY }
  },
  'tavern keeper': {
    'ale': { price: 4, type: ITEM_TYPE.FOOD },
    'ale sample': { price: 2, type: ITEM_TYPE.FOOD },
    'snack': { price: 3, type: ITEM_TYPE.FOOD },
    'tavern token': { price: 5, type: ITEM_TYPE.GOODS },
    'house special': { price: 8, type: ITEM_TYPE.FOOD }
  },
  scholar: {
    'old book': { price: 25, type: ITEM_TYPE.CURIOSITY },
    'research notes': { price: 10, type: ITEM_TYPE.GOODS },
    'quill': { price: 6, type: ITEM_TYPE.TOOL },
    'interesting fact': { price: 3, type: ITEM_TYPE.CURIOSITY }
  },
  farmer: {
    'vegetables': { price: 4, type: ITEM_TYPE.FOOD },
    'eggs': { price: 3, type: ITEM_TYPE.FOOD },
    'grain sack': { price: 8, type: ITEM_TYPE.MATERIAL },
    'fresh produce': { price: 5, type: ITEM_TYPE.FOOD }
  },
  merchant: {
    'exotic spices': { price: 30, type: ITEM_TYPE.GOODS },
    'silk cloth': { price: 50, type: ITEM_TYPE.GOODS },
    'interesting stone': { price: 10, type: ITEM_TYPE.CURIOSITY },
    'rare item': { price: 100, type: ITEM_TYPE.CURIOSITY }
  },
  florist: {
    'sunflower seeds': { price: 2, type: ITEM_TYPE.MATERIAL },
    'rose bouquet': { price: 15, type: ITEM_TYPE.GOODS },
    'flower pot': { price: 5, type: ITEM_TYPE.GOODS },
    'dried flowers': { price: 8, type: ITEM_TYPE.GOODS }
  },
  fisher: {
    'fresh fish': { price: 6, type: ITEM_TYPE.FOOD },
    'bait': { price: 1, type: ITEM_TYPE.MATERIAL },
    'large catch': { price: 12, type: ITEM_TYPE.FOOD }
  },
  banker: {
    'financial advice': { price: 10, type: ITEM_TYPE.GOODS },
    'village ledger copy': { price: 5, type: ITEM_TYPE.GOODS }
  },
  apprentice: {
    'odd jobs': { price: 5, type: ITEM_TYPE.GOODS },
    'errands': { price: 3, type: ITEM_TYPE.GOODS }
  }
};

// Default starting inventory by role
export const DEFAULT_INVENTORY = {
  herbalist: [
    { item: 'healing herbs', quantity: 10 },
    { item: 'dried flowers', quantity: 5 },
    { item: 'remedy potion', quantity: 3 }
  ],
  blacksmith: [
    { item: 'iron nails', quantity: 20 },
    { item: 'small tool', quantity: 3 },
    { item: 'horseshoe', quantity: 5 }
  ],
  baker: [
    { item: 'fresh bread', quantity: 15 },
    { item: 'pastry', quantity: 8 },
    { item: 'melon bread', quantity: 6 }
  ],
  messenger: [
    { item: 'interesting map', quantity: 2 },
    { item: 'letter', quantity: 5 },
    { item: 'news scroll', quantity: 3 }
  ],
  'tavern keeper': [
    { item: 'ale', quantity: 20 },
    { item: 'snack', quantity: 15 },
    { item: 'tavern token', quantity: 10 }
  ],
  scholar: [
    { item: 'old book', quantity: 5 },
    { item: 'research notes', quantity: 10 },
    { item: 'quill', quantity: 3 }
  ],
  farmer: [
    { item: 'vegetables', quantity: 20 },
    { item: 'eggs', quantity: 12 },
    { item: 'grain sack', quantity: 5 }
  ],
  merchant: [
    { item: 'exotic spices', quantity: 3 },
    { item: 'silk cloth', quantity: 2 },
    { item: 'interesting stone', quantity: 8 }
  ],
  florist: [
    { item: 'sunflower seeds', quantity: 15 },
    { item: 'rose bouquet', quantity: 5 },
    { item: 'flower pot', quantity: 8 }
  ],
  fisher: [
    { item: 'fresh fish', quantity: 8 },
    { item: 'bait', quantity: 30 }
  ],
  banker: [
    { item: 'financial advice', quantity: 10 }
  ],
  apprentice: [
    { item: 'odd jobs', quantity: 5 }
  ]
};

// Default starting coins by role
export const DEFAULT_COINS = {
  herbalist: 100,
  blacksmith: 150,
  baker: 120,
  messenger: 80,
  'tavern keeper': 200,
  scholar: 100,
  farmer: 90,
  merchant: 300,
  florist: 110,
  fisher: 75,
  banker: 500,
  apprentice: 30
};

/**
 * Inventory class - manages a villager's items
 */
export class Inventory {
  constructor(initialItems = []) {
    // Map<itemName, { quantity, type }>
    this.items = new Map();
    
    // Initialize with items
    for (const item of initialItems) {
      this.add(item.item || item.name, item.quantity || 1, item.type);
    }
  }

  /**
   * Add items to inventory
   * @param {string} itemName - Name of the item
   * @param {number} quantity - Amount to add
   * @param {string} [type] - Item type category
   * @returns {number} New total quantity
   */
  add(itemName, quantity = 1, type = null) {
    const existing = this.items.get(itemName);
    if (existing) {
      existing.quantity += quantity;
      return existing.quantity;
    } else {
      this.items.set(itemName, { quantity, type: type || ITEM_TYPE.GOODS });
      return quantity;
    }
  }

  /**
   * Remove items from inventory
   * @param {string} itemName - Name of the item
   * @param {number} quantity - Amount to remove
   * @returns {boolean} True if successful, false if insufficient
   */
  remove(itemName, quantity = 1) {
    const existing = this.items.get(itemName);
    if (!existing || existing.quantity < quantity) {
      return false;
    }
    
    existing.quantity -= quantity;
    if (existing.quantity <= 0) {
      this.items.delete(itemName);
    }
    return true;
  }

  /**
   * Check if has item in sufficient quantity
   * @param {string} itemName - Name of the item
   * @param {number} quantity - Required quantity
   * @returns {boolean} True if has enough
   */
  has(itemName, quantity = 1) {
    const existing = this.items.get(itemName);
    return existing && existing.quantity >= quantity;
  }

  /**
   * Get quantity of an item
   * @param {string} itemName - Name of the item
   * @returns {number} Quantity (0 if not owned)
   */
  getQuantity(itemName) {
    return this.items.get(itemName)?.quantity || 0;
  }

  /**
   * Get all items as array
   * @returns {Array} Array of {item, quantity, type}
   */
  getAll() {
    return Array.from(this.items.entries()).map(([item, data]) => ({
      item,
      quantity: data.quantity,
      type: data.type
    }));
  }

  /**
   * Get items by type
   * @param {string} type - Item type to filter by
   * @returns {Array} Matching items
   */
  getByType(type) {
    return this.getAll().filter(i => i.type === type);
  }

  /**
   * Get total number of unique items
   */
  get uniqueCount() {
    return this.items.size;
  }

  /**
   * Get total quantity of all items
   */
  get totalCount() {
    let total = 0;
    for (const data of this.items.values()) {
      total += data.quantity;
    }
    return total;
  }

  /**
   * Get a random item from inventory
   * @param {string} [type] - Optional type filter
   * @returns {Object|null} Random item or null if empty
   */
  getRandomItem(type = null) {
    let items = this.getAll();
    if (type) {
      items = items.filter(i => i.type === type);
    }
    if (items.length === 0) return null;
    return items[Math.floor(Math.random() * items.length)];
  }

  /**
   * Serialize for persistence
   */
  toJSON() {
    return this.getAll();
  }

  /**
   * Create from JSON
   */
  static fromJSON(data) {
    return new Inventory(data || []);
  }
}

/**
 * TransactionManager - Handles all economic exchanges
 */
export class TransactionManager {
  constructor() {
    // Pending transaction logs for database sync
    this.pendingLogs = [];
    
    // Transaction statistics
    this.stats = {
      totalTransactions: 0,
      totalMoneyExchanged: 0,
      totalItemsExchanged: 0,
      byType: {}
    };
    
    // Price history for market dynamics (optional future feature)
    this.priceHistory = new Map();
  }

  /**
   * Get base price for an item
   * @param {string} itemName - Item name
   * @param {string} [sellerRole] - Seller's role for role-specific pricing
   * @returns {number} Base price
   */
  getBasePrice(itemName, sellerRole = null) {
    // Check role-specific pricing first
    if (sellerRole && ROLE_ITEMS[sellerRole]) {
      const roleItem = ROLE_ITEMS[sellerRole][itemName];
      if (roleItem) return roleItem.price;
    }
    
    // Check all role catalogs
    for (const roleItems of Object.values(ROLE_ITEMS)) {
      if (roleItems[itemName]) {
        return roleItems[itemName].price;
      }
    }
    
    // Default price for unknown items
    return 5;
  }

  /**
   * Calculate trade price with relationship modifier
   * @param {number} basePrice - Base item price
   * @param {number} relationship - Relationship value (0-100)
   * @param {boolean} isBuying - True if buyer perspective
   * @returns {number} Final price
   */
  calculatePrice(basePrice, relationship = 50, isBuying = true) {
    // Better relationships mean better prices
    // Friend (70+): 15% discount buying, 15% bonus selling
    // Neutral (40-70): standard price
    // Stranger (<40): 10% markup buying, 10% less selling
    
    let modifier = 1.0;
    
    if (relationship > 70) {
      modifier = isBuying ? 0.85 : 1.15;
    } else if (relationship < 40) {
      modifier = isBuying ? 1.10 : 0.90;
    }
    
    return Math.max(1, Math.round(basePrice * modifier));
  }

  /**
   * Execute a purchase transaction
   * @param {Object} buyer - Buyer villager
   * @param {Object} seller - Seller villager
   * @param {string} item - Item name
   * @param {number} quantity - Quantity to buy
   * @param {number} [priceOverride] - Optional price override
   * @returns {Object} Transaction result
   */
  executePurchase(buyer, seller, item, quantity = 1, priceOverride = null) {
    // Calculate price
    const basePrice = this.getBasePrice(item, seller.role);
    const relationship = buyer.getRelationship?.(seller.id) || 50;
    const unitPrice = priceOverride ?? this.calculatePrice(basePrice, relationship, true);
    const totalPrice = unitPrice * quantity;
    
    // Validate
    if (!buyer.canAfford(totalPrice)) {
      return {
        success: false,
        reason: 'insufficient_funds',
        needed: totalPrice,
        has: buyer.coins
      };
    }
    
    if (!seller.hasItem(item, quantity)) {
      return {
        success: false,
        reason: 'insufficient_stock',
        needed: quantity,
        has: seller.getItemQuantity(item)
      };
    }
    
    // Execute transfer
    buyer.removeCoins(totalPrice);
    seller.addCoins(totalPrice);
    seller.removeItem(item, quantity);
    buyer.addItem(item, quantity);
    
    // Log transaction
    const transaction = {
      type: TRANSACTION_TYPE.PURCHASE,
      from_villager_id: buyer.id,
      from_villager_name: buyer.name,
      to_villager_id: seller.id,
      to_villager_name: seller.name,
      amount: totalPrice,
      item: item,
      item_quantity: quantity,
      notes: `${buyer.name} bought ${quantity}x ${item} from ${seller.name}`,
      timestamp: Date.now()
    };
    
    this.logTransaction(transaction);
    
    return {
      success: true,
      transaction,
      unitPrice,
      totalPrice
    };
  }

  /**
   * Execute a gift (free transfer)
   * @param {Object} giver - Giving villager
   * @param {Object} receiver - Receiving villager
   * @param {string} [item] - Item to gift (optional)
   * @param {number} [quantity] - Item quantity
   * @param {number} [coins] - Coins to gift
   * @returns {Object} Transaction result
   */
  executeGift(giver, receiver, item = null, quantity = 1, coins = 0) {
    // Validate item gift
    if (item && !giver.hasItem(item, quantity)) {
      return {
        success: false,
        reason: 'insufficient_stock',
        item,
        needed: quantity,
        has: giver.getItemQuantity(item)
      };
    }
    
    // Validate coin gift
    if (coins > 0 && !giver.canAfford(coins)) {
      return {
        success: false,
        reason: 'insufficient_funds',
        needed: coins,
        has: giver.coins
      };
    }
    
    // Execute transfers
    if (item) {
      giver.removeItem(item, quantity);
      receiver.addItem(item, quantity);
    }
    
    if (coins > 0) {
      giver.removeCoins(coins);
      receiver.addCoins(coins);
    }
    
    // Log transaction
    const transaction = {
      type: TRANSACTION_TYPE.GIFT,
      from_villager_id: giver.id,
      from_villager_name: giver.name,
      to_villager_id: receiver.id,
      to_villager_name: receiver.name,
      amount: coins,
      item: item,
      item_quantity: item ? quantity : null,
      notes: `${giver.name} gifted ${item ? `${quantity}x ${item}` : ''}${item && coins ? ' and ' : ''}${coins ? `${coins} coins` : ''} to ${receiver.name}`,
      timestamp: Date.now()
    };
    
    this.logTransaction(transaction);
    
    return {
      success: true,
      transaction
    };
  }

  /**
   * Execute a trade (item for item exchange)
   * @param {Object} villager1 - First villager
   * @param {string} item1 - Item villager1 offers
   * @param {number} qty1 - Quantity of item1
   * @param {Object} villager2 - Second villager
   * @param {string} item2 - Item villager2 offers
   * @param {number} qty2 - Quantity of item2
   * @returns {Object} Transaction result
   */
  executeTrade(villager1, item1, qty1, villager2, item2, qty2) {
    // Validate both sides
    if (!villager1.hasItem(item1, qty1)) {
      return {
        success: false,
        reason: 'villager1_insufficient_stock',
        villager: villager1.id,
        item: item1,
        needed: qty1,
        has: villager1.getItemQuantity(item1)
      };
    }
    
    if (!villager2.hasItem(item2, qty2)) {
      return {
        success: false,
        reason: 'villager2_insufficient_stock',
        villager: villager2.id,
        item: item2,
        needed: qty2,
        has: villager2.getItemQuantity(item2)
      };
    }
    
    // Execute exchange
    villager1.removeItem(item1, qty1);
    villager2.addItem(item1, qty1);
    villager2.removeItem(item2, qty2);
    villager1.addItem(item2, qty2);
    
    // Log transaction
    const transaction = {
      type: TRANSACTION_TYPE.TRADE,
      from_villager_id: villager1.id,
      from_villager_name: villager1.name,
      to_villager_id: villager2.id,
      to_villager_name: villager2.name,
      amount: 0,
      item: `${item1} <-> ${item2}`,
      item_quantity: `${qty1} <-> ${qty2}`,
      notes: `${villager1.name} traded ${qty1}x ${item1} for ${qty2}x ${item2} with ${villager2.name}`,
      timestamp: Date.now()
    };
    
    this.logTransaction(transaction);
    
    return {
      success: true,
      transaction
    };
  }

  /**
   * Execute a payment for services
   * @param {Object} payer - Paying villager
   * @param {Object} receiver - Service provider
   * @param {number} amount - Payment amount
   * @param {string} service - Description of service
   * @returns {Object} Transaction result
   */
  executePayment(payer, receiver, amount, service = 'service') {
    if (!payer.canAfford(amount)) {
      return {
        success: false,
        reason: 'insufficient_funds',
        needed: amount,
        has: payer.coins
      };
    }
    
    payer.removeCoins(amount);
    receiver.addCoins(amount);
    
    const transaction = {
      type: TRANSACTION_TYPE.PAYMENT,
      from_villager_id: payer.id,
      from_villager_name: payer.name,
      to_villager_id: receiver.id,
      to_villager_name: receiver.name,
      amount: amount,
      item: null,
      item_quantity: null,
      notes: `${payer.name} paid ${receiver.name} ${amount} coins for ${service}`,
      timestamp: Date.now()
    };
    
    this.logTransaction(transaction);
    
    return {
      success: true,
      transaction
    };
  }

  /**
   * Add daily income based on role
   * @param {Object} villager - The villager receiving income
   * @returns {Object} Transaction result
   */
  addDailyIncome(villager) {
    // Daily income based on role
    const incomeByRole = {
      herbalist: 10,
      blacksmith: 15,
      baker: 12,
      messenger: 8,
      'tavern keeper': 20,
      scholar: 8,
      farmer: 10,
      merchant: 25,
      florist: 12,
      fisher: 10,
      banker: 30,
      apprentice: 5
    };
    
    const income = incomeByRole[villager.role] || 5;
    villager.addCoins(income);
    
    const transaction = {
      type: TRANSACTION_TYPE.DAILY_INCOME,
      from_villager_id: null,
      from_villager_name: 'Village Economy',
      to_villager_id: villager.id,
      to_villager_name: villager.name,
      amount: income,
      item: null,
      item_quantity: null,
      notes: `${villager.name} earned ${income} coins from their work as ${villager.role}`,
      timestamp: Date.now()
    };
    
    this.logTransaction(transaction);
    
    return {
      success: true,
      income,
      transaction
    };
  }

  /**
   * Restock a villager's inventory based on their role
   * @param {Object} villager - The villager to restock
   */
  restockInventory(villager) {
    const roleInventory = DEFAULT_INVENTORY[villager.role];
    if (!roleInventory) return;
    
    for (const stock of roleInventory) {
      const current = villager.getItemQuantity(stock.item);
      const deficit = stock.quantity - current;
      
      // Restock up to 50% of default if below 25%
      if (current < stock.quantity * 0.25) {
        const restock = Math.ceil(deficit * 0.5);
        villager.addItem(stock.item, restock);
      }
    }
  }

  /**
   * Log a transaction for database persistence
   */
  logTransaction(transaction) {
    this.pendingLogs.push(transaction);
    
    // Update stats
    this.stats.totalTransactions++;
    this.stats.totalMoneyExchanged += transaction.amount || 0;
    if (transaction.item && transaction.item_quantity) {
      const qty = typeof transaction.item_quantity === 'number' 
        ? transaction.item_quantity 
        : 1;
      this.stats.totalItemsExchanged += qty;
    }
    this.stats.byType[transaction.type] = (this.stats.byType[transaction.type] || 0) + 1;
  }

  /**
   * Get and clear pending transaction logs
   * @returns {Array} Pending transactions
   */
  flushPendingLogs() {
    const logs = [...this.pendingLogs];
    this.pendingLogs = [];
    return logs;
  }

  /**
   * Get transaction statistics
   */
  getStats() {
    return { ...this.stats };
  }

  /**
   * Evaluate if a trade would be fair
   * @param {string} item1 - First item
   * @param {number} qty1 - Quantity of first item
   * @param {string} item2 - Second item
   * @param {number} qty2 - Quantity of second item
   * @returns {Object} Fairness evaluation
   */
  evaluateTradeFairness(item1, qty1, item2, qty2) {
    const value1 = this.getBasePrice(item1) * qty1;
    const value2 = this.getBasePrice(item2) * qty2;
    
    const ratio = value1 / value2;
    
    return {
      value1,
      value2,
      ratio,
      isFair: ratio >= 0.7 && ratio <= 1.3,
      favoredParty: ratio > 1.3 ? 'party2' : ratio < 0.7 ? 'party1' : 'even'
    };
  }
}

/**
 * Create a new TransactionManager instance
 */
export function createTransactionManager() {
  return new TransactionManager();
}

export default TransactionManager;
