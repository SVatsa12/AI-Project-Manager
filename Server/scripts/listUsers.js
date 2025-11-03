// Server/scripts/listUsers.js
require('dotenv').config();
const mongoose = require('mongoose');

(async () => {
  try {
    const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/gpai';
    console.log('Connecting to (masked):', uri.replace(/:\/\/([^:]+):([^@]+)@/, '://$1:<REDACTED_PASS>@'));
    await mongoose.connect(uri);
    console.log('Connected DB:', mongoose.connection.name);

    const usersColl = mongoose.connection.db.collection('users');
    const count = await usersColl.countDocuments();
    console.log('users collection count:', count);

    const docs = await usersColl.find({}).limit(50).toArray();
    console.log('First up to 50 docs:', docs);
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
})();
