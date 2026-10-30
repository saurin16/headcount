import { useCallback, useEffect, useRef, useState } from "react";
import { getRun, streamUrl, type RunView } from "./api";

/** Live RunView via SSE, falling back to 2s polling. */
export function useRun(id: string) {
  const [run, setRun] = useState<RunView | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const esRef = useRef<EventSource | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const statusRef = useRef<string>("running");

  const stopPoll = () => { if (pollRef.current) clearInterval(pollRef.current); pollRef.current = null; };
  const startPoll = useCallback(() => {
    if (pollRef.current) return;
    pollRef.current = setInterval(async () => {
      try {
        const r = await getRun(id);
        setRun(r); statusRef.current = r.status;
        if (r.status === "done" || r.status === "error") stopPoll();
      } catch (e) { setErr(String(e)); }
    }, 2000);
  }, [id]);

  const connect = useCallback(() => {
    esRef.current?.close();
    const es = new EventSource(streamUrl(id));
    esRef.current = es;
    es.addEventListener("run", (ev) => {
      try {
        const r = JSON.parse((ev as MessageEvent).data) as RunView;
        setRun(r); statusRef.current = r.status;
        if (r.status === "done" || r.status === "error") es.close();
      } catch { /* ignore */ }
    });
    es.onerror = () => {
      es.close();
      if (statusRef.current !== "done" && statusRef.current !== "error") startPoll();
    };
  }, [id, startPoll]);

  useEffect(() => {
    getRun(id).then((r) => { setRun((p) => p ?? r); statusRef.current = r.status; }).catch((e) => setErr(String(e)));
    connect();
    return () => { esRef.current?.close(); stopPoll(); };
  }, [id, connect]);

  const resume = useCallback((r?: RunView) => {
    if (r) { setRun(r); statusRef.current = r.status; }
    if (!esRef.current || esRef.current.readyState === EventSource.CLOSED) { stopPoll(); connect(); }
  }, [connect]);

  return { run, err, resume };
}
