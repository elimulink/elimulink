import React from "react";
import "./chat-media.css";

export default function MediaActionButton({
  children,
  className = "",
  type = "button",
  ...props
}) {
  return (
    <button type={type} className={`chat-media-action-btn ${className}`.trim()} {...props}>
      {children}
    </button>
  );
}
