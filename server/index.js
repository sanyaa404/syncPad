const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

dotenv.config();
connectDB();

const app = express();

app.use(cors()); //allows your React frontend on port 3000 to call this API on port 5000
app.use(express.json());

//health check
app.get('/api/health', (req, res) => {
  res.json({ message: 'CollabCode API is running' });
});

app.use('/api/auth', require('./routes/auth'));
app.use('/api/rooms', require('./routes/rooms'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));