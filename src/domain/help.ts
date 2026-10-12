import type {SectionId} from './screen';

/**
 * What each section is for, in an installer's words.
 *
 * Lives in `domain` beside `SECTION_TITLES`: it is content, not layout, and the
 * UI should not be the place product wording is decided.
 *
 * ─── What this copy is for ───
 *
 * The reader is someone holding a sensor who is not sure what a row means or
 * whether they are allowed to change it. So each entry answers three questions
 * in the order they get asked: what is this, what am I looking at, and what can
 * I do here.
 *
 * Two rules it follows throughout:
 *
 * - **Say what the app cannot know.** This app is offline (REQ-A-16), so it
 *   reports what the *sensor* says about itself and never what a gateway or
 *   network server received. Help text that blurs that line teaches installers
 *   to trust a screen further than it deserves.
 * - **Name the consequence, not just the control.** "You can change the region"
 *   is less useful than knowing it resets the LoRaWAN settings and the sensor
 *   will not re-join until it is provisioned again.
 */
export interface SectionHelp {
  /** One or two sentences: what this part of the screen is for. */
  purpose: string;
  /** The rows, and what each one means. */
  shows: string[];
  /** Actions available here. Empty when the section only reports. */
  actions: string[];
}

export const SECTION_HELP: Record<SectionId, SectionHelp> = {
  control: {
    purpose:
      'Switching the sensor on or off, and restarting it. These act immediately — they are the only controls here that do not wait for Apply.',
    shows: [
      'Whether the sensor is currently switched on.',
      'A switched-off sensor keeps its settings and its battery, but stops measuring and stops reporting.',
    ],
    actions: [
      'Switch the sensor on or off. One tap, one NFC session — the sensor confirms it and the screen updates.',
      'Restart the sensor. Its configuration is kept. Worth trying when a sensor behaves oddly before changing anything.',
    ],
  },

  measurement: {
    purpose:
      'The last values the sensor measured, read directly from the sensor over NFC — not from a gateway or a server.',
    shows: [
      'One value per channel the sensor type supports, with the time it was read.',
      'A dash means the sensor did not report that channel in this read.',
      'Nothing at all when the sensor is switched off, because it is not measuring. The values return once it is back on.',
    ],
    actions: [],
  },

  device: {
    purpose:
      'Which article this is and how it is identified on the network. Nearly all of it is fixed in the hardware.',
    shows: [
      'The dol-sensors article name, with its frequency band as a pill.',
      'Firmware and hardware revision, and whether that combination is a qualified one.',
      'The DevEUI — the sensor’s unique identity, which the network server needs.',
      'Where to tap this device for NFC, once a read has identified it.',
      'The AppKey as a status only. The app never displays, exports or logs key material, by design.',
    ],
    actions: [],
  },

  network: {
    purpose:
      'How the sensor talks to the gateway: which frequency region it uses, whether it is reaching the network, and how strong that link is.',
    shows: [
      'The region the sensor is set to, and which others this hardware accepts.',
      'Whether the sensor reports having joined the network. The app is offline, so this is the sensor’s own account of it, not a confirmation from the gateway.',
      'Signal strength and quality, with a verdict and the usable limit beside the numbers.',
      '“No signal reading” on a sensor that has never joined — that is genuinely no reading, not a strong one.',
    ],
    actions: [
      'Change the region, then Apply. The sensor and the gateway must agree, or they will not hear each other.',
      'Be deliberate: changing the region resets the sensor’s LoRaWAN settings, the AppKey among them, and it will not re-join until it has been provisioned again on the network server.',
    ],
  },

  power: {
    purpose:
      'How the sensor is powered and how often it transmits. These two are related: reporting more often costs battery.',
    shows: [
      'Battery level. On a mains-powered iDOL53 the 24 V supply is shown above it and the battery is labelled as backup — a high battery percentage on a unit whose supply has failed is not healthy.',
      'The reporting interval the sensor is currently set to.',
    ],
    actions: [
      'Change the reporting interval, then Apply.',
      'The gateway can also set this by downlink, so a network server configured differently may change it back. Check the gateway if the value has to stick.',
    ],
  },

  actions: {
    purpose:
      'Writing staged changes to the sensor, and keeping a copy of its settings.',
    shows: [
      'Apply is enabled only when something has actually been changed on this screen.',
      'A note above it when changes are staged but not yet written.',
    ],
    actions: [
      'Apply sensor settings — hold the phone against the sensor until the write finishes. The app reads the sensor back afterwards and tells you if anything did not take.',
      'Save to profile or share the settings, to keep a record of how this sensor was commissioned.',
    ],
  },
};
