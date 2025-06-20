# Sistem Monitoring Obat

Sistem monitoring obat dengan monitoring kepatuhan pasien secara real-time menggunakan MySQL dari Aiven.

## 🚀 Fitur Utama

- **Dashboard Real-time**: Monitoring kepatuhan minum obat secara langsung
- **Analytics**: Laporan kepatuhan dan statistik penggunaan obat
- **Export Data**: Export ke Excel dan PDF
- **WebSocket**: Update real-time untuk semua client
- **Responsive Design**: Tampilan mobile-friendly
- **Database Flexibility**: Support MySQL (Aiven)

## 🛠️ Teknologi yang Digunakan

### Frontend
- **HTML5** - Struktur semantik
- **CSS3** - Modern styling dengan gradients dan animations
- **JavaScript ES6+** - Vanilla JS dengan modern features
- **WebSocket** - Real-time communication

### Backend
- **Node.js** - Runtime JavaScript
- **Express.js** - Web framework
- **MySQL** - Database utama (Aiven) untuk development
- **WebSocket** - Real-time updates

### Tools & Libraries
- **Nodemon** - Development server
- **Jest** - Testing framework
- **ESLint** - Code linting
- **XLSX** - Excel export
- **PDF-lib** - PDF generation

## 📋 Prerequisites

- Node.js >= 16.0.0
- npm >= 8.0.0
- MySQL database (Aiven)
- Git

## 🔧 Instalasi

### 1. Clone Repository
```bash
git clone https://github.com/fabian4819/medicine-management-system.git
cd medicine-management-system
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Konfigurasi Environment
```bash
# Copy file environment
cp .env.example .env

# Edit file .env dengan konfigurasi Anda
nano .env
```

```env
USE_AIVEN=true
DB_HOST=telemedicine-telemedicine-pengingat-obat.d.aivencloud.com
DB_PORT=13595
DB_USER=avnadmin
DB_PASSWORD=AVNS_W-1f2O9aaA8bmQtFbTm
DB_NAME=defaultdb
NODE_ENV=production
APP_ENV=production
APP_PORT=3000
ALLOWED_ORIGINS=https://medicine-management-system.vercel.app/,http://localhost:3000
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
DB_CONNECTION_LIMIT=10
DB_ACQUIRE_TIMEOUT=60000
DB_TIMEOUT=60000
```

### 5. Initialize Database
```bash
# Membuat schema dan tabel
npm run init-db

# (Opsional) Insert sample data
npm run seed
```

### 6. Start Application
```bash
# Development mode
npm run dev

# Production mode
npm start
```

Application akan berjalan di `http://localhost:3000`

## 📁 Struktur Direktori

```
medicine-management-system/
├── public/                   # Frontend files
│   ├── css/
│   │   ├── style.css         # Main styles
│   │   └── responsive.css    # Responsive styles
│   ├── js/
│   │   ├── main.js           # Main application logic
│   │   ├── export-filter.js  # Export Filter logic
│   │   ├── api.js            # API communication
│   │   └── utils.js          # Utility functions
│   └── index.html            # Main HTML file
├── lib/                      # Backend files
│   ├── database.js           # Database configuration
│   ├── routes/
│       ├── patients.js       # Patient routes
│       └── medicines.js      # Medicine routes
├── api/
    ├── index.js              # Main server file
├── .env                       # Environment
├── package.json              # Dependencies
└── README.md                 # Documentation
```

## 🔑 API Endpoints

### Patients
- `GET /api/v1/patients` - Get all patients with pagination
- `GET /api/v1/patients/:id` - Get patient by ID
- `GET /api/v1/patients/rm/:rmNumber` - Get patient by RM number
- `POST /api/v1/patients` - Create new patient
- `PUT /api/v1/patients/:id` - Update patient
- `DELETE /api/v1/patients/:id` - Delete patient

### Medicines
- `GET /api/v1/medicines` - Get all medicines
- `GET /api/v1/medicines/:id` - Get medicine by ID
- `POST /api/v1/medicines` - Create new medicine
- `PUT /api/v1/medicines/:id` - Update medicine
- `DELETE /api/v1/medicines/:id` - Delete medicine

### Analytics
- `GET /api/v1/analytics/dashboard` - Dashboard statistics
- `GET /api/v1/analytics/compliance-trends` - Compliance trends
- `GET /api/v1/analytics/export` - Export data

### Health Check
- `GET /api/health` - Application health status


## 📊 Monitoring & Analytics

### Dashboard Metrics
- Total pasien aktif
- Resep yang sedang berjalan
- Persentase kepatuhan
- Dosis yang terlewat

### Reports
- Laporan kepatuhan
- Statistik penggunaan obat
- Export ke Excel/PDF


## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.