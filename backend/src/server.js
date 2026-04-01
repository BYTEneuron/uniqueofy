const dotenv = require('dotenv');
// Load env vars before other imports
dotenv.config();

if (!process.env.OTP_DELIVERY_MODE) {
    console.error('Missing OTP_DELIVERY_MODE in environment');
    process.exit(1);
}

console.log("ENV MODE:", process.env.OTP_DELIVERY_MODE);

const app = require('./app');
const connectDB = require('./config/db');

connectDB();

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});