import js from "@eslint/js";

export default [
    {
        ignores: ["eslint.config.mjs"]
    },
    js.configs.recommended,
    {
        languageOptions: {
            ecmaVersion: "latest",
            sourceType: "commonjs",
            globals: {
                // Configura globals para Node.js
                __dirname: "readonly",
                module: "readonly",
                require: "readonly",
                process: "readonly",
                console: "readonly",
                setInterval: "readonly",
                setTimeout: "readonly",
                clearInterval: "readonly",
                clearTimeout: "readonly",
                // Configura globals para o Jest
                describe: "readonly",
                it: "readonly",
                expect: "readonly",
                beforeAll: "readonly",
                afterAll: "readonly"
            }
        },
        rules: {
            "no-unused-vars": "warn",
            "no-undef": "error"
        }
    }
];
