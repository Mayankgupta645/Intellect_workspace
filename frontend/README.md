# INTELLECTS Workspace

Responsive React frontend for the public club site, member portal, and Core Team attendance dashboard.

## Run locally

```sh
npm install
npm run dev
```

## Backend integration

The frontend connects to `https://intellect-workspace.onrender.com` by default, including when running locally with `npm run dev`. To use a local backend instead, set `VITE_API_BASE_URL=` and `VITE_API_PROXY_TARGET=http://localhost:5000` in `frontend/.env.local`; Vite proxies `/api` requests to that local service. The included backend can be configured with `Backend/.env` (`MONGODB_URI`, `ADMIN_EMAIL`, and a newly chosen `ADMIN_PASSWORD` with 12+ characters, uppercase and lowercase letters, a number, and a special character) and started from `Backend` with `npm start`. The backend creates or promotes only the account matching `ADMIN_EMAIL`; it hashes the configured password and synchronizes it on startup. For production, configure the hosted backend's `FRONTEND_ORIGINS` to include the frontend's deployed origin so credentialed API requests are accepted.

Signup offers Member and Core Team account types. Member accounts can only use member sign-in. Core Team requests remain pending and cannot sign in until an administrator approves them in **Core approvals** in the Core Team console; rejected requests remain blocked. Approved Core Team users can view the **Members** directory; only administrators can approve/reject applications. Signed-in members can update profile details and upload or remove a JPEG, PNG, or WebP profile image up to 2 MB. Member registration, sign-in, logout, current-user lookup, profile updates, and Core Team approval use backend routes. Sign-in uses an HTTP-only session cookie and passwords are hashed before storage.

For a separately hosted frontend, configure the backend `FRONTEND_ORIGINS` environment variable as a comma-separated list of permitted origins. The frontend uses `https://intellect-workspace.onrender.com` as its default API base; set `VITE_API_BASE_URL` to override it for another deployment. Cookie credentials are sent with requests. Attendance status, code submission, and member history are available to signed-in users; approved Core Team members can activate/deactivate sessions, refresh the active code, and view attendance records. Activating a session generates a code immediately; the session and its code remain active until an administrator deactivates the session or refreshes the code. New registrations require class and section, and attendance records retain those details with the member role and registration number. Admin attendance records include weekday and date, and can be printed or saved as a PDF from the records page. Attendance codes are only returned by protected admin routes. Session state is kept in memory and resets when the backend restarts; attendance records are stored in MongoDB.

## Club content and visual references

- The club description, slogan, domains, leadership names/roles, updates, astronaut, and leadership portraits are sourced from [the INTELLECTS club website](https://intellects-club-website-khaki.vercel.app/). The supplied circular badge `src/assets/intellects-badge.png` is used for compact branding. The loading screen uses a transparent cutout of the club astronaut on a dark starfield, with a drifting animation and progress line. Content and image mappings live in `src/data/club.js`; project images are bundled locally under `src/assets/`.
- S. Mounisha (Competitive Programming Lead) and Shabaz Sheikh (Competitive Programming Co-Lead), their portraits, and the two new images split from the supplied leads composite are included after the Technical Lead pair in the leadership cards.
- The Instagram bio and official profile link are from [INTELLECTS on Instagram](https://www.instagram.com/intellects_srmramapuram/). LinkedIn redirected to its sign-in page during inspection, so the UI links to the supplied company profile but does not invent post details.
- The loading screen follows the supplied reference recording's dark, minimal composition with a floating astronaut and loading text; the club's existing website hero remains independently branded.
- The home page features the supplied INTELLECTS group photo, activity cards, and an automatically advancing gallery of club workshop and challenge photos (two seconds per slide), with manual navigation and pause controls. Public-page sections and cards animate into view throughout scrolling over subtle hero-inspired grid, star, and atmospheric glow backgrounds; motion is reduced when requested by the visitor's device settings. The Events section retains the club recruitment, committee, and project updates. A dark/light theme toggle is available across the public site, authentication pages, and dashboards; the selection is saved in the browser.
- The club site lists recruitment, committee, and project updates but no event dates; those cards are labeled as updates and direct visitors to official social channels for current schedules.

The profile page only permits edits when the backend provides both an update route and an `editableFields` allowlist.
