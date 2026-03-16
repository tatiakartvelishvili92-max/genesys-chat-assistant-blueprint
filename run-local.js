const http = require('http');
const https = require('https');
const fs = require('fs');
const express = require('express');
const platformClient = require('purecloud-platform-client-v2');
require('dotenv').config();

const privateKey = fs.readFileSync('ssl/_localhost.key', 'utf8');
const certificate = fs.readFileSync('ssl/_localhost.crt', 'utf8');

const credentials = {key: privateKey, cert: certificate};
const app = express();

// Genesys Cloud config from environment variables
const clientId = process.env.GENESYS_CLIENT_ID;
const clientSecret = process.env.GENESYS_CLIENT_SECRET;
const region = process.env.GENESYS_REGION;

// Allow Genesys Cloud to frame this app
app.use((req, res, next) => {
    res.setHeader(
        'Content-Security-Policy',
        "frame-ancestors 'self' https://apps.mypurecloud.com"
    );
    next();
});

app.use(express.static('docs'));

// OAuth callback route - exchanges auth code for token
app.get('/oauth/callback', (req, res) => {
    const authCode = req.query.code;
    const state = req.query.state || '';

    if (!authCode) {
        return res.status(400).send('Missing authorization code');
    }

    const client = platformClient.ApiClient.instance;
    client.setEnvironment(region);

    client.loginCodeAuthorizationGrant(clientId, clientSecret, authCode, `https://localhost:3443/oauth/callback`)
    .then((authData) => {
        // Redirect back to the app with the token and state
        const token = authData.accessToken;
        res.redirect(`/?token=${encodeURIComponent(token)}&conversationid=${encodeURIComponent(state)}`);
    })
    .catch((err) => {
        console.error('Auth code exchange failed:', err);
        res.status(500).send('Authentication failed');
    });
});

const httpsServer = https.createServer(credentials, app);
httpsServer.listen(3443);
console.log('HTTPS listening on: 3443');

