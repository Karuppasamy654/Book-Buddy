class OrderManager {
    constructor() {
      this.api = window.api;
    }
  
    async createFoodOrder(bookingId, foodItems) {
      try {
        const orderData = {
          booking_id: bookingId,
          food_items: foodItems
        };
  
        const result = await this.api.createFoodOrder(orderData);
        this.showNotification('Order placed successfully!', 'success');
        return result;
      } catch (error) {
        this.showNotification(`Order failed: ${error.message}`, 'error');
        throw error;
      }
    }
  
    async getOrder(orderId) {
      try {
        const order = await this.api.getOrder(orderId);
        return order;
      } catch (error) {
        this.showNotification(`Failed to load order: ${error.message}`, 'error');
        throw error;
      }
    }
  
    async showFoodOrderModal(bookingId) {
      try {
        const foodItems = await this.api.getFoodItems();
        
        const modalHTML = `
          <div id="food-order-modal" class="modal">
            <div class="modal-content">
              <span class="close" onclick="this.parentElement.parentElement.remove()">&times;</span>
              <h2>Order Food</h2>
              <div id="food-items-list">
                ${foodItems.map(item => `
                  <div class="food-item">
                    <h4>${item.name}</h4>
                    <p>₹${item.price} - ${item.category} - ${item.type}</p>
                    <div class="quantity-controls">
                      <button onclick="orderManager.decreaseQuantity(${item.food_item_id})">-</button>
                      <span id="qty-${item.food_item_id}">0</span>
                      <button onclick="orderManager.increaseQuantity(${item.food_item_id})">+</button>
                    </div>
                  </div>
                `).join('')}
              </div>
              <button onclick="orderManager.placeOrder(${bookingId})">Place Order</button>
            </div>
          </div>
        `;
  
        document.body.insertAdjacentHTML('beforeend', modalHTML);
      } catch (error) {
        this.showNotification(`Failed to load food menu: ${error.message}`, 'error');
      }
    }
  
    increaseQuantity(foodItemId) {
      const qtyElement = document.getElementById(`qty-${foodItemId}`);
      const currentQty = parseInt(qtyElement.textContent) || 0;
      qtyElement.textContent = currentQty + 1;
    }
  
    decreaseQuantity(foodItemId) {
      const qtyElement = document.getElementById(`qty-${foodItemId}`);
      const currentQty = parseInt(qtyElement.textContent) || 0;
      if (currentQty > 0) {
        qtyElement.textContent = currentQty - 1;
      }
    }
  
    async placeOrder(bookingId) {
      try {
        const foodItems = [];
        
        document.querySelectorAll('[id^="qty-"]').forEach(element => {
          const foodItemId = element.id.replace('qty-', '');
          const quantity = parseInt(element.textContent) || 0;
          
          if (quantity > 0) {
            foodItems.push({
              food_item_id: parseInt(foodItemId),
              quantity: quantity
            });
          }
        });
  
        if (foodItems.length === 0) {
          this.showNotification('Please select at least one item', 'error');
          return;
        }
  
        await this.createFoodOrder(bookingId, foodItems);
        document.getElementById('food-order-modal').remove();
        
      } catch (error) {
        console.error('Error placing order:', error);
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
  
  window.orderManager = new OrderManager();