import type { IncomingMessage, ServerResponse } from "http";
import { createApp } from "../server/app.js";

let appHandler:
  | ((req: IncomingMessage, res: ServerResponse) => void)
  | null = null;

export default async function vercelHandler(req: IncomingMessage, res: ServerResponse) {
  if (!appHandler) {
    const { app } = await createApp();
    appHandler = app as unknown as (
      req: IncomingMessage,
      res: ServerResponse,
    ) => void;
  }
  return appHandler(req, res);
}
