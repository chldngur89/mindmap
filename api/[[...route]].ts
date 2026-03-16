import type { IncomingMessage, ServerResponse } from "http";
import serverless from "serverless-http";
import { createApp } from "../server/app.js";

let handler: ((req: IncomingMessage, res: ServerResponse) => Promise<void>) | null = null;

export default async function vercelHandler(req: IncomingMessage, res: ServerResponse) {
  if (!handler) {
    const { app } = await createApp();
    handler = serverless(app) as unknown as (req: IncomingMessage, res: ServerResponse) => Promise<void>;
  }
  return handler(req, res);
}
