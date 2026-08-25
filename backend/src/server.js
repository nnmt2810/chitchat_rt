import { app } from "./app.js";
import { server } from "./lib/socket.js";
import { connectDB } from "./lib/db.js";
import { ENV } from "./lib/env.js";

const PORT = ENV.PORT || 3000;

server.listen(PORT, () => {
    console.log("Server running on port: " + PORT);
    connectDB();
});
