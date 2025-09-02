# 🔐 Secure Development Guidelines (for Cursor AI Assistance)

These rules ensure no vulnerabilities (injection, DDoS, leaks, etc.) when building apps.

---

## 1. Input Validation & Sanitization

### ✅ Safe Example: Validate and sanitize all user input
```javascript
// Express.js example
import validator from "validator";

app.post("/register", (req, res) => {
  const { email, username } = req.body;

  if (!validator.isEmail(email)) {
    return res.status(400).json({ error: "Invalid email" });
  }

  if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
    return res.status(400).json({ error: "Invalid username" });
  }

  // Safe use
  saveUserToDB({ email, username });
  res.json({ message: "User created" });
});
```

### 🚫 Avoid:
```javascript
// ❌ No input validation
db.query(`INSERT INTO users VALUES ('${req.body.username}')`);
```

---

## 2. Prevent Prompt Injection (AI Security)

### ✅ Safe Example: Schema validation for AI input
```javascript
import Ajv from "ajv";

const ajv = new Ajv();
const schema = {
  type: "object",
  properties: {
    query: { type: "string", maxLength: 200 },
  },
  required: ["query"],
};

app.post("/ask-ai", (req, res) => {
  const valid = ajv.validate(schema, req.body);
  if (!valid) return res.status(400).json({ error: "Invalid input" });

  // Strictly control AI system prompt
  const systemPrompt = "You are a support bot. Only answer questions about products.";
  const userPrompt = req.body.query.replace(/[{}$<>]/g, ""); // strip special chars

  callAIModel({ system: systemPrompt, user: userPrompt })
    .then(answer => res.json({ answer }))
    .catch(() => res.status(500).json({ error: "AI error" }));
});
```

### 🚫 Avoid:
```javascript
// ❌ Concatenating user input directly into system prompts
const prompt = `System: You are admin.\nUser: ${req.body.query}`;
```

---

## 3. Secure API Keys & Config

### ✅ Safe Example: Use environment variables
```bash
# .env
OPENAI_API_KEY=super-secret-key
```

```javascript
// index.js
import "dotenv/config";
const apiKey = process.env.OPENAI_API_KEY;

// Rotate keys regularly using a secrets manager
```

### 🚫 Avoid:
```javascript
// ❌ Hardcoding secrets
const apiKey = "sk-123456";
```

---

## 4. Rate Limiting & DDoS Protection

### ✅ Safe Example:
```javascript
import rateLimit from "express-rate-limit";

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 100, // limit each IP
  message: { error: "Too many requests, slow down." },
});

app.use("/api/", limiter);
```

---

## 5. Secure Database Queries (SQLi Prevention)

### ✅ Safe Example:
```javascript
// Using parameterized queries
db.query("SELECT * FROM users WHERE email = ?", [req.body.email], (err, result) => {
  if (err) return res.status(500).send("DB error");
  res.json(result);
});
```

### 🚫 Avoid:
```javascript
// ❌ Vulnerable to SQL injection
db.query(`SELECT * FROM users WHERE email = '${req.body.email}'`);
```

---

## 6. HTTPS Everywhere

### ✅ Safe Example (Node.js server forcing HTTPS):
```javascript
app.use((req, res, next) => {
  if (req.headers["x-forwarded-proto"] !== "https") {
    return res.redirect("https://" + req.headers.host + req.url);
  }
  next();
});
```

---

## 7. Logging & Monitoring

### ✅ Safe Example:
```javascript
import winston from "winston";

const logger = winston.createLogger({
  transports: [
    new winston.transports.File({ filename: "security.log" }),
  ],
});

logger.info("App started securely.");
```

---

## 8. Defense Against File Upload Attacks

### ✅ Safe Example:
```javascript
import multer from "multer";

const upload = multer({
  dest: "uploads/",
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only images allowed"), false);
    }
    cb(null, true);
  },
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB max
});
```

---

## 9. Cross-Site Scripting (XSS) Prevention

### ✅ Safe Example:
```javascript
import xss from "xss";

app.post("/comment", (req, res) => {
  const cleanComment = xss(req.body.comment);
  saveComment(cleanComment);
  res.json({ message: "Comment saved" });
});
```

---

## 10. Checklist for Each Feature
- [ ] Input validation and sanitization applied  
- [ ] Rate limiting enabled  
- [ ] No hardcoded secrets  
- [ ] All prompts sanitized before AI call  
- [ ] API keys managed via `.env` or secret store  
- [ ] Logs monitored for abuse patterns  
- [ ] File uploads restricted and validated  
- [ ] Database queries parameterized  
- [ ] HTTPS enforced  
- [ ] Escape all user-generated HTML (XSS safe)  

---
