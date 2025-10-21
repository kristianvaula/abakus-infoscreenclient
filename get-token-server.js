// get-token-server.mjs
import http from "http";
import open from "open"; // optional, install with `npm i open`
import { google } from "googleapis";
import fs from "fs";
import path from "path";

const CREDENTIALS_PATH = path.join(process.cwd(), "credentials.json");
const TOKEN_PATH = path.join(process.cwd(), "token.json");
const PORT = 3000; // must match the redirect URI you added in Google Console

if (!fs.existsSync(CREDENTIALS_PATH)) {
  console.error("credentials.json missing. Create OAuth credentials and save as credentials.json");
  process.exit(1);
}

const creds = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, "utf8"));
const clientInfo = creds.installed || creds.web;
if (!clientInfo) throw new Error("Invalid credentials.json structure.");

const { client_id, client_secret } = clientInfo;
const redirectUri = `http://localhost:${PORT}`;
const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirectUri);

const authUrl = oAuth2Client.generateAuthUrl({
  access_type: "offline",
  scope: ["https://www.googleapis.com/auth/drive.readonly"],
  prompt: "consent"
});

console.log("Open this URL in your browser (it may open automatically):\n\n", authUrl, "\n");

// optional: try to open automatically (install open package)
try { open(authUrl); } catch (e) {}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://localhost:${PORT}`);
    const code = url.searchParams.get("code");
    if (!code) {
      res.writeHead(200, { "Content-Type": "text/plain" });
      res.end("No code received. Close this window and try again.");
      return;
    }

    // exchange code for tokens
    const { tokens } = await oAuth2Client.getToken(code);
    oAuth2Client.setCredentials(tokens);
    fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2), "utf8");
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end("<h3>Authorization successful — you can close this window.</h3>");
    console.log("Saved token to", TOKEN_PATH);
  } catch (err) {
    console.error("Error exchanging code:", err);
    res.writeHead(500, { "Content-Type": "text/plain" });
    res.end("Error: " + String(err));
  } finally {
    // shut down after 1s so browser can finish
    setTimeout(() => server.close(), 1000);
  }
});

server.listen(PORT, () => {
  console.log(`Listening for OAuth redirect on http://localhost:${PORT}/`);
});
