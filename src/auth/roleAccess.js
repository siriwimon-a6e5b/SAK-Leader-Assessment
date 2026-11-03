import { readTokenValue } from "../utils/tokenUtils";

export function getRoleFromToken(token) {
  const PerD = readTokenValue(token.PerD);
  const PerST = readTokenValue(token.PerST);
  const AgU = readTokenValue(token.AgU);
  const PerRG = readTokenValue(token.PerRG);
  const PerExp_Token = readTokenValue(token.PerExp_Token); 

  const userRG = ["1", "2", "3", "4", "5", "6"];
  // const userPST = [
  //   "PST014",
  //   "PST015",
  //   "PST016",
  //   "PST017",
  //   "PST018",
  //   "PST019",
  //   "PST119",
  //   "PST020",
  //   "PST025",
  //   "PST083",
  //   "PST084",
  // ];
  //รหัสแอดมิน
  const adminWP =  ["003792","003791","000806","002367","000430","001094","002322"];  

  const isUser =
    userRG.includes(PerRG) && PerST === "1";
  const isAdmin = adminWP.includes(PerD) || (AgU === "AGAD" && PerST === "1");
  // const isUserOut = PerWP === "WP1075";

  // if (isUserOut) return { role: "userOut", PerExp_Token };
  if (isAdmin) return { role: "admin", PerExp_Token };
  if (isUser) return { role: "user", PerExp_Token };

  return { role: "guest", PerExp_Token };
}

function parsePositionLevel(value) {
  const text = readTokenValue(value);
  const numberText = String(text || "").replace(/\D/g, "");
  const level = Number(numberText || text);

  return Number.isFinite(level) ? level : 0;
}

//แยกสิทธิ์ระดับ User
export function getUserLevelFromToken(token, role) {
  if (role !== "user") return "employee";

  // ผู้ดูแลระบบที่สลับมาทดสอบมุมมอง User ต้องเข้าถึงเมนูของหัวหน้างานได้
  // โดยไม่ขึ้นกับระดับตำแหน่งจริงของเจ้าหน้าที่ Admin
  if (getRoleFromToken(token).role === "admin") return "manager";

  const employeeId = readTokenValue(token.PerD);
  const workplaceCode = readTokenValue(token.PerWP);
  const PerPST_LV = parsePositionLevel(token.PerPST_LV);
  const PerRG = readTokenValue(token.PerRG);

  // เปิดมุมมองภาพรวมทีมสำหรับเจ้าหน้าที่ที่ได้รับมอบหมายให้ทดสอบรายงาน
  if (employeeId === "003792" || workplaceCode === "WP0001") return "manager";
  if (PerPST_LV >= 4 || PerRG === "5") return "manager";
  if (PerPST_LV >= 2 || PerRG === "3" || PerRG === "4") return "leader";

  return "employee";
}

export function canViewRegionalScoresFromToken(token, role = "user") {
  const employeeId = readTokenValue(token?.PerD);
  const workplaceCode = readTokenValue(token?.PerWP);
  const level = parsePositionLevel(token?.PerPST_LV);
  const region = Number(readTokenValue(token?.PerRG));
  const fixedHeadIds = new Set([
    "003792",
    "EXE002",
    "000013", "000016", "000041", "000044", "000058", "000073",
    "000077", "000083", "000087", "000104", "000119", "000125",
    "000179", "000182", "000189", "000198", "000229", "000251",
    "000281", "000337", "000356", "000430", "000497", "000610",
    "000922", "001015", "001194", "001222", "001332", "002883",
    "003925",
  ]);

  if (!["admin", "user"].includes(role)) return false;
  if (workplaceCode === "WP0001") return true;
  if (fixedHeadIds.has(employeeId)) return true;
  if (level === 6) return true;

  return region === 6 && [16, 17, 18].includes(level);
}
