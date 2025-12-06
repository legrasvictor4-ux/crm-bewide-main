import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // In a real implementation, you would process the message here
    // For now, we'll just return a mock response
    const mockResponses = [
      "Je suis votre assistant commercial. Comment puis-je vous aider aujourd'hui ?",
      "Je peux vous aider à générer des messages de prospection ou répondre à vos questions.",
      "Avez-vous besoin d'aide pour rédiger un email de suivi ?",
      "Je peux vous aider à analyser vos leads et à prioriser vos actions.",
      "N'hésitez pas à me poser des questions sur vos clients ou vos ventes."
    ];
    
    const randomResponse = mockResponses[Math.floor(Math.random() * mockResponses.length)];
    
    return res.status(200).json({
      reply: randomResponse
    });
  } catch (error) {
    console.error('Error in chat API:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
