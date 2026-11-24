import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { currentMonth, formatMonth } from '../data/months';
import type { Role, TimelineDoc } from '../data/schema';
import type { Selection } from '../detail/selection';
import { HatchDefs } from './hatches';
import { useLabelMeasurer } from './labelMeasure';
import { fitPxPerMonth, GEOMETRY, layoutTimeline } from './layout';
import { EventMark, FloatingDot, Pill } from './Pill';
import { dotColor, swatchForThread } from './palettes';
import './timeline.css';

const roleLabel = (role: Role) =>
  `${role.title || 'Untitled role'}${role.company ? ` · ${role.company}` : ''} · ${formatMonth(role.start)} – ${formatMonth(role.end)}`;

export interface TimelineProps {
  doc: TimelineDoc;
  /** 1 = the whole career fits the width; higher zooms in. */
  zoom?: number;
  now?: string;
  /** The role or event whose detail is open. */
  selection?: Selection | null;
  onSelect?: (selection: Selection) => void;
  /** Show titles regardless of the saved setting (e.g. while coloring roles). */
  forceTitles?: boolean;
  /**
   * Toggle mode: these roles show as pressed and nothing fades (used while
   * coloring, for the roles that have the chosen thread).
   */
  pressedRoleIds?: ReadonlySet<string> | null;
  /** The thread picked in the key: its roles fill in its colour and the rest fade. */
  focusThread?: string | null;
}

/** Below this the pills get too thin to read; the timeline scrolls instead. */
const MIN_PX_PER_MONTH = 1.6;
const MAX_PX_PER_MONTH = 24;

export function Timeline({
  doc,
  zoom = 1,
  now = currentMonth(),
  selection = null,
  onSelect,
  forceTitles = false,
  pressedRoleIds = null,
  focusThread = null,
}: TimelineProps) {
  const showTitles = forceTitles || doc.settings.showTitles;
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
  const focusSwatch = focusThread ? swatchForThread(doc, focusThread) : null;
  const hasSelection = selection !== null;
  const isSelected = (kind: Selection['kind'], id: string) => selection?.kind === kind && selection.id === id;
  const selectRole = (id: string, eventId?: string) => () => onSelect?.({ kind: 'role', id, eventId });

  /**
   * How a mark shows. Coloring: pressed roles, nothing fades. With a thread
   * picked: roles without it fade; if one of its roles is open, the thread's
   * other roles step back part way. Otherwise an open mark fades the rest.
   */
  const tapState = (kind: Selection['kind'], id: string) => {
    if (pressedRoleIds) {
      return { selected: kind === 'role' && pressedRoleIds.has(id), dim: kind === 'floating', soft: false };
    }
    const selected = isSelected(kind, id);
    if (focusThread) {
      const role = kind === 'role' ? doc.roles.find((r) => r.id === id) : undefined;
      const inFilter = !!role?.threads.includes(focusThread);
      return { selected, dim: !inFilter, soft: inFilter && hasSelection && !selected };
    }
    return { selected, dim: hasSelection && !selected, soft: false };
  };

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

          {layout.segments.map((s) => {
            // A pill after a slanted cut starts one slant early so the cut lines up.
            const lead = s.shape === 'pill' && (s.kind === 'last' || s.kind === 'mid') ? GEOMETRY.slant : 0;
            const lit = focusThread && s.role.threads.includes(focusThread) ? focusSwatch : null;
            return (
              <Pill
                key={s.role.id}
                kind={s.kind}
                shape={s.shape}
                lit={lit}
                dots={s.dots.map((d) => ({ x: d.x, swatch: swatchForThread(doc, d.threadId) }))}
                label={roleLabel(s.role)}
                style={{ left: s.left - lead, width: s.right - s.left + lead, top: s.y, height: GEOMETRY.pillH }}
                onSelect={selectRole(s.role.id)}
                {...tapState('role', s.role.id)}
              />
            );
          })}

          {layout.events.map((e) => {
            const first = e.role.threads[0];
            return (
              <EventMark
                key={e.event.id}
                dotX={e.dotX}
                dotY={e.dotY}
                ringX={e.ringX}
                ringY={e.ringY}
                color={first ? dotColor(swatchForThread(doc, first)) : '#8793a5'}
                label={`${e.event.title} · ${formatMonth(e.event.date)} · during ${e.role.title || 'role'}`}
                onSelect={selectRole(e.role.id, e.event.id)}
                {...tapState('role', e.role.id)}
              />
            );
          })}

          {layout.floating.map((f) => (
            <FloatingDot
              key={f.event.id}
              label={`${f.event.title} · ${formatMonth(f.event.date)}`}
              style={{ left: f.x, top: f.y }}
              onSelect={() => onSelect?.({ kind: 'floating', id: f.event.id })}
              {...tapState('floating', f.event.id)}
            />
          ))}

          {[
            ...layout.segments.map((s) => ({
              l: s.label,
              owner: { kind: 'role' as const, id: s.role.id },
              onHatch: focusSwatch?.kind === 'hatch' && s.role.threads.includes(focusThread!),
            })),
            ...layout.floating.map((f) => ({
              l: f.label,
              owner: { kind: 'floating' as const, id: f.event.id },
              onHatch: false,
            })),
          ].map(({ l, owner, onHatch }, i) => {
            if (!l) return null;
            const { dim, soft } = tapState(owner.kind, owner.id);
            // Titles let taps through to the pill under them. On a hatch fill they get a white backing to stay readable.
            return (
              <span
                key={i}
                className={`tl-label ${l.mode}${onHatch ? ' chip' : ''}${dim ? ' dim' : ''}${soft ? ' soft' : ''}`}
                style={{ left: l.x, top: l.y - 12, ...(l.mode === 'in' ? { maxWidth: l.width } : {}) }}
                aria-hidden="true"
              >
                {l.text}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
