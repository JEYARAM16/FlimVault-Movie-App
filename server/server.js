const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = 5000;
const SECRET_KEY = 'supersecretkey'; // Security Key for logging in

app.use(cors());
app.use(bodyParser.json());

// Connect to MongoDB
mongoose.connect('mongodb://127.0.0.1:27017/movieapp')
    .then(() => console.log('✅ MongoDB Connected'))
    .catch(err => console.log(err));

// --- NEW SCHEMA (User + Watchlist) ---
const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    watchlist: [{ 
        tmdbId: String, 
        title: String, 
        poster: String 
    }]
});
const User = mongoose.model('User', UserSchema);

// --- ROUTES ---

// 1. SIGN UP (Create Account)
app.post('/api/signup', async (req, res) => {
    const { username, password } = req.body;
    try {
        // Encrypt the password so it's safe
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ username, password: hashedPassword, watchlist: [] });
        await newUser.save();
        res.json({ message: 'User created! Please Log In.' });
    } catch (err) {
        res.status(500).json({ error: 'Username already taken.' });
    }
});

// 2. LOG IN
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await User.findOne({ username });
        if (!user) return res.status(400).json({ error: 'User not found' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ error: 'Wrong password' });

        // Create a "token" (like a digital ID card)
        const token = jwt.sign({ id: user._id }, SECRET_KEY);
        res.json({ token, username, message: 'Login Successful' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 3. GET WATCHLIST (Only for the logged-in user)
app.get('/api/watchlist', async (req, res) => {
    const token = req.headers['x-access-token'];
    try {
        const decoded = jwt.verify(token, SECRET_KEY);
        const user = await User.findById(decoded.id);
        res.json(user.watchlist);
    } catch (err) {
        res.status(401).json({ error: 'Invalid Token' });
    }
});

// 4. ADD TO WATCHLIST
app.post('/api/watchlist', async (req, res) => {
    const token = req.headers['x-access-token'];
    const { tmdbId, title, poster } = req.body;
    try {
        const decoded = jwt.verify(token, SECRET_KEY);
        const user = await User.findById(decoded.id);
        
        const exists = user.watchlist.find(m => m.tmdbId === tmdbId);
        if(!exists) {
            user.watchlist.push({ tmdbId, title, poster });
            await user.save();
            res.json({ message: 'Added to Watchlist!' });
        } else {
            res.json({ message: 'Already in Watchlist' });
        }
    } catch (err) {
        res.status(401).json({ error: 'Unauthorized' });
    }
});

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));