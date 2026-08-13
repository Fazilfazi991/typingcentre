"use client";

import { useEffect, useRef, useState } from "react";
import { DashboardHeader, type DashboardHeaderIdentity, type DemoHeaderCommand } from "@/components/dashboard-header";

type DemoStateMessage = { type: "noteit:demo-state"; identity: DashboardHeaderIdentity } | { type: "noteit:demo-logout" };

export function DemoWorkspace() {
  const frame = useRef<HTMLIFrameElement>(null);
  const [identity, setIdentity] = useState<DashboardHeaderIdentity | null>(null);

  useEffect(() => {
    const receive = (event: MessageEvent<DemoStateMessage>) => {
      if (event.origin !== window.location.origin || event.source !== frame.current?.contentWindow) return;
      if (event.data?.type === "noteit:demo-state") setIdentity(event.data.identity);
      if (event.data?.type === "noteit:demo-logout") setIdentity(null);
    };
    window.addEventListener("message", receive);
    return () => window.removeEventListener("message", receive);
  }, []);

  useEffect(() => {
    if (identity) return;
    const requestState = () => frame.current?.contentWindow?.postMessage({ type: "noteit:demo-request-state" }, window.location.origin);
    requestState();
    const retry = window.setInterval(requestState, 500);
    return () => window.clearInterval(retry);
  }, [identity]);

  const send = (command: DemoHeaderCommand) => frame.current?.contentWindow?.postMessage({ type: "noteit:demo-command", command }, window.location.origin);

  return <main className={`demo-workspace${identity ? " demo-workspace-active" : ""}`}>
    {identity && <DashboardHeader {...identity} demo onDemoCommand={send} />}
    <iframe ref={frame} name="demo-workspace" title="Note It demo workspace" src="/legacy-prototype/index.html?embedded=1" className="demo-workspace-frame" onLoad={() => frame.current?.contentWindow?.postMessage({ type: "noteit:demo-request-state" }, window.location.origin)} />
  </main>;
}
