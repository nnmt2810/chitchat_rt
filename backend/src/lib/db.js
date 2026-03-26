import mongoose from "mongoose"

export const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI)
        console.log("MongoDB Connected: ", conn.connection.host);
    } catch (e) {
        console.log("Error connection to MONGODB: ", e);
        process.exit(1); // 1 status code means fail, 0 means success
    }
}