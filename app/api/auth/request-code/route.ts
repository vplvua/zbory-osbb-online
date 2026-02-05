import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { generateOtpCode, getOtpExpiry, hashOtpCode } from '@/lib/auth/otp';
import { getAuthSecret } from '@/lib/auth/secret';
import { getSmsAdapter } from '@/lib/sms/adapter';
import { isValidPhone, normalizePhone } from '@/lib/auth/validation';

export async function POST(request: Request) {
  let payload: { phone?: string };

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: 'Невірні дані.' }, { status: 400 });
  }

  const phone = normalizePhone(payload.phone ?? '');
  if (!isValidPhone(phone)) {
    return NextResponse.json(
      { ok: false, message: 'Невірний формат номера телефону.' },
      { status: 400 },
    );
  }

  const code = generateOtpCode();
  const codeHash = hashOtpCode(phone, code, getAuthSecret());
  const expiresAt = getOtpExpiry();

  const otp = await prisma.smsOtp.create({
    data: {
      phone,
      codeHash,
      expiresAt,
    },
  });

  const smsAdapter = getSmsAdapter();
  try {
    const sent = await smsAdapter.sendCode(phone, code);
    if (!sent) {
      await prisma.smsOtp.delete({ where: { id: otp.id } });
      return NextResponse.json(
        { ok: false, message: 'Не вдалося надіслати SMS. Спробуйте пізніше.' },
        { status: 500 },
      );
    }
  } catch {
    await prisma.smsOtp.delete({ where: { id: otp.id } });
    return NextResponse.json(
      { ok: false, message: 'Не вдалося надіслати SMS. Спробуйте пізніше.' },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
