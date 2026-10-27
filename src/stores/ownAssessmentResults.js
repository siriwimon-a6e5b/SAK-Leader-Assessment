import { create } from "zustand";
import CryptoJS from "crypto-js";
import apiClient from "../recoilstore/userStores";
import { appConfig } from "../config/appConfig";

const CACHE_KEY = "own-assessment-results-v1";
let pending = null;
export const useOwnAssessmentResults = create(() => ({ key: "", status: "idle", canView: false, rounds: [], error: "" }));

export function loadOwnAssessmentResults(force = false) {
  const token = localStorage.getItem(appConfig.auth.tokenStorageKey);
  const key = token ? CryptoJS.SHA256(token).toString() : "";
  const current = useOwnAssessmentResults.getState();
  if (!key) {
    useOwnAssessmentResults.setState({ key: "", status: "idle", canView: false, rounds: [], error: "" });
    try { sessionStorage.removeItem(CACHE_KEY); } catch { /* Storage may be disabled. */ }
    return Promise.resolve();
  }
  if (pending?.key === key) return pending.promise;
  if (!force && current.key === key && current.status !== "idle") return Promise.resolve();
  if (!force) {
    try {
      const cached = JSON.parse(sessionStorage.getItem(CACHE_KEY));
      if (cached?.key === key && typeof cached.canView === "boolean" && Array.isArray(cached.rounds)) {
        useOwnAssessmentResults.setState({ ...cached, status: "ready", error: "" });
        return Promise.resolve();
      }
    } catch { /* Invalid or unavailable cache: use one request. */ }
  }
  useOwnAssessmentResults.setState({ key, status: "loading", canView: false, rounds: [], error: "" });
  const promise = apiClient.get("/api/insurances/getOwnAssessmentResults")
    .then(({ data }) => {
      if (useOwnAssessmentResults.getState().key !== key) return;
      const result = data?.result;
      if (typeof result?.canView !== "boolean" || !Array.isArray(result.rounds)) throw new Error("รูปแบบข้อมูลผลประเมินไม่ถูกต้อง");
      const next = { key, canView: result.canView, rounds: result.rounds };
      useOwnAssessmentResults.setState({ ...next, status: "ready", error: "" });
      try { sessionStorage.setItem(CACHE_KEY, JSON.stringify(next)); } catch { /* Memory cache remains available. */ }
    })
    .catch((error) => {
      if (useOwnAssessmentResults.getState().key === key) useOwnAssessmentResults.setState({ status: "error", error: error?.response?.data?.message || error.message || "โหลดผลประเมินไม่สำเร็จ" });
    })
    .finally(() => { if (pending?.key === key) pending = null; });
  pending = { key, promise };
  return promise;
}

export function markOwnAssessmentResultAcknowledged(roundCode) {
  const current = useOwnAssessmentResults.getState();
  const rounds = current.rounds.map((round) =>
    String(round.EVC_Code) === String(roundCode)
      ? {
          ...round,
          resultAcknowledged: true,
          resultAcknowledgedAt: new Date().toISOString(),
        }
      : round,
  );
  const next = { ...current, rounds };

  useOwnAssessmentResults.setState(next);

  if (current.key) {
    try {
      sessionStorage.setItem(CACHE_KEY, JSON.stringify({
        key: current.key,
        canView: current.canView,
        rounds,
      }));
    } catch {
      // Memory state remains available when session storage is disabled.
    }
  }
}
