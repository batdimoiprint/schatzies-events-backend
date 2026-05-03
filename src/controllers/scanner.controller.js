import { scanQrCode as scanQrCodeService } from '../services/scanner.service.js';

function buildGuestName(guest) {
  return [guest.guestfirstName, guest.guestmiddleName, guest.guestlastName]
    .filter(Boolean)
    .join(' ')
    .trim();
}

export async function scanQrCode(req, res) {
  try {
    const { eventId, qrCode } = req.body ?? {};
    const guest = await scanQrCodeService(eventId, qrCode);
    return res.status(200).json({
      message: 'Guest checked in',
      guestName: buildGuestName(guest),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unable to scan QR';
    return res.status(400).json({ message });
  }
}
