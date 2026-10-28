/**
 * Reads a LinkedIn "Save to PDF" profile.
 *
 * LinkedIn's PDF carries its structure in font size and position, which is
 * far steadier than guessing from the words:
 *   x < 200          left sidebar (Contact, Top Skills, Languages, ...)
 *   26pt             name
 *   15.75pt          main section heading (Summary, Experience, Education)
 *   13pt (sidebar)   sidebar heading
 *   12pt             company / school (and header + summary text)
 *   11.5pt           role title
 *   10.5pt           dates, location, description, degree
 *   9pt              "Page N of M" footer
 * Body lines sit 18pt apart; a blank line between paragraphs makes it 36pt.
 *
 * This file is pure: it works on text lines, so it runs the same in the
 * browser, in tests and in Node. `pdf.ts` turns a file into lines.
 */

export interface PdfLine {
  page: number;
  col: 'side' | 'main';
  /** Baseline, in PDF points from the bottom of the page. */
  y: number;
  /** Font size in points. */
  size: number;
  text: string;
}

/** Month precision "YYYY-MM", or year only "YYYY" when that's all LinkedIn shows. */
export type PdfDate = string;

export interface LinkedInRole {
  title: string;
  start: PdfDate | null;
  /** "present" for a current role. */
  end: PdfDate | 'present' | null;
  location: string;
  /** Description split into bullets and paragraphs. */
  details: string[];
}

export interface LinkedInCompany {
  company: string;
  roles: LinkedInRole[];
}

export interface LinkedInEducation {
  school: string;
  degree: string;
  start: PdfDate | null;
  end: PdfDate | null;
}

export interface LinkedInProfile {
  name: string;
  headline: string;
  location: string;
  /** e.g. "www.linkedin.com/in/someone"; empty if the PDF doesn't list it. */
  linkedin: string;
  summary: string;
  sidebar: Record<string, string[]>;
  experience: LinkedInCompany[];
  education: LinkedInEducation[];
}

export const SIDEBAR_MAX_X = 200;
const near = (a: number, b: number, tol = 0.3) => Math.abs(a - b) <= tol;
/** Anything over this between two body lines is a blank line, i.e. a new paragraph. */
const PARAGRAPH_GAP = 27;

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MONTH_RE = MONTHS.join('|');
// "April 2019 - April 2021 (2 years 1 month)" / "November 2025 - Present (1 year)" / "2015 - 2017"
const DATE_RANGE_RE = new RegExp(
  `^((?:${MONTH_RE})\\s+)?(\\d{4})\\s*[-–]\\s*(?:((?:${MONTH_RE})\\s+)?(\\d{4})|Present)\\s*(\\(.*\\))?$`,
);
// Company total above a group of roles, e.g. "3 years 5 months"
const DURATION_ONLY_RE = /^(?=\S)(\d+\s+years?)?\s*(\d+\s+months?)?$/;
// Education degree line ends with "· (2010 - 2014)" or "· (2014)"
const EDU_DATES_RE = /·\s*\(\s*(?:(?:\w+\s+)?(\d{4}))?\s*[-–]?\s*(?:(?:\w+\s+)?(\d{4}))?\s*\)\s*$/;
const BULLET_RE = /^[-•–·*]\s*/;

function toPdfDate(monthWord: string | undefined, year: string | undefined): PdfDate | null {
  if (!year) return null;
  if (!monthWord) return year;
  return `${year}-${String(MONTHS.indexOf(monthWord.trim()) + 1).padStart(2, '0')}`;
}

export function parseDateRange(text: string): { start: PdfDate | null; end: PdfDate | 'present' | null } | null {
  const m = text.trim().match(DATE_RANGE_RE);
  if (!m) return null;
  return { start: toPdfDate(m[1], m[2]), end: m[4] ? toPdfDate(m[3], m[4]) : 'present' };
}

/** Joins soft-wrapped lines, re-joining words split with a hyphen. */
function joinWrapped(parts: string[]): string {
  return parts.reduce((out, t) => (!out ? t : /\w-$/.test(out) && !/^[A-Z]/.test(t) ? `${out}${t}` : `${out} ${t}`), '');
}

/**
 * Splits a description into details: each bullet is one, and so is each
 * paragraph of plain text. Lines carry the gap above them so paragraphs show.
 */
export function splitDetails(lines: { text: string; gap: number | null }[]): string[] {
  const out: string[][] = [];
  for (const l of lines) {
    const bullet = BULLET_RE.test(l.text) && l.text.length > 1;
    const para = l.gap != null && l.gap > PARAGRAPH_GAP;
    if (!out.length || bullet || para) out.push([bullet ? l.text.replace(BULLET_RE, '') : l.text]);
    else out[out.length - 1].push(l.text);
  }
  return out.map((p) => joinWrapped(p).trim()).filter(Boolean);
}

export function parseLinkedInLines(lines: PdfLine[]): LinkedInProfile {
  const profile: LinkedInProfile = {
    name: '',
    headline: '',
    location: '',
    linkedin: '',
    summary: '',
    sidebar: {},
    experience: [],
    education: [],
  };

  // ---- Sidebar ----
  let sideHeading: string | null = null;
  for (const l of lines) {
    if (l.col !== 'side') continue;
    if (near(l.size, 13)) {
      sideHeading = l.text;
      profile.sidebar[sideHeading] = [];
    } else if (sideHeading) profile.sidebar[sideHeading].push(l.text);
  }
  const url = Object.values(profile.sidebar)
    .flat()
    .map((t) => t.match(/(?:www\.)?linkedin\.com\/in\/[\w%-]+/i)?.[0])
    .find(Boolean);
  if (url) profile.linkedin = url.startsWith('www.') ? url : `www.${url}`;

  // ---- Main column ----
  const headerLines: string[] = [];
  const summaryLines: { text: string; gap: number | null }[] = [];
  let section = 'header';
  let company: LinkedInCompany | null = null;
  let role: (LinkedInRole & { desc: { text: string; gap: number | null }[] }) | null = null;
  let state: 'company' | 'title' | 'afterDates' | 'desc' | null = null;
  let edu: LinkedInEducation | null = null;
  let lastY: number | null = null;
  let lastPage: number | null = null;

  const finishRole = () => {
    if (role) {
      role.details = splitDetails(role.desc);
      const { desc: _desc, ...clean } = role;
      company!.roles[company!.roles.length - 1] = clean;
    }
    role = null;
  };

  for (const l of lines) {
    if (l.col !== 'main') continue;
    const gap = lastY != null && l.page === lastPage ? lastY - l.y : null;
    lastY = l.y;
    lastPage = l.page;

    if (near(l.size, 26)) {
      profile.name = l.text;
      continue;
    }
    if (near(l.size, 15.75, 0.5)) {
      finishRole();
      section = l.text.trim().toLowerCase();
      continue;
    }
    if (section === 'header') {
      headerLines.push(l.text);
      continue;
    }
    if (section === 'summary') {
      summaryLines.push({ text: l.text, gap });
      continue;
    }

    if (section === 'experience') {
      if (near(l.size, 12)) {
        finishRole();
        company = { company: l.text, roles: [] };
        profile.experience.push(company);
        state = 'company';
        continue;
      }
      if (near(l.size, 11.5) && company) {
        // A long title wraps over several lines.
        if (role && state === 'title') {
          role.title += ` ${l.text}`;
          continue;
        }
        finishRole();
        role = { title: l.text, start: null, end: null, location: '', details: [], desc: [] };
        company.roles.push(role);
        state = 'title';
        continue;
      }
      if (state === 'company' && DURATION_ONLY_RE.test(l.text)) continue;
      if (!role) continue;
      const dates = state === 'title' ? parseDateRange(l.text) : null;
      if (dates) {
        Object.assign(role, dates);
        state = 'afterDates';
        continue;
      }
      // The location sits ~15pt under the dates; a description starts ~21pt under.
      // A page break hides the gap, so then go by whether it reads like a place.
      const placeLike = l.text.length < 60 && !BULLET_RE.test(l.text) && !/[.!?]$/.test(l.text);
      if (state === 'afterDates' && placeLike && (gap == null || gap <= 17)) {
        role.location = l.text;
        state = 'desc';
        continue;
      }
      role.desc.push({ text: l.text, gap: state === 'desc' ? gap : null });
      state = 'desc';
      continue;
    }

    if (section === 'education') {
      if (near(l.size, 12)) {
        edu = { school: l.text, degree: '', start: null, end: null };
        profile.education.push(edu);
      } else if (edu) {
        edu.degree = edu.degree ? `${edu.degree} ${l.text}` : l.text;
        const m = edu.degree.match(EDU_DATES_RE);
        if (m) {
          edu.start = m[1] ?? m[2] ?? null;
          edu.end = m[2] ?? m[1] ?? null;
          edu.degree = edu.degree.replace(EDU_DATES_RE, '').trim();
        }
      }
    }
  }
  finishRole();

  // Header: the headline lines, then the location as the last line.
  if (headerLines.length) {
    profile.location = headerLines.length > 1 ? headerLines.pop()! : '';
    profile.headline = joinWrapped(headerLines);
  }
  profile.summary = splitDetails(summaryLines).join('\n\n');
  return profile;
}

/** True when the lines look like a LinkedIn profile PDF at all. */
export function looksLikeLinkedIn(lines: PdfLine[]): boolean {
  const headings = new Set(lines.filter((l) => l.col === 'main' && near(l.size, 15.75, 0.5)).map((l) => l.text.trim().toLowerCase()));
  return lines.some((l) => near(l.size, 26)) && (headings.has('experience') || headings.has('education'));
}
