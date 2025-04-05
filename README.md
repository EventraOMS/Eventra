# Contact Form Project

A full-stack contact form implementation with file upload functionality.

## Technologies Used
- Frontend: HTML, CSS, JavaScript
- Backend: Node.js, Express.js
- Database: MySQL
- File Upload: Multer

## Prerequisites
1. Node.js installed
2. MySQL installed
3. MySQL password (currently set as 'root123' in server.js)

## Setup Instructions
1. Make sure MySQL is running on your system
2. Open terminal/command prompt in the project folder
3. Install dependencies:
   ```bash
   npm install
   ```

## Running the Project
1. Start the server:
   ```bash
   node server.js
   ```
2. You should see these messages:
   - "Connected to MySQL database"
   - "Table created successfully"
   - "Server running at http://localhost:3000"

3. Open your browser and go to:
   ```
   http://localhost:3000/contactus.html
   ```

## Features
- Form validation for email and phone number
- File upload support (images, PDFs, DOC, TXT)
- Data stored in MySQL database
- File storage in uploads directory
- Copy request option

## Project Structure
- `contactus.html` - Frontend contact form
- `server.js` - Node.js backend server
- `uploads/` - Directory for uploaded files
- `package.json` - Project dependencies

## Database Schema
Table: contact_submissions
- id (AUTO_INCREMENT)
- query_type (VARCHAR)
- email (VARCHAR)
- phone (VARCHAR)
- subject (VARCHAR)
- content (TEXT)
- needs_copy (BOOLEAN)
- file_path (VARCHAR)
- submission_date (TIMESTAMP) 