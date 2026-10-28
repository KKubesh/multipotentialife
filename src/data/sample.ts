import { emptyDoc } from './defaults';
import type { Role, TimelineDoc } from './schema';

/**
 * A fictional career used for previews, tests and "Try a sample". It covers
 * every layout case: chains, a one-month handover, a sidecar, short stints,
 * events, a floating event and roles with 0-4 threads.
 */

const r = (p: Partial<Role> & Pick<Role, 'id' | 'title' | 'company' | 'start' | 'end'>): Role => ({
  threads: [],
  details: [],
  events: [],
  chain: null,
  overlapStyle: null,
  ...p,
});

export function sampleDoc(): TimelineDoc {
  const doc = emptyDoc(new Date('2026-10-27T12:00:00Z'));
  doc.profile = { ...doc.profile, name: 'Alex Rivera', headline: 'Product designer who codes, coaches and builds community' };
  doc.roles = [
    r({ id: 'uni', title: 'B.A. Graphic Design', company: 'State University', start: '2008-09', end: '2012-05', threads: ['education', 'design'], events: [{ id: 'grad', title: 'Graduated', date: '2012-05' }] }),
    r({ id: 'coach1', title: 'Swim Coach', company: 'City Aquatics', start: '2009-06', end: '2011-08', threads: ['coaching'] }),
    r({ id: 'intern', title: 'Design Intern', company: 'Lumen Studio', start: '2011-06', end: '2011-08', threads: ['design'] }),
    r({ id: 'jd', title: 'Junior Designer', company: 'Fold & Co', start: '2012-07', end: '2014-03', threads: ['design'], chain: 'fold' }),
    r({ id: 'd', title: 'Designer', company: 'Fold & Co', start: '2014-04', end: '2016-02', threads: ['design', 'software'], chain: 'fold', details: ['Redesigned the client portal', 'Built the first design system'] }),
    r({ id: 'vol', title: 'Volunteer Organizer', company: 'Neighborhood Makers', start: '2013-01', end: '2019-06', threads: ['community'], events: [{ id: 'fair', title: 'First maker fair', date: '2015-09' }] }),
    r({ id: 'boot', title: 'Web Development Bootcamp', company: 'Code Forge', start: '2016-03', end: '2016-08', threads: ['education', 'software'], events: [{ id: 'cert', title: 'Certificate', date: '2016-08' }] }),
    r({ id: 'fe', title: 'Frontend Developer', company: 'Brightline', start: '2016-08', end: '2019-04', threads: ['software', 'design'], chain: 'bright' }),
    r({ id: 'sfe', title: 'Senior Frontend Developer', company: 'Brightline', start: '2019-04', end: '2021-06', threads: ['software', 'design', 'coaching'], chain: 'bright', events: [{ id: 'lib', title: 'Launched component library', date: '2020-02' }] }),
    r({ id: 'mentor', title: 'Mentorship Lead', company: 'Brightline', start: '2020-01', end: '2021-10', threads: ['coaching', 'community'], overlapStyle: 'sidecar' }),
    r({ id: 'talk', title: 'Speaker', company: 'DesignOps Summit', start: '2018-10', end: '2018-11', threads: ['community'] }),
    r({ id: 'pd', title: 'Product Designer', company: 'Northwind', start: '2021-07', end: '2023-11', threads: ['design', 'software'] }),
    r({ id: 'sab', title: 'Sabbatical', company: '', start: '2023-12', end: '2024-05', threads: [] }),
    r({ id: 'lead', title: 'Design Engineering Lead', company: 'Atlas Health', start: '2024-06', end: 'now', threads: ['software', 'design'] }),
    r({ id: 'board', title: 'Board Member', company: 'Youth Code Club', start: '2022-03', end: 'now', threads: ['community', 'coaching', 'education', 'software'] }),
  ];
  doc.floatingEvents = [{ id: 'move', title: 'Moved to Chicago', date: '2017-05', threads: [] }];
  return doc;
}
