# 📸 PhotoStudio Manager (Lens Booking Pro)

**Lens Booking Pro** is a comprehensive business management suite tailored for modern photographers. It transforms messy manual record-keeping into a high-performance digital workflow, allowing you to manage your entire photography studio from a single dashboard.

### 💡 Why Use Lens Booking Pro?
*   **Stay Organized**: Centralize your client database and never miss a shoot date or client detail again.
*   **Financial Integrity**: Precision tracking of payments, installments, and remaining balances eliminates manual calculation errors.
*   **Professionalism**: Instantly generate branded PDF invoices that reflect your studio's unique identity.
*   **Data-Driven Decisions**: Leverage interactive analytics to track revenue trends and business growth over time.
*   **Efficiency**: Automating administrative tasks saves hours of paperwork, giving you more time behind the camera.

---
## 🚀 Key Features
*   **📊 Advanced Dashboard** – Real-time analytics with interactive revenue charts and quick stats.
*   **👥 Client Management** – Centralized database for client contacts and history.
*   **📅 Smart Booking System** – Efficiently track shoot dates and status (Pending, Confirmed, Completed).
*   **🧾 Invoicing & PDF** – Generate professional invoices, download as PDF, and email directly to clients.
*   **💳 Payment Installments** – Manage partial payments and track remaining balances effortlessly.
*   **📈 Detailed Reports** – Holistic view of revenue trends and payment method breakdowns.
*   **🎨 Custom Branding** – Personalize your studio profile with business details and logos for invoices.
---
## 🛠️ Technology Stack
| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React, TypeScript, Vite, Tailwind CSS, shadcn/ui |
| **Charts** | Recharts, Lucide React |
| **Backend** | PHP (REST API), Custom Middleware |
| **Database** | MySQL |
| **Utilities** | LinkSigner, EmailUtility (PHPMailer) |
---
## 📦 Getting Started
### 📋 Prerequisites
*   **XAMPP / WAMP** (Apache & MySQL)
*   **Node.js** (v18+)
*   **Bun** (Recommended) or **npm**
### 🗄️ Database Setup
1.  Start **Apache** and **MySQL** via XAMPP Control Panel.
2.  Create a database named lens_booking_pro in phpMyAdmin.
3.  Import database/lens_booking_pro.sql.
4.  Apply migration scripts in the database/ folder sequentially as listed in SETUP.md.
### 💻 Frontend Setup
1.  Clone the repository and enter the directory.
2.  Install dependencies: bun install
3.  Run the development server: bun dev
---
## 💡 Usage Guide
1.  **Dashboard**: Get a bird-eye view of your business performance.
2.  **Clients**: Register and manage your client base.
3.  **Bookings**: Schedule new shoots and update their progress.
4.  **Invoices & Payments**: Use the Payment Manager to record installments via Cash, Bank, or Card.
5.  **Reports**: Drill down into monthly income and payment distribution.
6.  **Profile**: Setup your studio logo and bio to reflect on all generated invoices.
---
## 📂 Project Structure
*   api/ – PHP backend REST API logic.
*   database/ – SQL schema and versioned migrations.
*   src/ – Modern React frontend.
*   uploads/ – Safe storage for studio logos and profile images.
---
## 🔐 Default Admin Account
*   **Email**: admin@lensbooking.com
*   **Password**: admin123
---
> Built with ❤️ for photographers.

---

# 📸 PhotoStudio Manager (සිංහලෙන්)

**Lens Booking Pro** යනු නූතන ඡායාරූප ශිල්පීන්ගේ ව්‍යපාරික කටයුතු පහසු කිරීම සඳහාම සැකසූ පද්ධතියකි. මෙහි ඇති සුවිශේෂී පහසුකම් මගින් ඔබේ ඡායාරූප මැදිරියේ (Studio) සියලුම පරිපාලන කටයුතු ලේඛන මගින් පවත්වාගෙන යාම වෙනුවට ඉතා කාර්යක්ෂම ඩිජිටල් පද්ධතියක් හරහා එකම තැනකින් මෙහෙයවිය හැකිය.

### 💡 මෙයින් ඔබට ලැබෙන ප්‍රයෝජන:
*   **විධිමත් කළමනාකරණය**: කිසිදු ඇණවුමක් (Booking) මඟ නොහැරී සියලුම ගනුදෙනුකරුවන්ගේ තොරතුරු එකම තැනක ක්‍රමවත්ව ගබඩා කර ගත හැකිය.
*   **මූල්‍ය විනිවිදභාවය**: ගනුදෙනුකරුවන්ගෙන් ලැබෙන ගෙවීම්, හිඟ මුදල් සහ වාරික ගෙවීම් ඉතා නිවැරදිව ගණනය කර වාර්තා තබා ගත හැකිය.
*   **වෘත්තීය ගරුත්වය**: ඔබේ ආයතනයේ නම සහ ලාංඡනය (Logo) සහිතව වෘත්තීය මට්ටමේ PDF ඉන්වොයිසි සියල්ල ස්වයංක්‍රීයව සකසා ගත හැකිය.
*   **ව්‍යාපාරික වර්ධනය**: ව්‍යාපාරයේ මාසික ප්‍රගතිය සහ ආදායම් වර්තාවන් ප්‍රස්ථාර ඇසුරින් බලා සාර්ථක අනාගත තීරණ පහසුවෙන් ගත හැකිය.
*   **කාලය ඉතිරි කර ගැනීම**: ලේඛන කටයුතු සහ අතින් සිදුකරන ගණනය කිරීම් සඳහා වැයවන කාලය විශාල වශයෙන් ඉතිරි කර දෙන බැවින් ඔබට ඡායාරූපකරණය (Creative work) සඳහා වැඩි කාලයක් වෙන් කළ හැකිය.


---

## 🚀 ප්‍රධාන විශේෂාංග

*   **📊 උසස් Dashboard එකක්** – ව්‍යාපාරයේ ආදායම් වාර්තා සහ දත්ත ප්‍රස්ථාර ඇසුරින් බැලීමේ හැකියාව.
*   **👥 ගනුදෙනුකරුවන් කළමනාකරණය** – ගනුදෙනුකරුවන්ගේ විස්තර සහ ඔවුන්ගේ ඉතිහාසය එකම තැනක පවත්වාගෙන යාම.
*   **📅 වෙන් කිරීම් (Bookings) පද්ධතිය** – උත්සව දිනයන් සහ ඒවායේ තත්ත්වය (Pending, Confirmed, Completed) පහසුවෙන් පාලනය කිරීම.
*   **🧾 ඉන්වොයිසි සහ PDF** – වෘත්තීය මට්ටමේ ඉන්වොයිසි සැකසීම, PDF ලෙස බාගත කිරීම සහ ඊමේල් මගින් යැවීමේ හැකියාව.
*   **💳 වාරික ගෙවීම් පද්ධතිය** – එක් එක් ඇණවුම සඳහා ගෙවීම් වාරික වශයෙන් සටහන් කිරීම සහ ඉතිරි මුදල පරීක්ෂා කිරීම.
*   **📈 සවිස්තරාත්මක වාර්තා** – මාසික ආදායම සහ ගෙවීම් ක්‍රම (Cash, Bank, Card) පිළිබඳ පැහැදිලි වාර්තා.
*   **🎨 පෞද්ගලික පැතිකඩ (Profile)** – ඔබේ ව්‍යාපාරයේ නම, විස්තර සහ ලාංඡනය (Logo) ඇතුළත් කර ඉන්වොයිසි අලංකාර කිරීම.

---

## 💡 භාවිත කරන ආකාරය

1.  **Dashboard**: ව්‍යාපාරයේ සමස්ත තත්ත්වය මෙතැනින් එකවර දැකගත හැකිය.
2.  **Clients**: නව ගනුදෙනුකරුවන් ලියාපදිංචි කිරීම සහ ඔවුන්ගේ තොරතුරු වෙනස් කිරීම.
3.  **Bookings**: නව ඡායාරූප ඇණවුම් ඇතුළත් කිරීම සහ ඒවායේ ප්‍රගතිය යාවත්කාලීන කිරීම.
4.  **Invoices & Payments**: ගනුදෙනුකරුවන්ගෙන් ලැබෙන ගෙවීම් සටහන් කිරීම සඳහා Payment Manager භාවිතා කරන්න.
5.  **Reports**: ඔබේ ව්‍යාපාරයේ දියුණුව මැන බැලීම සඳහා ආදායම් වාර්තා පරීක්ෂා කරන්න.
6.  **Profile**: ඉන්වොයිසි වල ඔබේ ව්‍යාපාර විස්තර නිවැරදිව පෙන්වීමට Profile එක සකසන්න.

---

> 📸 ඡායාරූප ශිල්පීන්ගේ පහසුව සඳහා නිපදවන ලද්දකි.
