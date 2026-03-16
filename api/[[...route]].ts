import serverless from "serverless-http";
import { createApp } from "../server/app";

let handler: ReturnType<typeof serverless> | null = null;

export default async function vercelHandler(req: unknown, res: unknown) {
  if (!handler) {
    const { app } = await createApp();
    handler = serverless(app);
  }
  return handler(req, res);
}
