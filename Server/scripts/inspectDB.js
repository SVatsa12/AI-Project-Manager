// Server/scripts/inspectDb.js
require('dotenv').config();
const mongoose = require('mongoose');

(async () => {
  try {
    const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/gpai';
    const masked = uri.replace(/:\/\/([^:]+):([^@]+)@/, '://$1:<REDACTED_PASS>@');
    console.log('Using MONGO_URI (masked):', masked);

    await mongoose.connect(uri);
    console.log('Connected. Mongoose connection name (DB):', mongoose.connection.name);
    const cols = await mongoose.connection.db.listCollections().toArray();
    console.log('Collections in DB:', cols.map(c => c.name));

    // try to find alice:
    const users = await mongoose.connection.db.collection('users').find({ email: 'alice@example.com' }).toArray();
    console.log("Documents in users with email 'alice@example.com':", users);

    // also show top-level DB list on the cluster (admin command)
    const adminDb = mongoose.connection.db.admin();
    const dbs = await adminDb.listDatabases();
    console.log('Databases on cluster (names):', dbs.databases.map(d => d.name));

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
})();
