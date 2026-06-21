if (!(typeof window !== 'undefined' && window.BookBuddyAPI)) {
class BookBuddyAPI {
    constructor() {
      const origin = (typeof window !== 'undefined' && window.location && window.location.origin) || '';
      const override = (typeof window !== 'undefined' && (window.API_BASE_URL || localStorage.getItem('apiBaseUrl'))) || '';
      const devBackend = 'http://localhost:5002/api/v1';
      if (override) {
        this.baseURL = override.replace(/\/$/, '');
      } else if (/^https?:\/\//.test(origin) && !origin.includes('localhost') && !origin.includes('127.0.0.1')) {
        this.baseURL = `${origin}/api/v1`;
      } else {
        this.baseURL = devBackend;
      }
      this.token = this._readTokenFromStorage();
    }

    _readTokenFromStorage() {
      return (
        localStorage.getItem('token') ||
        localStorage.getItem('authToken') ||
        localStorage.getItem('jwt') ||
        null
      );
    }
  
    setToken(token) {
      this.token = token;
      if (token) {
        localStorage.setItem('token', token);
      } else {
        localStorage.removeItem('token');
      }
    }
  
    async request(endpoint, options = {}) {
      const url = `${this.baseURL}${endpoint}`;
      if (!this.token) {
        const t = this._readTokenFromStorage();
        if (t) this.token = t;
      }
      const config = {
        headers: {
          'Content-Type': 'application/json',
          ...(this.token && { 'Authorization': `Bearer ${this.token}` })
        },
        ...options
      };
  
      try {
        const response = await fetch(url, config);
        const text = await response.text();
        const data = text ? JSON.parse(text) : {};

        if (!response.ok) {
          if (response.status === 401) {
            this.setToken(null);
          }
          throw new Error(data.message || text || 'API request failed');
        }

        return data;
      } catch (error) {
        console.error('API Error:', error);
        if (error && (error.name === 'TypeError' || String(error.message).includes('Failed to fetch'))) {
          throw new Error(`Network error: could not reach ${url}. Is the backend running and reachable?`);
        }
        throw error;
      }
    }
  
    async login(email, password) {
      const data = await this.request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });
      
      if (data.token) {
        this.setToken(data.token);
      }
      
      return data;
    }
  
    async register(userData) {
      const data = await this.request('/auth/register', {
        method: 'POST',
        body: JSON.stringify(userData)
      });
      
      if (data.token) {
        this.setToken(data.token);
      }
      
      return data;
    }
  
    async createBooking(bookingData) {
      return await this.request('/bookings/create', {
        method: 'POST',
        body: JSON.stringify(bookingData)
      });
    }
  
    async getMyBookings() {
      return await this.request('/bookings/my-bookings');
    }
  
    async createFoodOrder(orderData) {
      return await this.request('/orders/create', {
        method: 'POST',
        body: JSON.stringify(orderData)
      });
    }
  
    async getOrder(orderId) {
      return await this.request(`/orders/${orderId}`);
    }
  
    async getHotels(filters = {}) {
      const queryParams = new URLSearchParams(filters).toString();
      return await this.request(`/hotels?${queryParams}`);
    }
  
    async getHotel(hotelId) {
      return await this.request(`/hotels/${hotelId}`);
    }
  
    async getFoodItems(filters = {}) {
      const queryParams = new URLSearchParams(filters).toString();
      return await this.request(`/food?${queryParams}`);
    }
  
    async getFoodItem(foodItemId) {
      return await this.request(`/food/${foodItemId}`);
    }
  
    async updateFoodPrice(foodItemId, newPrice) {
      return await this.request(`/manager/food/${foodItemId}/price`, {
        method: 'PUT',
        body: JSON.stringify({ price: newPrice })
      });
    }
  
    async updateHotelRoomPrice(hotelId, newPrice) {
      return await this.request(`/manager/hotel/${hotelId}/room-price`, {
        method: 'PUT',
        body: JSON.stringify({ base_price_per_night: newPrice })
      });
    }

    async setHotelPriceAndRefresh(hotelId, newPrice) {
      await this.updateHotelRoomPrice(hotelId, newPrice);
      return await this.getHotel(hotelId);
    }

    async setFoodPriceAndRefresh(foodItemId, newPrice) {
      await this.updateFoodPrice(foodItemId, newPrice);
      return await this.getFoodItem(foodItemId);
    }
  
    async addFoodItem(foodData) {
      return await this.request('/manager/food', {
        method: 'POST',
        body: JSON.stringify(foodData)
      });
    }

    async assignTask(staffEmail, title, description, due_date) {
      return await this.request('/manager/tasks', {
        method: 'POST',
        body: JSON.stringify({ staffEmail, title, description, due_date })
      });
    }

    async listTasksForStaff(staffEmail) {
      const q = new URLSearchParams({ staffEmail }).toString();
      return await this.request(`/manager/tasks?${q}`);
    }

    async updateTaskStatus(task_id, status) {
      return await this.request(`/manager/tasks/${task_id}`, {
        method: 'PUT',
        body: JSON.stringify({ status })
      });
    }

    async listMyTasks() {
      return await this.request('/manager/tasks/mine');
    }

    async updateMyTaskStatus(task_id, status) {
      return await this.request(`/manager/tasks/${task_id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status })
      });
    }

    async getManagerStaff() {
      return await this.request('/manager/staff');
    }

    async getManagerAnalytics() {
      return await this.request('/manager/analytics');
    }

  }
  if (typeof window !== 'undefined') {
    if (!window.BookBuddyAPI) window.BookBuddyAPI = BookBuddyAPI;
  }
}

if (typeof window !== 'undefined') {
  if (!window.api && window.BookBuddyAPI) {
    window.api = new window.BookBuddyAPI();
  }
}