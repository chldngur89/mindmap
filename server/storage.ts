import type { SupabaseClient } from "@supabase/supabase-js";
import { type User, type InsertUser } from "@shared/schema";
import { randomUUID } from "crypto";
import { getSupabase } from "./supabase";

export interface MindMapData {
  id: string;
  title?: string;
  nodes: unknown[];
  edges: unknown[];
  updatedAt: string;
}

export interface MindMapListItem {
  id: string;
  title?: string;
  updatedAt: string;
}

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getMindMap(id: string): Promise<MindMapData | undefined>;
  listMindMaps(): Promise<MindMapListItem[]>;
  createMindMap(data: { title?: string; nodes: unknown[]; edges: unknown[] }): Promise<MindMapData>;
  updateMindMap(id: string, data: { title?: string; nodes: unknown[]; edges: unknown[] }): Promise<MindMapData | undefined>;
  deleteMindMap(id: string): Promise<boolean>;
}

/** Supabase row: DB columns are snake_case (updated_at) */
function supabaseRowToMindMapData(row: {
  id: string | unknown;
  title: string | null;
  nodes: unknown;
  edges: unknown;
  updated_at: string;
}): MindMapData {
  return {
    id: String(row.id),
    title: row.title ?? undefined,
    nodes: (row.nodes as unknown[]) ?? [],
    edges: (row.edges as unknown[]) ?? [],
    updatedAt: row.updated_at ?? new Date().toISOString(),
  };
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private mindMaps: Map<string, MindMapData>;

  constructor() {
    this.users = new Map();
    this.mindMaps = new Map();
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getMindMap(id: string): Promise<MindMapData | undefined> {
    return this.mindMaps.get(id);
  }

  async listMindMaps(): Promise<MindMapListItem[]> {
    return Array.from(this.mindMaps.values()).map((m) => ({
      id: m.id,
      title: m.title,
      updatedAt: m.updatedAt,
    }));
  }

  async createMindMap(data: { title?: string; nodes: unknown[]; edges: unknown[] }): Promise<MindMapData> {
    const id = randomUUID();
    const map: MindMapData = {
      id,
      title: data.title,
      nodes: data.nodes,
      edges: data.edges,
      updatedAt: new Date().toISOString(),
    };
    this.mindMaps.set(id, map);
    return map;
  }

  async updateMindMap(id: string, data: { title?: string; nodes: unknown[]; edges: unknown[] }): Promise<MindMapData | undefined> {
    const existing = this.mindMaps.get(id);
    if (!existing) return undefined;
    const updated: MindMapData = {
      ...existing,
      ...(data.title !== undefined && { title: data.title }),
      nodes: data.nodes,
      edges: data.edges,
      updatedAt: new Date().toISOString(),
    };
    this.mindMaps.set(id, updated);
    return updated;
  }

  async deleteMindMap(id: string): Promise<boolean> {
    return this.mindMaps.delete(id);
  }
}

export class SupabaseStorage implements IStorage {
  constructor(private client: SupabaseClient) {}

  async getUser(_id: string): Promise<User | undefined> {
    return undefined;
  }

  async getUserByUsername(_username: string): Promise<User | undefined> {
    return undefined;
  }

  async createUser(_insertUser: InsertUser): Promise<User> {
    throw new Error("SupabaseStorage: createUser not implemented");
  }

  async getMindMap(id: string): Promise<MindMapData | undefined> {
    const { data, error } = await this.client
      .from("mind_maps")
      .select()
      .eq("id", id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return undefined;
    return supabaseRowToMindMapData(data);
  }

  async listMindMaps(): Promise<MindMapListItem[]> {
    const { data, error } = await this.client
      .from("mind_maps")
      .select("id, title, updated_at")
      .order("updated_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return (data ?? []).map((row: { id: string; title: string | null; updated_at: string }) => ({
      id: String(row.id),
      title: row.title ?? undefined,
      updatedAt: row.updated_at,
    }));
  }

  async createMindMap(data: { title?: string; nodes: unknown[]; edges: unknown[] }): Promise<MindMapData> {
    const { data: raw, error } = await this.client
      .from("mind_maps")
      .insert({
        title: data.title ?? null,
        nodes: data.nodes,
        edges: data.edges,
      })
      .select("id, title, nodes, edges, updated_at");
    if (error) throw new Error(error.message);
    const row = Array.isArray(raw) ? raw[0] : raw;
    if (!row || (typeof row === "object" && !("id" in row))) {
      throw new Error("Failed to create mind map: Supabase returned no row (check RLS: anon needs INSERT and SELECT)");
    }
    return supabaseRowToMindMapData(row as { id: string; title: string | null; nodes: unknown; edges: unknown; updated_at: string });
  }

  async updateMindMap(id: string, data: { title?: string; nodes: unknown[]; edges: unknown[] }): Promise<MindMapData | undefined> {
    const { data: row, error } = await this.client
      .from("mind_maps")
      .update({
        title: data.title ?? null,
        nodes: data.nodes,
        edges: data.edges,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) return undefined;
    return supabaseRowToMindMapData(row);
  }

  async deleteMindMap(id: string): Promise<boolean> {
    const { error } = await this.client.from("mind_maps").delete().eq("id", id);
    if (error) throw new Error(error.message);
    return true;
  }
}

let _storage: IStorage | null = null;

/** 요청 시점에 storage 반환 (Vercel에서 env가 런타임에만 주입되도록) */
export function getStorage(): IStorage {
  if (!_storage) {
    const client = getSupabase();
    _storage = client ? new SupabaseStorage(client) : new MemStorage();
  }
  return _storage;
}
