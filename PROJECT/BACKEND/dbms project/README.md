# BookBuddy - Hotel Management System

A comprehensive full-stack hotel management system built with HTML, CSS, and JavaScript. This system provides a complete solution for hotel booking, food ordering, staff management, and administrative functions.

## 🏨 Features

### 🔐 Authentication System
- **Multi-User Login**: Customer, Staff, and Manager login types
- **User Registration**: Create new accounts with hotel assignment
- **Password Reset**: Secure password recovery system
- **Session Management**: User-specific data and access control

### 👥 Customer Features
- **Hotel Discovery**: Browse and search hotels with horizontal scrolling gallery
- **Hotel Details Modal**: Click hotel images to view comprehensive details
- **Hotel Booking**: Detailed hotel information with sorting and filtering options
- **Room Booking**: Complete booking form with price calculation
- **Food Ordering**: Categorized food menu (Breakfast, Lunch, Dinner, Beverages, Desserts)
- **Price Integration**: Food prices automatically added to room booking total
- **Cart Persistence**: User-specific cart that clears on logout

### 👨‍💼 Staff Features
- **Personalized Dashboard**: View only your assigned tasks
- **Task Management**: Mark tasks as in-progress or completed
- **Real-time Updates**: Live statistics and task status updates
- **User-Specific Access**: See only your hotel's tasks

### 🏢 Management Features
- **Hotel-Specific Management**: Manage only your assigned hotel
- **Analytics Dashboard**: Revenue, occupancy, and performance metrics
- **Hotel Pricing**: Update room prices for your hotel only
- **Food Menu Management**: Modify food prices and availability
- **Staff Assignment**: Assign tasks to specific staff members
- **Data Persistence**: All changes saved to localStorage

### 🏨 Enhanced Hotel Features
- **Comprehensive Facilities**: 10+ amenities per hotel (Pool, Spa, WiFi, etc.)
- **Room Type Details**: Multiple room categories with descriptions
- **Interactive Modals**: Click hotel images for detailed information
- **Full-Width Layout**: Enhanced viewing experience

## 📁 Project Structure

```
dbms project/
├── index.html              # Landing page with navigation
├── home.html               # Hotel gallery with horizontal scrolling
├── book.html               # Hotel listing with sorting/filtering
├── room.html               # Booking form with price calculation
├── food.html               # Food menu with categories
├── staff.html              # Staff task management portal
├── manage.html             # Management dashboard
├── database/
│   ├── hotels_db.json      # Comprehensive hotel and food data
│   └── food_db.json        # Food menu database
├── js/
│   ├── hotel-management.js # Main system JavaScript
│   └── food-database.js    # Food management functions
└── README.md               # This file
```

## 🚀 Getting Started

### Prerequisites
- Modern web browser (Chrome, Firefox, Safari, Edge)
- Local web server (optional, for file:// protocol)

### Installation
1. Clone or download the project files
2. Open `index.html` in your web browser
3. Navigate through the system using the provided interface

### Usage
1. **Start at index.html** - Choose your access level:
   - Management Access → `manage.html`
   - Staff Portal → `staff.html`
   - Explore Hotels → `home.html`

2. **Hotel Booking Flow**:
   - Browse hotels in `home.html`
   - Select hotel to view details in `book.html`
   - Complete booking form in `room.html`
   - Add food items in `food.html`
   - Confirm final booking

3. **Staff Management**:
   - View assigned tasks in `staff.html`
   - Update task status (Start/Complete)
   - Track progress with live statistics

4. **Management Functions**:
   - Update hotel prices in `manage.html`
   - Modify food menu prices
   - Assign tasks to staff
   - View analytics dashboard

## 🎨 Design Features

### Responsive Design
- Mobile-first approach
- Horizontal scrolling hotel gallery
- Adaptive grid layouts
- Touch-friendly interfaces

### Modern UI/UX
- Smooth animations and transitions
- Consistent color scheme (Orange/Green theme)
- Interactive hover effects
- Professional typography

### User Experience
- Intuitive navigation
- Clear visual hierarchy
- Real-time feedback
- Error handling and validation

## 🛠️ Technical Implementation

### Frontend Technologies
- **HTML5**: Semantic markup and structure
- **CSS3**: Modern styling with Flexbox/Grid
- **JavaScript ES6+**: Object-oriented programming
- **LocalStorage**: Data persistence
- **Fetch API**: Data loading

### Key Components
- **HotelManagementSystem Class**: Main system controller
- **Data Management**: JSON-based database
- **Event Handling**: Comprehensive user interactions
- **State Management**: Real-time updates
- **Form Validation**: Client-side validation

### Data Flow
1. **Data Loading**: JSON files → JavaScript objects
2. **User Interactions**: Event listeners → State updates
3. **Data Persistence**: State changes → localStorage
4. **UI Updates**: State changes → DOM manipulation

## 📊 Database Schema

### Hotels
```json
{
  "id": "hotel-id",
  "name": "Hotel Name",
  "location": "City, State",
  "rating": 4.5,
  "price": 5000,
  "features": ["Pool", "Spa", "WiFi"],
  "pricing": {
    "standard": 5000,
    "deluxe": 7500,
    "suite": 12000
  }
}
```

### Food Menu
```json
{
  "breakfast": [
    {
      "id": "item-id",
      "name": "Item Name",
      "price": 100,
      "category": "veg/non-veg"
    }
  ]
}
```

### Staff
```json
{
  "staff-id": {
    "name": "Staff Name",
    "role": "Position",
    "department": "Department",
    "tasks": []
  }
}
```

## 🔧 Customization

### Adding New Hotels
1. Update `database/hotels_db.json`
2. Add hotel images to project directory
3. Update hotel data in JavaScript

### Modifying Food Menu
1. Edit `database/hotels_db.json` foodMenu section
2. Add food images to project directory
3. Update food categories in `food.html`

### Styling Changes
- Modify CSS variables in `:root` selectors
- Update color scheme in CSS files
- Adjust animations and transitions

## 🌟 Key Features

### Hotel Management
- ✅ 11+ hotels with detailed information
- ✅ Price sorting and filtering
- ✅ Room type selection
- ✅ Real-time price calculation

### Food Ordering
- ✅ 20+ food items across 5 categories
- ✅ Vegetarian/Non-vegetarian classification
- ✅ Quantity selection
- ✅ Cart management
- ✅ Price integration with booking

### Staff Portal
- ✅ Department-wise task organization
- ✅ Priority-based task management
- ✅ Real-time status updates
- ✅ Progress tracking

### Management Dashboard
- ✅ Analytics and reporting
- ✅ Price management
- ✅ Staff task assignment
- ✅ Data persistence

## 🚀 Future Enhancements

- **Backend Integration**: Connect to real database
- **User Authentication**: Login/logout system
- **Payment Gateway**: Online payment processing
- **Email Notifications**: Booking confirmations
- **Mobile App**: React Native/Flutter version
- **Admin Panel**: Advanced management features

## 📱 Browser Support

- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Commit changes
4. Push to branch
5. Create Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 👥 Authors

- **BookBuddy Team** - *Initial work*

## 🙏 Acknowledgments

- Font Awesome for icons
- Google Fonts for typography
- Modern CSS techniques
- JavaScript ES6+ features

---

**BookBuddy Hotel Management System** - Your complete hotel booking and management solution! 🏨✨
