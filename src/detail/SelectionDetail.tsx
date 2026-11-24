import { currentMonth } from '../data/months';
import type { TimelineDoc } from '../data/schema';
import { FloatingEventEditor } from '../edit/FloatingEventEditor';
import { RoleEditor } from '../edit/RoleEditor';
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
  /** Edit mode: show forms instead of the read-only detail. */
  editing?: boolean;
  /** Edit mode: delete what's selected. */
  onDelete?: (selection: Selection) => void;
}

const HEADING_ID = 'detail-heading';

/** The detail panel for whatever is selected; nothing when the selection no longer exists. */
export function SelectionDetail({
  doc,
  selection,
  onSelect,
  onClose,
  now = currentMonth(),
  editing = false,
  onDelete = () => {},
}: SelectionDetailProps) {
  if (!selection) return null;

  if (selection.kind === 'role') {
    const role = doc.roles.find((r) => r.id === selection.id);
    if (!role) return null;
    if (editing) {
      return (
        <DetailPanel contentKey={`edit-role:${role.id}`} labelledBy={HEADING_ID} onClose={onClose}>
          <RoleEditor
            key={role.id}
            doc={doc}
            role={role}
            headingId={HEADING_ID}
            onDelete={() => onDelete(selection)}
            onDone={onClose}
          />
        </DetailPanel>
      );
    }
    return (
      <DetailPanel contentKey={`role:${role.id}`} labelledBy={HEADING_ID} onClose={onClose}>
        <RoleDetail
          doc={doc}
          role={role}
          relations={relationsFor(role, doc)}
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
  if (editing) {
    return (
      <DetailPanel contentKey={`edit-event:${event.id}`} labelledBy={HEADING_ID} onClose={onClose}>
        <FloatingEventEditor
          doc={doc}
          event={event}
          headingId={HEADING_ID}
          onDelete={() => onDelete(selection)}
          onDone={onClose}
        />
      </DetailPanel>
    );
  }
  return (
    <DetailPanel contentKey={`event:${event.id}`} labelledBy={HEADING_ID} onClose={onClose}>
      <FloatingEventDetail doc={doc} event={event} headingId={HEADING_ID} />
    </DetailPanel>
  );
}
