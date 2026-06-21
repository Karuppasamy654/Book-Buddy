class FoodDatabaseAPI {
    constructor() {
        this.dbPath = './database/food_db.json';
        this.cache = null;
        this.lastFetch = null;
        this.cacheTimeout = 5000; // 5 seconds cache
    }

    async loadDatabase() {
        try {
            const response = await fetch(this.dbPath);
            if (!response.ok) {
                throw new Error('Failed to load database');
            }
            this.cache = await response.json();
            this.lastFetch = Date.now();
            return this.cache;
        } catch (error) {
            console.error('Error loading database:', error);
            return this.getFallbackData();
        }
    }

    getFallbackData() {
        const fallbackData = {
            hotels: {
                "1": {
                    id: 1,
                    name: "Book Buddy Central Hotel",
                    foodMenu: {
                        breakfast: [
                            { id: "kesari", name: "Kesari", price: 120, img: "kesari.webp", description: "Traditional South Indian sweet dish", available: true },
                            { id: "idli", name: "Idli Sambar (2pcs)", price: 100, img: "idli.jpg", description: "Soft rice cakes with spicy lentil soup", available: true },
                            { id: "bread_omelette", name: "Bread Omelette (2 Eggs)", price: 200, img: "bread omlete.webp", description: "Fluffy omelette with toasted bread", available: true }
                        ],
                        lunch: [
                            { id: "chicken_biryani", name: "Chicken Biryani", price: 450, img: "chicken biriyani.webp", description: "Aromatic basmati rice with tender chicken", available: true },
                            { id: "paneer_tikka", name: "Paneer Tikka Masala", price: 380, img: "paneer tikka.webp", description: "Cottage cheese in creamy tomato sauce", available: true }
                        ],
                        dinner: [
                            { id: "butter_chicken", name: "Butter Chicken", price: 550, img: "chicken gravy'.webp", description: "Tender chicken in rich tomato and cream sauce", available: true },
                            { id: "veg_thali", name: "Royal Vegetarian Thali", price: 420, img: "mini lunch.webp", description: "Complete meal with multiple vegetarian dishes", available: true }
                        ]
                    }
                }
            }
        };
        return fallbackData;
    }

    async getData() {
        if (this.cache && (Date.now() - this.lastFetch) < this.cacheTimeout) {
            return this.cache;
        }
        return await this.loadDatabase();
    }

    async getFoodMenu(hotelId) {
        const data = await this.getData();
        return data.hotels[hotelId]?.foodMenu || { breakfast: [], lunch: [], dinner: [] };
    }

    async updateFoodPrice(hotelId, category, itemId, newPrice) {
        const data = await this.getData();
        
        if (data.hotels[hotelId] && data.hotels[hotelId].foodMenu[category]) {
            const item = data.hotels[hotelId].foodMenu[category].find(item => item.id === itemId);
            if (item) {
                item.price = newPrice;
                item.lastUpdated = new Date().toISOString();
                
                this.cache = data;
                
                this.saveToSessionStorage(hotelId, data.hotels[hotelId].foodMenu);
                
                return { success: true, item: item };
            }
        }
        return { success: false, error: 'Item not found' };
    }

    async addFoodItem(hotelId, category, foodItem) {
        const data = await this.getData();
        
        if (!data.hotels[hotelId]) {
            data.hotels[hotelId] = {
                id: parseInt(hotelId),
                name: `Hotel ${hotelId}`,
                foodMenu: { breakfast: [], lunch: [], dinner: [] }
            };
        }

        if (!data.hotels[hotelId].foodMenu[category]) {
            data.hotels[hotelId].foodMenu[category] = [];
        }

        const newItem = {
            ...foodItem,
            id: foodItem.id || `${category}_${Date.now()}`,
            available: true,
            createdAt: new Date().toISOString(),
            lastUpdated: new Date().toISOString()
        };

        data.hotels[hotelId].foodMenu[category].push(newItem);
        
        this.cache = data;
        
        this.saveToSessionStorage(hotelId, data.hotels[hotelId].foodMenu);
        
        return { success: true, item: newItem };
    }

    async removeFoodItem(hotelId, category, itemId) {
        const data = await this.getData();
        
        if (data.hotels[hotelId] && data.hotels[hotelId].foodMenu[category]) {
            const index = data.hotels[hotelId].foodMenu[category].findIndex(item => item.id === itemId);
            if (index !== -1) {
                const removedItem = data.hotels[hotelId].foodMenu[category].splice(index, 1)[0];
                
                this.cache = data;
                
                this.saveToSessionStorage(hotelId, data.hotels[hotelId].foodMenu);
                
                return { success: true, item: removedItem };
            }
        }
        return { success: false, error: 'Item not found' };
    }

    saveToSessionStorage(hotelId, foodMenu) {
        try {
            sessionStorage.setItem(`foodMenu_${hotelId}`, JSON.stringify(foodMenu));
            sessionStorage.setItem(`foodMenu_${hotelId}_lastUpdated`, new Date().toISOString());
        } catch (error) {
            console.error('Error saving to sessionStorage:', error);
        }
    }

    getFromSessionStorage(hotelId) {
        try {
            const data = sessionStorage.getItem(`foodMenu_${hotelId}`);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error('Error loading from sessionStorage:', error);
            return null;
        }
    }

    async syncWithOtherPages(hotelId) {
        const foodMenu = this.getFromSessionStorage(hotelId);
        if (foodMenu) {
            window.dispatchEvent(new CustomEvent('foodMenuUpdated', {
                detail: { hotelId, foodMenu }
            }));
        }
    }
}

window.foodDB = new FoodDatabaseAPI();
