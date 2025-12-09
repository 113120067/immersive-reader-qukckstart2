# 共用模組架構說明

## 🎯 目的
避免功能重複和不一致,透過模組化設計集中管理共用邏輯。

## 📁 架構說明

### 1. **檔案處理模組** (`src/utils/file-processor.js`)

**功能:**
- 統一所有檔案格式處理邏輯
- 支援的格式管理集中化
- 提供文字提取、分詞等共用功能

**主要函數:**
```javascript
FILE_FORMATS.getAllFormats()      // 取得所有支援格式
FILE_FORMATS.getVocabFormats()    // 取得單字提取支援格式
FILE_FORMATS.getDocumentFormats() // 取得文件閱讀支援格式

extractTextFromBuffer(buffer, filename, options)  // 從記憶體提取文字
extractTextFromFile(filePath, options)             // 從檔案提取文字
tokenizeText(text)                                 // 文字分詞
formatAsHtml(text)                                 // 格式化為 HTML
```

**使用範例:**
```javascript
const { extractTextFromBuffer, tokenizeText, FILE_FORMATS } = require('../utils/file-processor');

// 提取文字
const text = await extractTextFromBuffer(buffer, filename);

// 分詞
const words = tokenizeText(text);

// 檢查支援格式
const allowedFormats = FILE_FORMATS.getVocabFormats();
```

---

### 2. **Multer 設定模組** (`src/config/multer-config.js`)

**功能:**
- 統一檔案上傳設定
- 集中管理檔案大小限制
- 提供記憶體和磁碟儲存兩種模式

**主要函數:**
```javascript
createMemoryUpload(allowedExtensions, errorMessage)  // 記憶體儲存模式
createDiskUpload(destination, allowedExtensions)     // 磁碟儲存模式
handleMulterError(err, req, res, next)               // 統一錯誤處理
```

**使用範例:**
```javascript
const { createMemoryUpload, handleMulterError, FILE_SIZE_LIMIT } = require('../config/multer-config');
const { FILE_FORMATS } = require('../utils/file-processor');

// 建立上傳中介軟體
const upload = createMemoryUpload(
  FILE_FORMATS.getVocabFormats(),
  'Only text documents and spreadsheets are allowed'
);

// 在路由中使用
router.post('/api/upload', upload.single('file'), async (req, res) => {
  // ... 處理邏輯
});

// 錯誤處理
router.use(handleMulterError);
```

---

### 3. **Immersive Reader 設定模組** (`public/js/ir-config.js`)

**功能:**
- 統一 Immersive Reader 設定
- 提供預設選項(繁體中文介面)
- 簡化啟動流程

**主要函數:**
```javascript
IRConfig.getDefaultOptions(customOptions)  // 取得預設選項
IRConfig.createData(title, content, lang)  // 建立資料結構
IRConfig.launch(title, content, options)   // 啟動 IR
```

**預設設定:**
- `uiLang: 'zh-Hant'` - 繁體中文介面
- `disableGrammar: false` - 啟用音節、圖片字典
- `disableTranslation: false` - 啟用翻譯功能

**使用範例:**
```javascript
// 在 HTML 中引入 (已在 layout.pug 中引入)
<script src="/js/ir-config.js"></script>

// 使用預設設定啟動
await IRConfig.launch('My Title', content);

// 自訂設定
await IRConfig.launch('My Title', content, {
  lang: 'zh-Hant',  // 內容語言
  onExit: () => console.log('Closed')
});
```

---

## 🔄 遷移指南

### 如何更新現有路由使用共用模組:

#### **Upload 路由範例:**
```javascript
const { extractTextFromFile, formatAsHtml, FILE_FORMATS } = require('../src/utils/file-processor');
const { createDiskUpload, handleMulterError } = require('../src/config/multer-config');

// 使用共用設定
const upload = createDiskUpload(
  'tmp/uploads/',
  FILE_FORMATS.getDocumentFormats()
);

router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    // 使用共用提取函數
    const text = await extractTextFromFile(req.file.path, { preserveHtml: true });
    const content = formatAsHtml(text);
    
    res.json({ success: true, content });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 使用共用錯誤處理
router.use(handleMulterError);
```

#### **Upload-Vocab 路由範例:**
```javascript
const { extractTextFromBuffer, tokenizeText, FILE_FORMATS } = require('../utils/file-processor');
const { createMemoryUpload, handleMulterError } = require('../config/multer-config');

// 使用共用設定
const upload = createMemoryUpload(FILE_FORMATS.getVocabFormats());

router.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    // 使用共用提取函數
    const text = await extractTextFromBuffer(req.file.buffer, req.file.originalname);
    const words = tokenizeText(text);
    
    res.json({ success: true, words, wordCount: words.length });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.use(handleMulterError);
```

---

## ✅ 優點

1. **一致性**: 所有功能使用相同的邏輯
2. **可維護性**: 修改一處,全域生效
3. **可測試性**: 共用模組更容易單元測試
4. **可擴展性**: 新增功能時只需更新共用模組
5. **減少重複**: DRY (Don't Repeat Yourself) 原則

---

## 📝 維護規範

### 新增檔案格式支援:

1. 在 `FILE_FORMATS` 中註冊新格式
2. 在 `extractTextFromBuffer` 和 `extractTextFromFile` 中實作處理邏輯
3. 所有使用該模組的路由自動支援新格式

### 修改 Immersive Reader 設定:

1. 只需修改 `ir-config.js` 中的 `getDefaultIROptions`
2. 所有頁面自動套用新設定

### 調整檔案大小限制:

1. 只需修改 `multer-config.js` 中的 `FILE_SIZE_LIMIT`
2. 所有上傳功能自動套用新限制

---

## 🚀 後續建議

1. ✅ 已建立共用模組
2. ⏳ 待重構現有路由使用共用模組
3. ⏳ 新增單元測試
4. ⏳ 建立 CI/CD 流程確保一致性
