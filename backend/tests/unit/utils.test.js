import { describe, it, expect, vi } from "vitest";
import jwt from "jsonwebtoken";
import { generateToken } from "../../src/lib/utils.js";

// Create a mock response object with a cookie method for testing purposes
function createMockRes() {
    return { cookie: vi.fn() };
}

describe("generateToken", () => {
    it("tạo ra một JWT hợp lệ, chứa đúng userId", () => {
        const res = createMockRes();
        const userId = "64f000000000000000000001";

        const token = generateToken(userId, res);
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        expect(decoded.userId).toBe(userId);
    });

    it("gắn cookie 'jwt' với các cờ bảo mật đúng (httpOnly, sameSite=strict)", () => {
        const res = createMockRes();
        generateToken("64f000000000000000000001", res);

        expect(res.cookie).toHaveBeenCalledTimes(1);

        const [cookieName, cookieValue, options] = res.cookie.mock.calls[0];
        expect(cookieName).toBe("jwt");
        expect(typeof cookieValue).toBe("string");
        expect(options.httpOnly).toBe(true);
        expect(options.sameSite).toBe("strict");
        expect(options.maxAge).toBe(7 * 24 * 60 * 60 * 1000);
        // NODE_ENV=test -> secure=false, NODE_ENV=production -> secure=true
        expect(options.secure).toBe(false);
    });

    it("ném lỗi nếu JWT_SECRET chưa được cấu hình", async () => {
        const res = createMockRes();
        const original = process.env.JWT_SECRET;

        // Delete JWT_SECRET to simulate missing configuration
        vi.resetModules();
        delete process.env.JWT_SECRET;

        const { generateToken: generateTokenNoSecret } = await import("../../src/lib/utils.js");
        expect(() => generateTokenNoSecret("someUserId", res)).toThrow("JWT_SECRET is not configured");

        process.env.JWT_SECRET = original;
        vi.resetModules();
    });
});
