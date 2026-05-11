import { useEffect, useState } from "react";
import { Link } from "wouter";
import { BrainCircuit, FilePlus, HardDriveDownload, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useListMaps } from "@/hooks/use-maps";
import { formatDistanceToNow } from "date-fns";
import {
  clearLocalMindMapDraft,
  listLocalMindMapDrafts,
  type LocalMindMapDraft,
} from "@/lib/local-draft";

export default function MapList() {
  const { data: maps, isLoading, isError, error } = useListMaps();
  const [localDrafts, setLocalDrafts] = useState<LocalMindMapDraft[]>([]);
  const unsavedDrafts = localDrafts.filter((draft) => !draft.mapId);

  useEffect(() => {
    setLocalDrafts(listLocalMindMapDrafts());
  }, []);

  const handleDeleteLocalDraft = () => {
    clearLocalMindMapDraft(null);
    setLocalDrafts(listLocalMindMapDrafts());
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="h-14 border-b bg-background/80 backdrop-blur-md flex items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <div className="bg-primary text-primary-foreground p-1.5 rounded-lg shadow-sm">
            <BrainCircuit className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-semibold text-sm leading-none">Brainstorming Canvas</h1>
            <p className="text-[11px] text-muted-foreground leading-none">저장된 마인드맵</p>
          </div>
        </div>
      </header>

      <main className="flex-1 p-6 max-w-2xl mx-auto w-full">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-medium text-foreground">내 맵 목록</h2>
          <Button size="sm" asChild>
            <Link href="/new">
              <FilePlus className="h-4 w-4 mr-2" />
              새 맵 만들기
            </Link>
          </Button>
        </div>

        {unsavedDrafts.length > 0 && (
          <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50/70 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <HardDriveDownload className="h-4 w-4 text-emerald-700" />
                <h3 className="text-sm font-medium text-emerald-900">
                  이어쓰기
                </h3>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-emerald-900 hover:bg-emerald-100"
                onClick={handleDeleteLocalDraft}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                삭제
              </Button>
            </div>
            <ul className="space-y-2">
              {unsavedDrafts.slice(0, 1).map((draft) => {
                const href = draft.mapId ? `/map/${draft.mapId}` : "/new";

                return (
                  <li key={`${draft.mapId ?? "new"}-${draft.savedAt}`}>
                    <Link href={href}>
                      <a className="block rounded-lg border border-emerald-200 bg-white px-4 py-3 transition-colors hover:bg-emerald-50">
                        <p className="font-medium text-foreground">
                          {draft.title || "제목 없는 로컬 저장본"}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(draft.savedAt), {
                            addSuffix: true,
                          })} · 노드 {draft.nodes.length}개
                        </p>
                      </a>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {isLoading && (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            목록 불러오는 중…
          </div>
        )}

        {isError && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive space-y-1">
            <p className="font-medium">목록을 불러오지 못했습니다.</p>
            <p className="text-xs opacity-90">{error?.message}</p>
            <p className="text-xs mt-2">Vercel 환경 변수(SUPABASE_URL, SUPABASE_ANON_KEY)와 Supabase RLS 정책을 확인하세요.</p>
          </div>
        )}

        {!isLoading && !isError && (!maps || maps.length === 0) && (
          <div className="rounded-xl border border-dashed border-muted-foreground/30 bg-muted/30 p-12 text-center">
            <p className="text-muted-foreground text-sm mb-4">저장된 맵이 없습니다.</p>
            <Button asChild>
              <Link href="/new">
                <FilePlus className="h-4 w-4 mr-2" />
                새 맵 만들기
              </Link>
            </Button>
          </div>
        )}

        {!isLoading && !isError && maps && maps.length > 0 && (
          <ul className="space-y-3">
            {maps.map((map) => (
              <li key={map.id}>
                <Link href={`/map/${map.id}`}>
                  <a className="block rounded-lg border bg-card p-4 hover:bg-muted/50 hover:border-primary/30 transition-colors text-left">
                    <p className="font-medium text-foreground truncate">
                      {map.title || "제목 없음"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(map.updatedAt), { addSuffix: true })}
                    </p>
                  </a>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
