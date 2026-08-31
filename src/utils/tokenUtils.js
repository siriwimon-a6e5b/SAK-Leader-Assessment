export function safeDecodeBase64(value) {
  if (!value) return "";

  try {
    return decodeURIComponent(
      atob(value)
        .split("")
        .map((char) => `%${`00${char.charCodeAt(0).toString(16)}`.slice(-2)}`)
        .join(""),
    );
  } catch {
    return String(value || "");
  }
}

export function buildAdminTokenPayload(userDetail = {}) {
  return {
    AgU: safeDecodeBase64(userDetail.AgU),
    PerD: safeDecodeBase64(userDetail.PerD),
    PerTiNa: safeDecodeBase64(userDetail.PerTiNa),
    PerFuNas: safeDecodeBase64(userDetail.PerFuNas),
    PerST: safeDecodeBase64(userDetail.PerST),
    PerPST: safeDecodeBase64(userDetail.PerPST),
    PerPST_N: safeDecodeBase64(userDetail.PerPST_N),
    PerPST_LV: safeDecodeBase64(userDetail.PerPST_LV),
    PerWP: safeDecodeBase64(userDetail.PerWP),
    PerWP_N: safeDecodeBase64(userDetail.PerWP_N),
    PerBL: safeDecodeBase64(userDetail.PerBL),
    PerBL_N: safeDecodeBase64(userDetail.PerBL_N),
    PerRG: safeDecodeBase64(userDetail.PerRG),
    PerRG_N: safeDecodeBase64(userDetail.PerRG_N),
    PerPhotoProfile_N: safeDecodeBase64(userDetail.PerPhotoProfile_N),
    PerExp_Token: safeDecodeBase64(userDetail.PerExp_Token),
    PerLast_Login: safeDecodeBase64(userDetail.PerLast_Login),
  };
}

export function readTokenValue(value) {
  return safeDecodeBase64(value) || String(value || "");
}
