import type { Express } from "express";
import { createServer, type Server } from "http";
import { getSupabase, getSupabaseEnvStatus } from "./supabase.js";
import { getStorage } from "./storage.js";

const ollamaHost = process.env.OLLAMA_HOST ?? "http://localhost:11434";
let ollamaClientPromise: Promise<{
  chat: (options: {
    model: string;
    messages: Array<{ role: string; content: string }>;
    format: string;
  }) => Promise<{ message: { content: string } }>;
}> | null = null;

async function getOllamaClient() {
  if (!ollamaClientPromise) {
    ollamaClientPromise = import("ollama").then(
      ({ Ollama }) => new Ollama({ host: ollamaHost }),
    );
  }

  return ollamaClientPromise;
}

function getErrorMessage(error: unknown, fallback: string): string {
  const message = error instanceof Error ? error.message : fallback;

  if (/row-level security|permission denied/i.test(message)) {
    return `${message} Add SUPABASE_SERVICE_ROLE_KEY in Vercel or update the RLS policy for anon access.`;
  }

  return message;
}

function sendMissingSupabaseEnv(res: Express["response"], action: string) {
  const status = getSupabaseEnvStatus();
  console.error("[Vercel] Supabase env check:", status);

  return res.status(503).json({
    message: `Failed to ${action}`,
    error:
      "SUPABASE_URL and either SUPABASE_SERVICE_ROLE_KEY (recommended) or SUPABASE_ANON_KEY must be set in Vercel Environment Variables. Redeploy after saving.",
    debug: status,
  });
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // prefix all routes with /api
  
  // --- Mind map CRUD ---
  app.get("/api/maps", async (_req, res) => {
    try {
      const supabaseClient = getSupabase();
      if (process.env.VERCEL && !supabaseClient) {
        return sendMissingSupabaseEnv(res, "list mind maps");
      }
      const list = await getStorage().listMindMaps();
      res.json(list);
    } catch (error) {
      const message = getErrorMessage(error, "Failed to list mind maps");
      console.error("List maps error:", message, error);
      res.status(500).json({
        message: "Failed to list mind maps",
        error: message,
      });
    }
  });

  app.get("/api/maps/:id", async (req, res) => {
    try {
      if (process.env.VERCEL && !getSupabase()) {
        return sendMissingSupabaseEnv(res, "load mind map");
      }
      const map = await getStorage().getMindMap(req.params.id);
      if (!map) {
        return res.status(404).json({ message: "Mind map not found" });
      }
      res.json(map);
    } catch (error) {
      const message = getErrorMessage(error, "Failed to load mind map");
      console.error("Get map error:", message, error);
      res.status(500).json({ message: "Failed to load mind map", error: message });
    }
  });

  app.post("/api/maps", async (req, res) => {
    try {
      if (process.env.VERCEL && !getSupabase()) {
        return sendMissingSupabaseEnv(res, "create mind map");
      }
      const { title, nodes = [], edges = [] } = req.body ?? {};
      const map = await getStorage().createMindMap({ title, nodes, edges });
      if (!map?.id) {
        console.error("Create map: storage returned map without id", map);
        return res.status(500).json({ message: "Failed to create mind map (no id returned)" });
      }
      res.status(201).setHeader("Content-Type", "application/json").json(map);
    } catch (error) {
      const message = getErrorMessage(error, "Failed to create mind map");
      console.error("Create map error:", message, error);
      res.status(500).json({ message: "Failed to create mind map", error: message });
    }
  });

  app.put("/api/maps/:id", async (req, res) => {
    try {
      if (process.env.VERCEL && !getSupabase()) {
        return sendMissingSupabaseEnv(res, "save mind map");
      }
      const { title, nodes, edges } = req.body ?? {};
      if (!nodes || !edges) {
        return res.status(400).json({ message: "nodes and edges are required" });
      }
      const map = await getStorage().updateMindMap(req.params.id, { title, nodes, edges });
      if (!map) {
        return res.status(404).json({ message: "Mind map not found" });
      }
      res.json(map);
    } catch (error) {
      const message = getErrorMessage(error, "Failed to save mind map");
      console.error("Update map error:", message, error);
      res.status(500).json({ message: "Failed to save mind map", error: message });
    }
  });

  app.delete("/api/maps/:id", async (req, res) => {
    try {
      if (process.env.VERCEL && !getSupabase()) {
        return sendMissingSupabaseEnv(res, "delete mind map");
      }
      await getStorage().deleteMindMap(req.params.id);
      res.status(204).send();
    } catch (error) {
      const message = getErrorMessage(error, "Failed to delete mind map");
      console.error("Delete map error:", message, error);
      res.status(500).json({ message: "Failed to delete mind map", error: message });
    }
  });

  app.post("/api/generate-map", async (req, res) => {
    try {
      if (process.env.VERCEL && ollamaHost.includes("localhost")) {
        return res.status(503).json({
          message: "AI generation is unavailable on this Vercel deployment",
          error:
            "This route is configured to call a local Ollama server at http://localhost:11434. Vercel Serverless Functions cannot reach that local process. Run locally or set OLLAMA_HOST to a reachable remote Ollama server.",
        });
      }

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

      const ollama = await getOllamaClient();
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
      const message = getErrorMessage(error, "Failed to generate mind map");
      console.error("Generation error:", message, error);
      res.status(500).json({ message: "Failed to generate mind map", error: message });
    }
  });

  return httpServer;
}
