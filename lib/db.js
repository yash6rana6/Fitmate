const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  // We don't throw at import-time in serverless environments where env
  // might not be loaded yet in some tooling, but we do warn loudly.
  console.warn('[db] MONGODB_URI is not set. Set it in your .env file.');
}

// Reuse the connection across hot reloads / serverless invocations.
let cached = global._fitmateMongoose;
if (!cached) {
  cached = global._fitmateMongoose = { conn: null, promise: null };
}

async function dbConnect() {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    if (!MONGODB_URI) {
      throw new Error('MONGODB_URI is not set');
    }
    cached.promise = mongoose
      .connect(MONGODB_URI, {
        bufferCommands: false,
      })
      .then((m) => m);
  }

  try {
    cached.conn = await cached.promise;
  } catch (err) {
    cached.promise = null;
    throw err;
  }

  return cached.conn;
}

module.exports = dbConnect;
