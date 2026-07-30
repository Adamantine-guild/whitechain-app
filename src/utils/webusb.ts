// WebUSB Hardware Wallet Integration Helper
// Solves whitechain-app Issue #27 ($150 USDC Bounty)

export async function connectWebUSBHardwareWallet(): Promise<USBDevice | null> {
  if (!navigator.usb) {
    throw new Error('WebUSB is not supported in this browser environment.');
  }

  const device = await navigator.usb.requestDevice({
    filters: [{ vendorId: 0x2c97 }] // Ledger Vendor ID
  });

  await device.open();
  await device.selectConfiguration(1);
  await device.claimInterface(0);

  return device;
}
