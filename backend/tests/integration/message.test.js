import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { createTestUser, authCookie } from "../helpers/auth.helper.js";
import Message from "../../src/models/Message.js";

vi.mock("../../src/lib/arcjet.js", () => ({
    default: {
        protect: vi.fn().mockResolvedValue({
            isDenied: () => false,
            results: [],
        }),
    },
}));

vi.mock("../../src/lib/cloudinary.js", () => ({
    default: {
        uploader: {
            upload: vi.fn().mockResolvedValue({
                secure_url: "https://res.cloudinary.com/test/image/upload/mock-message.jpg",
            }),
        },
    },
}));

// message.controller.js emit qua socket.io khi có người nhận online (getReceiverSocketId).
// Mock để tránh phụ thuộc kết nối socket thật trong lúc test HTTP API.
vi.mock("../../src/lib/socket.js", async () => {
    const actual = await vi.importActual("../../src/lib/socket.js");
    return {
        ...actual,
        getReceiverSocketId: vi.fn().mockReturnValue(undefined),
        io: { to: vi.fn().mockReturnValue({ emit: vi.fn() }) },
    };
});

const { app } = await import("../../src/app.js");
const { default: cloudinary } = await import("../../src/lib/cloudinary.js");

describe("GET /api/messages/contacts", () => {
    it("trả về 401 nếu chưa đăng nhập", async () => {
        const res = await request(app).get("/api/messages/contacts");
        expect(res.status).toBe(401);
    });

    it("trả về danh sách user khác, không bao gồm chính mình và không lộ password", async () => {
        const { user: me } = await createTestUser({ email: "me@test.com" });
        const { user: other } = await createTestUser({ email: "other@test.com" });

        const res = await request(app)
            .get("/api/messages/contacts")
            .set("Cookie", authCookie(me._id));

        expect(res.status).toBe(200);
        const ids = res.body.map((u) => u._id);
        expect(ids).toContain(other._id.toString());
        expect(ids).not.toContain(me._id.toString());
        expect(res.body[0].password).toBeUndefined();
    });
});

describe("POST /api/messages/send/:id", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("gửi tin nhắn text thành công", async () => {
        const { user: sender } = await createTestUser({ email: "sender@test.com" });
        const { user: receiver } = await createTestUser({ email: "receiver@test.com" });

        const res = await request(app)
            .post(`/api/messages/send/${receiver._id}`)
            .set("Cookie", authCookie(sender._id))
            .send({ text: "Xin chao!" });

        expect(res.status).toBe(201);
        expect(res.body.text).toBe("Xin chao!");
        expect(res.body.senderId).toBe(sender._id.toString());
        expect(res.body.receiverId).toBe(receiver._id.toString());
    });

    it("gửi tin nhắn kèm ảnh sẽ gọi Cloudinary upload và lưu URL trả về", async () => {
        const { user: sender } = await createTestUser({ email: "sender2@test.com" });
        const { user: receiver } = await createTestUser({ email: "receiver2@test.com" });

        const res = await request(app)
            .post(`/api/messages/send/${receiver._id}`)
            .set("Cookie", authCookie(sender._id))
            .send({ image: "data:image/png;base64,fakebase64data" });

        expect(res.status).toBe(201);
        expect(cloudinary.uploader.upload).toHaveBeenCalledTimes(1);
        expect(res.body.image).toBe("https://res.cloudinary.com/test/image/upload/mock-message.jpg");
    });

    it("từ chối nếu không có cả text lẫn image", async () => {
        const { user: sender } = await createTestUser({ email: "sender3@test.com" });
        const { user: receiver } = await createTestUser({ email: "receiver3@test.com" });

        const res = await request(app)
            .post(`/api/messages/send/${receiver._id}`)
            .set("Cookie", authCookie(sender._id))
            .send({});

        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/text or image is required/i);
    });

    it("từ chối nếu gửi tin nhắn cho chính mình", async () => {
        const { user: sender } = await createTestUser({ email: "sender4@test.com" });

        const res = await request(app)
            .post(`/api/messages/send/${sender._id}`)
            .set("Cookie", authCookie(sender._id))
            .send({ text: "noi chuyen mot minh" });

        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/Cannot send message to yourself/i);
    });

    it("trả về 404 nếu người nhận không tồn tại", async () => {
        const { user: sender } = await createTestUser({ email: "sender5@test.com" });
        const fakeReceiverId = "64f000000000000000000123";

        const res = await request(app)
            .post(`/api/messages/send/${fakeReceiverId}`)
            .set("Cookie", authCookie(sender._id))
            .send({ text: "hello" });

        expect(res.status).toBe(404);
        expect(res.body.message).toMatch(/Receiver not found/i);
    });
});

describe("GET /api/messages/:id", () => {
    it("trả về đúng các tin nhắn giữa 2 user, theo cả 2 chiều", async () => {
        const { user: userA } = await createTestUser({ email: "a@test.com" });
        const { user: userB } = await createTestUser({ email: "b@test.com" });
        const { user: userC } = await createTestUser({ email: "c@test.com" });

        await Message.create({ senderId: userA._id, receiverId: userB._id, text: "A gui B" });
        await Message.create({ senderId: userB._id, receiverId: userA._id, text: "B tra loi A" });
        await Message.create({ senderId: userA._id, receiverId: userC._id, text: "A gui C, khong lien quan" });

        const res = await request(app)
            .get(`/api/messages/${userB._id}`)
            .set("Cookie", authCookie(userA._id));

        expect(res.status).toBe(200);
        expect(res.body).toHaveLength(2);
        const texts = res.body.map((m) => m.text);
        expect(texts).toEqual(expect.arrayContaining(["A gui B", "B tra loi A"]));
    });
});

describe("GET /api/messages/chats", () => {
    it("chỉ trả về những user đã từng nhắn tin qua lại (không phải toàn bộ contacts)", async () => {
        const { user: me } = await createTestUser({ email: "me2@test.com" });
        const { user: chatted } = await createTestUser({ email: "chatted@test.com" });
        await createTestUser({ email: "never-chatted@test.com" });

        await Message.create({ senderId: me._id, receiverId: chatted._id, text: "hi" });

        const res = await request(app)
            .get("/api/messages/chats")
            .set("Cookie", authCookie(me._id));

        expect(res.status).toBe(200);
        expect(res.body).toHaveLength(1);
        expect(res.body[0]._id).toBe(chatted._id.toString());
    });
});
