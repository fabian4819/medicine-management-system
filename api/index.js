const mysql = require("mysql2/promise");

let pool;

function getDbConnection() {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT || 13595,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME || "defaultdb",
      ssl: { rejectUnauthorized: false },
      connectionLimit: 5,
      acquireTimeout: 60000,
      timeout: 60000,
      charset: "utf8mb4",
    });
  }
  return pool;
}

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS"
  );
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const { url, method } = req;
  const path = url.replace("/api", "");

  try {
    const db = getDbConnection();

    if (path === "/health") {
      return res.json({ status: "OK", timestamp: new Date().toISOString() });
    }

    if (path === "/v1/patients" && method === "GET") {
      return await getPatients(req, res, db);
    }

    if (path.match(/^\/v1\/patients\/\d+$/) && method === "GET") {
      const id = path.split("/").pop();
      return await getPatient(req, res, db, id);
    }

    if (path === "/v1/patients" && method === "POST") {
      return await createPatient(req, res, db);
    }

    res.status(404).json({ success: false, error: "Endpoint tidak ditemukan" });
  } catch (error) {
    console.error("API Error:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

async function getPatients(req, res, db) {
  const { page = 1, limit = 10, search = "" } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  try {
    let countQuery = "SELECT COUNT(*) as total FROM pengguna";
    let params = [];

    if (search) {
      countQuery += " WHERE nama_lengkap LIKE ?";
      params.push(`%${search}%`);
    }

    const [countResult] = await db.execute(countQuery, params);
    const totalRecords = countResult[0].total;
    const totalPages = Math.ceil(totalRecords / parseInt(limit));

    let mainQuery = `
      SELECT 
        id_pengguna as id,
        CONCAT('RM', LPAD(id_pengguna, 6, '0')) as rm_number,
        nama_lengkap as name,
        tanggal_lahir as birth_date,
        CASE 
          WHEN jenis_kelamin = 'Laki-Laki' THEN 'L'
          WHEN jenis_kelamin = 'Perempuan' THEN 'P'
          ELSE 'L'
        END as gender,
        created_at,
        DATE(created_at) as prescription_date,
        FLOOR(RAND() * 30) + 70 as compliance_percentage,
        'Obat Hipertensi' as medicine_name
      FROM pengguna
    `;

    if (search) {
      mainQuery += " WHERE nama_lengkap LIKE ?";
    }

    mainQuery += ` ORDER BY nama_lengkap ASC LIMIT ${parseInt(
      limit
    )} OFFSET ${offset}`;

    const [patients] = await db.execute(mainQuery, params);

    res.json({
      success: true,
      data: {
        patients,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalRecords,
          hasNextPage: parseInt(page) < totalPages,
          hasPrevPage: parseInt(page) > 1,
        },
      },
    });
  } catch (error) {
    throw error;
  }
}

async function getPatient(req, res, db, id) {
  try {
    const [patients] = await db.execute(
      `
      SELECT 
        id_pengguna as id,
        CONCAT('RM', LPAD(id_pengguna, 6, '0')) as rm_number,
        nama_lengkap as name,
        tanggal_lahir as birth_date,
        CASE 
          WHEN jenis_kelamin = 'Laki-Laki' THEN 'L'
          WHEN jenis_kelamin = 'Perempuan' THEN 'P'
          ELSE 'L'
        END as gender,
        created_at
      FROM pengguna 
      WHERE id_pengguna = ?
    `,
      [id]
    );

    if (patients.length === 0) {
      return res
        .status(404)
        .json({ success: false, error: "Pasien tidak ditemukan" });
    }

    res.json({ success: true, data: patients[0] });
  } catch (error) {
    throw error;
  }
}

async function createPatient(req, res, db) {
  const {
    nama_lengkap,
    tanggal_lahir,
    jenis_kelamin,
    password = "default123",
  } = req.body;

  if (!nama_lengkap) {
    return res.status(400).json({ success: false, error: "Nama wajib diisi" });
  }

  try {
    const [result] = await db.execute(
      "INSERT INTO pengguna (password, nama_lengkap, tanggal_lahir, jenis_kelamin) VALUES (?, ?, ?, ?)",
      [
        password,
        nama_lengkap,
        tanggal_lahir || null,
        jenis_kelamin || "Laki-Laki",
      ]
    );

    const newPatient = {
      id: result.insertId,
      rm_number: `RM${String(result.insertId).padStart(6, "0")}`,
      name: nama_lengkap,
      birth_date: tanggal_lahir,
      gender: jenis_kelamin === "Laki-Laki" ? "L" : "P",
      created_at: new Date().toISOString(),
    };

    res.status(201).json({
      success: true,
      data: newPatient,
      message: "Pasien berhasil ditambahkan",
    });
  } catch (error) {
    throw error;
  }
}
