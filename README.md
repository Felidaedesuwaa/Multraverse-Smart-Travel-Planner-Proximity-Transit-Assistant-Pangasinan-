# Multraverse

Multraverse is a cross-platform travel companion for Android, iOS, and the web. It includes trip planning, budgets, saved places, transit routes, geofences, phrasebook and translation tools, AI itinerary generation, and admin screens.

## Display preferences

Open **Settings → App Preferences** to switch Dark Mode or search the currency dropdown. Both preferences persist on the current device/browser and apply throughout the app.

Budgets, expenses, and itinerary costs are stored in PHP. Their displays show the selected currency first, with the original PHP amount underneath in parentheses. Selecting PHP shows a single amount. Amount fields accept the selected currency and convert back to PHP when saved. The dropdown includes 166 currencies supported by [ExchangeRate-API](https://www.exchangerate-api.com/docs/free), using its public PHP-based endpoint without an API key. Successful rates are cached for 24 hours. Offline, the last available rates are used; without a matching cached rate, amounts remain explicitly labeled PHP. Converted amounts are estimates, with the rate date and provider shown in the footer.

Run `node scripts/check-preferences.cjs` to check currency precision, PHP conversions, unavailable-rate handling, and theme color behavior.

## Profile settings

**Settings → Edit Profile** saves your name and location to your account. **Change Photo** opens a photo preview: choose an image, then save or cancel. You can also remove your current photo. Saved names and photos update in Settings and the mobile/desktop sidebar, and are restored on sign-in. The sign-in email is displayed as read-only.

The [Expo photo picker](https://docs.expo.dev/versions/v54.0.0/sdk/imagepicker/) and image manipulator support Android, iOS, and web. Photos are cropped to a square, resized to 512 × 512 JPEG, and stored with the user in MongoDB (maximum 512 KB). No separate image-hosting service is required. Rebuild installed native binaries after adding these dependencies; Expo Go can use the updated JavaScript bundle.

Run `npm run build --prefix server` then `node server/scripts/check-profile.cjs` to check profile validation.

## Technology Stack

Frontend:

- JavaScript with React 19
- React Native 0.81 and Expo SDK 54
- React Navigation
- Zustand for client state
- Async Storage for local persistence

Backend API:

- Node.js with TypeScript
- Express 5
- MongoDB with Mongoose
- JWT and bcryptjs authentication
- REST routes with ObjectId-compatible JSON serialization
- CORS

AI service:

- Python 3.11/3.12
- FastAPI with Uvicorn
- PyTorch and Hugging Face Transformers
- TinyLlama/TinyLlama-1.1B-Chat-v1.0 base model
- PEFT LoRA adapter fine-tuned for Pangasinan travel and translation
- Express communicates with the local service through `AI_SERVICE_URL`

The application uses the custom Python AI service for itinerary generation,
translation, and general text generation. It does not use Groq, Anthropic, or
Google Generative AI APIs.

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
AI_SERVICE_URL=http://localhost:8000
PORT=3001
CORS_ORIGINS=http://localhost:8081
```

`MONGODB_URI`, `JWT_SECRET`, and a reachable `AI_SERVICE_URL` are required for
the complete application. Start the Python service separately on port 8000
before using AI features.

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

AI service from `ai-service/`:

| Command                                     | Description                                     |
| ------------------------------------------- | ----------------------------------------------- |
| `.\venv\Scripts\python.exe main.py`         | Start the local FastAPI AI service on port 8000 |
| `.\venv\Scripts\python.exe train.py`        | Fine-tune the Pangasinan travel LoRA adapter    |
| `.\venv\Scripts\python.exe prepare_data.py` | Rebuild and validate training data              |

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

## Profile settings (web and mobile)

Edit Profile suggests locations after three characters. Pangasinan towns are bundled for offline suggestions; the authenticated `GET /api/locations/search?q=...` endpoint adds worldwide Photon/OpenStreetMap matches. Users can also keep a manually entered location. Search is debounced, obsolete requests are cancelled, and the backend caches results for 24 hours with bounded traffic and a five-second provider timeout.

The default [Photon public demo](https://github.com/komoot/photon#demo-server) needs no API key and allows reasonable usage without an availability guarantee. Set `PHOTON_URL` in `server/.env` to a dedicated Photon `/api/` endpoint for higher traffic. Search text goes to this provider; the user's name, email, and photo do not. OpenStreetMap attribution appears with suggestions.

Change Photo offers 16 bundled travel avatars and a local image upload. Both use a preview and explicit Save Changes; Cancel discards changes. Avatar IDs (`travel:01` through `travel:16`) or resized JPEGs persist in the existing profile `photo` field. Existing photo uploads require no migration.

Profile API checks: `npm run build --prefix server`, then `node server/scripts/check-profile.cjs` and `node server/scripts/check-locations.cjs`.
