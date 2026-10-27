import { UserOutlined } from "@ant-design/icons";
import { Avatar } from "antd";
import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { readCurrentUserDetail } from "../../recoilstore/userStores";
import { readTokenValue } from "../../utils/tokenUtils";
import { appConfig } from "../../config/appConfig";

export default function HeaderUserIdentity() {
  const { search } = useLocation();
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const sync = (event) => {
      if (!event.key || event.key === appConfig.auth.tokenStorageKey) {
        setRevision((value) => value + 1);
      }
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);
  const user = useMemo(() => readCurrentUserDetail() || {}, [search, revision]);
  const name = readTokenValue(user.PerFuNas) || "ผู้ใช้งาน";
  const photo = readTokenValue(user.PerPhotoProfile_N).trim();
  const photoUrl = !photo || photo === "-"
    ? undefined
    : /^https?:\/\//i.test(photo)
      ? photo
      : `https://apimb.sakerp.org/file_photoEMP/${encodeURIComponent(photo)}`;

  return (
    <div className="header-user-identity" aria-label={`ผู้เข้าระบบ ${name}`}>
      <Avatar size={38} src={photoUrl} icon={<UserOutlined />} />
      <div className="header-user-copy">
        <span>ผู้เข้าระบบ</span>
        <strong title={name}>{name}</strong>
      </div>
    </div>
  );
}
