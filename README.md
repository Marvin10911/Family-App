# Family App

Eine moderne Familien-Organisations-App mit AI-Integration — Einkaufsliste, Aufgaben, Essensplan, Wetter, Müllplan, Kalender und mehr.

## Features

- **Dashboard** — Übersichtliches Widget-Grid mit allen Infos auf einen Blick
- **Einkaufsliste (AI)** — Natürliche Spracheingabe, Rezept-zu-Einkaufsliste, Auto-Kategorisierung
- **Aufgaben (AI)** — Todos mit Prioritäten, AI-Vorschlägen und Punktesystem
- **Essensplan (AI)** — Wochenpläne per AI generieren
- **Wetter** — Live-Wetter am Gerätestandort
- **Müllplan (AI)** — AI-gestützte Leerungstermine basierend auf Standort
- **Kalender** — Gemeinsame Familientermine
- **Admin-Bereich** — Mitgliederverwaltung, Rollen, Einstellungen
- **Familie & Einladungscode** — Familien erstellen und Mitglieder einladen
- **Family AI Assistent** — Floating Chat mit Kontext zu allen Familiendaten
- **Gamification** — Punkte für erledigte Aufgaben, Rangliste
- **Dark/Light Mode** — Schönes Design in beiden Modi
- **PWA & Push-Benachrichtigungen**
- **Geräteübergreifend** — Echtzeit-Sync über Firebase

## Tech Stack

- **Next.js 15** (App Router) + **TypeScript**
- **Tailwind CSS** + **Framer Motion**
- **Firebase** (Auth, Firestore, FCM)
- **OpenAI** (GPT-4o)
- **OpenWeatherMap**
- **React Query** + **Zustand**

## Setup

### 1. Dependencies installieren

```bash
npm install
```

### 2. Environment-Variablen

Kopiere `.env.example` nach `.env.local` und fülle die Werte aus:

```bash
cp .env.example .env.local
```

**Firebase Client** (aus Firebase Console → Projekteinstellungen → Allgemein → SDK-Snippet):
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `NEXT_PUBLIC_FIREBASE_VAPID_KEY` (aus Cloud Messaging → Web-Push-Zertifikate)

**Firebase Admin** (aus Firebase Console → Projekteinstellungen → Dienstkonten → Privaten Schlüssel generieren):
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY` (mit `\n` statt echter Zeilenumbrüche)

**OpenAI**:
- `OPENAI_API_KEY` (von https://platform.openai.com/api-keys)

**OpenWeatherMap**:
- `OPENWEATHER_API_KEY` (kostenlos von https://openweathermap.org/api)

### 3. Firebase einrichten

1. Projekt auf https://console.firebase.google.com erstellen
2. Authentication aktivieren → Email/Passwort aktivieren
3. Firestore Database erstellen (Production mode)
4. Cloud Messaging aktivieren
5. Firestore-Regeln deployen:

```bash
npx firebase deploy --only firestore:rules
```

### 4. Starten

```bash
npm run dev
```

Öffne http://localhost:3000

## Erste Schritte

1. **Registrieren** mit E-Mail und Passwort
2. **Familie erstellen** oder mit Code beitreten
3. **Standort** im Admin-Bereich einstellen (für Müllplan)
4. Push-Benachrichtigungen aktivieren
5. Widgets auf dem Dashboard nutzen

## Projekt-Struktur

```
src/
├── app/                   # Next.js App Router
│   ├── (auth)/            # Login, Register
│   ├── (app)/             # Geschützte App-Seiten
│   │   ├── dashboard/
│   │   ├── shopping/
│   │   ├── tasks/
│   │   ├── meals/
│   │   ├── calendar/
│   │   ├── waste/
│   │   ├── family/
│   │   └── admin/
│   ├── api/               # API Routes
│   └── onboarding/
├── components/            # React Komponenten
│   ├── dashboard/
│   ├── layout/
│   └── ai/
├── lib/                   # Bibliotheken & Utils
│   ├── firebase/
│   ├── openai/
│   ├── auth/
│   └── family/
├── hooks/                 # Custom Hooks
└── types/                 # TypeScript Typen
```

## Lizenz

Privat
