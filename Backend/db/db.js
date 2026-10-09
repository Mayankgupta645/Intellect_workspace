require("dotenv").config();

const dns = require("dns");
dns.setServers(["8.8.8.8"]);

const mongoose = require("mongoose");

console.log("URI loaded:", !!process.env.MONGODB_URI);

mongoose.connect(process.env.MONGODB_URI)
    .then(() => {
        console.log("Connected to database");
    })
    .catch((err) => {
        console.log("Error in database connection:", err.message);
    });

mongoose.connection.on("disconnected", () => {
    console.log("Database disconnected");
});

module.exports = mongoose;