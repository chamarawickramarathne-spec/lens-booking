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

### Step 4: Apply Migrations

After importing the base schema, apply these migrations in order:

1. **Access Levels Migration:**

   - File: `database/create_access_levels.sql`
   - This creates the access levels system (Free, Pro, Premium, Unlimited)

2. **Profile Fields Migration:**
   - File: `database/add_photographer_profile_fields.sql`
   - This adds business_name, bio, website, portfolio_url, and expire_date fields

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
│   ├── cron/              # Daily/recurring maintenance scripts
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

## ⏰ Daily plan expiry job (cron)

This project includes a maintenance script that downgrades photographers whose plan has expired to the Free tier and clears their expiry date.

- Script: `api/cron/downgrade_expired_access.php`
- Action: For any photographer with `expire_date` (or `expiry_date`) on or before today and a non-Free access level, set access level to Free and set the expiry date to NULL.

### Run manually

```powershell
php "api/cron/downgrade_expired_access.php"
```

### Schedule daily on Linux (cron)

Edit crontab:

```bash
crontab -e
```

Add (runs every day at 02:15):

```bash
15 2 * * * /usr/bin/php /var/www/html/lens-booking/api/cron/downgrade_expired_access.php >> /var/log/lens-booking-cron.log 2>&1
```

### Schedule daily on Windows (Task Scheduler)

1. Open Task Scheduler > Create Basic Task
2. Trigger: Daily (choose a time)
3. Action: Start a program
4. Program/script: `php`
5. Add arguments: `"E:\Web projects\webampp\htdocs\lens-booking\api\cron\downgrade_expired_access.php"`
6. Start in: `E:\Web projects\webampp\htdocs\lens-booking`
7. Finish

Tip: Ensure PHP is in your PATH or provide the full path to `php.exe`.

## ✅ **You're All Set!**

Your lens-booking application is now:

- ✅ Running on http://localhost:8080/
- ✅ Using PHP backend with MySQL database
- ✅ JWT authentication system
- ✅ Complete API for all operations

Just set up the database and you can start using the application!
