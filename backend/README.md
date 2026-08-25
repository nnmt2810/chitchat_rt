# ChitChat RT — Backend

## Testing

Test suite dùng **Vitest** + **Supertest** + **mongodb-memory-server** (MongoDB thật chạy tạm trong bộ nhớ, không cần cài Mongo hay Docker để chạy test).

```bash
npm test              # chạy toàn bộ test, 1 lần
npm run test:watch    # chạy ở chế độ watch khi code
npm run test:coverage # chạy kèm báo cáo coverage (html tại coverage/index.html)
```

### Cấu trúc test

```
tests/
  setup.js                    # global setup: load .env.test, boot mongodb-memory-server
  helpers/auth.helper.js      # tạo user/token giả dùng chung
  unit/
    utils.test.js             # generateToken (JWT + cookie)
    auth.middleware.test.js   # protectRoute
  integration/
    auth.test.js              # /api/auth/* (signup, login, logout, check)
    message.test.js           # /api/messages/* (contacts, chats, send, get)
```

### Cách ly khỏi service ngoài

Test không gọi network thật ra ngoài — các service bên thứ 3 được mock bằng `vi.mock()`:

| Service | Vì sao mock |
|---|---|
| `lib/arcjet.js` | Tránh gọi API Arcjet thật, tránh rate-limit/flaky test |
| `lib/cloudinary.js` | Tránh upload ảnh thật lên Cloudinary khi test |
| `emails/emailHandlers.js` | Tránh gửi email thật qua Resend |
| `lib/socket.js` (`getReceiverSocketId`, `io`) | Test HTTP API không phụ thuộc kết nối WebSocket thật |

MongoDB dùng **mongodb-memory-server** — một MongoDB thật (không phải mock), chạy tạm trong RAM, tự tải binary lần chạy đầu tiên (cần internet, sau đó cache lại ở `~/.cache/mongodb-binaries`). Nếu mạng bị chặn tải `fastdl.mongodb.org`, có thể set biến môi trường `MONGOMS_DOWNLOAD_MIRROR` trỏ tới mirror khác, hoặc cài Mongo cục bộ và set `MONGOMS_SYSTEM_BINARY=/usr/bin/mongod`.

### Kiến trúc phục vụ test

`src/server.js` trước đây vừa cấu hình Express vừa gọi `server.listen()` — không tách được để test. Đã refactor:

- `src/app.js`: chỉ cấu hình Express app (middleware, routes) — **không listen, không connect DB**. Đây là file test import.
- `src/server.js`: import `app` từ `app.js`, gọi `server.listen()` + `connectDB()` — chỉ chạy khi thật sự khởi động server (`npm start`/`npm run dev`).

Nhờ vậy `supertest(app)` gọi thẳng vào Express app trong bộ nhớ, không cần mở cổng mạng thật, chạy nhanh và ổn định.
