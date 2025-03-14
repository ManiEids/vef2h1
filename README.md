# Verkefnalisti Mána - Vefforritun 2, Hópaverkefni 1

Þetta verkefni er uppfært verkefnalista (Todo) forrit með notendastjórnun, flokkum, merkingum og myndsendingum.

## Tækni

- **Bakendi**: Node.js, Express, PostgreSQL
- **Framendi**: JavaScript, HTML, CSS
- **Öryggi**: JWT, bcrypt
- **Hýsing**: Render

## Virkni

- Notendastjórnun með auðkenningu og mismunandi réttindum
- CRUD aðgerðir fyrir verkefni
- Flokkar og merkingar fyrir verkefni
- Forgangur og skiladagar fyrir verkefni
- Myndastuðningur fyrir verkefni
- Síun, leit og röðun á verkefnum
- Síðuskipting

## Uppsetningu

### Nauðsynleg forrit

- Node.js (v14+)
- PostgreSQL
- Git

### Uppsetning fyrir þróun

1. Klónaðu verkefnið:
   ```
   git clone https://github.com/þitt-repo/verkefnalisti-mana.git
   cd verkefnalisti-mana
   ```

2. Settu upp umhverfisbreytur:
   - Afritaðu `.env.example` skrána sem `.env` og breyttu eftir þörfum
   - Settu `DATABASE_URL` og `JWT_SECRET` breytur

3. Settu upp gagnagrunn:
   ```
   psql postgres < server/database.sql
   ```

4. Settu upp pakka og keyrðu:
   ```
   npm install
   npm run dev
   ```

5. Hlaðið inn gögnum:
   ```
   node server/seed.js
   ```

## Keyrsla verkefnis

Verkefnið er keyrt með:
```
npm start
```

Þróunarumhverfi er keyrt með:
```
npm run dev
```

## Test

Keyrsla prófa:
```
npm test
```

## Gagnagrunnsuppbygging

Verkefnið notar PostgreSQL gagnagrunn með eftirfarandi töflum:
- users: Notendur kerfisins
- tasks: Verkefni notenda
- categories: Flokkar fyrir verkefni
- tags: Merkingar fyrir verkefni
- task_tags: Tengitafla milli verkefna og merkja
- task_history: Saga breytinga á verkefnum
- comments: Athugasemdir við verkefni
- task_attachments: Skrár tengdar verkefnum

## API Leiðir

### Notendastjórnun
- POST `/auth/login`
- POST `/auth/register`
- GET `/auth/me`

### Verkefni
- GET `/tasks`
- GET `/tasks/:id`
- POST `/tasks`
- PUT `/tasks/:id`
- DELETE `/tasks/:id`
- GET `/tasks/categories/all`
- GET `/tasks/tags/all`

### Hleðsla skráa
- POST `/upload`
- GET `/upload/task/:taskId`
- DELETE `/upload/:id`

## Innskráning

Sjálfgefinn notandi fyrir prófun:

- Notandanafn: `admin` 
- Lykilorð: `admin`

Sá notandi hefur stjórnanda réttindi og getur því framkvæmt allar aðgerðir.

## Höfundur

Máni - HÍ 2025

