import dns from "dns";
import mongoose from "mongoose";

dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);

export const Dbconnection = async()=>{
    try {
        await mongoose.connect(process.env.MONGODB_URL);
        console.log("Db connect successfully")
    } catch (error) {
        console.log("Db not connect",error)
    }
}
