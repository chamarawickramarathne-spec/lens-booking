# Lens Booking Pro - Production Deployment Guide

## 🚀 Deployment Information

**Production URL:** https://lensmanager.hireartist.studio
**Database:** hiresmcq_lensbooking
**Build Date:** November 1, 2025

---

## 📦 Files to Upload

### 1. Frontend Files (dist folder)

Upload ALL contents from `dist/` folder to your domain's public_html or root directory:

```
dist/
├── index.html
├── assets/
│   ├── index-sBX7pQYd.js
│   ├── index-DptS4WNq.css
│   └── [other asset files]
└── robots.txt
```

### 2. Backend API Files

Upload the `api/` folder to your domain:

```
api/
├── config/
│   ├── database.php (REPLACE with database.production.php)
│   └── cors.php (already updated)
├── middleware/
├── models/
├── controllers/
├── .htaccess
└── [all PHP endpoint files]
```

### 3. Database Setup

Upload and import the SQL file:

```
database/lens_booking_pro.sql
```

---

## 🔧 Step-by-Step Deployment

### Step 1: Upload Frontend

1. Connect to your server via FTP/cPanel File Manager
2. Navigate to `public_html` (or your domain root)
3. Upload ALL files from the `dist/` folder
4. The .htaccess file from dist should be in the root

### Step 2: Upload Backend API

1. Create an `api` folder in your domain root (same level as index.html)
2. Upload the entire `api/` directory contents
3. **IMPORTANT:** Replace `api/config/database.php` with `database.production.php`
   ```
   Rename: database.production.php → database.php
   ```

### Step 3: Setup Database

1. Login to cPanel → phpMyAdmin
2. Select database: `hiresmcq_lensbooking`
3. Import `database/lens_booking_pro.sql`
4. Verify tables are created (users, clients, bookings, invoices, etc.)

### Step 4: Configure Permissions

Set folder permissions (via FTP or File Manager):

```
api/uploads/          → 755 or 777 (for image uploads)
api/config/           → 755
api/.htaccess         → 644
```

### Step 5: Update Database Config

Edit `api/config/database.php` on the server and verify:

```php
private $database_name = "hiresmcq_lensbooking";
private $username = "hiresmcq_lensrun";
private $password = "Q}Pf;9#?^djT)MT";
```

---

## 🧪 Testing Your Deployment

### 1. Test Frontend

- Visit: https://lensmanager.hireartist.studio
- Should see the login page
- Check browser console for any errors

### 2. Test API Connection

- Visit: https://lensmanager.hireartist.studio/api/test-db.php
- Should return: `{"status":"success","message":"Database connection successful"}`

### 3. Test Login

- Try logging in with a test account
- If no accounts exist, use the registration page

---

## 📁 Final Folder Structure on Server

```
public_html/ (or domain root)
├── index.html
├── .htaccess
├── robots.txt
├── assets/
│   ├── index-sBX7pQYd.js
│   ├── index-DptS4WNq.css
│   └── [other assets]
├── api/
│   ├── .htaccess
│   ├── auth.php
│   ├── clients.php
│   ├── bookings.php
│   ├── invoices.php
│   ├── galleries.php
│   ├── payments.php
│   ├── dashboard.php
│   ├── send-invoice-email.php
│   ├── get-image.php
│   ├── test-db.php
│   ├── config/
│   │   ├── database.php (production credentials)
│   │   └── cors.php
│   ├── middleware/
│   │   └── auth.php
│   ├── models/
│   │   ├── User.php
│   │   ├── Client.php
│   │   └── Booking.php
│   └── uploads/ (create if not exists, set 777)
```

---

## 🔒 Security Checklist

- [x] HTTPS enabled (redirect from HTTP)
- [x] Database credentials secured
- [x] CORS configured for production domain
- [x] .htaccess files in place
- [ ] Create uploads folder with proper permissions
- [ ] Remove any test files (test-db.php after testing)
- [ ] Change JWT secret in api/middleware/auth.php for production

---

## 🐛 Troubleshooting

### Issue: White screen / blank page

**Solution:** Check browser console. If you see CORS errors, verify:

1. api/config/cors.php includes your domain
2. .htaccess file is uploaded

### Issue: API connection failed

**Solution:**

1. Verify API folder is at correct path
2. Check api/.htaccess is present
3. Test: https://lensmanager.hireartist.studio/api/test-db.php

### Issue: Database connection error

**Solution:**

1. Verify database credentials in api/config/database.php
2. Check database name matches: `hiresmcq_lensbooking`
3. Ensure SQL file is imported

### Issue: Images not uploading

**Solution:**

1. Create `api/uploads` folder if missing
2. Set permissions to 755 or 777
3. Verify folder is writable

### Issue: Login not working

**Solution:**

1. Import database schema first
2. Create a test account via registration
3. Check browser console for API errors

---

## 📝 Important Notes

1. **Database File:** The production database config is in `api/config/database.production.php` - rename it to `database.php` on the server
2. **CORS:** Already configured for your domain (https://lensmanager.hireartist.studio)
3. **API URL:** Frontend is configured to use https://lensmanager.hireartist.studio/api
4. **SSL:** Make sure SSL certificate is active on your domain
5. **Uploads:** Create `api/uploads` folder on server for profile images and gallery uploads

---

## 🎉 Post-Deployment

After successful deployment:

1. Create your admin account
2. Test all features (clients, bookings, invoices, galleries)
3. Upload profile image
4. Send a test invoice email
5. Create a test booking and gallery

---

## 📞 Quick Commands for Verification

```bash
# Test database connection
curl https://lensmanager.hireartist.studio/api/test-db.php

# Test CORS
curl -H "Origin: https://lensmanager.hireartist.studio" -I https://lensmanager.hireartist.studio/api/clients

# Check if frontend is live
curl -I https://lensmanager.hireartist.studio
```

---

## 🔄 Future Updates

To update the app:

1. Make changes locally
2. Run `npm run build`
3. Upload new `dist/` contents
4. If API changes, upload modified PHP files
5. Clear browser cache and test

---

**Built with:** React + TypeScript + Vite + PHP + MySQL
**Version:** 1.0.0
**Last Updated:** November 1, 2025
