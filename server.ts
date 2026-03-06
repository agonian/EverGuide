import express from 'express';
import { createServer as createViteServer } from 'vite';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Increase payload limit for base64 images
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // Ensure uploads directory exists
  const uploadDir = path.join(__dirname, 'public', 'uploads');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  // API Route for Image Upload
  app.post('/api/upload-image', (req, res) => {
    try {
      const { image, slug } = req.body;
      
      if (!image || !slug) {
        return res.status(400).json({ error: 'Image and slug are required' });
      }

      // Remove header if present (data:image/png;base64,...)
      const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
      const buffer = Buffer.from(base64Data, 'base64');
      
      const fileName = `${slug}-${Date.now()}.png`;
      const filePath = path.join(uploadDir, fileName);

      fs.writeFileSync(filePath, buffer);

      // Return the URL
      // In dev (Vite), public folder is root. In prod, it's copied.
      // We'll return a relative path that works for both if configured correctly.
      const imageUrl = `/uploads/${fileName}`;
      
      res.json({ success: true, url: imageUrl });
    } catch (error) {
      console.error('Image upload failed:', error);
      res.status(500).json({ error: 'Failed to upload image' });
    }
  });

  // Serve uploads statically (for production or if Vite doesn't catch it)
  app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));

  if (process.env.NODE_ENV !== 'production') {
    // Vite middleware for development
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production static file serving
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
