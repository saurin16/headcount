import { useEffect, useMemo, useState } from "react";
import { geoAlbersUsa, geoPath } from "d3-geo";
import { feature, mesh } from "topojson-client";
import { motion } from "framer-motion";

interface Pt { metro: string; lat: number; lon: number; percentile: number; rank: number }

const W = 960, H = 600;

export function DemandMap({ points, target }: { points: Pt[]; target: string | null }) {
  const [paths, setPaths] = useState<{ nation: string; states: string } | null>(null);
  const projection = useMemo(() => geoAlbersUsa().scale(1280).translate([W / 2, H / 2]), []);

  useEffect(() => {
    let alive = true;
    fetch("https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json")
      .then((r) => r.json())
      .then((topo: any) => {
        if (!alive) return;
        const p = geoPath(projection);
        const nation = p(feature(topo, topo.objects.nation) as any) ?? "";
        const states = p(mesh(topo, topo.objects.states, (a: any, b: any) => a !== b) as any) ?? "";
        setPaths({ nation, states });
      })
      .catch(() => {});
    return () => { alive = false; };
  }, [projection]);

  const pts = points
    .map((p) => ({ ...p, xy: projection([p.lon, p.lat]) }))
    .filter((p) => p.xy)
    .sort((a, b) => a.percentile - b.percentile);
  const tgt = pts.find((p) => p.metro === target);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="US demand map">
      {paths && (
        <>
          <path d={paths.nation} className="fill-secondary" />
          <path d={paths.states} fill="none" className="stroke-border" strokeWidth={1} />
        </>
      )}
      {pts.map((p, i) => {
        const t = p.percentile / 100;
        return (
          <motion.circle
            key={p.metro}
            cx={p.xy![0]} cy={p.xy![1]}
            initial={{ r: 0, opacity: 0 }}
            animate={{ r: 3 + t * 11, opacity: 0.35 + t * 0.6 }}
            transition={{ delay: i * 0.008, duration: 0.4 }}
            style={{ fill: `color-mix(in oklab, var(--amber) ${Math.round(t * 100)}%, var(--magenta))` }}
          >
            <title>{`${p.metro}: ${p.percentile}th pct · rank ${p.rank}`}</title>
          </motion.circle>
        );
      })}
      {tgt && (
        <g>
          <motion.circle
            cx={tgt.xy![0]} cy={tgt.xy![1]} fill="none" strokeWidth={3}
            style={{ stroke: "var(--foreground)" }}
            animate={{ r: [14, 34], opacity: [1, 0] }}
            transition={{ repeat: Infinity, duration: 1.6 }}
          />
          <circle cx={tgt.xy![0]} cy={tgt.xy![1]} r={9} style={{ fill: "var(--foreground)" }} />
          <text x={tgt.xy![0]} y={tgt.xy![1] - 22} textAnchor="middle" className="font-display" fontSize={34} style={{ fill: "var(--foreground)", paintOrder: "stroke", stroke: "var(--ink)", strokeWidth: 6 }}>
            {tgt.metro}
          </text>
        </g>
      )}
    </svg>
  );
}
