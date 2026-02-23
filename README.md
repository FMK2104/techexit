# TechExit - Systemkortlaegning med Node.js og SQLite

Node.js-app til at registrere:
- Systemer i virksomheden
- Europaeiske alternativer pr. system
- Afhaengigheder mellem systemer
- Konsekvensanalyse ved udskiftning

## Start

```bash
npm install
npm run dev
```

Aabn derefter:
- `http://localhost:3000`

Databasen oprettes automatisk i `data.sqlite`.

## Docker (port 6000)

Byg image lokalt med tags:

```bash
docker build -t techexit:latest -t techexit:v1.0.0 .
```

Koer container paa port `6000`:

```bash
docker run --rm -p 6000:6000 \
  -e PORT=6000 \
  -e DB_PATH=/data/data.sqlite \
  -v techexit_data:/data \
  techexit:latest
```

Eller brug Compose:

```bash
docker compose up -d --build
```

## GitHub build og tags

Workflow: `.github/workflows/docker-image.yml`

Ved push buildes Docker image automatisk og push'es til `ghcr.io/<owner>/<repo>` med tags:
- `latest` (kun default branch)
- branch tags (fx `main`)
- PR tags
- semver tags ved git tags (fx `v1.2.3` -> `1.2.3` og `1.2`)
- commit SHA tag

## Login og brugerroller

- Du skal vaere logget ind for at se eller redigere data.
- Ved foerste opstart oprettes en standard administrator:
  - Brugernavn: `admin`
  - Adgangskode: `admin123`
- Kun administratorer kan oprette nye brugere.
- Alle brugere kan selv skifte deres adgangskode efter login.
- Du kan overskrive standard-login via miljoevariabler:
  - `DEFAULT_ADMIN_USERNAME`
  - `DEFAULT_ADMIN_PASSWORD`
- Det anbefales at saette en unik `SESSION_SECRET` i produktion.

## Frontend funktioner

I browseren kan du:
- Oprette, redigere og slette systemer
- Vaelge et system og tilfoeje/slette alternativer
- Oprette/slette afhaengigheder mellem systemer
- Koere konsekvensanalyse pr. system

## API (udvalg)

- `GET /auth/me`
- `POST /auth/login`
- `POST /auth/change-password`
- `POST /auth/logout`
- `GET /users` (admin)
- `POST /users` (admin)
- `GET /systems`
- `GET /systems/:id`
- `POST /systems`
- `PUT /systems/:id`
- `DELETE /systems/:id`
- `POST /systems/:id/alternatives`
- `PUT /alternatives/:id`
- `DELETE /alternatives/:id`
- `POST /dependencies`
- `DELETE /dependencies/:id`
- `GET /analysis/impact/:systemId`
- `GET /graph`
- `GET /health`
