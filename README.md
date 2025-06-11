# Sistem Manajemen Obat

Sistem manajemen obat dengan monitoring kepatuhan pasien secara real-time menggunakan PostgreSQL dari Aiven.

## 🚀 Fitur Utama

- **Dashboard Real-time**: Monitoring kepatuhan minum obat secara langsung
- **Manajemen Pasien**: CRUD lengkap data pasien dengan nomor rekam medis
- **Manajemen Obat**: Database obat dengan kategori dan dosis
- **Tracking Konsumsi**: Pencatatan waktu minum obat dengan status kepatuhan
- **Analytics**: Laporan kepatuhan dan statistik penggunaan obat
- **Export Data**: Export ke Excel dan PDF
- **WebSocket**: Update real-time untuk semua client
- **Responsive Design**: Tampilan mobile-friendly
- **Database Flexibility**: Support PostgreSQL (Aiven) dan MySQL

## 🛠️ Teknologi yang Digunakan

### Frontend
- **HTML5** - Struktur semantik
- **CSS3** - Modern styling dengan gradients dan animations
- **JavaScript ES6+** - Vanilla JS dengan modern features
- **WebSocket** - Real-time communication

### Backend
- **Node.js** - Runtime JavaScript
- **Express.js** - Web framework
- **PostgreSQL** - Database utama (Aiven)
- **MySQL** - Alternative database untuk development
- **WebSocket** - Real-time updates
- **JWT** - Authentication
- **Helmet** - Security middleware

### Tools & Libraries
- **Nodemon** - Development server
- **Jest** - Testing framework
- **ESLint** - Code linting
- **XLSX** - Excel export
- **PDF-lib** - PDF generation

## 📋 Prerequisites

- Node.js >= 16.0.0
- npm >= 8.0.0
- PostgreSQL database (Aiven) atau MySQL
- Git

## 🔧 Instalasi

### 1. Clone Repository
```bash
git clone https://github.com/yourusername/medicine-management-system.git
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

### 4. Konfigurasi Database Aiven

#### Setup PostgreSQL di Aiven:
1. Login ke [Aiven Console](https://console.aiven.io/)
2. Create new PostgreSQL service
3. Download SSL certificate
4. Update `.env` dengan connection details:

```env
USE_AIVEN=true
DB_HOST=your-service-host.aivencloud.com
DB_PORT=5432
DB_USER=avnadmin
DB_PASSWORD=your-password
DB_NAME=medicine_management
DB_SSL_CA=/path/to/ca-certificate.crt
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
├── public/                 # Frontend files
│   ├── css/
│   │   ├── style.css      # Main styles
│   │   └── responsive.css # Responsive styles
│   ├── js/
│   │   ├── main.js        # Main application logic
│   │   ├── api.js         # API communication
│   │   └── utils.js       # Utility functions
│   └── index.html         # Main HTML file
├── server/                # Backend files
│   ├── config/
│   │   └── database.js    # Database configuration
│   ├── routes/
│   │   ├── patients.js    # Patient routes
│   │   └── medicines.js   # Medicine routes
│   └── server.js          # Main server file
├── scripts/               # Utility scripts
├── logs/                  # Application logs
├── .env.example          # Environment template
├── package.json          # Dependencies
└── README.md             # Documentation
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

## 🗄️ Database Schema

### Tabel Utama

#### patients
```sql
- id (SERIAL PRIMARY KEY)
- rm_number (VARCHAR(20) UNIQUE)
- name (VARCHAR(100))
- birth_date (DATE)
- gender (VARCHAR(10))
- phone (VARCHAR(20))
- address (TEXT)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

#### medicines
```sql
- id (SERIAL PRIMARY KEY)
- name (VARCHAR(100))
- type (VARCHAR(50))
- dosage (VARCHAR(50))
- description (TEXT)
- created_at (TIMESTAMP)
```

#### prescriptions
```sql
- id (SERIAL PRIMARY KEY)
- patient_id (INTEGER FK)
- medicine_id (INTEGER FK)
- doctor_name (VARCHAR(100))
- dosage_instruction (TEXT)
- frequency_per_day (INTEGER)
- duration_days (INTEGER)
- prescription_date (DATE)
- created_at (TIMESTAMP)
```

#### medicine_consumption
```sql
- id (SERIAL PRIMARY KEY)
- prescription_id (INTEGER FK)
- scheduled_time (TIMESTAMP)
- actual_time (TIMESTAMP)
- status (VARCHAR(20)) -- 'scheduled', 'taken', 'missed', 'late'
- notes (TEXT)
- created_at (TIMESTAMP)
```

## 🔄 Real-time Features

Sistem menggunakan WebSocket untuk update real-time:

- **Medication Updates**: Notifikasi saat pasien minum obat
- **New Prescriptions**: Update saat resep baru ditambahkan
- **Compliance Changes**: Update statistik kepatuhan
- **System Alerts**: Notifikasi sistem penting

## 📊 Monitoring & Analytics

### Dashboard Metrics
- Total pasien aktif
- Resep yang sedang berjalan
- Persentase kepatuhan hari ini
- Dosis yang terlewat

### Reports
- Laporan kepatuhan per pasien
- Statistik penggunaan obat
- Tren kepatuhan bulanan
- Export ke Excel/PDF

## 🚀 Deployment

### Using PM2
```bash
# Install PM2
npm install -g pm2

# Start application
pm2 start server/server.js --name medicine-system

# Monitor
pm2 monitor
```

### Using Docker
```bash
# Build image
docker build -t medicine-system .

# Run container
docker run -p 3000:3000 --env-file .env medicine-system
```

### Environment Variables untuk Production
```env
NODE_ENV=production
USE_AIVEN=true
DB_HOST=your-production-host.aivencloud.com
# ... other production configs
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm test -- --coverage
```

## 🔧 Development

### Code Style
```bash
# Check linting
npm run lint

# Fix linting issues
npm run lint:fix
```

### Database Migration
```bash
# Create new migration
npm run migrate:create migration-name

# Run migrations
npm run migrate:up

# Rollback migrations
npm run migrate:down
```

## 🛡️ Security Features

- **Helmet.js** - Security headers
- **Rate Limiting** - API rate limiting
- **CORS** - Cross-origin configuration
- **Input Validation** - Request validation
- **SQL Injection Protection** - Parameterized queries
- **SSL/TLS** - Secure database connections

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📞 Support

Untuk support dan pertanyaan:
- Email: support@yourdomain.com
- Issue Tracker: [GitHub Issues](https://github.com/yourusername/medicine-management-system/issues)
- Documentation: [Wiki](https://github.com/yourusername/medicine-management-system/wiki)

## 🙏 Acknowledgments

- [Aiven](https://aiven.io/) untuk layanan database PostgreSQL
- [Express.js](https://expressjs.com/) untuk web framework
- [WebSocket](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API) untuk real-time communication
- Komunitas open source untuk tools dan libraries

---

**Catatan**: Pastikan untuk mengupdate konfigurasi database dan environment variables sesuai dengan setup Aiven Anda sebelum menjalankan aplikasi.