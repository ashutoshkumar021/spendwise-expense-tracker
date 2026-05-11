# SpendWise - Personal Finance Management System

A comprehensive full-stack personal finance application built with Angular, Node.js, and MongoDB that helps users track expenses, manage budgets, and gain insights into their financial health.

## 🚀 Features

### Core Functionality
- **Expense Tracking**: Add, edit, and categorize expenses with date filtering
- **Budget Planning**: Set monthly budgets by category with real-time spending alerts
- **Income Management**: Track multiple income sources and calculate savings
- **Financial Dashboard**: Comprehensive overview with charts and analytics
- **Data Visualization**: Interactive charts for spending patterns and budget analysis

### Advanced Features
- **Privacy Controls**: Independent privacy toggles for sensitive financial data
- **Real-time Analytics**: Financial health scoring and personalized recommendations
- **Budget Alerts**: Automatic notifications when approaching or exceeding budget limits
- **Responsive Design**: Mobile-first approach with adaptive layouts
- **Secure Authentication**: JWT-based authentication with protected routes

## 🛠️ Tech Stack

### Frontend
- **Angular 15+**: Modern TypeScript-based framework
- **Chart.js**: Interactive data visualization
- **Angular Material**: UI components and theming
- **RxJS**: Reactive programming for data streams

### Backend
- **Node.js**: JavaScript runtime environment
- **Express.js**: Web application framework
- **MongoDB**: NoSQL database for data persistence
- **Mongoose**: Object Data Modeling (ODM) library
- **JWT**: JSON Web Tokens for authentication

### Development Tools
- **TypeScript**: Type-safe JavaScript
- **Git**: Version control
- **NPM**: Package management

## 📁 Project Structure

```
expense-tracker/
├── backend/                 # Node.js/Express API
│   ├── config/             # Database configuration
│   ├── middleware/         # Authentication middleware
│   ├── models/             # MongoDB schemas
│   ├── routes/             # API endpoints
│   ├── services/           # Business logic
│   └── server.js           # Server entry point
├── frontend/               # Angular application
│   ├── src/
│   │   ├── app/
│   │   │   ├── components/ # Angular components
│   │   │   ├── services/   # API services
│   │   │   ├── guards/     # Route guards
│   │   │   └── interceptors/ # HTTP interceptors
│   │   └── environments/   # Environment configs
│   └── package.json
└── README.md
```

## 🚀 Getting Started

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (local or cloud instance)
- Angular CLI
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd expense-tracker
   ```

2. **Install backend dependencies**
   ```bash
   cd backend
   npm install
   ```

3. **Install frontend dependencies**
   ```bash
   cd ../frontend
   npm install
   ```

4. **Environment Setup**
   - Create `.env` file in `backend/` directory:
     ```
     MONGODB_URI=mongodb://localhost:27017/spendwise
     JWT_SECRET=your-super-secret-jwt-key
     PORT=5000
     ```

5. **Start the application**
   - Backend server:
     ```bash
     cd backend
     npm start
     ```
   - Frontend application:
     ```bash
     cd frontend
     ng serve
     ```

6. **Access the application**
   - Frontend: http://localhost:4200
   - Backend API: http://localhost:5000

## 📊 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login

### Expenses
- `GET /api/expenses` - Get all expenses
- `POST /api/expenses` - Add new expense
- `PUT /api/expenses/:id` - Update expense
- `DELETE /api/expenses/:id` - Delete expense

### Budgets
- `GET /api/budget` - Get all budgets
- `POST /api/budget` - Set/update budget
- `GET /api/budget/status` - Get budget status with spending

### Income
- `GET /api/income` - Get all income records
- `POST /api/income` - Add new income
- `PUT /api/income/:id` - Update income
- `DELETE /api/income/:id` - Delete income

## 🎯 Key Features Demonstrated

### Technical Implementation
- **Full-Stack Architecture**: Complete MERN stack application
- **RESTful API Design**: Scalable backend with proper HTTP methods
- **Component-Based Frontend**: Modular Angular architecture
- **Database Design**: Efficient MongoDB schemas with relationships
- **Authentication System**: Secure JWT implementation

### User Experience
- **Responsive Design**: Optimized for all device sizes
- **Real-time Updates**: Instant feedback on financial data changes
- **Data Privacy**: User-controlled privacy settings
- **Interactive Charts**: Visual financial insights
- **Smart Notifications**: Proactive budget management alerts

## 🔧 Development Features

### Code Quality
- **TypeScript**: Type safety throughout the application
- **Error Handling**: Comprehensive error management
- **Input Validation**: Client and server-side validation
- **Code Organization**: Modular, maintainable structure

### Performance
- **Lazy Loading**: Optimized bundle sizes
- **Data Caching**: Efficient data management
- **Responsive Images**: Optimized media delivery
- **API Optimization**: Efficient database queries

## 📱 Screenshots

*(Add screenshots of your application here)*

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👤 Author

**Your Name** - *Initial work* - [YourGitHubProfile](https://github.com/yourusername)

## 🙏 Acknowledgments

- Angular Documentation
- Node.js and Express.js Communities
- Chart.js Documentation
- MongoDB University

---

**SpendWise** - Take control of your finances today! 💰📊
