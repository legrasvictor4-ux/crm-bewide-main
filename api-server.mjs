import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Mock API endpoint
app.post('/api/chat', (req, res) => {
  const mockResponses = [
    "Je suis votre assistant commercial. Comment puis-je vous aider aujourd'hui ?",
    "Je peux vous aider à générer des messages de prospection ou répondre à vos questions.",
    "Avez-vous besoin d'aide pour rédiger un email de suivi ?",
    "Je peux vous aider à analyser vos leads et à prioriser vos actions.",
    "N'hésitez pas à me poser des questions sur vos clients ou vos ventes."
  ];
  
  const randomResponse = mockResponses[Math.floor(Math.random() * mockResponses.length)];
  
  // Simulate a small delay
  setTimeout(() => {
    res.json({
      reply: randomResponse
    });
  }, 500);
});

// Start server
app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
});
