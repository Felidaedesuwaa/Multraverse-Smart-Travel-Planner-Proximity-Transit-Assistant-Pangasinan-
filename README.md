# Multraverse

Multraverse is a cross-platform travel companion for Android, iOS, and the web. It includes trip planning, budgets, saved places, transit routes, geofences, phrasebook and translation tools, AI itinerary generation, and admin screens.

## Technology

Frontend:

- JavaScript
- React 19
- React Native 0.81
- Expo SDK 54
- React Navigation
- Zustand
- Async Storage

Backend:

- Node.js
- TypeScript
- Express 5
- MongoDB with Mongoose
- JWT and bcryptjs authentication
- CORS
- Groq, Anthropic, and Google Generative AI SDKs

## Requirements

- Node.js 18 or newer
- MongoDB Atlas or a local MongoDB server
- Expo Go for physical-device testing, or Android Studio/Xcode for native emulators

## Installation

Install frontend dependencies from the repository root:

```bash
npm install
```

Install backend dependencies:

```bash
cd server
npm install
```

Create `server/.env` using `server/.env.example` as a template:

```env
MONGODB_URI=mongodb+srv://USERNAME:PASSWORD@CLUSTER/multraverse?retryWrites=true&w=majority
JWT_SECRET=replace-with-a-long-random-secret
GROQ_API_KEY=
PORT=3001
CORS_ORIGINS=http://localhost:8081
```

`MONGODB_URI` and `JWT_SECRET` are required. `GROQ_API_KEY` is required for Groq-backed AI features. The backend also supports the Anthropic and Google Generative AI integrations when their route configuration and keys are provided.

## Running the Backend

Open a terminal in the repository root and run:

```bash
cd server
npm run dev
```

The API starts at `http://localhost:3001`. Check that it is running at `http://localhost:3001/api/health`. The expected response is `{"status":"ok"}`.

For a compiled backend:

```bash
cd server
npm run build
npm start
```

## Running the Frontend

Keep the backend running, then open a second terminal at the repository root:

```bash
npm start
```

Use the Expo CLI to choose a platform, or run one of these commands directly:

```bash
npm run web
npm run android
npm run ios
```

For an Android Studio emulator, start a virtual device in Device Manager, then run:

```bash
npm run android:emulator
```

This opens the app in Expo Go (installed automatically on first launch) with Metro
using localhost. Keep the backend running in another terminal with `cd server`
and `npm run dev`. The app uses `http://10.0.2.2:3001` to reach the computer's
backend from the emulator. An explicit `EXPO_PUBLIC_API_URL` overrides this address.
If Metro's default port is already occupied, use
`npm run android:emulator -- --port 8082`.

For a physical device, connect the device and computer to the same Wi-Fi network. The client detects the Expo development host for native development. For a deployed API or a backend on another machine, set this before starting Expo:

```env
EXPO_PUBLIC_API_URL=http://YOUR_API_HOST:3001
```

Web and the iOS simulator use `http://localhost:3001` by default. Android devices may need the computer's LAN IP address.

## Database Seeding

Run these commands from the `server` directory after configuring MongoDB:

```bash
npm run seed
npm run seed:kb
npm run seed:phrases
```

The seed scripts populate the main data, knowledge base, and phrasebook collections. They are safe to run repeatedly because each script checks whether its data already exists.

## Available Scripts

Root frontend scripts:

| Command           | Description                      |
| ----------------- | -------------------------------- |
| `npm start`       | Start Expo                       |
| `npm run web`     | Start Expo for web               |
| `npm run android` | Start Expo and open Android      |
| `npm run ios`     | Start Expo and open iOS          |
| `npm run build`   | Export the app for all platforms |
| `npm run lint`    | Run ESLint                       |

Backend scripts from `server/`:

| Command                | Description                          |
| ---------------------- | ------------------------------------ |
| `npm run dev`          | Run the API with Nodemon and ts-node |
| `npm run build`        | Compile the TypeScript API           |
| `npm start`            | Start the compiled API               |
| `npm run seed`         | Seed the main collections            |
| `npm run seed:kb`      | Seed the knowledge base              |
| `npm run seed:phrases` | Seed the phrasebook                  |

## Project Structure

```text
multraverse-web/
  src/                    Expo frontend
    components/           Shared UI components
    data/                 Local frontend data
    layouts/              App layouts
    lib/                  API and storage helpers
    pages/                User and admin screens
    store/                Zustand stores
    theme/                Colors, spacing, and typography
    utils/                Frontend utilities
  public/                 Public web assets
  server/                 Express backend
    src/
      lib/                MongoDB connection
      middleware/         Authentication middleware
      models/             Mongoose models
      routes/             API route modules
      index.ts            API entry point
    seeds/                MongoDB seed scripts
      seed.ts
      seedKnowledge.ts
      seedPhrasebook.ts
    .env.example          Backend environment template
    package.json          Backend scripts and dependencies
  app.json               Expo configuration
  package.json            Frontend scripts and dependencies
```

## API Routes

The backend provides route groups for authentication, users, trips, budgets, places, transit routes, geofences, AI, and knowledge data. The health check is available at `GET /api/health`.
