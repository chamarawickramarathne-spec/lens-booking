# Lens Booking Pro - Production Deployment Guide

## ✅ Build Status
**Built successfully on:** November 1, 2025
**Build output:** `dist/` folder (1.1 MB main bundle)

---

## 📦 What Was Built

The production build generated optimized static assets:
- **HTML:** `dist/index.html` (1.32 kB)
- **CSS:** `dist/assets/index-DptS4WNq.css` (66 kB)
- **JavaScript:** `dist/assets/index-C81SAEd2.js` (1.1 MB, gzipped to 334 kB)
- **Images & Icons:** `dist/favicon.ico`, `dist/placeholder.svg`, `dist/robots.txt`

---

## 🚀 Deployment Instructions

### **Part 1: Backend (PHP API)**

Upload the following to your live server:

```
/api/                    # All PHP backend files
  ├── config/
  ├── controllers/
  ├── middleware/
  ├── models/
  ├── *.php             # All endpoint files
  └── .htaccess
/database/              # SQL schema (for import)
/uploads/               # User uploads directory (ensure writable)
```

**Server Requirements:**
- PHP 8.0+ with PDO and MySQL extensions
- MySQL/MariaDB database
- Apache with mod_rewrite enabled (for .htaccess)

**Configuration Steps:**

1. **Database Setup:**
   ```bash
   # Import the schema
   mysql -u your_db_user -p your_db_name < database/lens_booking_pro.sql
   ```

2. **Update Database Config:**
   Edit `api/config/database.php`:
   ```php
   private $host = "your_production_host";          // e.g., "localhost"
   private $database_name = "lens_booking_pro";
   private $username = "your_production_db_user";
   private $password = "your_production_db_password";
   ```

3. **Update CORS Settings:**
   Edit `api/config/cors.php` and add your production domain:
   ```php
   $allowed_origins = [
       'https://yourdomain.com',           // Add your live domain
       'https://www.yourdomain.com',
       'http://localhost:8080',            // Keep for local dev
   ];
   ```

4. **Email Configuration:**
   Edit `api/send-invoice-email.php`:
   ```php
   $isDevelopment = false;  // Change to false for production
   ```
   Consider using PHPMailer with SMTP for reliable email delivery.

5. **Set Directory Permissions:**
   ```bash
   chmod 755 api/
   chmod 777 uploads/     # Or use appropriate user/group permissions
   ```

---

### **Part 2: Frontend (React App)**

Upload the entire `dist/` folder contents to your web server:

```
/dist/
  ├── assets/          # CSS, JS bundles
  ├── index.html       # Main entry point
  ├── favicon.ico
  ├── placeholder.svg
  └── robots.txt
```

**⚠️ IMPORTANT: Update API Base URL**

Before deploying, you need to update the API endpoint in your code:

**Option A: Use Environment Variables (Recommended)**

1. Create `.env.production` in the project root:
   ```env
   VITE_API_BASE_URL=https://yourdomain.com/api
   ```

2. Update `src/integrations/api/client.ts`:
   ```typescript
   const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost/lens-booking/api';
   ```

3. Rebuild:
   ```bash
   npm run build
   ```

**Option B: Direct Edit (Quick)**

Edit `src/integrations/api/client.ts` before building:
```typescript
const API_BASE_URL = 'https://yourdomain.com/api';  // Change to your live API URL
```

Then rebuild:
```bash
npm run build
```

---

### **Deployment Scenarios**

#### **Scenario 1: Subdomain (Recommended)**
- Frontend: `https://app.yourdomain.com` → Upload `dist/` contents to root
- Backend: `https://api.yourdomain.com` → Upload `api/` folder to root
- Set `API_BASE_URL = 'https://api.yourdomain.com'`

#### **Scenario 2: Same Domain with Subfolder**
- Frontend: `https://yourdomain.com` → Upload `dist/` contents to `/public_html/`
- Backend: `https://yourdomain.com/api` → Upload `api/` folder to `/public_html/api/`
- Set `API_BASE_URL = 'https://yourdomain.com/api'`

#### **Scenario 3: Shared Hosting (cPanel)**
```
/public_html/
  ├── index.html           # From dist/
  ├── assets/              # From dist/assets/
  ├── favicon.ico
  ├── api/                 # Backend files
  │   ├── .htaccess
  │   ├── config/
  │   └── *.php
  └── uploads/             # Create this, set writable
```

---

### **Apache Configuration**

Add this to your main `.htaccess` in the root (or virtual host config):

```apache
# React Router - redirect all requests to index.html
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  
  # Don't rewrite files or directories
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  
  # Don't rewrite API requests
  RewriteCond %{REQUEST_URI} !^/api/
  
  # Rewrite everything else to index.html
  RewriteRule ^ index.html [L]
</IfModule>

# Security Headers
<IfModule mod_headers.c>
  Header set X-Content-Type-Options "nosniff"
  Header set X-Frame-Options "SAMEORIGIN"
  Header set X-XSS-Protection "1; mode=block"
</IfModule>

# Compression
<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/plain text/xml text/css text/javascript application/javascript application/json
</IfModule>

# Cache Control
<IfModule mod_expires.c>
  ExpiresActive On
  ExpiresByType image/jpg "access plus 1 year"
  ExpiresByType image/jpeg "access plus 1 year"
  ExpiresByType image/gif "access plus 1 year"
  ExpiresByType image/png "access plus 1 year"
  ExpiresByType image/svg+xml "access plus 1 year"
  ExpiresByType text/css "access plus 1 month"
  ExpiresByType application/javascript "access plus 1 month"
  ExpiresByType text/javascript "access plus 1 month"
</IfModule>
```

---

## 🧪 Testing After Deployment

1. **Database Connection:**
   - Visit: `https://yourdomain.com/api/test-db.php`
   - Should return: `{"status":"success","message":"Database connection successful"}`

2. **Frontend Load:**
   - Visit: `https://yourdomain.com`
   - Should load the login page

3. **API Communication:**
   - Try logging in
   - Check browser console for API errors
   - Look for CORS issues (check api/config/cors.php if errors)

4. **Test Core Features:**
   - Login/Registration
   - Client management
   - Booking creation
   - Invoice generation
   - Image uploads

---

## 🔧 Production Checklist

- [ ] Database imported successfully
- [ ] Database credentials updated in `api/config/database.php`
- [ ] Production domain added to `api/config/cors.php`
- [ ] API_BASE_URL updated to production URL
- [ ] Application rebuilt with `npm run build`
- [ ] `dist/` contents uploaded to web root
- [ ] `api/` folder uploaded with correct permissions
- [ ] `uploads/` folder created and writable
- [ ] Email sending configured (dev mode OFF)
- [ ] .htaccess configured for React Router
- [ ] SSL certificate installed (HTTPS)
- [ ] Test all major features work

---

## 🐛 Troubleshooting

**Issue:** CORS errors in browser console
- **Fix:** Add your production domain to `api/config/cors.php`

**Issue:** 404 on page refresh
- **Fix:** Ensure .htaccess has React Router rewrite rules

**Issue:** API endpoints return 404
- **Fix:** Check `api/.htaccess` has all endpoint rewrite rules

**Issue:** Database connection failed
- **Fix:** Verify credentials in `api/config/database.php`

**Issue:** Images/uploads not working
- **Fix:** Ensure `uploads/` folder exists and has write permissions (777 or www-data owner)

**Issue:** Email not sending
- **Fix:** Configure PHPMailer or check mail server settings

---

## 📝 Notes

- **Bundle Size Warning:** The main JavaScript bundle is 1.1 MB (334 kB gzipped). This is acceptable for a feature-rich admin dashboard but can be optimized further with code splitting if needed.

- **Database Name:** Ensure your production database is named `lens_booking_pro` (with underscore, not hyphen).

- **JWT Secret:** Consider changing the JWT secret in `api/middleware/auth.php` for production security.

- **Development Mode:** The invoice email endpoint is currently in development mode (logs instead of sending). Remember to set `$isDevelopment = false` in production.

---

## 🔐 Security Recommendations

1. **Change JWT Secret:**
   Edit `api/middleware/auth.php`:
   ```php
   private $secret_key = "your_unique_production_secret_key_here";
   ```

2. **Use Environment Variables:**
   Store sensitive data in environment variables, not in code.

3. **Enable HTTPS:**
   Install SSL certificate and redirect all HTTP to HTTPS.

4. **Restrict Database User:**
   Create a database user with only necessary privileges (SELECT, INSERT, UPDATE, DELETE).

5. **Disable Directory Listing:**
   Add to .htaccess:
   ```apache
   Options -Indexes
   ```

6. **Hide PHP Version:**
   Add to php.ini:
   ```ini
   expose_php = Off
   ```

---

## 📞 Support

If you encounter issues during deployment, check:
1. Browser console for frontend errors
2. PHP error logs for backend issues
3. Apache error logs for server configuration problems
4. Network tab in DevTools for API request/response details

---

**Deployment prepared by:** GitHub Copilot
**Date:** November 1, 2025
