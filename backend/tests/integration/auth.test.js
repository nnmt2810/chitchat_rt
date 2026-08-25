import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";

// Mock Arcjet: always allow access to protected routes for testing purposes.
vi.mock("../../src/lib/arcjet.js", () => ({
    default: {
        protect: vi.fn().mockResolvedValue({
            isDenied: () => false,
            results: [],
        }),
    },
}));

// Mock email: check if sendWelcomeEmail is called after signup, without actually sending emails.
vi.mock("../../src/emails/emailHandlers.js", () => ({
    sendWelcomeEmail: vi.fn().mockResolvedValue(undefined),
}));

// Mock Cloudinary: return a fixed URL for uploaded images, without actually uploading to Cloudinary.
vi.mock("../../src/lib/cloudinary.js", () => ({
    default: {
        uploader: {
            upload: vi.fn().mockResolvedValue({
                secure_url: "https://res.cloudinary.com/test/image/upload/mock-avatar.jpg",
            }),
        },
    },
}));

const { app } = await import("../../src/app.js");
const { sendWelcomeEmail } = await import("../../src/emails/emailHandlers.js");

function extractCookie(res) {
    const raw = res.headers["set-cookie"];
    return raw ? raw[0] : null;
}

describe("POST /api/auth/signup", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    const validPayload = {
        fullName: "Nguyen Van A",
        email: "vana@test.com",
        password: "password123",
    };

    it("create a new user, return 201 with jwt cookie", async () => {
        const res = await request(app).post("/api/auth/signup").send(validPayload);

        expect(res.status).toBe(201);
        expect(res.body.user.email).toBe(validPayload.email);
        expect(res.body.user.password).toBeUndefined();
        expect(extractCookie(res)).toMatch(/^jwt=/);
    });

    it("send welcome email after successful signup", async () => {
        await request(app).post("/api/auth/signup").send(validPayload);
        expect(sendWelcomeEmail).toHaveBeenCalledTimes(1);
    });

    it("reject if required fields are missing", async () => {
        const res = await request(app)
            .post("/api/auth/signup")
            .send({ email: "a@test.com", password: "password123" });

        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/required/i);
    });

    it("reject if password is shorter than 6 characters", async () => {
        const res = await request(app)
            .post("/api/auth/signup")
            .send({ ...validPayload, password: "123" });

        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/at least 6 characters/i);
    });

    it("reject if email is in invalid format", async () => {
        const res = await request(app)
            .post("/api/auth/signup")
            .send({ ...validPayload, email: "not-an-email" });

        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/Invalid email format/i);
    });

    it("reject if email already exists", async () => {
        await request(app).post("/api/auth/signup").send(validPayload);
        const res = await request(app).post("/api/auth/signup").send(validPayload);

        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/already exists/i);
    });
});

describe("POST /api/auth/login", () => {
    const credentials = {
        fullName: "Login User",
        email: "login@test.com",
        password: "password123",
    };

    beforeEach(async () => {
        vi.clearAllMocks();
        await request(app).post("/api/auth/signup").send(credentials);
    });

    it("login successfully with correct email/password", async () => {
        const res = await request(app)
            .post("/api/auth/login")
            .send({ email: credentials.email, password: credentials.password });

        expect(res.status).toBe(200);
        expect(res.body.user.email).toBe(credentials.email);
        expect(extractCookie(res)).toMatch(/^jwt=/);
    });

    it("reject if password is incorrect", async () => {
        const res = await request(app)
            .post("/api/auth/login")
            .send({ email: credentials.email, password: "wrongpassword" });

        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/Invalid Credentials/i);
    });

    it("reject if email does not exist", async () => {
        const res = await request(app)
            .post("/api/auth/login")
            .send({ email: "nonexistent@test.com", password: "password123" });

        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/Invalid Credentials/i);
    });
});

describe("POST /api/auth/logout", () => {
    it("delete cookie jwt", async () => {
        const res = await request(app).post("/api/auth/logout");

        expect(res.status).toBe(200);
        const cookie = extractCookie(res);
        expect(cookie).toMatch(/^jwt=;/);
    });
});

describe("GET /api/auth/check", () => {
    it("return 401 if not logged in", async () => {
        const res = await request(app).get("/api/auth/check");
        expect(res.status).toBe(401);
    });

    it("return user information if logged in", async () => {
        const signupRes = await request(app).post("/api/auth/signup").send({
            fullName: "Check User",
            email: "check@test.com",
            password: "password123",
        });
        const cookie = extractCookie(signupRes);

        const res = await request(app).get("/api/auth/check").set("Cookie", cookie);

        expect(res.status).toBe(200);
        expect(res.body.user.email).toBe("check@test.com");
    });
});
