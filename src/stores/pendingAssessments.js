import { create } from "zustand";
import apiClient, { getInitialUserDetail } from "../recoilstore/userStores";
import { readTokenValue } from "../utils/tokenUtils";

let inFlight = null;
let lastLoaded = 0;

export const usePendingAssessments = create(() => ({
  count: null,
  countsByRound: {},
}));

function getRows(data) {
  const result = data?.result ?? data?.data ?? data;

  if (Array.isArray(result)) return result;
  if (Array.isArray(result?.rows)) return result.rows;
  if (Array.isArray(result?.data)) return result.data;

  return [];
}

export function refreshPendingAssessments(force = false) {
  if (inFlight) {
    return force
      ? inFlight.then(() => refreshPendingAssessments(true))
      : inFlight;
  }
  if (!force && Date.now() - lastLoaded < 30000) return Promise.resolve();

  const userDetail = getInitialUserDetail() || {};
  const params = {
    PerD: readTokenValue(userDetail.PerD),
    PerPST: readTokenValue(userDetail.PerPST),
    PerPST_LV: readTokenValue(userDetail.PerPST_LV),
    PerWP: readTokenValue(userDetail.PerWP),
  };

  if (!params.PerD) {
    usePendingAssessments.setState({ count: 0, countsByRound: {} });
    return Promise.resolve();
  }

  inFlight = apiClient
    .get("/api/insurances/getAssessmentRound", {
      params: { PerD: params.PerD, EVC_Status: "1", page: 1, limit: 100 },
    })
    .then(async ({ data }) => {
      const rounds = getRows(data).filter(
        (round) => String(round.EVC_Status ?? round.status ?? "") === "1",
      );
      const counts = await Promise.all(
        rounds.map(async (round) => {
          const EVC_Code = round.EVC_Code || round.code || "";
          if (!EVC_Code) return ["", 0];

          const response = await apiClient.get(
            "/api/insurances/getAssessmentRoundPermissionUser",
            {
              params: {
                ...params,
                EVC_Code,
                EVT_ID: round.EVT_ID,
              },
            },
          );
          const pendingIds = new Set(
            getRows(response.data)
              .filter((item) => String(item.status_submission ?? "") !== "1")
              .map((item) => String(item.EVP_TargetID || ""))
              .filter(Boolean),
          );

          return [EVC_Code, pendingIds.size];
        }),
      );
      const countsByRound = Object.fromEntries(
        counts.filter(([roundCode]) => roundCode),
      );
      const count = Object.values(countsByRound).reduce(
        (total, value) => total + Number(value || 0),
        0,
      );

      usePendingAssessments.setState({ count, countsByRound });
      lastLoaded = Date.now();
    })
    .catch(() => {
      lastLoaded = 0;
    })
    .finally(() => {
      inFlight = null;
    });

  return inFlight;
}
