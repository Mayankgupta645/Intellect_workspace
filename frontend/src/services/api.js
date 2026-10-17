const env = import.meta.env;

export const apiRoutes = {
  login: env.VITE_API_LOGIN_PATH,
  logout: env.VITE_API_LOGOUT_PATH,
  register: env.VITE_API_REGISTER_PATH,
  me: env.VITE_API_ME_PATH,
  passwordReset: env.VITE_API_PASSWORD_RESET_PATH,
  postOptions: env.VITE_API_POST_OPTIONS_PATH,
  profileUpdate: env.VITE_API_PROFILE_UPDATE_PATH,
  attendanceStatus: env.VITE_API_ATTENDANCE_STATUS_PATH,
  attendanceSubmit: env.VITE_API_ATTENDANCE_SUBMIT_PATH,
  attendanceHistory: env.VITE_API_ATTENDANCE_HISTORY_PATH,
  adminActivate: env.VITE_API_ADMIN_ATTENDANCE_ACTIVATE_PATH,
  adminGenerateCode: env.VITE_API_ADMIN_ATTENDANCE_GENERATE_CODE_PATH,
  adminDeactivate: env.VITE_API_ADMIN_ATTENDANCE_DEACTIVATE_PATH,
  adminRecords: env.VITE_API_ADMIN_ATTENDANCE_RECORDS_PATH,
};

const baseUrl = (env.VITE_API_BASE_URL || "").replace(/\/+$/, "");
const localDemoKey = "intellects-local-demo";
const localDemoAccounts = import.meta.env.DEV ? {
  member: { email: "member.demo@intellects.local", password: "MemberDemo2026!" },
  admin: { email: "admin.demo@intellects.local", password: "AdminDemo2026!" },
} : null;

export function localDemoAvailable() {
  return env.DEV
    && typeof window !== "undefined"
    && ["localhost", "127.0.0.1", "[::1]"].includes(window.location.hostname);
}

export function localDemoCredentials(role) {
  if (!localDemoAvailable() || !localDemoAccounts || (role !== "member" && role !== "admin")) return null;
  return localDemoAccounts[role];
}

export function authenticateLocalDemo(email, password) {
  if (!localDemoAvailable() || !localDemoAccounts) return "";
  return Object.entries(localDemoAccounts).find(([, account]) =>
    account.email === String(email).trim().toLowerCase() && account.password === password
  )?.[0] || "";
}

export function localDemoRole() {
  if (!localDemoAvailable()) return "";
  try {
    const role = window.sessionStorage.getItem(localDemoKey);
    return role === "member" || role === "admin" ? role : "";
  } catch {
    return "";
  }
}

export function saveLocalDemoRole(role) {
  if (!localDemoAvailable() || (role !== "member" && role !== "admin")) {
    throw new ApiError("Local demo accounts are only available on the development server.", 0, "DEMO_UNAVAILABLE");
  }
  try {
    window.sessionStorage.setItem(localDemoKey, role);
  } catch {
    throw new ApiError("Could not sign in because browser session storage is unavailable.", 0, "DEMO_STORAGE_UNAVAILABLE");
  }
}

export function clearLocalDemoRole() {
  if (!localDemoAvailable()) return;
  try {
    window.sessionStorage.removeItem(localDemoKey);
  } catch {
    throw new ApiError("Could not end the demo session because browser session storage is unavailable.", 0, "DEMO_STORAGE_UNAVAILABLE");
  }
}

export class ApiError extends Error {
  constructor(message, status = 0, code = "") {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

export function isConfigured(route) {
  return Boolean(apiRoutes[route]);
}

export async function request(route, { method = "GET", body, signal } = {}) {
  if (localDemoRole()) {
    throw new ApiError("API-backed actions are disabled for local demo accounts.", 0, "LOCAL_DEMO");
  }
  const path = apiRoutes[route];
  if (!path) {
    throw new ApiError(`The ${route} API route is not configured.`, 0, "NOT_CONFIGURED");
  }
  if (!baseUrl && !/^https?:\/\//i.test(path)) {
    throw new ApiError("The API base URL is not configured.", 0, "NOT_CONFIGURED");
  }

  let response;
  try {
    response = await fetch(/^https?:\/\//i.test(path) ? path : `${baseUrl}${path.startsWith("/") ? "" : "/"}${path}`, {
      method,
      credentials: "include",
      headers: body === undefined ? { Accept: "application/json" } : {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    });
  } catch (error) {
    if (error.name === "AbortError") throw error;
    throw new ApiError("Could not connect to the service. Please try again later.", 0, "NETWORK_ERROR");
  }

  const contentType = response.headers.get("content-type") || "";
  let data = null;
  if (contentType.includes("application/json")) {
    try {
      data = await response.json();
    } catch {
      throw new ApiError("The service returned an unreadable response.", response.status, "INVALID_RESPONSE");
    }
  } else {
    await response.text();
    data = null;
  }

  if (!response.ok) {
    const code = data?.code || data?.errorCode || "";
    const serverMessage = data?.message || data?.error;
    const message = response.status === 401
      ? "Your session has expired or the supplied credentials are not valid."
      : response.status === 403
        ? "You are not authorised to perform this action."
        : response.status >= 500
          ? "The service is temporarily unavailable. Please try again later."
          : (typeof serverMessage === "string" ? serverMessage : `Request failed (${response.status}).`);
    throw new ApiError(message, response.status, code);
  }
  const responseStatus = String(data?.status || "").toLowerCase();
  if (data?.success === false || data?.ok === false || ["error", "failed", "failure"].includes(responseStatus)) {
    throw new ApiError(
      typeof data?.message === "string" ? data.message : "The service did not confirm that the operation succeeded.",
      response.status,
      data?.code || data?.errorCode || "OPERATION_REJECTED",
    );
  }
  return data;
}

export function unwrapObject(data) {
  return data?.user || data?.member || data?.profile || data?.data || data;
}

export function unwrapList(data) {
  if (Array.isArray(data)) return data;
  for (const key of ["records", "items", "options", "data", "history"]) {
    if (Array.isArray(data?.[key])) return data[key];
  }
  return [];
}

export function userIsAdmin(user) {
  const role = String(user?.role || user?.accountType || "").toLowerCase().replace(/[\s-]+/g, "_");
  const roles = Array.isArray(user?.roles) ? user.roles.map((item) => String(item).toLowerCase()) : [];
  return user?.isAdmin === true
    || user?.isCoreTeamAdmin === true
    || ["admin", "core_team_admin", "administrator"].includes(role)
    || roles.some((item) => ["admin", "core_team_admin", "administrator"].includes(item));
}

export function attendanceIsActive(data) {
  if (typeof data?.active === "boolean") return data.active;
  if (typeof data?.isActive === "boolean") return data.isActive;
  const status = String(data?.status || data?.sessionStatus || "").toLowerCase();
  if (["active", "open", "started"].includes(status)) return true;
  if (["inactive", "closed", "ended"].includes(status)) return false;
  return null;
}

export function explainApiError(error) {
  if (error?.code === "NOT_CONFIGURED") {
    return "This feature is waiting for the existing backend route to be configured.";
  }
  const code = String(error?.code || "").toUpperCase();
  if (["INVALID_CODE", "INVALID_ATTENDANCE_CODE"].includes(code)) return "That attendance code is invalid. Check the code and try again.";
  if (["CODE_EXPIRED", "SESSION_EXPIRED", "ATTENDANCE_SESSION_EXPIRED"].includes(code)) return "This attendance code or session has expired.";
  if (["SESSION_INACTIVE", "SESSION_CLOSED", "ATTENDANCE_CLOSED"].includes(code)) return "Attendance is currently closed.";
  if (["DUPLICATE_ATTENDANCE", "ALREADY_ATTENDED", "ATTENDANCE_EXISTS"].includes(code)) return "Attendance has already been recorded for this session.";
  return error?.message || "Something went wrong. Please try again.";
}
