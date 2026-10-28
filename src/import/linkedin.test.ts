import { describe, expect, it } from 'vitest';
import { draftToRole, profileToDrafts, toMonths } from './drafts';
import type { PdfLine } from './linkedin';
import { looksLikeLinkedIn, parseDateRange, parseLinkedInLines, splitDetails } from './linkedin';

/**
 * A made-up profile laid out the way LinkedIn's PDF lays one out: same font
 * sizes, columns and spacing. Real PDFs stay out of the repo; see the README
 * for checking against your own.
 */
function fixture(): PdfLine[] {
  const lines: PdfLine[] = [];
  let y = 760;
  let page = 1;
  const main = (size: number, text: string, gap = 18) => {
    y -= gap;
    if (y < 40) {
      page++;
      y = 760;
    }
    lines.push({ page, col: 'main', y, size, text });
  };
  const side = (size: number, text: string, sy: number) => lines.push({ page: 1, col: 'side', y: sy, size, text });

  side(13, 'Contact', 740);
  side(10.5, 'www.linkedin.com/in/sam-example', 720);
  side(10.5, '(LinkedIn)', 706);
  side(13, 'Top Skills', 680);
  side(10.5, 'Wayfinding', 664);

  main(26, 'Sam Example', 0);
  main(12, 'Designer, teacher and occasional', 30);
  main(12, 'beekeeper');
  main(12, 'Duluth, Minnesota, United States');
  main(15.75, 'Summary', 40);
  main(12, 'I make maps and teach people to read them.', 30);
  main(12, 'Second paragraph here.', 36);

  main(15.75, 'Experience', 50);
  // A company with a promotion, a long overlapping side role, and a company total.
  main(12, 'Northwind Studio', 30);
  main(10.5, '4 years 2 months', 16);
  main(11.5, 'Senior Cartographer', 21);
  main(10.5, 'March 2021 - Present (4 years)', 15);
  main(10.5, 'Duluth, Minnesota', 15);
  main(10.5, '- Led the redesign of the regional trail atlas, working with', 21);
  main(10.5, 'park rangers');
  main(10.5, '- Built a print pipeline', 18);
  main(11.5, 'Cartographer', 31);
  main(10.5, 'January 2019 - March 2021 (2 years 3 months)', 15);
  main(10.5, 'Drew maps for the city.', 21);
  main(10.5, 'Second paragraph of the description.', 36);
  main(11.5, 'Safety Committee Member - Internal', 31);
  main(11.5, 'Initiative', 18);
  main(10.5, 'June 2020 - May 2022 (2 years)', 15);

  main(12, 'Lake Superior Schools', 38);
  main(11.5, 'Substitute Teacher', 21);
  main(10.5, '2015 - 2018', 15);

  main(12, 'Gap Year', 38);
  main(11.5, 'Volunteer', 21);
  main(10.5, '2014 - 2014', 15);

  main(15.75, 'Education', 50);
  main(12, 'University of Minnesota Duluth', 30);
  main(10.5, 'Bachelor of Arts - BA, Geography · (2010 - 2014)', 16);
  main(12, 'Some Online School', 30);
  main(10.5, 'Certificate, GIS');
  lines.push({ page, col: 'main', y: 20, size: 9, text: 'Page 1 of 2' });
  return lines.filter((l) => l.size !== 9);
}

describe('parseDateRange', () => {
  it('reads month, year-only and present ranges', () => {
    expect(parseDateRange('April 2019 - April 2021 (2 years 1 month)')).toEqual({ start: '2019-04', end: '2021-04' });
    expect(parseDateRange('November 2025 - Present (1 year)')).toEqual({ start: '2025-11', end: 'present' });
    expect(parseDateRange('2015 - 2017')).toEqual({ start: '2015', end: '2017' });
    expect(parseDateRange('Led the team from 2015 - 2017')).toBeNull();
  });
});

describe('splitDetails', () => {
  it('makes one detail per bullet and per paragraph, joining wrapped lines', () => {
    expect(
      splitDetails([
        { text: 'Intro line one', gap: null },
        { text: 'wraps here.', gap: 18 },
        { text: '- First bullet', gap: 18 },
        { text: 'continues', gap: 18 },
        { text: '• Second bullet', gap: 18 },
        { text: 'New paragraph.', gap: 36 },
      ]),
    ).toEqual(['Intro line one wraps here.', 'First bullet continues', 'Second bullet', 'New paragraph.']);
  });
});

describe('parseLinkedInLines', () => {
  const p = parseLinkedInLines(fixture());

  it('reads the header, link and sidebar', () => {
    expect(p.name).toBe('Sam Example');
    expect(p.headline).toBe('Designer, teacher and occasional beekeeper');
    expect(p.location).toBe('Duluth, Minnesota, United States');
    expect(p.linkedin).toBe('www.linkedin.com/in/sam-example');
    expect(p.sidebar['Top Skills']).toEqual(['Wayfinding']);
    expect(p.summary).toBe('I make maps and teach people to read them.\n\nSecond paragraph here.');
  });

  it('reads companies, roles, wrapped titles, locations and details', () => {
    expect(p.experience.map((c) => c.company)).toEqual(['Northwind Studio', 'Lake Superior Schools', 'Gap Year']);
    const [senior, carto, committee] = p.experience[0].roles;
    expect(senior).toMatchObject({
      title: 'Senior Cartographer',
      start: '2021-03',
      end: 'present',
      location: 'Duluth, Minnesota',
    });
    expect(senior.details).toEqual([
      'Led the redesign of the regional trail atlas, working with park rangers',
      'Built a print pipeline',
    ]);
    expect(carto.location).toBe('');
    expect(carto.details).toEqual(['Drew maps for the city.', 'Second paragraph of the description.']);
    expect(committee.title).toBe('Safety Committee Member - Internal Initiative');
    expect(p.experience[1].roles[0]).toMatchObject({ start: '2015', end: '2018' });
  });

  it('reads education with and without dates', () => {
    expect(p.education).toEqual([
      {
        school: 'University of Minnesota Duluth',
        degree: 'Bachelor of Arts - BA, Geography',
        start: '2010',
        end: '2014',
      },
      { school: 'Some Online School', degree: 'Certificate, GIS', start: null, end: null },
    ]);
  });

  it('recognises a LinkedIn PDF', () => {
    expect(looksLikeLinkedIn(fixture())).toBe(true);
    expect(looksLikeLinkedIn([{ page: 1, col: 'main', y: 700, size: 12, text: 'Invoice #42' }])).toBe(false);
  });
});

describe('toMonths', () => {
  it('fills in months for year-only dates', () => {
    expect(toMonths('1983', '1987')).toEqual({ start: '1983-01', end: '1987-01' });
    expect(toMonths('2014', '2014')).toEqual({ start: '2014-01', end: '2014-12' });
    expect(toMonths('2019-04', 'present')).toEqual({ start: '2019-04', end: 'now' });
    expect(toMonths(null, null)).toEqual({ start: null, end: null });
  });
});

describe('profileToDrafts', () => {
  let n = 0;
  const { profile, drafts } = profileToDrafts(parseLinkedInLines(fixture()), () => `id${++n}`);

  it('carries the profile basics', () => {
    expect(profile).toEqual({
      name: 'Sam Example',
      headline: 'Designer, teacher and occasional beekeeper',
      linkedin: 'www.linkedin.com/in/sam-example',
    });
  });

  it('chains a promotion and flags a long overlap at the same company', () => {
    const [senior, carto, committee] = drafts;
    expect(senior.chain).toBeTruthy();
    expect(senior.chain).toBe(carto.chain);
    expect(committee.chain).toBeNull();
    // Overlaps both; points at the one it overlaps most (Mar 2021 – May 2022).
    expect(committee.overlapsWith).toBe(senior.key);
  });

  it('marks year-only and missing dates for the review', () => {
    const teacher = drafts.find((d) => d.title === 'Substitute Teacher')!;
    expect(teacher).toMatchObject({ start: '2015-01', end: '2018-01', startPrecision: 'year', endPrecision: 'year' });
    const cert = drafts.find((d) => d.kind === 'education' && d.company === 'Some Online School')!;
    expect(cert).toMatchObject({ start: null, end: null, startPrecision: 'missing' });
  });

  it('turns a reviewed draft into a role with no threads picked', () => {
    const d = drafts[0];
    const role = draftToRole({ ...d, start: d.start!, end: d.end! }, []);
    expect(role).toMatchObject({
      title: 'Senior Cartographer',
      company: 'Northwind Studio',
      end: 'now',
      threads: [],
      events: [],
    });
    expect(role.overlapStyle).toBeNull();
  });
});
