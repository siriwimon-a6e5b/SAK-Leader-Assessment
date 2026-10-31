import { create } from "zustand";
import apiClient from "../recoilstore/userStores";

let inFlight = null;
let lastLoaded = 0;
export const useApprovalNotifications = create(() => ({ count: null }));

export function refreshApprovalCount(force = false) {
  if (inFlight) return force ? inFlight.then(() => refreshApprovalCount(true)) : inFlight;
  if (!force && Date.now() - lastLoaded < 30000) return Promise.resolve();
  inFlight = apiClient.get("/getPendingApprovalCount")
    .then(({ data }) => {
      const count = Number(data?.result?.pendingCount);
      if (!Number.isInteger(count) || count < 0) throw new Error("Invalid pending count");
      useApprovalNotifications.setState({ count });
      lastLoaded = Date.now();
    })
    .catch(() => { lastLoaded = 0; })
    .finally(() => { inFlight = null; });
  return inFlight;
}
