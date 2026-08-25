import { describe, it, expect, vi } from "vitest";
import jwt from "jsonwebtoken";
import { protectRoute } from "../../src/middleware/auth.middleware.js";
import { createTestUser } from "../helpers/auth.helper.js";

function createMockReqRes(cookieValue) {
    const req = { cookies: { jwt: cookieValue } };
    const res = {
        statusCode: null,
        body: null,
        status(code) {
            this.statusCode = code;
            return this;
        },
        json(payload) {
            this.body = payload;
            return this;
        },
    };
    const next = vi.fn();
    return { req, res, next };
}

describe("protectRoute middleware", () => {
    it("return 401 if no jwt cookie is provided", async () => {
        const { req, res, next } = createMockReqRes(undefined);

        await protectRoute(req, res, next);

        expect(res.statusCode).toBe(401);
        expect(res.body.message).toMatch(/No token provided/i);
        expect(next).not.toHaveBeenCalled();
    });

    it("return 500 if token is malformed or cannot be verified", async () => {
        const { req, res, next } = createMockReqRes("day-la-token-gia-mao");

        await protectRoute(req, res, next);

        // jwt.verify throw error -> catch block in protectRoute -> return 500
        expect(res.statusCode).toBe(500);
        expect(next).not.toHaveBeenCalled();
    });

    it("return 404 if token is valid but user does not exist in the database", async () => {
        const fakeUserId = "64f000000000000000000099";
        const token = jwt.sign({ userId: fakeUserId }, process.env.JWT_SECRET, { expiresIn: "7d" });
        const { req, res, next } = createMockReqRes(token);

        await protectRoute(req, res, next);

        expect(res.statusCode).toBe(404);
        expect(res.body.message).toMatch(/User not found/i);
        expect(next).not.toHaveBeenCalled();
    });

    it("set req.user and call next() when token is valid and user exists", async () => {
        const { user } = await createTestUser({ email: "middleware@test.com" });
        const token = jwt.sign({ userId: user._id.toString() }, process.env.JWT_SECRET, { expiresIn: "7d" });
        const { req, res, next } = createMockReqRes(token);

        await protectRoute(req, res, next);

        expect(next).toHaveBeenCalledTimes(1);
        expect(req.user).toBeTruthy();
        expect(req.user._id.toString()).toBe(user._id.toString());
        // Ensure password is not exposed via req.user
        expect(req.user.password).toBeUndefined();
    });
});
