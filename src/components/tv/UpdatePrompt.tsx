import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { APK_URL, installedBuild, isOutdated, latestBuild } from "@/lib/update";

// Asks customers with an old APK to install the new one (installs over the old app).
export function UpdatePrompt() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    let live = true;
    (async () => {
      const mine = await installedBuild();
      if (mine === null) return;
      const latest = await latestBuild().catch(() => 0);
      if (live && isOutdated(mine, latest)) setShow(true);
    })();
    return () => { live = false; };
  }, []);
  if (!show) return null;
  const btn = "rounded-full px-6 py-2.5 text-sm font-bold outline-none focus:ring-4 focus:ring-primary";
  return (
    <div className="dark fixed inset-0 z-[60] flex text-foreground items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-3xl border border-primary/40 bg-card p-6 text-center shadow-2xl">
        <Download className="mx-auto h-10 w-10 text-primary" />
        <h2 className="mt-3 text-lg font-extrabold">Nova versão disponível</h2>
        <p className="mt-2 text-sm text-muted-foreground">Toque em Atualizar, baixe e instale. O app é atualizado sem precisar desinstalar.</p>
        <div className="mt-5 flex justify-center gap-3">
          <button data-nav autoFocus onClick={() => { window.location.href = APK_URL; }} className={`${btn} bg-primary text-primary-foreground`}>Atualizar</button>
          <button data-nav onClick={() => setShow(false)} className={`${btn} bg-muted`}>Depois</button>
        </div>
      </div>
    </div>
  );
}
