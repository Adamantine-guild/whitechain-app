import { testWithSynpress } from '@synthetixio/synpress';
import { metaMaskFixtures } from '@synthetixio/synpress/playwright';
import metamaskSetup from './wallet-setup/metamask.setup';

export const test = testWithSynpress(metaMaskFixtures(metamaskSetup));

export { expect } from '@playwright/test';
