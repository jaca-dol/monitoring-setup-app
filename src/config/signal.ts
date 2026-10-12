/**
 * Signal thresholds for the Network section's verdict (PRD B5, REQ-A-11).
 *
 * This file is deliberately the *only* place these numbers live. The signal
 * verdict component is built in Stage 4 (roadmap task 10) and must read from
 * here rather than inlining limits, because one of them is still undecided.
 */

/**
 * RSSI limits, in dBm. Settled — taken directly from PRD B5.
 *
 * Good:        better than -95
 * Weak:        -95 to -100
 * Unusable:    below -100
 */
export const RSSI_GOOD_ABOVE_DBM = -95;
export const RSSI_UNUSABLE_BELOW_DBM = -100;

/** Copy for the limit shown beneath the verdict (PRD B5). */
export const RSSI_LIMIT_LABEL = 'usable above -100 dBm';

/**
 * ─── OPEN DECISION — DO NOT BUILD THE SNR COMPONENT AGAINST THIS YET ───
 *
 * The concept screens show SNR on a 0-20 dB scale, i.e. 20 dB treated as a
 * scale ceiling. But on LoRaWAN a *higher* SNR is better, so the useful
 * number is a minimum pass threshold, not a ceiling. PRD B5 flags this as an
 * open decision owned by Product, needed before this component is built.
 *
 * Both readings are encoded below so that resolving the decision is a one-line
 * change here and nowhere else. `SNR_PRESENTATION` is the switch.
 *
 * See: docs/PRD-WIRELESS-US-001-B.md B5, docs/roadmap.md blocker #3.
 */
export type SnrPresentation = 'scale-ceiling' | 'minimum-threshold';

/** UNRESOLVED. Placeholder value — confirm with Product before Stage 4. */
export const SNR_PRESENTATION: SnrPresentation = 'minimum-threshold';

/** Used when SNR_PRESENTATION === 'scale-ceiling'. */
export const SNR_SCALE_MIN_DB = 0;
export const SNR_SCALE_MAX_DB = 20;

/** Used when SNR_PRESENTATION === 'minimum-threshold'. Value not yet agreed. */
export const SNR_MINIMUM_DB = 0;
