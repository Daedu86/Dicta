import { describe } from 'vitest';
import { runAppProfileOpenRouterAccessSuite } from './helpers/appProfileOpenRouterAccessSuite';
import { runAppProfileQuotaSuite } from './helpers/appProfileQuotaSuite';
import { runAppProfileSyncProfileSuite } from './helpers/appProfileSyncProfileSuite';

describe('appProfiles', () => {
  runAppProfileSyncProfileSuite();
  runAppProfileQuotaSuite();
  runAppProfileOpenRouterAccessSuite();
});
