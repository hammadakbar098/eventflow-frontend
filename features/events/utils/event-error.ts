import axios from "axios";
export function isEventNotFound(error: unknown) {
  return axios.isAxiosError(error) && error.response?.status === 404;
}
export function eventErrorMessage(error: unknown) {
  if (axios.isAxiosError(error) && !error.response)
    return "We couldn’t connect. Check your connection and try again.";
  if (isEventNotFound(error))
    return "This event may have moved or is no longer available.";
  return "We couldn’t load the events right now. Please try again in a moment.";
}
