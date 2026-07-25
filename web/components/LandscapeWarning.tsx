// web/components/LandscapeWarning.tsx
"use client";

import { useEffect, useState } from "react";
import styles from "./LandscapeWarning.module.css";

export function LandscapeWarning() {
  const [isPortrait, setIsPortrait] = useState(false);

  useEffect(() => {
    const check = () => {
      setIsPortrait(window.innerHeight > window.innerWidth && "ontouchstart" in window);
    };
    check();
    const onOrientation = () => setTimeout(check, 200);
    window.addEventListener("resize", check);
    window.addEventListener("orientationchange", onOrientation);
    return () => {
      window.removeEventListener("resize", check);
      window.removeEventListener("orientationchange", onOrientation);
    };
  }, []);

  if (!isPortrait) return null;

  return (
    <div className={styles.landscapeWarning}>
      <div className={styles.warningContent}>
        <div className={styles.rotateIcon} />
        <h1>Love</h1>
        <h1>Tinh Cầu</h1>
        <p>Cậu hãy xoay ngang màn hình nha để thấy điều kỳ diệu!</p>
        <p>Nhớ chạm vào tinh cầu ở giữa để mở quà bí mật nha.</p>
        <div className={styles.starsBg} />
      </div>
    </div>
  );
}
