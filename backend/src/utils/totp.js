import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import dotenv from 'dotenv';

dotenv.config();

const ISSUER = process.env.TOTP_ISSUER || 'SecureLoginApp';

/** Generate a new base32 TOTP secret (for enrollment). */
export function generateTotpSecret(username) {
  const secret = speakeasy.generateSecret({
    name: `${ISSUER} (${username})`,
    issuer: ISSUER,
    length: 20,
  });
  return {
    base32: secret.base32,
    otpauthUrl: secret.otpauth_url,
  };
}

/** Convert an otpauth:// URL into a data:image/png;base64 QR code. */
export async function generateQrDataUrl(otpauthUrl) {
  return QRCode.toDataURL(otpauthUrl, { errorCorrectionLevel: 'M' });
}

/**
 * Verify a 6-digit code against a base32 secret.
 * window:1 tolerates ±30 seconds of clock drift.
 */
export function verifyTotpCode(base32Secret, token) {
  return speakeasy.totp.verify({
    secret: base32Secret,
    encoding: 'base32',
    token: String(token).trim(),
    window: 1,
  });
}