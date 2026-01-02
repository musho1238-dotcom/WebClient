const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const app = express();
const PORT = 3000;

// Middleware to parse JSON bodies
app.use(express.json());

// Serve static files from the 'client' directory
app.use(express.static(path.join(__dirname, 'client')));

// --- FILE MANAGEMENT HELPERS ---

// Paths to data files
const USERS_FILE = path.join(__dirname, 'data', 'users.json');
const PLAYLISTS_FILE = path.join(__dirname, 'data', 'playlists.json');

// Helper: Read JSON file
const readJsonFile = (filePath) => {
    try {
        if (!fs.existsSync(filePath)) {
            // Create file if it doesn't exist
            if (filePath.includes('users.json')) fs.writeFileSync(filePath, '[]');
            else fs.writeFileSync(filePath, '{}');
            return filePath.includes('users.json') ? [] : {};
        }
        const data = fs.readFileSync(filePath, 'utf8');
        // Handle empty files
        if (!data) return filePath.includes('users.json') ? [] : {};
        return JSON.parse(data);
    } catch (err) {
        console.error("Error reading file:", err);
        return filePath.includes('users.json') ? [] : {};
    }
};

// Helper: Write JSON file
const writeJsonFile = (filePath, data) => {
    try {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        return true;
    } catch (err) {
        console.error("Error writing file:", err);
        return false;
    }
};
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, 'client', 'uploads');
        // Check if folder exists, create if not
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        // Safe filename: timestamp + original name
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage: storage });

// --- ROUTES ---

// Default Route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'client', 'index.html'));
});

/**
 * REGISTER ROUTE
 * Method: POST
 * URL: /api/register
 */
app.post('/api/register', (req, res) => {
    const { username, password, firstName, imageURL } = req.body;

    // 1. Validation
    if (!username || !password || !firstName) {
        return res.status(400).json({ error: "Missing required fields" });
    }

    // 2. Read existing users
    const users = readJsonFile(USERS_FILE);

    // 3. Check for duplicates
    const userExists = users.some(u => u.username === username);
    if (userExists) {
        return res.status(409).json({ error: "Username already exists" });
    }

    // 4. Create new user object
    const newUser = {
        firstName,
        username,
        password,
        imageURL: imageURL || '', // Optional
        playlists: {} // Initialize empty playlists
    };

    // 5. Save to file
    users.push(newUser);
    const saved = writeJsonFile(USERS_FILE, users);

    if (saved) {
        console.log(`New user registered: ${username}`);
        res.status(201).json({ message: "User registered successfully" });
    } else {
        res.status(500).json({ error: "Server error: Could not save user" });
    }
});

/**
 * LOGIN ROUTE
 * Method: POST
 * URL: /api/login
 */
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;

    // 1. Read users from file
    const users = readJsonFile(USERS_FILE);

    // 2. Find user with matching username AND password
    const user = users.find(u => u.username === username && u.password === password);

    if (user) {
        // 3. Success: Return user info
        res.json({
            username: user.username,
            firstName: user.firstName,
            imageURL: user.imageURL
        });
    } else {
        // 4. Failure: Unauthorized
        res.status(401).json({ error: "Invalid username or password" });
    }
});
/**
 * GET PLAYLISTS ROUTE
 * Method: GET
 * URL: /api/playlists?username=...
 * Description: Returns the playlists for a specific user
 */
app.get('/api/playlists', (req, res) => {
    // 1. Get the username from the Query String (e.g., ?username=yossi)
    const { username } = req.query;

    if (!username) {
        return res.status(400).json({ error: "Username is required" });
    }

    // 2. Read the full playlists file
    const allPlaylists = readJsonFile(PLAYLISTS_FILE);

    // 3. Return only this user's playlists (or empty object if none exist)
    const userPlaylists = allPlaylists[username] || {};

    res.json(userPlaylists);
});

/**
 * SAVE PLAYLISTS ROUTE
 * Method: POST
 * URL: /api/playlists
 * Description: Saves the entire playlist object for a user
 */
app.post('/api/playlists', (req, res) => {
    // 1. Get data from client
    const { username, playlists } = req.body;

    if (!username || !playlists) {
        return res.status(400).json({ error: "Missing data" });
    }

    // 2. Read existing data
    const allPlaylists = readJsonFile(PLAYLISTS_FILE);

    // 3. Update only this user's section
    allPlaylists[username] = playlists;

    // 4. Write back to file
    const success = writeJsonFile(PLAYLISTS_FILE, allPlaylists);

    if (success) {
        res.json({ message: "Playlists saved successfully" });
    } else {
        res.status(500).json({ error: "Failed to save playlists" });
    }
});
/**
 * UPLOAD MP3 ROUTE (NEW)
 * Method: POST
 * URL: /api/upload
 */
app.post('/api/upload', upload.single('mp3file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
    }

    // Return the path relative to the client folder
    const fileUrl = `/uploads/${req.file.filename}`;
    res.json({ filePath: fileUrl, originalName: req.file.originalname });
});
// --- START SERVER ---
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});