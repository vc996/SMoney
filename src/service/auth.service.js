// auth.service.js
import { Client, Account } from "appwrite";

const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT)
    .setProject(process.env.APPWRITE_PROJECT_ID);

const account = new Account(client);

export async function loginWithPassword(email, password) {
    try {
        await account.createEmailPasswordSession(email, password);
        const jwt = await account.createJWT();

        const res = await fetch("/api/auth", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ jwt: jwt.jwt }),
        });

        return await res.json();
    } catch (err) {
        return { success: false, message: err.message };
    }
}