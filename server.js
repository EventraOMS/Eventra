const express = require('express');
const mysql = require('mysql2');
const multer = require('multer');
const path = require('path');
const cors = require('cors');
const fs = require('fs');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();
const port = 3002;
const JWT_SECRET = 'your-secret-key';

// Create uploads directory if it doesn't exist
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)){
    fs.mkdirSync(uploadDir);
}

// Configure multer for file upload
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/')
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname)
    }
});

const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: function (req, file, cb) {
        const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|txt/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        if (extname) {
            return cb(null, true);
        }
        cb(new Error('Only image, PDF, DOC, and TXT files are allowed!'));
    }
}).single('attachment');

// Middleware
app.use(cors({
    origin: true, // Allow all origins during development
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('.'));
app.use('/uploads', express.static('uploads'));

// Database connection
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',     // Replace with your MySQL username (probably 'root')
    password: 'root123',  // Replace this with the password you set during MySQL installation
    database: 'eventra_contact'
});

db.connect((err) => {
    if (err) {
        console.error('Error connecting to database:', err);
        return;
    }
    console.log('Connected to MySQL database');
    
    // Create table if it doesn't exist
    const createContactTableQuery = `
        CREATE TABLE IF NOT EXISTS contact_submissions (
            id INT AUTO_INCREMENT PRIMARY KEY,
            query_type VARCHAR(50) NOT NULL,
            email VARCHAR(255) NOT NULL,
            phone VARCHAR(20),
            subject VARCHAR(100) NOT NULL,
            content TEXT NOT NULL,
            needs_copy BOOLEAN,
            file_path VARCHAR(255),
            submission_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `;
    
    const createUsersTableQuery = `
        CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            first_name VARCHAR(50) NOT NULL,
            last_name VARCHAR(50) NOT NULL,
            age INT NOT NULL,
            phone VARCHAR(15) NOT NULL,
            gender VARCHAR(10) NOT NULL,
            address TEXT NOT NULL,
            email VARCHAR(255) NOT NULL UNIQUE,
            password VARCHAR(255) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `;
    
    db.query(createContactTableQuery, (err) => {
        if (err) {
            console.error('Error creating contact table:', err);
            return;
        }
        console.log('Contact table ready');
    });

    db.query(createUsersTableQuery, (err) => {
        if (err) {
            console.error('Error creating users table:', err);
            return;
        }
        console.log('Users table ready');
    });
});

function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access denied' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid token' });
        }
        req.user = user;
        next();
    });
}

app.post('/api/signup', async (req, res) => {
    try {
        console.log('Received signup request:', req.body);
        const { fname, lname, age, phone, gender, address, email, password } = req.body;

        // Validate required fields
        if (!fname || !lname || !age || !phone || !gender || !address || !email || !password) {
            console.log('Missing required fields');
            return res.status(400).json({ error: 'All fields are required' });
        }

        // Check if email already exists
        const checkEmailQuery = 'SELECT email FROM users WHERE email = ?';
        db.query(checkEmailQuery, [email], async (err, results) => {
            if (err) {
                console.error('Database error checking email:', err);
                return res.status(500).json({ error: 'Error checking email existence' });
            }

            if (results.length > 0) {
                return res.status(400).json({ error: 'Email already registered' });
            }

            // Hash password
            const hashedPassword = await bcrypt.hash(password, 10);

            // Insert new user
            const insertQuery = `
                INSERT INTO users 
                (first_name, last_name, age, phone, gender, address, email, password)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `;

            db.query(
                insertQuery,
                [fname, lname, age, phone, gender, address, email, hashedPassword],
                (err, results) => {
                    if (err) {
                        console.error('Database error inserting user:', err);
                        return res.status(500).json({ error: 'Error creating account: ' + err.message });
                    }
                    console.log('User created successfully');
                    res.json({ success: true, message: 'Account created successfully!' });
                }
            );
        });
    } catch (error) {
        console.error('Server error in signup:', error);
        res.status(500).json({ error: 'Server error: ' + error.message });
    }
});

app.post('/api/login', (req, res) => {
    const { email, password } = req.body;

    const query = 'SELECT * FROM users WHERE email = ?';
    
    db.query(query, [email], async (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        
        if (results.length === 0) {
            return res.status(401).json({ error: 'User not found' });
        }

        const user = results[0];
        const validPassword = await bcrypt.compare(password, user.password);

        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid password' });
        }

        const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '24h' });
        res.json({ success: true, token });
    });
});

app.get('/api/profile', authenticateToken, (req, res) => {
    const query = 'SELECT id, first_name, last_name, age, phone, gender, address, email, created_at FROM users WHERE id = ?';
    
    db.query(query, [req.user.id], (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        
        if (results.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json(results[0]);
    });
});

// API endpoint to handle form submission
app.post('/api/submit-contact', (req, res) => {
    upload(req, res, function (err) {
        if (err instanceof multer.MulterError) {
            // A Multer error occurred when uploading
            console.error('Multer error:', err);
            return res.status(500).json({ error: 'File upload error: ' + err.message });
        } else if (err) {
            // An unknown error occurred when uploading
            console.error('Unknown error:', err);
            return res.status(500).json({ error: 'File upload error: ' + err.message });
        }

        const { queryType, email, phone, subject, content, needsCopy } = req.body;
        const filePath = req.file ? req.file.path : null;

        // Log the received data
        console.log('Received form data:', {
            queryType, email, phone, subject, content, needsCopy, filePath
        });
        
        const query = `
            INSERT INTO contact_submissions 
            (query_type, email, phone, subject, content, needs_copy, file_path)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
        
        db.query(
            query,
            [queryType, email, phone, subject, content, needsCopy === 'true', filePath],
            (err, results) => {
                if (err) {
                    console.error('Database error:', err);
                    return res.status(500).json({ error: 'Error saving your submission: ' + err.message });
                }
                res.json({ success: true, message: 'Form submitted successfully!' });
            }
        );
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Server error: ' + err.message });
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
}); 