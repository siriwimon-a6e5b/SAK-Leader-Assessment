import axios from "axios";
import CryptoJS from "crypto-js";
import { appConfig } from "../config/appConfig";

const BASE_URL = import.meta.env.VITE_REACT_APP_API_URL;
const BASE_API_KEY = import.meta.env.VITE_REACT_APP_API_KEY;
const TOKEN_STORAGE_KEY = appConfig.auth.tokenStorageKey;
const TOKEN_SECRET_KEY = "secret-key-value";

const apiClient = axios.create({
  baseURL: BASE_URL,
});

apiClient.interceptors.request.use(
  (config) => {
    config.headers = {
      ...config.headers,
      "x-api-key": BASE_API_KEY,
    };

    if (!(config.data instanceof FormData)) {
      config.headers["Content-Type"] = "application/json";
    }

    return config;
  },
  (error) => Promise.reject(error),
);

function safeJsonParse(value) {
  try {
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

function parseJwtPayload(token) {
  if (typeof token !== "string" || token.split(".").length < 2) return null;

  try {
    const payload = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const decodedPayload = atob(payload)
      .split("")
      .map((char) => `%${`00${char.charCodeAt(0).toString(16)}`.slice(-2)}`)
      .join("");

    return JSON.parse(decodeURIComponent(decodedPayload));
  } catch {
    return null;
  }
}

function stringifyToken(value) {
  return typeof value === "string" ? value : JSON.stringify(value);
}

function decryptTokenString(value) {
  if (!value || typeof value !== "string") return null;

  try {
    const normalizedValue = decodeURIComponent(value).replaceAll(" ", "+");
    const bytes = CryptoJS.AES.decrypt(normalizedValue, TOKEN_SECRET_KEY);
    const decryptedToken = bytes.toString(CryptoJS.enc.Utf8);

    return decryptedToken || value;
  } catch {
    return value;
  }
}

function parseTokenString(value) {
  if (!value || typeof value !== "string") return null;

  const decryptedValue = decryptTokenString(value);
  return safeJsonParse(decryptedValue) || parseJwtPayload(decryptedValue);
}

function getTokenFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const tokenParam = params.get("token") || params.get("userToken") || params.get("Token");

  if (!tokenParam) return null;

  localStorage.setItem(TOKEN_STORAGE_KEY, tokenParam);
  return decryptTokenString(tokenParam);
}

function unwrapUserToken(tokenData) {
  if (!tokenData) return null;

  const nestedToken =
    tokenData?.userToken?.Token ||
    tokenData?.userToken?.token ||
    tokenData?.userToken ||
    tokenData?.Token ||
    tokenData?.token;

  if (!nestedToken) return tokenData;

  if (typeof nestedToken === "string") {
    return parseTokenString(nestedToken) || nestedToken;
  }

  return nestedToken;
}

function mapUserDetail(userTokenData) {
  if (!userTokenData || typeof userTokenData !== "object") return null;

  return {
    AgU: userTokenData._AgU || userTokenData.AgU,
    PerD: userTokenData._PerD || userTokenData.PerD,
    PerTiNa: userTokenData._PerTiNa || userTokenData.PerTiNa,
    PerFuNas: userTokenData._PerFuNa || userTokenData._PerFuNas || userTokenData.PerFuNa || userTokenData.PerFuNas,
    PerST: userTokenData._PerST || userTokenData.PerST,
    PerPST: userTokenData._PerPST || userTokenData.PerPST,
    PerPST_N: userTokenData._PerPST_N || userTokenData.PerPST_N,
    PerPST_LV: userTokenData._PerPST_LV || userTokenData.PerPST_LV,
    PerWP: userTokenData._PerWP || userTokenData.PerWP,
    PerWP_N: userTokenData._PerWP_N || userTokenData.PerWP_N,
    PerBL: userTokenData._PerBL || userTokenData.PerBL,
    PerBL_N: userTokenData._PerBL_N || userTokenData.PerBL_N,
    PerRG: userTokenData._PerRG || userTokenData.PerRG,
    PerRG_N: userTokenData._PerRG_N || userTokenData.PerRG_N,
    PerPhotoProfile_N: userTokenData._PerPhotoProfile_N || userTokenData.PerPhotoProfile_N,
    PerExp_Token: userTokenData._PerExp_Token || userTokenData.PerExp_Token || userTokenData.exp,
    PerLast_Login: userTokenData._PerLast_Login || userTokenData.PerLast_Login,
  };
}

export function getInitialUserDetail() {
  const tokenString = getTokenFromUrl() || localStorage.getItem(TOKEN_STORAGE_KEY);
  const rawTokenData = parseTokenString(tokenString);
  const userTokenData = unwrapUserToken(rawTokenData);
  const userDetail = mapUserDetail(userTokenData);

  if (tokenString && userDetail) {
    apiClient.interceptors.request.use((config) => {
      config.headers.Authorization = stringifyToken(userTokenData);
      config.params = {
        ...(config.params || {}),
        _exp_Token: userDetail.PerExp_Token,
        _PerWP_Token: userDetail.PerWP,
        _PerRG_Token: userDetail.PerRG,
        _PerST_Token: userDetail.PerST,
      };

      return config;
    });
  }

  return userDetail;
}

export default apiClient;
