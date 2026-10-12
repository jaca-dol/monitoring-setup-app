/**
 * Side-effect module: installs log redaction on import.
 *
 * This exists as its own module because ES imports are hoisted — a bare
 * `installRedactingLogger()` call sitting between imports in `index.js` would
 * run *after* every import in that file had already been evaluated. Module
 * evaluation follows import order, so importing this first is what actually
 * guarantees redaction is in place before anything else loads.
 */
import {installRedactingLogger} from './install';

installRedactingLogger();
