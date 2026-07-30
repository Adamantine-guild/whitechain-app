import { defineWalletSetup } from '@synthetixio/synpress';
import { MetaMask } from '@synthetixio/synpress/playwright';

const SEED_PHRASE = 'test test test test test test test test test test test junk';
const PASSWORD = 'Synpress123!';

export default defineWalletSetup(PASSWORD, async (context, page) => {
  const metamask = new MetaMask(context, page, PASSWORD);
  await metamask.importWallet(SEED_PHRASE);
});
