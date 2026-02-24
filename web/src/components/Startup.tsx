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
    // Store original values
    const originalHtmlOverflow = document.documentElement.style.overflow;
    const originalBodyOverflow = document.body.style.overflow;
    const originalBodyPosition = document.body.style.position;
    const originalBodyWidth = document.body.style.width;
    
    // Disable scrolling completely
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.width = "100%";
    document.body.style.top = "0";
    document.body.style.left = "0";

    const timer = setTimeout(() => {
      setIsVisible(false);
      
      // Use requestAnimationFrame to ensure smooth restoration
      requestAnimationFrame(() => {
        // Restore styles gradually to prevent double scrollbar flash
        document.body.style.position = originalBodyPosition || "static";
        document.body.style.width = originalBodyWidth || "auto";
        document.body.style.top = "";
        document.body.style.left = "";
        
        // Restore overflow last to prevent flash
        setTimeout(() => {
          document.documentElement.style.overflow = originalHtmlOverflow || "auto";
          document.body.style.overflow = originalBodyOverflow || "auto";
        }, 50);
      });
    }, 3500);

    return () => {
      clearTimeout(timer);
      // Cleanup - restore original values
      document.body.style.position = originalBodyPosition || "static";
      document.body.style.width = originalBodyWidth || "auto";
      document.body.style.top = "";
      document.body.style.left = "";
      document.documentElement.style.overflow = originalHtmlOverflow || "auto";
      document.body.style.overflow = originalBodyOverflow || "auto";
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
