# 🚀 Quick Deployment Checklist

## Before Uploading

- [x] Built production bundle (npm run build)
- [x] Created .env.production with correct API URL
- [x] Updated CORS configuration for production domain
- [x] Created production database config

## Upload to Server

- [ ] Upload all files from `dist/` folder to public_html/domain root
- [ ] Upload `api/` folder to domain root
- [ ] Replace `api/config/database.php` with production credentials
- [ ] Upload `database/lens_booking_pro.sql`

## Database Setup

- [ ] Login to phpMyAdmin
- [ ] Select database: hiresmcq_lensbooking
- [ ] Import lens_booking_pro.sql
- [ ] Verify all tables created

## Folder Permissions

- [ ] Create `api/uploads/` folder
- [ ] Set uploads folder permission to 755 or 777
- [ ] Verify .htaccess files are present

## Testing

- [ ] Visit https://lensmanager.hireartist.studio
- [ ] Test https://lensmanager.hireartist.studio/api/test-db.php
- [ ] Register/login to admin account
- [ ] Test creating a client
- [ ] Test creating a booking
- [ ] Test uploading images

## Security

- [ ] Verify HTTPS redirect is working
- [ ] Change JWT secret in api/middleware/auth.php
- [ ] Remove test-db.php after testing (optional)
- [ ] Verify CORS only allows your domain

## Production Database Credentials

```
Database: hiresmcq_lensbooking
Username: hiresmcq_lensrun
Password: Q}Pf;9#?^djT)MT
```

## Important Files to Upload

1. Everything from `dist/` → domain root
2. Everything from `api/` → domain root/api
3. `database/lens_booking_pro.sql` → import via phpMyAdmin

## Quick Test URLs

- Frontend: https://lensmanager.hireartist.studio
- API Test: https://lensmanager.hireartist.studio/api/test-db.php
- Login: https://lensmanager.hireartist.studio/login

---

**Ready to deploy!** Follow DEPLOYMENT_GUIDE.md for detailed instructions.
