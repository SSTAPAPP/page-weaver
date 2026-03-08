import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, X, RefreshCw } from "lucide-react";

interface UpdateInfo {
  version: string;
  body: string;
}

export function UpdateChecker() {
  const [updateAvailable, setUpdateAvailable] = useState<UpdateInfo | null>(null);
  const [installing, setInstalling] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    checkForUpdates();
  }, []);

  async function checkForUpdates() {
    try {
      // Only run in Tauri environment
      if (!(window as any).__TAURI__) return;

      const { checkUpdate } = await import("@tauri-apps/api/updater");
      const { shouldUpdate, manifest } = await checkUpdate();

      if (shouldUpdate && manifest) {
        setUpdateAvailable({
          version: manifest.version,
          body: manifest.body || "新版本已发布",
        });
      }
    } catch (e) {
      console.log("Update check skipped:", e);
    }
  }

  async function installUpdate() {
    try {
      setInstalling(true);
      const { installUpdate } = await import("@tauri-apps/api/updater");
      const { relaunch } = await import("@tauri-apps/api/process");
      await installUpdate();
      await relaunch();
    } catch (e) {
      console.error("Update failed:", e);
      setInstalling(false);
    }
  }

  if (!updateAvailable || dismissed) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm rounded-lg border border-border bg-card p-4 shadow-lg animate-in slide-in-from-bottom-4">
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <Download className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-card-foreground">
            发现新版本 v{updateAvailable.version}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
            {updateAvailable.body}
          </p>
          <div className="mt-3 flex gap-2">
            <Button
              size="sm"
              onClick={installUpdate}
              disabled={installing}
              className="h-7 text-xs gap-1.5"
            >
              {installing ? (
                <>
                  <RefreshCw className="h-3 w-3 animate-spin" />
                  更新中…
                </>
              ) : (
                "立即更新"
              )}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setDismissed(true)}
              className="h-7 text-xs text-muted-foreground"
            >
              稍后
            </Button>
          </div>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="text-muted-foreground/50 hover:text-muted-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
