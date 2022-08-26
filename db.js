import * as dotenv from "dotenv";
import mongoose from "mongoose";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(`Database is Connected: ${conn.connection.host}`);
  } catch (error) {
    console.log(`Error connection: ${error.message}`);
  }
};

export default connectDB;
