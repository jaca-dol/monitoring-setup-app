/**
 * Design tokens, taken from `docs/SmartAdjust_concept_screens.html`.
 *
 * The concept is a **light** design: a pale grey page, white cards, and one
 * navy accent. There is no dark variant, so this file does not define one —
 * an earlier build followed the system colour scheme and produced a dark-grey
 * app that looked nothing like the concept.
 *
 * The navy is dol-sensors' brand blue `#004077`, not the `#1C3E6F` the concept
 * HTML happens to carry.
 */

export const colors = {
  /** dol-sensors brand blue. App bar, accents, link-ish text. */
  navy: '#004077',
  /** Darker navy for the toggle knob and pressed states. */
  navyDeep: '#003060',
  /** Muted navy for the app-bar subtitle, on navy. */
  navySoft: '#8FA6C0',

  /** Page behind the cards. */
  page: '#EEF0F2',
  card: '#FFFFFF',
  divider: '#E6E8EA',

  ink: '#1C1C1C',
  muted: '#6B7280',

  /** Apply bar and the "good" pill. */
  green: '#3E8B52',
  greenPillBg: '#E9F3EC',

  /** Band-group and neutral-status pills. */
  bandPillBg: '#E8EDF4',
  readOnlyPillBg: '#EDEFF1',
  readOnlyPillText: '#5A6472',

  /** Warning banner, for an unqualified revision. */
  amberBg: '#FDF6E3',
  amberBorder: '#F0E2BC',
  amberText: '#7A5510',

  /** Poor-signal pill. */
  redPillBg: '#FBEAE8',
  red: '#B42318',

  toggleOff: '#C9CDD2',
  toggleOnTrack: '#B9C7DA',
  chevron: '#9AA0A6',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 14,
  lg: 22,
} as const;

export const radius = {
  card: 16,
  button: 14,
  pill: 20,
} as const;
