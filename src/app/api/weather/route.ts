import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const lat = searchParams.get('lat');
  const lon = searchParams.get('lon');

  if (!lat || !lon) {
    return NextResponse.json({ error: 'Missing coordinates' }, { status: 400 });
  }

  const apiKey = process.env.OPENWEATHER_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Weather API key not configured' },
      { status: 500 }
    );
  }

  try {
    const res = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&lang=de&appid=${apiKey}`,
      { next: { revalidate: 600 } }
    );

    if (!res.ok) throw new Error('Weather fetch failed');
    const data = await res.json();

    return NextResponse.json({
      temp: data.main.temp,
      tempMin: data.main.temp_min,
      tempMax: data.main.temp_max,
      feelsLike: data.main.feels_like,
      humidity: data.main.humidity,
      windSpeed: data.wind.speed * 3.6, // m/s to km/h
      description: data.weather[0]?.description ?? '',
      icon: data.weather[0]?.icon ?? '',
      main: data.weather[0]?.main ?? '',
      precipitation: data.clouds?.all,
      location: data.name,
    });
  } catch (err) {
    return NextResponse.json({ error: 'Weather fetch failed' }, { status: 500 });
  }
}
