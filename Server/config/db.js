// Server/config/db.js
const mongoose = require('mongoose');

/**
 * Connects to the MongoDB database using the provided URI.
 * Mongoose v6+ no longer requires the useNewUrlParser and useUnifiedTopology options.
 */
async function connectDB(uri) {
  try {
    // The options object is no longer needed
    await mongoose.connect(uri);
    console.log('MongoDB connected successfully.');
  } catch (err) {
    console.error('MongoDB connection error:', err);
    // Exit the process with a failure code
    process.exit(1);
  }
}

module.exports = connectDB;