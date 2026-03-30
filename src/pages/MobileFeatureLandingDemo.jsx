import React, { useState } from "react";
import MobileFeatureLandingShell from "../shared/feature-landing/MobileFeatureLandingShell";

const DEMO_ITEMS = [
  {
    id: "1",
    title: "Feature-Wiring Audit Prompts",
    preview: "Now at the top right we need to have s...",
  },
  {
    id: "2",
    title: "Innovation Name and Type",
    preview: "What is that",
  },
  {
    id: "3",
    title: "Greeting Interaction",
    preview: "Extract for me that link",
  },
  {
    id: "4",
    title: "Bug Fix and Platform Limitation",
    preview: "Are we good now...",
  },
  {
    id: "5",
    title: "Sanity Pass Results",
    preview: "Now today we added 4 feature...",
  },
  {
    id: "6",
    title: "Web Image Search Feature",
    preview: "Now there is this feature mostly my app...",
  },
  {
    id: "7",
    title: "Project Discussion",
    preview: "Core Business Model of InovaRoute...",
  },
];

export default function MobileFeatureLandingDemo() {
  const [value, setValue] = useState("");

  return (
    <MobileFeatureLandingShell
      featureName="ElimuLink"
      workspaceLabel="University"
      items={DEMO_ITEMS}
      inputValue={value}
      inputPlaceholder="New chat"
      onInputChange={setValue}
      onMenu={() => console.log("menu")}
      onShare={() => console.log("share")}
      onSettings={() => console.log("settings")}
      onNewWork={() => console.log("new work")}
      onStartCall={() => console.log("start call")}
      onOpenItem={(item) => console.log("open item", item)}
    />
  );
}
