import { NextRequest, NextResponse } from 'next/server';
import type { AlertPayload } from '@/types/betting';
import { formatAmericanOdds, formatEV } from '@/lib/betting-utils';

export async function POST(request: NextRequest) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_FROM_NUMBER;
  const toNumber = process.env.TWILIO_TO_NUMBER;

  if (!accountSid || !authToken || !fromNumber || !toNumber) {
    return NextResponse.json(
      { error: 'Twilio is not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER, TWILIO_TO_NUMBER.' },
      { status: 500 }
    );
  }

  let payload: AlertPayload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { game, team, odds, ev, bookmaker, sport } = payload;

  const message = [
    `🔥 BEST BET ALERT — ${sport.toUpperCase()}`,
    `Game: ${game}`,
    `Team: ${team}`,
    `Odds: ${formatAmericanOdds(odds)} @ ${bookmaker}`,
    `EV: ${formatEV(ev)}`,
    `Recommendation: ${ev >= 0.08 ? 'MAX BET' : 'STRONG +EV'}`,
  ].join('\n');

  try {
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;

    const formData = new URLSearchParams();
    formData.append('From', fromNumber);
    formData.append('To', toNumber);
    formData.append('Body', message);

    const credentials = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

    const res = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: `Twilio error: ${res.status} ${text}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json({ success: true, sid: data.sid });
  } catch (err) {
    console.error('Twilio send error:', err);
    return NextResponse.json({ error: 'Failed to send SMS' }, { status: 500 });
  }
}
