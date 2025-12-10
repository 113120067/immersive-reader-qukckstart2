# Immersive Reader - Node.js Sample

## Prerequisites

* An Immersive Reader resource configured for Azure Active Directory authentication. Follow [these instructions](https://docs.microsoft.com/azure/applied-ai-services/immersive-reader/how-to-create-immersive-reader) to get set up. You will need some of the values created here when configuring the sample project properties. Save the output of your session into a text file for future reference.
* Install [Yarn](https://yarnpkg.com), [npm](https://npmjs.com)

## Usage

1. Open a command prompt (Windows) or terminal (OSX, Linux)

1. Navigate to the **immersive-reader-sdk/js/samples/quickstart-nodejs** directory

1. Run `yarn install`

1. Create a file called **.env** and add the following, supplying values as appropriate.

    ```text
    TENANT_ID={YOUR_TENANT_ID}
    CLIENT_ID={YOUR_CLIENT_ID}
    CLIENT_SECRET={YOUR_CLIENT_SECRET}
    SUBDOMAIN={YOUR_SUBDOMAIN}
    ```

1. Run `npm start` (or `nodemon start` if you want to view changes you make after doing a browser refresh)

1. Open a web browser and navigate to [http://localhost:3000](http://localhost:3000) to view the sample

## Upload and Save Vocabulary Feature

This application includes a simple vocabulary extraction and storage feature for quick testing. **Note:** This feature uses a local JSON file store without database or authentication - it's intended for development/testing purposes only.

### Features

- **Upload text files** (.txt) to extract vocabulary words
- **Select and save** words to build a personal vocabulary list
- **View saved vocabulary** with source information

### Usage

#### Web Interface

1. Navigate to [http://localhost:3000/upload-vocab](http://localhost:3000/upload-vocab)
2. Upload a .txt file
3. Select words from the extracted list
4. Click "Save Selected Words" to add them to your vocabulary
5. View all saved words in the "Saved Vocabulary" section

#### API Endpoints

**Extract words from uploaded file:**
```bash
curl -X POST http://localhost:3000/api/upload \
  -F "file=@yourfile.txt"
```

Response:
```json
{
  "success": true,
  "filename": "yourfile.txt",
  "wordCount": 150,
  "words": ["word1", "word2", ...]
}
```

**Save selected words:**
```bash
curl -X POST http://localhost:3000/api/vocab/save \
  -H "Content-Type: application/json" \
  -d '{"words": ["hello", "world"], "source": "myfile.txt"}'
```

Response:
```json
{
  "success": true,
  "saved": 2,
  "total": 50,
  "newWords": ["hello", "world"]
}
```

**List all saved vocabulary:**
```bash
curl http://localhost:3000/api/vocab/list
```

Response:
```json
{
  "success": true,
  "count": 50,
  "words": [
    {"word": "hello", "source": "myfile.txt", "timestamp": "2024-01-01T12:00:00.000Z"},
    ...
  ]
}
```

### Data Storage

Vocabulary data is stored in `data/vocab-store.json`. This is a simple JSON file (no database required) suitable for testing. The file is created automatically when you save your first words.

## License

Copyright (c) Microsoft Corporation. All rights reserved.

Licensed under the MIT License.

## Immersive Reader Integration (快速上手)

This project includes helper code to launch Microsoft Immersive Reader from the browser. Below are configuration and usage examples so you can call Immersive Reader from pages such as `notes.html` or `upload-vocab`.

### Server environment variables
Create a `.env` (or set platform environment variables) with the same values used by the Home sample. Example variables the project reads:

```text
TENANT_ID={YOUR_TENANT_ID}
CLIENT_ID={YOUR_CLIENT_ID}
CLIENT_SECRET={YOUR_CLIENT_SECRET}
SUBDOMAIN={YOUR_SUBDOMAIN}
```

- `SUBDOMAIN` should be the host for your Cognitive Services/Immersive Reader resource (for example `your-resource-name.cognitiveservices.azure.com`).

The project exposes two compatible token endpoints the client will try:

- `/api/immersive-reader-token` (new route) — implemented in `routes/immersive-reader.js` using Azure AD client credentials flow.
- `/GetTokenAndSubdomain` (legacy route) — implemented in `routes/index.js` (same pattern used by the Home sample).

Make sure the env vars above are configured and the server is restarted after changes.

### Front-end helper module
We added a reusable ES module at `public/js/immersive-reader-client.js` that encapsulates SDK loading, token acquisition and launching the Immersive Reader. Example functions:

- `launchFromText(title, text, lang, options)` — convert plain text to HTML and open IR.
- `launchFromHtml(title, html, lang, options)` — launch IR from an HTML string.

Example usage in a module-enabled page (notes or upload-vocab):

```javascript
import { launchFromText } from '/js/immersive-reader-client.js';

// Launch Immersive Reader for a single note
await launchFromText('My Note Title', note.content, 'zh-Hant', { uiLang: 'zh-Hant' });
```

The helper will automatically try to fetch credentials from `/api/immersive-reader-token` and fall back to `/GetTokenAndSubdomain` if necessary, and will dynamically load the Immersive Reader SDK if it's not already present on the page.

### Server-side token endpoint (already provided)
The repo includes a server endpoint (`routes/immersive-reader.js`) that uses the Azure AD client credentials flow to issue a short-lived token for the client. You must set `CLIENT_ID`, `CLIENT_SECRET`, `TENANT_ID` and `SUBDOMAIN` in your environment for this to work. The endpoint returns `{ token, subdomain }` which the client uses to call `ImmersiveReader.launchAsync`.

### Notes & best practices
- Do NOT store subscription secrets or client secrets in client-side code. Always obtain IR tokens server-side.
- Keep `SUBDOMAIN` and Azure credentials out of source control. Use environment variables or your hosting platform's secret management.
- For long notes split content into chunks if needed; the helper does a simple paragraph-based split for plain text.

If you want, I can add a small `.env.example` file to the repo and update `ReadMe.md` with a one-line command to restart the server after env changes.
