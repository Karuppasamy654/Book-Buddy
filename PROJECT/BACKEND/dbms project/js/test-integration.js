class IntegrationTest {
  constructor() {
    this.api = new BookBuddyAPI();
    this.testResults = [];
  }

  async runAllTests() {
    console.log('🧪 Running BookBuddy Integration Tests...\n');

    try {
      await this.testAuthentication();
      await this.testHotelOperations();
      await this.testFoodOperations();
      await this.testBookingOperations();
      await this.testOrderOperations();
      await this.testManagerOperations();

      this.displayResults();
    } catch (error) {
      console.error('❌ Test suite failed:', error);
    }
  }

  async testAuthentication() {
    console.log('🔐 Testing Authentication...');
    
    try {
      const registerData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'test123',
        role: 'Customer',
        phone_number: '9876543210'
      };
      
      const registerResult = await this.api.register(registerData);
      this.addResult('Registration', registerResult.success, registerResult.message);
      
      const loginResult = await this.api.login('test@example.com', 'test123');
      this.addResult('Login', loginResult.user ? true : false, 'Login successful');
      
    } catch (error) {
      this.addResult('Authentication', false, error.message);
    }
  }

  async testHotelOperations() {
    console.log('🏨 Testing Hotel Operations...');
    
    try {
      const hotels = await this.api.getHotels();
      this.addResult('Get Hotels', hotels.success, `Found ${hotels.data?.length || 0} hotels`);
      
      if (hotels.data && hotels.data.length > 0) {
        const hotel = await this.api.getHotel(hotels.data[0].hotel_id);
        this.addResult('Get Single Hotel', hotel.success, 'Hotel details retrieved');
      }
      
    } catch (error) {
      this.addResult('Hotel Operations', false, error.message);
    }
  }

  async testFoodOperations() {
    console.log('🍽️ Testing Food Operations...');
    
    try {
      const foodItems = await this.api.getFoodItems();
      this.addResult('Get Food Items', foodItems.success, `Found ${foodItems.data?.length || 0} food items`);
      
      const breakfastItems = await this.api.getFoodItems({ category: 'Breakfast' });
      this.addResult('Get Food by Category', breakfastItems.success, `Found ${breakfastItems.data?.length || 0} breakfast items`);
      
    } catch (error) {
      this.addResult('Food Operations', false, error.message);
    }
  }

  async testBookingOperations() {
    console.log('📅 Testing Booking Operations...');
    
    try {
      const bookingData = {
        hotel_id: 1,
        room_number: '101',
        check_in_date: '2024-02-01',
        check_out_date: '2024-02-03',
        total_nights: 2
      };
      
      const booking = await this.api.createBooking(bookingData);
      this.addResult('Create Booking', booking.success, 'Booking created successfully');
      
      const myBookings = await this.api.getMyBookings();
      this.addResult('Get My Bookings', myBookings.success, `Found ${myBookings.data?.length || 0} bookings`);
      
    } catch (error) {
      this.addResult('Booking Operations', false, error.message);
    }
  }

  async testOrderOperations() {
    console.log('🍕 Testing Order Operations...');
    
    try {
      const orderData = {
        booking_id: 1,
        order_details: [
          { food_item_id: 1, quantity: 2 },
          { food_item_id: 2, quantity: 1 }
        ]
      };
      
      const order = await this.api.createFoodOrder(orderData);
      this.addResult('Create Food Order', order.success, 'Food order created successfully');
      
    } catch (error) {
      this.addResult('Order Operations', false, error.message);
    }
  }

  async testManagerOperations() {
    console.log('👨‍💼 Testing Manager Operations...');
    
    try {
      const priceUpdate = await this.api.updateFoodPrice(1, 150.00);
      this.addResult('Update Food Price', priceUpdate.success, 'Food price updated');
      
      const roomPriceUpdate = await this.api.updateHotelRoomPrice(1, 2000.00);
      this.addResult('Update Hotel Room Price', roomPriceUpdate.success, 'Hotel room price updated');
      
    } catch (error) {
      this.addResult('Manager Operations', false, error.message);
    }
  }

  addResult(testName, success, message) {
    this.testResults.push({
      test: testName,
      success: success,
      message: message,
      timestamp: new Date().toLocaleTimeString()
    });
    
    const status = success ? '✅' : '❌';
    console.log(`  ${status} ${testName}: ${message}`);
  }

  displayResults() {
    console.log('\n📊 Test Results Summary:');
    console.log('========================');
    
    const passed = this.testResults.filter(r => r.success).length;
    const total = this.testResults.length;
    const percentage = Math.round((passed / total) * 100);
    
    console.log(`Total Tests: ${total}`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${total - passed}`);
    console.log(`Success Rate: ${percentage}%`);
    
    if (total - passed > 0) {
      console.log('\n❌ Failed Tests:');
      this.testResults
        .filter(r => !r.success)
        .forEach(r => console.log(`  - ${r.test}: ${r.message}`));
    }
    
    console.log('\n🎉 Integration test completed!');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  if (window.location.search.includes('test=true') || window.location.pathname.includes('test')) {
    const tester = new IntegrationTest();
    tester.runAllTests();
  }
});

window.IntegrationTest = IntegrationTest;
