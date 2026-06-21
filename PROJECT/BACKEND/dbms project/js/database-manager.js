class DatabaseManager {
    constructor() {
        this.hotels = {};
        this.foodMenu = {};
        this.staff = {};
        this.bookings = [];
        this.lastUpdated = null;
        this.listeners = [];
        this.init();
    }

    async init() {
        await this.loadData();
        this.setupStorageListener();
        this.setupPeriodicSync();
    }

    async loadData() {
        try {
            const savedData = localStorage.getItem('hotelManagementData');
            if (savedData) {
                const data = JSON.parse(savedData);
                this.hotels = data.hotels || {};
                this.foodMenu = data.foodMenu || {};
                this.staff = data.staff || {};
                this.bookings = data.bookings || [];
                this.lastUpdated = data.lastUpdated;
            } else {
                await this.loadFromFiles();
            }
        } catch (error) {
            console.error('Error loading data:', error);
            await this.loadFromFiles();
        }
    }

    async loadFromFiles() {
        try {
            const response = await fetch('database/hotels_db.json');
            const data = await response.json();
            
            this.hotels = data.hotels || {};
            this.foodMenu = data.foodMenu || {};
            this.staff = data.staff || {};
            this.bookings = data.bookings || [];
            this.lastUpdated = data.lastUpdated;
            
            this.saveData();
        } catch (error) {
            console.error('Error loading from files:', error);
            this.initializeDefaultData();
        }
    }

    initializeDefaultData() {
        this.hotels = {
            "taj-coromandel": {
                id: "taj-coromandel",
                name: "Taj Coromandel",
                location: "Anna Salai, Chennai",
                rating: 4.8,
                price: 8500,
                image: "taj-coromandel.jpg",
                features: ["Luxury", "Pool", "Spa"],
                type: "luxury",
                pricing: {
                    standard: 8500,
                    deluxe: 12000,
                    suite: 18000,
                    presidential: 25000
                },
                rooms: {
                    total: 200,
                    available: 45,
                    types: {
                        standard: 120,
                        deluxe: 60,
                        suite: 15,
                        presidential: 5
                    }
                }
            }
        };
        
        this.foodMenu = {
            breakfast: [
                { id: "idli", name: "Idli Sambar (2pcs)", price: 100, image: "idli.jpg" }
            ]
        };
        
        this.staff = {};
        this.bookings = [];
        this.lastUpdated = new Date().toISOString();
    }

    saveData() {
        const data = {
            hotels: this.hotels,
            foodMenu: this.foodMenu,
            staff: this.staff,
            bookings: this.bookings,
            lastUpdated: new Date().toISOString()
        };
        localStorage.setItem('hotelManagementData', JSON.stringify(data));
        this.notifyListeners('dataUpdated', data);
    }

    setupStorageListener() {
        window.addEventListener('storage', (e) => {
            if (e.key === 'hotelManagementData') {
                this.loadData();
                this.notifyListeners('dataSynced', JSON.parse(e.newValue));
            }
        });
    }

    setupPeriodicSync() {
        setInterval(() => {
            this.checkForUpdates();
        }, 5000); // Check every 5 seconds
    }

    async checkForUpdates() {
        const currentData = localStorage.getItem('hotelManagementData');
        if (currentData) {
            const data = JSON.parse(currentData);
            if (data.lastUpdated !== this.lastUpdated) {
                await this.loadData();
                this.notifyListeners('dataUpdated', data);
            }
        }
    }

    addListener(callback) {
        this.listeners.push(callback);
    }

    removeListener(callback) {
        this.listeners = this.listeners.filter(listener => listener !== callback);
    }

    notifyListeners(event, data) {
        this.listeners.forEach(listener => {
            try {
                listener(event, data);
            } catch (error) {
                console.error('Error in listener:', error);
            }
        });
    }

    updateHotelPrices(hotelId, newPricing) {
        if (this.hotels[hotelId]) {
            this.hotels[hotelId].pricing = { ...this.hotels[hotelId].pricing, ...newPricing };
            this.hotels[hotelId].price = Math.min(...Object.values(newPricing));
            this.saveData();
            this.notifyListeners('hotelPricesUpdated', { hotelId, newPricing });
            return true;
        }
        return false;
    }

    updateFoodPrice(foodId, newPrice, category) {
        if (this.foodMenu[category]) {
            const item = this.foodMenu[category].find(item => item.id === foodId);
            if (item) {
                item.price = newPrice;
                this.saveData();
                this.notifyListeners('foodPriceUpdated', { foodId, newPrice, category });
                return true;
            }
        }
        return false;
    }

    getHotel(hotelId) {
        return this.hotels[hotelId] || null;
    }

    getAllHotels() {
        return Object.values(this.hotels);
    }

    getHotelsWithPricing() {
        return Object.values(this.hotels).map(hotel => ({
            ...hotel,
            currentPrice: hotel.pricing ? Math.min(...Object.values(hotel.pricing)) : hotel.price
        }));
    }

    searchHotels(query) {
        const results = [];
        for (const hotel of Object.values(this.hotels)) {
            if (hotel.name.toLowerCase().includes(query.toLowerCase()) ||
                hotel.location.toLowerCase().includes(query.toLowerCase()) ||
                hotel.features.some(feature => feature.toLowerCase().includes(query.toLowerCase()))) {
                results.push({
                    ...hotel,
                    currentPrice: hotel.pricing ? Math.min(...Object.values(hotel.pricing)) : hotel.price
                });
            }
        }
        return results;
    }

    filterHotelsByPrice(minPrice, maxPrice) {
        return Object.values(this.hotels).filter(hotel => {
            const currentPrice = hotel.pricing ? Math.min(...Object.values(hotel.pricing)) : hotel.price;
            return currentPrice >= minPrice && currentPrice <= maxPrice;
        });
    }

    getFoodMenu(category) {
        return this.foodMenu[category] || [];
    }

    getFoodCategories() {
        return Object.keys(this.foodMenu);
    }

    addBooking(booking) {
        booking.id = this.generateId();
        booking.createdAt = new Date().toISOString();
        this.bookings.push(booking);
        this.saveData();
        this.notifyListeners('bookingAdded', booking);
        return booking.id;
    }

    updateBookingStatus(bookingId, status) {
        const booking = this.bookings.find(b => b.id === bookingId);
        if (booking) {
            booking.status = status;
            booking.updatedAt = new Date().toISOString();
            this.saveData();
            this.notifyListeners('bookingUpdated', booking);
            return true;
        }
        return false;
    }

    getBookings() {
        return this.bookings;
    }

    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    exportData() {
        return {
            hotels: this.hotels,
            foodMenu: this.foodMenu,
            staff: this.staff,
            bookings: this.bookings,
            lastUpdated: this.lastUpdated
        };
    }

    importData(data) {
        if (data.hotels) this.hotels = data.hotels;
        if (data.foodMenu) this.foodMenu = data.foodMenu;
        if (data.staff) this.staff = data.staff;
        if (data.bookings) this.bookings = data.bookings;
        if (data.lastUpdated) this.lastUpdated = data.lastUpdated;
        
        this.saveData();
        this.notifyListeners('dataImported', data);
    }
}

const dbManager = new DatabaseManager();

window.DatabaseManager = DatabaseManager;
window.dbManager = dbManager;
