import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import User from "../../src/models/User.js";

// Create a JWT token for testing purposes
export function generateTestToken(userId) {
    return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: "7d" });
}

// Return a cookie string with the JWT token for testing purposes
export function authCookie(userId) {
    return `jwt=${generateTestToken(userId)}`;
}

// Create a test user in the database for testing purposes
export async function createTestUser(overrides = {}) {
    const password = overrides.password || "password123";
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
        fullName: overrides.fullName || "Test User",
        email: overrides.email || `user${Date.now()}${Math.random()}@test.com`,
        password: hashedPassword,
        profilePic: overrides.profilePic || "",
    });

    return { user, rawPassword: password };
}
