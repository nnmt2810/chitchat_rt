import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        environment: "node",
        globals: true,
        setupFiles: ["./tests/setup.js"],
        hookTimeout: 60000, // mongodb-memory-server tải binary lần đầu có thể chậm
        testTimeout: 20000,
        coverage: {
            provider: "v8",
            reporter: ["text", "html", "lcov"],
            include: ["src/**/*.js"],
            exclude: [
                "src/server.js",
                "src/lib/db.js",
                "src/lib/cloudinary.js",
                "src/lib/resend.js",
                "src/lib/arcjet.js",
                "src/emails/**",
            ],
        },
    },
});
