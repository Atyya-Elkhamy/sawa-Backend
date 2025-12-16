#!/usr/bin/env node
/*
  One-time Google OAuth flow to get and store a refresh token for Drive uploads.
  Usage:
    node scripts/init-gdrive-oauth.js
  Env / Files accepted:
    - GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET (preferred)
    - BACKUP_GDRIVE_OAUTH_CLIENT_FILE: path to client_secret_*.json downloaded from Google Cloud Console
    - BACKUP_GDRIVE_OAUTH_TOKEN_FILE: where to save token (default ./.gdrive_oauth_tokens.json)
*/
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const http = require('http');
const { google } = require('googleapis');
const dotenv = require('dotenv');
dotenv.config();

const SCOPES = ['https://www.googleapis.com/auth/drive.file'];

function loadClient() {
    let clientId = process.env.GOOGLE_CLIENT_ID;
    let clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    let redirectUri = process.env.BACKUP_GDRIVE_OAUTH_REDIRECT_URI;
    const clientFile = process.env.BACKUP_GDRIVE_OAUTH_CLIENT_FILE || process.env.BACKUP_GDRIVE_CREDENTIALS;
    console.log('Using client secrets from:', clientId);
    if ((!clientId || !clientSecret) && clientFile && fs.existsSync(clientFile)) {
        const raw = JSON.parse(fs.readFileSync(clientFile, 'utf8'));
        const src = raw.web || raw.installed || raw;
        clientId = clientId || src.client_id;
        clientSecret = clientSecret || src.client_secret;
        if (!redirectUri) redirectUri = (src.redirect_uris && src.redirect_uris[0]) || 'http://localhost:53682/oauth2callback';
    }

    if (!redirectUri) redirectUri = 'http://localhost:53682/oauth2callback';

    console.log(`Redirect URI: ${redirectUri}`);

    if (!clientId || !clientSecret) {
        console.log('Using client secrets from:', clientId);

        console.error('Missing GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET or BACKUP_GDRIVE_OAUTH_CLIENT_FILE');
        process.exit(1);
    }

    return new google.auth.OAuth2({ clientId, clientSecret, redirectUri });
}

function ask(query) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    return new Promise((resolve) => rl.question(query, (ans) => { rl.close(); resolve(ans); }));
}

(async () => {
    try {
        const oAuth2Client = loadClient();
        const redirectUri = oAuth2Client.redirectUri || oAuth2Client._redirectUri; // eslint-disable-line no-underscore-dangle
        const tokenFile = process.env.BACKUP_GDRIVE_OAUTH_TOKEN_FILE || path.resolve(process.cwd(), '.gdrive_oauth_tokens.json');

        const saveTokens = (tokens) => {
            const payload = {
                client_id: oAuth2Client._clientId, // eslint-disable-line no-underscore-dangle
                client_secret: oAuth2Client._clientSecret, // eslint-disable-line no-underscore-dangle
                refresh_token: tokens.refresh_token,
                expiry_date: tokens.expiry_date,
            };
            fs.writeFileSync(tokenFile, JSON.stringify(payload, null, 2));
            console.log(`\nSaved OAuth tokens to ${tokenFile}`);
        };

        // If redirect is localhost, spin a tiny webserver to capture the code
        if (redirectUri && redirectUri.startsWith('http://localhost')) {
            const urlObj = new URL(redirectUri);
            const port = Number(urlObj.port || 80);
            const pathname = urlObj.pathname || '/';

            const server = http.createServer(async (req, res) => {
                try {
                    if (req.url && req.url.startsWith(pathname)) {
                        const requestUrl = new URL(req.url, `http://localhost:${port}`);
                        const code = requestUrl.searchParams.get('code');
                        if (code) {
                            const { tokens } = await oAuth2Client.getToken(code);
                            saveTokens(tokens);
                            res.writeHead(200, { 'Content-Type': 'text/html' });
                            res.end('<h3>Authorization complete. You can close this window.</h3>');
                            server.close();
                            return;
                        }
                    }
                    res.writeHead(400, { 'Content-Type': 'text/html' });
                    res.end('<h3>Missing code parameter.</h3>');
                } catch (e) {
                    console.error('Error handling OAuth callback:', e.message);
                    res.writeHead(500, { 'Content-Type': 'text/plain' });
                    res.end('Internal Server Error');
                    server.close();
                }
            });

            await new Promise((resolve) => server.listen(port, () => resolve()));
            const authUrl = oAuth2Client.generateAuthUrl({ access_type: 'offline', prompt: 'consent', scope: SCOPES });
            console.log('\nOpen this URL in your browser and complete the consent:');
            console.log(authUrl);
            console.log(`\nWaiting for redirect to ${redirectUri} ...`);
            return; // process exits when server closes
        }

        // Fallback: manual paste (will only work if the client allows copy-paste codes, which many do not)
        const authUrl = oAuth2Client.generateAuthUrl({ access_type: 'offline', prompt: 'consent', scope: SCOPES });
        console.log('\nOpen this URL in your browser, authorize, and paste the code below:');
        console.log(authUrl);
        const code = await ask('\nEnter the code here: ');
        const { tokens } = await oAuth2Client.getToken(code.trim());
        saveTokens(tokens);
    } catch (err) {
        console.error('Failed to initialize OAuth:', err.message);
        process.exit(1);
    }
})();
