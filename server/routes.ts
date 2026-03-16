import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { Ollama } from "ollama";

const ollama = new Ollama({ host: 'http://localhost:11434' });

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // prefix all routes with /api
  
  // --- Mind map CRUD ---
  app.get("/api/maps", async (_req, res) => {
    try {
      const list = await storage.listMindMaps();
      res.json(list);
    } catch (error) {
      console.error("List maps error:", error);
      res.status(500).json({ message: "Failed to list mind maps" });
    }
  });

  app.get("/api/maps/:id", async (req, res) => {
    try {
      const map = await storage.getMindMap(req.params.id);
      if (!map) {
        return res.status(404).json({ message: "Mind map not found" });
      }
      res.json(map);
    } catch (error) {
      console.error("Get map error:", error);
      res.status(500).json({ message: "Failed to load mind map" });
    }
  });

  app.post("/api/maps", async (req, res) => {
    try {
      const { title, nodes = [], edges = [] } = req.body ?? {};
      const map = await storage.createMindMap({ title, nodes, edges });
      if (!map?.id) {
        console.error("Create map: storage returned map without id", map);
        return res.status(500).json({ message: "Failed to create mind map (no id returned)" });
      }
      res.status(201).setHeader("Content-Type", "application/json").json(map);
    } catch (error) {
      console.error("Create map error:", error);
      res.status(500).json({ message: "Failed to create mind map" });
    }
  });

  app.put("/api/maps/:id", async (req, res) => {
    try {
      const { title, nodes, edges } = req.body ?? {};
      if (!nodes || !edges) {
        return res.status(400).json({ message: "nodes and edges are required" });
      }
      const map = await storage.updateMindMap(req.params.id, { title, nodes, edges });
      if (!map) {
        return res.status(404).json({ message: "Mind map not found" });
      }
      res.json(map);
    } catch (error) {
      console.error("Update map error:", error);
      res.status(500).json({ message: "Failed to save mind map" });
    }
  });

  app.delete("/api/maps/:id", async (req, res) => {
    try {
      await storage.deleteMindMap(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Delete map error:", error);
      res.status(500).json({ message: "Failed to delete mind map" });
    }
  });

  app.post("/api/generate-map", async (req, res) => {
    try {
      const { prompt } = req.body;
      
      if (!prompt) {
        return res.status(400).json({ message: "Prompt is required" });
      }

      const systemPrompt = `You are an expert mind map generator. Transform the user's prompt into a JSON structure representing nodes and edges for a mind map diagram.
Output strictly valid JSON with no markdown formatting or extra text.
The JSON must have this exact structure:
{
  "nodes": [
    {
      "id": "root", // Use string IDs
      "type": "custom",
      "position": { "x": 400, "y": 300 }, // Keep root centered
      "data": { "label": "ROOT_TOPIC", "isRoot": true, "description": "Short description" }
    },
    {
      "id": "child1",
      "type": "custom",
      "position": { "x": number, "y": number }, // Spread nodes out nicely around the root (e.g. x: 100-700, y: 100-500)
      "data": { "label": "Subtopic Name", "description": "Optional details" }
    }
  ],
  "edges": [
    {
      "id": "e_root-child1",
      "source": "root",
      "target": "child1"
    }
  ]
}
Generate 5 to 10 nodes capturing the essence of the prompt.
`;

      const response = await ollama.chat({
        model: 'llama3.1:latest',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        format: 'json',
      });

      let mindMapData;
      try {
        mindMapData = JSON.parse(response.message.content);
        
        // Ensure x, y coordinates exist or provide fallbacks if LLM forgets
        mindMapData.nodes = mindMapData.nodes.map((n: any, i: number) => ({
          ...n,
          position: n.position || { 
            x: 400 + Math.cos(i) * 200, 
            y: 300 + Math.sin(i) * 200 
          }
        }));

      } catch (e) {
        console.error("Failed to parse Ollama response as JSON:", response.message.content);
        throw new Error("Invalid output format from LLM");
      }

      res.json(mindMapData);

    } catch (error) {
      console.error("Generation error:", error);
      res.status(500).json({ message: "Failed to generate mind map" });
    }
  });

  return httpServer;
}
