
class HotelManagementSystem {
    constructor() {
        this.currentUser = null;
        this.init();
    }

    async init() {
        if (typeof dbManager === 'undefined') {
            setTimeout(() => this.init(), 100);
            return;
        }
        
        this.setupEventListeners();
        this.setupDatabaseListeners();
        this.updateUI();
    }

    setupDatabaseListeners() {
        if (typeof dbManager !== 'undefined') {
            dbManager.addListener((event, data) => {
                switch(event) {
                    case 'hotelPricesUpdated':
                        this.handleHotelPriceUpdate(data);
                        break;
                    case 'foodPriceUpdated':
                        this.handleFoodPriceUpdate(data);
                        break;
                    case 'dataUpdated':
                        this.updateUI();
                        break;
                }
            });
        }
    }

    handleHotelPriceUpdate(data) {
        this.updateHotelCards();
        this.showNotification(`Hotel prices updated for ${data.hotelId}`, 'success');
    }

    handleFoodPriceUpdate(data) {
        this.updateFoodMenu();
        this.showNotification(`Food price updated for ${data.foodId}`, 'success');
    }

    setupEventListeners() {
        document.addEventListener('click', (e) => {
            if (e.target.closest('.hotel_card')) {
                const hotelCard = e.target.closest('.hotel_card');
                const hotelId = hotelCard.getAttribute('data-hotel');
                if (hotelId) {
                    this.selectHotel(hotelId);
                }
            }
        });

        document.addEventListener('submit', (e) => {
            if (e.target.id === 'bookingForm') {
                e.preventDefault();
                this.handleBooking(e.target);
            }
        });

        document.addEventListener('click', (e) => {
            if (e.target.id === 'confirmFoodBtn' || e.target.classList.contains('confirm_food_btn')) {
                this.confirmFoodOrder();
            }
        });

        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('btn-assign')) {
                this.assignTask(e.target);
            }
            if (e.target.classList.contains('btn-complete')) {
                this.completeTask(e.target);
            }
        });

        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('update_btn')) {
                this.updateHotelPrices(e.target);
            }
            if (e.target.classList.contains('update_food_btn')) {
                this.updateFoodPrice(e.target);
            }
        });
    }

    selectHotel(hotelId) {
        if (this.hotels[hotelId]) {
            localStorage.setItem('selectedHotel', hotelId);
            this.showNotification('Hotel selected successfully!', 'success');
        }
    }

    handleBooking(form) {
        const formData = new FormData(form);
        const bookingData = {
            id: this.generateId(),
            hotel: localStorage.getItem('selectedHotel'),
            guest: {
                firstName: formData.get('firstName'),
                lastName: formData.get('lastName'),
                email: formData.get('email'),
                phone: formData.get('phone')
            },
            dates: {
                checkIn: formData.get('checkIn'),
                checkOut: formData.get('checkOut')
            },
            room: {
                type: formData.get('roomType'),
                guests: formData.get('guests')
            },
            specialRequests: formData.get('specialRequests'),
            foodOrder: JSON.parse(localStorage.getItem('foodOrder') || '[]'),
            status: 'confirmed',
            createdAt: new Date().toISOString()
        };

        this.bookings.push(bookingData);
        this.saveData();
        
        this.showNotification('Booking confirmed! You will receive a confirmation email shortly.', 'success');
        
        localStorage.removeItem('foodOrder');
        
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 2000);
    }

    confirmFoodOrder() {
        const cart = JSON.parse(localStorage.getItem('foodOrder') || '[]');
        if (cart.length === 0) {
            this.showNotification('Please add some items to your cart first!', 'error');
            return;
        }
        
        this.showNotification('Food order confirmed! Returning to booking...', 'success');
        setTimeout(() => {
            window.location.href = 'room.html';
        }, 1500);
    }

    assignTask(button) {
        const taskItem = button.closest('.task-item');
        const statusSpan = taskItem.querySelector('.task-status');
        
        statusSpan.textContent = 'In Progress';
        statusSpan.className = 'task-status status-in-progress';
        
        button.textContent = 'Mark Complete';
        button.className = 'btn-complete';
        button.onclick = () => this.completeTask(button);
        
        this.showNotification('Task assigned and started!', 'success');
        this.updateStats();
    }

    completeTask(button) {
        const taskItem = button.closest('.task-item');
        const statusSpan = taskItem.querySelector('.task-status');
        
        statusSpan.textContent = 'Completed';
        statusSpan.className = 'task-status status-completed';
        
        button.textContent = 'Completed';
        button.disabled = true;
        
        this.showNotification('Task completed successfully!', 'success');
        this.updateStats();
    }

    updateHotelPrices(button) {
        const hotelCard = button.closest('.hotel_card');
        const hotelName = hotelCard.querySelector('.hotel_name').textContent;
        
        const standardPrice = hotelCard.querySelector('input[id$="-standard"]').value;
        const deluxePrice = hotelCard.querySelector('input[id$="-deluxe"]').value;
        const suitePrice = hotelCard.querySelector('input[id$="-suite"]').value;
        
        const hotelId = this.getHotelIdByName(hotelName);
        if (hotelId && dbManager) {
            const newPricing = {
                standard: parseInt(standardPrice),
                deluxe: parseInt(deluxePrice),
                suite: parseInt(suitePrice)
            };
            
            if (dbManager.updateHotelPrices(hotelId, newPricing)) {
                this.showNotification('Hotel prices updated successfully!', 'success');
            } else {
                this.showNotification('Error updating hotel prices!', 'error');
            }
        }
    }

    updateFoodPrice(button) {
        const foodItem = button.closest('.food_item');
        const foodName = foodItem.querySelector('.food_name').textContent;
        const priceInput = foodItem.querySelector('.food_price_input');
        const newPrice = priceInput.value;
        
        const foodData = this.findFoodItem(foodName);
        if (foodData && dbManager) {
            if (dbManager.updateFoodPrice(foodData.id, parseInt(newPrice), foodData.category)) {
                this.showNotification(`Food price updated to ₹${newPrice}!`, 'success');
            } else {
                this.showNotification('Error updating food price!', 'error');
            }
        }
    }

    findFoodItem(foodName) {
        const categories = dbManager.getFoodCategories();
        for (const category of categories) {
            const items = dbManager.getFoodMenu(category);
            const item = items.find(item => item.name === foodName);
            if (item) {
                return { ...item, category };
            }
        }
        return null;
    }

    getHotelIdByName(name) {
        const hotels = dbManager.getAllHotels();
        const hotel = hotels.find(h => h.name === name);
        return hotel ? hotel.id : null;
    }

    updateStats() {
        const totalTasks = document.querySelectorAll('.task-item').length;
        const completedTasks = document.querySelectorAll('.status-completed').length;
        const pendingTasks = totalTasks - completedTasks;
        
        if (document.getElementById('totalTasks')) {
            document.getElementById('totalTasks').textContent = totalTasks;
        }
        if (document.getElementById('completedTasks')) {
            document.getElementById('completedTasks').textContent = completedTasks;
        }
        if (document.getElementById('pendingTasks')) {
            document.getElementById('pendingTasks').textContent = pendingTasks;
        }
    }

    updateUI() {
        this.updateHotelCards();
        this.updateFoodMenu();
        this.updateStaffTasks();
    }

    updateHotelCards() {
        if (typeof dbManager === 'undefined') return;
        
        const hotels = dbManager.getHotelsWithPricing();
        const hotelGrid = document.getElementById('hotelGrid');
        
        if (hotelGrid) {
            hotelGrid.innerHTML = '';
            hotels.forEach((hotel, index) => {
                const hotelCard = document.createElement('div');
                hotelCard.className = 'hotel_card';
                hotelCard.setAttribute('data-hotel', hotel.id);
                hotelCard.style.animationDelay = `${0.5 + index * 0.1}s`;

                hotelCard.innerHTML = `
                    <img src="${hotel.image}" alt="${hotel.name}">
                    <div class="hotel_info">
                        <h3 class="hotel_name">${hotel.name}</h3>
                        <div class="hotel_location">
                            <i class="fas fa-map-marker-alt"></i>
                            <span>${hotel.location}</span>
                        </div>
                        <div class="hotel_rating">
                            <div class="stars">${'★'.repeat(Math.floor(hotel.rating))}${'☆'.repeat(5-Math.floor(hotel.rating))}</div>
                            <span class="rating_text">${hotel.rating}</span>
                        </div>
                        <div class="hotel_price">₹${hotel.currentPrice.toLocaleString()}/night</div>
                        <div class="hotel_features">
                            ${hotel.features.map(feature => `<span class="feature_tag">${feature}</span>`).join('')}
                        </div>
                        <button class="book_now_btn">Book Now</button>
                    </div>
                `;

                hotelGrid.appendChild(hotelCard);
            });
        }
    }

    updateFoodMenu() {
        if (typeof dbManager === 'undefined') return;
        
        const categories = dbManager.getFoodCategories();
        categories.forEach(category => {
            const items = dbManager.getFoodMenu(category);
            const categoryContainer = document.getElementById(`${category}-menu`);
            
            if (categoryContainer) {
                categoryContainer.innerHTML = '';
                items.forEach(item => {
                    const foodItem = document.createElement('div');
                    foodItem.className = 'food_item';
                    foodItem.innerHTML = `
                        <img src="${item.image}" alt="${item.name}">
                        <div class="food_info">
                            <h4 class="food_name">${item.name}</h4>
                            <p class="food_description">${item.description}</p>
                            <div class="food_price">₹${item.price}</div>
                        </div>
                    `;
                    categoryContainer.appendChild(foodItem);
                });
            }
        });
    }

    updateStaffTasks() {
        if (typeof dbManager === 'undefined') return;
        
        const staffContainer = document.getElementById('staff-tasks');
        if (staffContainer) {
            this.updateStats();
        }
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background-color: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#2196F3'};
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 10000;
            animation: slideInFromRight 0.3s ease-out;
            max-width: 300px;
        `;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideInFromRight 0.3s ease-out reverse';
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    getHotel(id) {
        return this.hotels[id] || null;
    }

    getAllHotels() {
        return Object.values(this.hotels);
    }

    getFoodMenu(category) {
        return this.foodMenu[category] || [];
    }

    getFoodCategories() {
        return Object.keys(this.foodMenu);
    }

    getStaff(id) {
        return this.staff[id] || null;
    }

    getAllStaff() {
        return Object.values(this.staff);
    }

    getBookings() {
        return this.bookings;
    }

    addBooking(booking) {
        booking.id = this.generateId();
        booking.createdAt = new Date().toISOString();
        this.bookings.push(booking);
        this.saveData();
    }

    updateBookingStatus(bookingId, status) {
        const booking = this.bookings.find(b => b.id === bookingId);
        if (booking) {
            booking.status = status;
            booking.updatedAt = new Date().toISOString();
            this.saveData();
        }
    }

    searchHotels(query) {
        const results = [];
        for (const hotel of Object.values(this.hotels)) {
            if (hotel.name.toLowerCase().includes(query.toLowerCase()) ||
                hotel.location.toLowerCase().includes(query.toLowerCase()) ||
                hotel.features.some(feature => feature.toLowerCase().includes(query.toLowerCase()))) {
                results.push(hotel);
            }
        }
        return results;
    }

    filterHotelsByPrice(minPrice, maxPrice) {
        return Object.values(this.hotels).filter(hotel => 
            hotel.price >= minPrice && hotel.price <= maxPrice
        );
    }

    filterHotelsByType(type) {
        return Object.values(this.hotels).filter(hotel => hotel.type === type);
    }

    sortHotels(hotels, sortBy) {
        switch(sortBy) {
            case 'price-low':
                return hotels.sort((a, b) => a.price - b.price);
            case 'price-high':
                return hotels.sort((a, b) => b.price - a.price);
            case 'rating':
                return hotels.sort((a, b) => b.rating - a.rating);
            case 'name':
                return hotels.sort((a, b) => a.name.localeCompare(b.name));
            default:
                return hotels;
        }
    }
}

const hotelSystem = new HotelManagementSystem();

window.HotelManagementSystem = HotelManagementSystem;
window.hotelSystem = hotelSystem;
