const express = require('express');
const router = express.Router();
const axios = require('axios');
const qs = require('qs');

/**
 * GET /api/immersive-reader-token
 * Returns a short-lived Immersive Reader token and subdomain for the client.
 * This implementation mirrors the existing home route `/GetTokenAndSubdomain`:
 * It uses Azure AD client credentials flow and environment variables:
 *   CLIENT_ID, CLIENT_SECRET, TENANT_ID, SUBDOMAIN
 */
router.get('/api/immersive-reader-token', function(req, res) {
  try {
    const config = {
      headers: {
        'content-type': 'application/x-www-form-urlencoded'
      }
    };

    const data = {
      grant_type: 'client_credentials',
      client_id: process.env.CLIENT_ID,
      client_secret: process.env.CLIENT_SECRET,
      resource: 'https://cognitiveservices.azure.com/'
    };

    const url = `https://login.windows.net/${process.env.TENANT_ID}/oauth2/token`;

    axios.post(url, qs.stringify(data), config)
      .then(function(response) {
        const token = response.data.access_token;
        const subdomain = process.env.SUBDOMAIN;
        return res.send({ token, subdomain });
      })
      .catch(function(err) {
        console.error('Unable to acquire Azure AD token:', err && err.toString ? err.toString() : err);
        return res.status(500).send({ error: 'Unable to acquire Azure AD token. Check server logs.' });
      });
  } catch (error) {
    console.error(error);
    return res.status(500).send({ error: 'CogSvcs IssueToken error' });
  }
});

module.exports = router;
