import { useEffect, useState } from "react";

export const Startup = () => {
  const [isVisible, setIsVisible] = useState(true);
  const words = ["Scan Wisely", "RCV Builds Trust", "For Safety Purposes"];

  const [currentWordIndex, setCurrentWordIndex] = useState(0);

  useEffect(() => {
    const randomIndex = Math.floor(Math.random() * words.length);
    setCurrentWordIndex(randomIndex);
  }, [words.length]);

  useEffect(() => {
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";

    const timer = setTimeout(() => {
      setIsVisible(false);
      document.documentElement.style.overflow = "auto";
      document.body.style.overflow = "auto";
    }, 3500);

    return () => {
      clearTimeout(timer);
      document.documentElement.style.overflow = "auto";
      document.body.style.overflow = "auto";
    };
  }, []);

  if (!isVisible) return null;

  return (
    <div className="startup-container">
      <div className="startup-content">
        <div className="logo-wrapper">
          <img src="/logo.svg" alt="RCV Logo" draggable="false" />
        </div>
        <div className="startup-text">
          <h1>{words[currentWordIndex]}</h1>
        </div>
        <div className="loading-dots">
          <div className="dot"></div>
          <div className="dot"></div>
          <div className="dot"></div>
        </div>
      </div>

      <div className="startup-footer">
        © 2026 Proof of Vision All rights reserved.
      </div>
    </div>
  );
};
