import { Menu } from "antd";
import { useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";

function normalizeMenuItems(items = [], externalUrlMap = new Map()) {
  return items.map(({ externalUrl, children, ...item }) => {
    if (externalUrl) {
      externalUrlMap.set(item.key, externalUrl);
    }

    return {
      ...item,
      children: children ? normalizeMenuItems(children, externalUrlMap) : undefined,
    };
  });
}

export default function Navbar({ items }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { menuItems, externalUrlMap } = useMemo(() => {
    const nextExternalUrlMap = new Map();

    return {
      menuItems: normalizeMenuItems(items, nextExternalUrlMap),
      externalUrlMap: nextExternalUrlMap,
    };
  }, [items]);

  const handleClick = ({ key }) => {
    const externalUrl = externalUrlMap.get(key);

    if (externalUrl) {
      window.location.href = externalUrl;
      return;
    }

    navigate(key);
  };

  return (
    <Menu
      className="app-navbar"
      mode="horizontal"
      selectedKeys={[`${location.pathname}${location.search}`]}
      onClick={handleClick}
      items={menuItems}
    />
  );
}
