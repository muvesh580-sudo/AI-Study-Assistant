import mongoose from "mongoose";

mongoose.connection.on("disconnected", () => {
  console.error("MongoDB disconnected");
});

mongoose.connection.on("error", (error) => {
  console.error("MongoDB connection error:", error.message);
});

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI, {
          maxPoolSize: 10,
          serverSelectionTimeoutMS: 10000,
        });

      console.log("MongoDB connected Successfully");
    } catch (error) {
      console.error("MongoDB connection failed:", error.message);
      process.exit(1);
    }
};

export default connectDB;
