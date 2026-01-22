import mongoose from 'mongoose';

export async function connectDB() {
  const uri = process.env.DB_URL;
  if (!uri) throw new Error('DB_URL not set');

  await mongoose.connect(uri);
  console.log('✅ Database connected');
}
