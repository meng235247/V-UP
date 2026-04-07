const express = require('express');
const path = require('path');
const app = express();
const port = 3000;

// Serve static files from the current directory
app.use(express.static(__dirname));

// Fallback for SPA-like behavior if needed (Optional)
app.get('*', (req, res, next) => {
    if (req.path.includes('.')) return next();
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(port, () => {
    console.log(`\n🚀 V-Up! SaaS Dashboard is running!`);
    console.log(`🔗 Local URL: http://localhost:${port}/index.html`);
    console.log(`📂 Environment: Modern Firebase Architecture\n`);
});
