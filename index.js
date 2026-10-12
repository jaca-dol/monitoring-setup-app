/**
 * @format
 */

// Must be first: installs log redaction before any other module is evaluated.
// The SDK logs decoded device payloads through bare console calls, and
// REQ-A-15 forbids AppKeys reaching a log. See src/logging and
// docs/sdk-pre-stage1-review.md.
import './src/logging/bootstrap';

import {AppRegistry} from 'react-native';

import App from './src/App';
import {name as appName} from './app.json';

AppRegistry.registerComponent(appName, () => App);
