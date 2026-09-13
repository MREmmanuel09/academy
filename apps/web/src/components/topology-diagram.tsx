'use client';

import type { Topology } from '@academy/content';
import { useRef, useState } from 'react';

interface TopologyDiagramProps {
  topology: Topology;
  className?: string;
}

const DEVICE_ICONS: Record<string, { path: string; color: string; label: string }> = {
  router: {
    path: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z',
    color: '#3b82f6',
    label: 'Router',
  },
  switch: {
    path: 'M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z',
    color: '#22c55e',
    label: 'Switch',
  },
  pc: {
    path: 'M21 2H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h7l-2 3v1h8v-1l-2-3h7c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 12H3V4h18v10z',
    color: '#a855f7',
    label: 'PC',
  },
  server: {
    path: 'M2 2h20v6H2zm0 8h20v2H2zm0 4h20v6H2zm2 2v2h4v-2zm6 0v2h4v-2zm6 0v2h4v-2z',
    color: '#f59e0b',
    label: 'Server',
  },
  firewall: {
    path: 'M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z',
    color: '#ef4444',
    label: 'Firewall',
  },
  cloud: {
    path: 'M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z',
    color: '#06b6d4',
    label: 'Cloud',
  },
};

function DeviceIcon({ type, x, y }: { type: string; x: number; y: number }) {
  const fallback = { path: '', color: '#6b7280', label: type };
  const icon = DEVICE_ICONS[type] ?? fallback;
  const pathD = icon.path;
  const iconColor = icon.color;
  return (
    <g transform={`translate(${x - 20}, ${y - 20})`}>
      <circle cx="20" cy="20" r="22" fill={`${iconColor}15`} stroke={iconColor} strokeWidth="2" />
      <g transform="translate(4, 4) scale(0.67)">
        <path d={pathD} fill={iconColor} />
      </g>
      <text
        x="20"
        y="52"
        textAnchor="middle"
        className="fill-muted-foreground text-[10px] font-medium"
      >
        {type.toUpperCase()}
      </text>
    </g>
  );
}

export function TopologyDiagram({ topology, className }: TopologyDiagramProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hovered, setHovered] = useState<string | null>(null);

  if (!topology.devices.length) return null;

  // Calculate bounding box
  const xs = topology.devices.map((d) => d.x);
  const ys = topology.devices.map((d) => d.y);
  const minX = Math.min(...xs) - 60;
  const maxX = Math.max(...xs) + 60;
  const minY = Math.min(...ys) - 60;
  const maxY = Math.max(...ys) + 80;
  const width = maxX - minX;
  const height = maxY - minY;

  const deviceMap = new Map(topology.devices.map((d) => [d.name, d]));

  return (
    <div className={`rounded-lg border border-border bg-card p-4 ${className ?? ''}`}>
      <h3 className="mb-3 text-sm font-semibold text-muted-foreground">Network Topology</h3>
      <svg
        ref={svgRef}
        viewBox={`${minX} ${minY} ${width} ${height}`}
        className="w-full"
        style={{ maxHeight: 300 }}
        role="img"
        aria-label="Network topology diagram"
      >
        <title>Network topology</title>
        {/* Links */}
        {topology.links.map((link, i) => {
          const from = deviceMap.get(link.from);
          const to = deviceMap.get(link.to);
          if (!from || !to) return null;
          const isHovered = hovered === link.from || hovered === link.to;
          return (
            // biome-ignore lint/suspicious/noArrayIndexKey: links have no ids; order is static content
            <g key={`link-${i}`}>
              <line
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                stroke={isHovered ? '#3b82f6' : '#94a3b8'}
                strokeWidth={isHovered ? 3 : 2}
                strokeDasharray={isHovered ? undefined : '6 3'}
                className="transition-all duration-200"
              />
              {link.label ? (
                <text
                  x={(from.x + to.x) / 2}
                  y={(from.y + to.y) / 2 - 8}
                  textAnchor="middle"
                  className="fill-muted-foreground text-[9px]"
                >
                  {link.label}
                </text>
              ) : null}
            </g>
          );
        })}

        {/* Devices */}
        {topology.devices.map((device) => (
          <g
            key={device.name}
            onMouseEnter={() => setHovered(device.name)}
            onMouseLeave={() => setHovered(null)}
            className="cursor-pointer"
          >
            <DeviceIcon type={device.type} x={device.x} y={device.y} />
            <text
              x={device.x}
              y={device.y + 66}
              textAnchor="middle"
              className="fill-foreground text-[11px] font-semibold"
            >
              {device.name}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
