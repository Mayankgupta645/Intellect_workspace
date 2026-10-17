# INTELLECTS Workspace

Responsive React frontend for the public club site, member portal, and Core Team attendance dashboard.

## Run locally

```sh
npm install
npm run dev
```

## Local demo accounts

Use these fake accounts on the Vite development server at `localhost` or `127.0.0.1`:

| Login page | Email | Password |
|---|---|---|
| `/member/login` | `member.demo@intellects.local` | `MemberDemo2026!` |
| `/admin/login` | `admin.demo@intellects.local` | `AdminDemo2026!` |

These accounts are accepted only in local development and are not backend users. They allow sign-in to the member and admin dashboard layouts; sessions last only for the browser session. API requests and dashboard write actions are blocked for demo accounts, so they cannot modify backend data. Demo sign-in is unavailable in production builds.

## Backend integration

No backend source or API contract was included with the project. API routes are therefore not guessed or called by default. Copy `.env.example` to `.env.local` and set the base URL and only the routes that exist in the backend. Requests use cookie credentials (`credentials: "include"`); authentication state and tokens are not written to local storage.

The service layer in `src/services/api.js` currently expects:

- Login: `POST`, JSON `{ email, password }`; a response containing a user/profile object or a session cookie usable by the current-user route. Logout: optional `POST` to clear a server session.
- Registration: `POST`, JSON `{ name, registerNumber, email, password, domain, post, year }`. Domain is descriptive and does not grant an admin role.
- Current user: `GET`; response with a user/profile object. An admin role must be included by the backend.
- Post options: `GET`; response as a string array or `{ options: [...] }`. Registration intentionally remains unavailable until valid options can be populated.
- Attendance status/history: `GET`; history may be a list or an object with `records`, `items`, or `data`.
- Attendance submission: `POST`, JSON `{ code }`; the UI only shows success when the backend confirms it.
- Admin activate/generate/deactivate: `POST`; deactivate is confirmed before sending. Admin records: `GET`.
- Profile update: `PATCH`, JSON containing only fields explicitly listed in the current user response's `editableFields`.
- Password reset is shown only when a reset route is configured; it uses `POST` `{ email }`.

If the backend uses different paths, verbs, payload keys, or response fields, adapt the mapping and response parsing in `src/services/api.js` to its documented contract before configuring the environment. Missing routes display an explicit integration message; no mock operation is presented as saved or successful.

## Club content and visual references

- The club description, slogan, domains, leadership names/roles, updates, astronaut, and leadership portraits are sourced from [the INTELLECTS club website](https://intellects-club-website-khaki.vercel.app/). The supplied circular badge `src/assets/intellects-badge.png` is used for compact branding. The loading screen uses a transparent cutout of the club astronaut on a dark starfield, with a drifting animation and progress line. Content and image mappings live in `src/data/club.js`; project images are bundled locally under `src/assets/`.
- S. Mounisha (Competitive Programming Lead) and Shabaz Sheikh (Competitive Programming Co-Lead), their portraits, and the two new images split from the supplied leads composite are included after the Technical Lead pair in the leadership cards.
- The Instagram bio and official profile link are from [INTELLECTS on Instagram](https://www.instagram.com/intellects_srmramapuram/). LinkedIn redirected to its sign-in page during inspection, so the UI links to the supplied company profile but does not invent post details.
- The loading screen follows the supplied reference recording's dark, minimal composition with a floating astronaut and loading text; the club's existing website hero remains independently branded.
- The home page features the supplied INTELLECTS group photo, activity cards, and an automatically advancing gallery of club workshop and challenge photos (two seconds per slide), with manual navigation and pause controls. Public-page sections and cards animate into view throughout scrolling over subtle hero-inspired grid, star, and atmospheric glow backgrounds; motion is reduced when requested by the visitor's device settings. The Events section retains the club recruitment, committee, and project updates. A dark/light theme toggle is available across the public site, authentication pages, and dashboards; the selection is saved in the browser.
- The club site lists recruitment, committee, and project updates but no event dates; those cards are labeled as updates and direct visitors to official social channels for current schedules.

The profile page only permits edits when the backend provides both an update route and an `editableFields` allowlist.
