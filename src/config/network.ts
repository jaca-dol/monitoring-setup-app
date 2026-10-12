/**
 * Network presentation policy (REQ-A-08).
 *
 * ─── DECIDED 2026-09-29 — was an open question, now answered ───
 *
 * REQ-A-08 reads as though "-868M" devices show static EU868 text and no
 * control, and the concept screens were drawn that way: the EM300 row reads
 * "Region / Fixed on EU hardware / EU868" with no chevron.
 *
 * The hardware disagreed. Every unit tested reports `supportFreq: 3`, which in
 * Milesight's own table means **EU868, IN865 and RU864** — three selectable
 * regions, not one. The question was whether the PRD expressed a deliberate
 * dol-sensors restriction or was simply under-specified.
 *
 * **Answered: under-specified.** dol-sensors asked for IN865 and RU864 to be
 * selectable, so the app now offers every region the hardware reports.
 *
 * Worth noting for whoever updates the PRD: REQ-A-08's "static text, no control"
 * wording no longer matches the built behaviour, and the concept screens' region
 * row is likewise out of date. The code follows the instruction, not the
 * document — so the document is the thing that needs correcting.
 *
 * Set back to `true` to pin "-868M" devices to a single region again.
 *
 * See docs/stage2-device-model.md and docs/stage3-screen-shell.md.
 */
export const RESTRICT_868M_TO_SINGLE_REGION = false;

/**
 * The region an "-868M" device is pinned to when the restriction is on.
 * Only used when {@link RESTRICT_868M_TO_SINGLE_REGION} is true.
 */
export const EU_BAND_LABEL = '868M';
