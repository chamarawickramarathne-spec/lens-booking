# Lens Booking Pro - Setup Instructions

## 🚀 **Your application is now running at: http://localhost:8080/**

## 📋 **Database Setup**

### Step 1: Start XAMPP Services
1. Open XAMPP Control Panel
2. Start **Apache** and **MySQL** services

### Step 2: Create Database
1. Open phpMyAdmin: http://localhost/phpmyadmin
2. Click "New" to create a new database
3. Name: `lens_booking_pro`
4. Click "Create"

### Step 3: Import Database Schema
1. Select the `lens_booking_pro` database
2. Click "Import" tab
3. Choose file: `database/lens_booking_pro.sql`
4. Click "Go" to import

## 🔐 **Default Admin Account**
- **Email:** admin@lensbooking.com
- **Password:** admin123

## 🌐 **API Endpoints**
Your PHP API is available at: `http://localhost/lens-booking/api/`

### Authentication:
- `POST /auth/login` - User login
- `POST /auth/register` - User registration
- `GET /auth/profile` - Get user profile
- `PUT /auth/profile` - Update user profile

### Clients:
- `GET /clients` - Get all clients
- `POST /clients` - Create new client
- `GET /clients/{id}` - Get single client
- `PUT /clients/{id}` - Update client
- `DELETE /clients/{id}` - Delete client

### Bookings:
- `GET /bookings` - Get all bookings
- `POST /bookings` - Create new booking
- `GET /bookings/{id}` - Get single booking
- `PUT /bookings/{id}/status` - Update booking status

### Dashboard:
- `GET /dashboard` - Get dashboard statistics

## 🔧 **Testing the Application**

1. **Frontend:** http://localhost:8080/
2. **Backend API:** http://localhost/lens-booking/api/
3. **Database:** phpMyAdmin at http://localhost/phpmyadmin

## 📁 **Project Structure**
```
lens-booking/
├── api/                    # PHP Backend
│   ├── config/            # Database & CORS config
│   ├── models/            # Data models
│   ├── middleware/        # Authentication
│   ├── auth.php          # Auth endpoints
│   ├── clients.php       # Client endpoints
│   ├── bookings.php      # Booking endpoints
│   └── dashboard.php     # Dashboard endpoints
├── database/              # Database schema
│   └── lens_booking_pro.sql
├── src/                   # React Frontend
│   ├── integrations/api/  # API client
│   └── hooks/             # React hooks
└── ...
```

## ✅ **You're All Set!**

Your lens-booking application is now:
- ✅ Running on http://localhost:8080/
- ✅ Using PHP backend with MySQL database
- ✅ JWT authentication system
- ✅ Complete API for all operations

Just set up the database and you can start using the application!