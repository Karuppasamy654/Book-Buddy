class ManagerTools {
    constructor() {
      this.api = window.api;
    }
  
    async updateFoodPrice(foodItemId, newPrice) {
      try {
        const result = await this.api.updateFoodPrice(foodItemId, newPrice);
        this.showNotification(`Food price updated! Updated ${result.food_item.updated_orders} existing orders.`, 'success');
        try { localStorage.setItem('priceUpdate', String(Date.now())); } catch {}
        return result;
      } catch (error) {
        this.showNotification(`Failed to update food price: ${error.message}`, 'error');
        throw error;
      }
    }
  
    async updateHotelRoomPrice(hotelId, newPrice) {
      try {
        const result = await this.api.updateHotelRoomPrice(hotelId, newPrice);
        this.showNotification(`Hotel room price updated! Updated ${result.hotel.updated_bookings} existing bookings.`, 'success');
        try { localStorage.setItem('priceUpdate', String(Date.now())); } catch {}
        return result;
      } catch (error) {
        this.showNotification(`Failed to update hotel price: ${error.message}`, 'error');
        throw error;
      }
    }
  
    async addFoodItem(name, price, category, type) {
      try {
        const foodData = { name, price, category, type };
        const result = await this.api.addFoodItem(foodData);
        this.showNotification('Food item added successfully!', 'success');
        return result;
      } catch (error) {
        this.showNotification(`Failed to add food item: ${error.message}`, 'error');
        throw error;
      }
    }
  
    showPriceUpdateForm(type, id, currentPrice) {
      const formHTML = `
        <div id="price-update-modal" class="modal">
          <div class="modal-content">
            <span class="close" onclick="this.parentElement.parentElement.remove()">&times;</span>
            <h2>Update ${type} Price</h2>
            <form onsubmit="managerTools.handlePriceUpdate(event, '${type}', ${id})">
              <label>Current Price: ₹${currentPrice}</label>
              <input type="number" id="new-price" placeholder="Enter new price" required>
              <button type="submit">Update Price</button>
            </form>
          </div>
        </div>
      `;
  
      document.body.insertAdjacentHTML('beforeend', formHTML);
    }
  
    async handlePriceUpdate(event, type, id) {
      event.preventDefault();
      
      const newPrice = parseFloat(document.getElementById('new-price').value);
      
      if (newPrice <= 0) {
        this.showNotification('Price must be greater than 0', 'error');
        return;
      }
  
      try {
        if (type === 'food') {
          await this.updateFoodPrice(id, newPrice);
        } else if (type === 'hotel') {
          await this.updateHotelRoomPrice(id, newPrice);
        }
        
        document.getElementById('price-update-modal').remove();
      } catch (error) {
        console.error('Error updating price:', error);
      }
    }
  
    showNotification(message, type = 'info') {
      const notification = document.createElement('div');
      notification.className = `notification ${type}`;
      notification.textContent = message;
      document.body.appendChild(notification);
      setTimeout(() => notification.remove(), 3000);
    }
  }
  
  window.managerTools = new ManagerTools();