import { useMemo } from 'react';
import { currentMonth } from '../data/months';
import type { TimelineDoc } from '../data/schema';
import { findSidecarHosts } from '../timeline/layout';
import { DetailPanel } from './DetailPanel';
import { FloatingEventDetail } from './FloatingEventDetail';
import { relationsFor } from './relations';
import { RoleDetail } from './RoleDetail';
import type { Selection } from './selection';

export interface SelectionDetailProps {
  doc: TimelineDoc;
  selection: Selection | null;
  onSelect: (selection: Selection) => void;
  onClose: () => void;
  now?: string;
}

const HEADING_ID = 'detail-heading';

/** The detail panel for whatever is selected; nothing when the selection no longer exists. */
export function SelectionDetail({ doc, selection, onSelect, onClose, now = currentMonth() }: SelectionDetailProps) {
  const sidecarHosts = useMemo(() => findSidecarHosts(doc, now), [doc, now]);
  if (!selection) return null;

  if (selection.kind === 'role') {
    const role = doc.roles.find((r) => r.id === selection.id);
    if (!role) return null;
    return (
      <DetailPanel contentKey={`role:${role.id}`} labelledBy={HEADING_ID} onClose={onClose}>
        <RoleDetail
          doc={doc}
          role={role}
          relations={relationsFor(role, doc, sidecarHosts)}
          highlightEventId={selection.eventId}
          headingId={HEADING_ID}
          onSelect={onSelect}
          now={now}
        />
      </DetailPanel>
    );
  }

  const event = doc.floatingEvents.find((e) => e.id === selection.id);
  if (!event) return null;
  return (
    <DetailPanel contentKey={`event:${event.id}`} labelledBy={HEADING_ID} onClose={onClose}>
      <FloatingEventDetail doc={doc} event={event} headingId={HEADING_ID} />
    </DetailPanel>
  );
}
