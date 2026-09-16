import axios from "axios";

type AuthAction = "login" | "register";

// Protected requests answer 401 once the short-lived access token expires.
export function isSessionError(error: unknown) {
  return axios.isAxiosError(error) && error.response?.status === 401;
}
const safeMessages: Record<string, string> = {
  "Invalid email or password":
    "The email or password is incorrect. Please try again.",
  "An account with this email already exists":
    "An account with this email already exists. Try logging in.",
  "This account is not active":
    "This account is not active. Please contact your event organizer for help.",
};

export function getAuthErrorMessage(
  error: unknown,
  action: AuthAction,
): string {
  if (!axios.isAxiosError(error)) {
    return error instanceof Error && error.message === "API_NOT_CONFIGURED"
      ? "Sign in and registration are temporarily unavailable. Please try again later."
      : "We couldn’t complete your request. Please try again.";
  }
  if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT")
    return "The request took too long. Please try again.";
  if (!error.response)
    return "We couldn’t connect. Check your internet connection and try again.";
  const status = error.response.status;
  if (status >= 500)
    return "Our service is temporarily unavailable. Please try again in a moment.";
  const data: unknown = error.response.data;
  const message =
    typeof data === "object" && data !== null && "message" in data
      ? data.message
      : undefined;
  if (
    typeof message === "string" &&
    Object.prototype.hasOwnProperty.call(safeMessages, message)
  )
    return safeMessages[message];
  if (status === 401)
    return "The email or password is incorrect. Please try again.";
  if (status === 403)
    return "This account is not active. Please contact your event organizer for help.";
  if (status === 409)
    return "An account with this email already exists. Try logging in.";
  if (status === 400 || status === 422)
    return "Please check your details and try again. One or more fields could not be accepted.";
  if (status === 429)
    return "Too many attempts. Please wait a moment before trying again.";
  return action === "login"
    ? "We couldn’t log you in. Please try again."
    : "We couldn’t create your account. Please try again.";
}
