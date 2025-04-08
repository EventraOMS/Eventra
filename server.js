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

// Enable CORS for all routes
app.use(cors());

// Parse JSON bodies
app.use(express.json());

// Parse URL-encoded bodies
app.use(express.urlencoded({ extended: true }));

// Create uploads directory if it doesn't exist
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)){
    fs.mkdirSync(uploadDir);
}

// Configure multer for file upload
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|txt/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
        return cb(null, true);
    }
    cb(null, false);
};

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: fileFilter
});

// Middleware
app.use(express.static('.'));
app.use('/uploads', express.static('uploads'));

// Database connection
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'root123',  // Changed back to the original password
    database: 'eventra_contact'
});

db.connect((err) => {
    if (err) {
        console.error('Error connecting to database:', err);
        return;
    }
    console.log('Connected to MySQL server');

    // Create users table if it doesn't exist
    const createUsersTableQuery = `
        CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            first_name VARCHAR(50) NOT NULL,
            last_name VARCHAR(50) NOT NULL,
            age INT NOT NULL,
            phone VARCHAR(20) NOT NULL,
            gender VARCHAR(10) NOT NULL,
            address TEXT NOT NULL,
            email VARCHAR(255) NOT NULL UNIQUE,
            password VARCHAR(255) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `;

    // Create event_submissions table if it doesn't exist
    const createEventsTableQuery = `
        CREATE TABLE IF NOT EXISTS event_submissions (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            event_type VARCHAR(50) NOT NULL,
            event_date DATE NOT NULL,
            guest_count INT NOT NULL,
            venue_preference TEXT,
            special_requirements TEXT,
            budget DECIMAL(10,2) NOT NULL DEFAULT 0.00,
            services TEXT,
            status VARCHAR(20) DEFAULT 'Pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    `;

    // Create contact_submissions table if it doesn't exist
    const createContactTableQuery = `
        CREATE TABLE IF NOT EXISTS contact_submissions (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            query_type VARCHAR(50) NOT NULL,
            email VARCHAR(255) NOT NULL,
            phone VARCHAR(20) NOT NULL,
            subject VARCHAR(255) NOT NULL,
            content TEXT NOT NULL,
            needs_copy BOOLEAN DEFAULT false,
            file_path VARCHAR(255),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    `;

    // Create tables in sequence
    db.query(createUsersTableQuery, (err) => {
        if (err) {
            console.error('Error creating users table:', err);
            return;
        }
        console.log('Users table ready');

        db.query(createEventsTableQuery, (err) => {
            if (err) {
                console.error('Error creating events table:', err);
                return;
            }
            console.log('Events table ready');

            db.query(createContactTableQuery, (err) => {
                if (err) {
                    console.error('Error creating contact table:', err);
                    return;
                }
                console.log('Contact table ready');
            });
        });
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

// Handle contact form submissions
app.post('/api/submit-contact', authenticateToken, upload.single('attachment'), async (req, res) => {
    console.log('Received form submission:', req.body);

    try {
        // Validate required fields
        const requiredFields = ['queryType', 'subject', 'content'];
        for (const field of requiredFields) {
            if (!req.body[field]) {
                throw new Error(`Missing required field: ${field}`);
            }
        }

        // Get file information if uploaded
        const filePath = req.file ? req.file.path : null;

        // Get user details
        const userQuery = 'SELECT email, phone FROM users WHERE id = ?';
        db.query(userQuery, [req.user.id], async (userErr, userResults) => {
            if (userErr) {
                console.error('Error fetching user details:', userErr);
                return res.status(500).json({ error: 'Error fetching user details' });
            }

            if (!userResults || userResults.length === 0) {
                return res.status(404).json({ error: 'User not found' });
            }

            const user = userResults[0];

            // Insert into database
            const query = `
                INSERT INTO contact_submissions (
                    user_id,
                    query_type,
                    email,
                    phone,
                    subject,
                    content,
                    needs_copy,
                    file_path
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `;

            const values = [
                req.user.id,
                req.body.queryType,
                user.email,
                user.phone,
                req.body.subject,
                req.body.content,
                req.body.copy === 'yes' ? 1 : 0,
                filePath
            ];

            console.log('Executing query with values:', values);

            db.query(query, values, (error, results) => {
                if (error) {
                    console.error('Database error:', error);
                    return res.status(500).json({
                        success: false,
                        error: 'Failed to save to database: ' + error.message
                    });
                }

                console.log('Form data saved successfully:', results);
                res.json({
                    success: true,
                    message: 'Form submitted successfully',
                    id: results.insertId,
                    userDetails: {
                        email: user.email,
                        phone: user.phone
                    }
                });
            });
        });
    } catch (error) {
        console.error('Form submission error:', error);
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
});

// Handle event submissions
app.post('/api/submit-event', authenticateToken, async (req, res) => {
    try {
        console.log('Raw request body:', req.body);
        const { eventType, eventDate, guests, venuePreference, message, budget, services } = req.body;
        const userId = req.user.id;

        console.log('Parsed values:', {
            userId,
            eventType,
            eventDate,
            guests,
            venuePreference,
            message,
            budget,
            services
        });

        if (!userId) {
            return res.status(401).json({ error: 'User not authenticated' });
        }

        // Validate required fields
        if (!eventType || !eventDate || !guests) {
            console.log('Missing required fields:', {
                hasEventType: !!eventType,
                hasEventDate: !!eventDate,
                hasGuests: !!guests
            });
            return res.status(400).json({ 
                error: 'Event type, date, and guest count are required',
                received: {
                    eventType,
                    eventDate,
                    guests
                }
            });
        }

        // Convert guests to integer
        const guestCountInt = parseInt(guests);
        if (isNaN(guestCountInt)) {
            return res.status(400).json({ error: 'Guest count must be a number' });
        }

        // Insert event submission
        const query = `
            INSERT INTO event_submissions 
            (user_id, event_type, event_date, guest_count, venue_preference, special_requirements, budget, services, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Pending')
        `;

        const values = [
            userId,
            eventType,
            eventDate,
            guestCountInt,
            venuePreference || null,
            message || null,
            budget || 0.00,
            services ? services.join(',') : null
        ];

        console.log('Final values being inserted:', values);

        db.query(query, values, (error, results) => {
            if (error) {
                console.error('Database error inserting event:', error);
                return res.status(500).json({ error: 'Failed to save event submission' });
            }
            res.json({ success: true, id: results.insertId });
        });
    } catch (error) {
        console.error('Error processing event submission:', error);
        res.status(500).json({ error: 'Server error processing event submission' });
    }
});

// Add endpoint to get user's events
app.get('/api/my-events', authenticateToken, (req, res) => {
    const userId = req.user.id;

    const query = `
        SELECT * FROM event_submissions 
        WHERE user_id = ?
        ORDER BY created_at DESC
    `;

    db.query(query, [userId], (err, results) => {
        if (err) {
            console.error('Error fetching events:', err);
            return res.status(500).json({ error: 'Error fetching events' });
        }
        res.json({ success: true, events: results });
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