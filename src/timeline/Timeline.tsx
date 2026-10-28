import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { currentMonth, formatMonth } from '../data/months';
import type { Role, TimelineDoc } from '../data/schema';
import { HatchDefs } from './hatches';
import { useLabelMeasurer } from './labelMeasure';
import { fitPxPerMonth, GEOMETRY, layoutTimeline } from './layout';
import { EventDot, Pill, SidecarBand } from './Pill';
import { pillSwatches, swatchForThread, UNTHREADED } from './palettes';
import './timeline.css';

const roleLabel = (role: Role) =>
  `${role.title || 'Untitled role'}${role.company ? ` · ${role.company}` : ''} · ${formatMonth(role.start)} – ${formatMonth(role.end)}`;

export interface TimelineProps {
  doc: TimelineDoc;
  /** 1 = the whole career fits the width; higher zooms in. */
  zoom?: number;
  now?: string;
}

/** Below this the pills get too thin to read; the timeline scrolls instead. */
const MIN_PX_PER_MONTH = 1.6;
const MAX_PX_PER_MONTH = 24;

export function Timeline({ doc, zoom = 1, now = currentMonth() }: TimelineProps) {
  const showTitles = doc.settings.showTitles;
  const scroller = useRef<HTMLDivElement>(null);
  const [viewW, setViewW] = useState(0);
  useLayoutEffect(() => {
    const el = scroller.current;
    if (!el) return;
    setViewW(el.clientWidth);
    const ro = new ResizeObserver(() => setViewW(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const measure = useLabelMeasurer();
  const fit = viewW ? fitPxPerMonth(doc, now, viewW) : 0;
  const pxPerMonth = Math.min(MAX_PX_PER_MONTH, Math.max(MIN_PX_PER_MONTH, fit) * zoom);
  const layout = useMemo(
    () => layoutTimeline(doc, { pxPerMonth, showTitles, measure, now }),
    [doc, pxPerMonth, showTitles, now, measure],
  );

  // Open at the present. While the person hasn't scrolled away, stay pinned
  // there; after they have, keep the same point in time centred when zooming.
  const pinned = useRef(true);
  const lastWidth = useRef(0);
  useLayoutEffect(() => {
    const el = scroller.current;
    if (!el || !viewW) return;
    const prev = lastWidth.current;
    if (pinned.current || !prev) el.scrollLeft = el.scrollWidth;
    else {
      const centre = (el.scrollLeft + el.clientWidth / 2) / prev;
      el.scrollLeft = Math.max(0, centre * layout.width - el.clientWidth / 2);
    }
    lastWidth.current = layout.width;
  }, [layout.width, viewW]);
  const onScroll = () => {
    const el = scroller.current;
    if (el) pinned.current = el.scrollLeft + el.clientWidth >= el.scrollWidth - 2;
  };

  const yearStep = pxPerMonth * 12 >= 40 ? 1 : 2;
  const swatchesOf = (r: Role) => pillSwatches(doc, r.threads);

  return (
    <div className="tl-scroll" ref={scroller} onScroll={onScroll}>
      <HatchDefs />
      {viewW > 0 && (
        <div className="tl-stage" style={{ width: layout.width, height: layout.height }}>
          {layout.years.map(({ year, x }) => (
            <span key={year} className="tl-grid" style={{ left: x }} />
          ))}
          {layout.years
            .filter(({ year }) => year % yearStep === 0)
            .map(({ year, x }) => (
              <span key={year} className="tl-year" style={{ left: x }}>
                {year}
              </span>
            ))}

          {layout.floatLaneRows > 0 && (
            <span
              className="tl-lane"
              style={{ top: layout.floatLaneTop, height: layout.floatLaneRows * GEOMETRY.floatLaneH }}
            />
          )}

          <svg className="tl-tethers" width={layout.width} height={layout.height} aria-hidden="true">
            {[...layout.segments.map((s) => s.label), ...layout.sidecars.map((s) => s.label)].map((l, i) =>
              l?.tether ? <line key={i} x1={l.tether.x1} y1={l.tether.y1} x2={l.tether.x2} y2={l.tether.y2} /> : null,
            )}
          </svg>

          {layout.segments.map((s) => {
            const lead = s.kind === 'last' || s.kind === 'mid' ? GEOMETRY.slant : 0;
            const sw = swatchesOf(s.role);
            return (
              <Pill
                key={s.role.id}
                kind={s.kind}
                swatches={sw}
                split={s.role.threads.length > 1}
                label={roleLabel(s.role)}
                style={{ left: s.left - lead, width: s.right - s.left + lead, top: s.y, height: GEOMETRY.pillH }}
              />
            );
          })}

          {layout.sidecars.map((c) => (
            <SidecarBand
              key={c.role.id}
              swatch={c.role.threads[0] ? swatchForThread(doc, c.role.threads[0]) : UNTHREADED}
              label={`${roleLabel(c.role)} · alongside`}
              style={{ left: c.left, width: c.right - c.left, top: c.y, height: GEOMETRY.sidecarH }}
            />
          ))}

          {layout.events.map((e) => (
            <EventDot
              key={e.event.id}
              swatches={swatchesOf(e.role)}
              label={`${e.event.title} · ${formatMonth(e.event.date)} · during ${e.role.title || 'role'}`}
              style={{ left: e.x, top: e.y }}
            />
          ))}

          {layout.floating.map((f) => (
            <span
              key={f.event.id}
              className="fev"
              role="img"
              aria-label={`${f.event.title} · ${formatMonth(f.event.date)}`}
              title={`${f.event.title} · ${formatMonth(f.event.date)}`}
              style={{ left: f.x, top: f.y }}
            />
          ))}

          {[
            ...layout.segments.map((s) => ({
              l: s.label,
              mono: swatchesOf(s.role)[0].kind === 'hatch',
              inv: isInverted(swatchesOf(s.role)[0]),
            })),
            ...layout.sidecars.map((s) => ({ l: s.label, mono: false, inv: false })),
            ...layout.floating.map((f) => ({ l: f.label, mono: false, inv: false })),
          ].map(({ l, mono, inv }, i) =>
            l ? (
              <span
                key={i}
                className={`tl-label ${l.mode}${mono && l.mode !== 'float' ? (inv ? ' chip inv' : ' chip') : ''}`}
                style={{ left: l.x, top: l.y - 12, ...(l.mode === 'float' ? {} : { maxWidth: l.width }) }}
                aria-hidden="true"
              >
                {l.text}
              </span>
            ) : null,
          )}
        </div>
      )}
    </div>
  );
}

const isInverted = (s: ReturnType<typeof swatchForThread>) => s.kind === 'hatch' && s.inverted;
