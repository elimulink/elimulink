import { useState } from "react";
import NewChatLanding from "../pages/NewChatLanding";
import AdminAnalyticsLanding from "../pages/AdminAnalyticsLanding";

export default function InstitutionApp({ userRole }) {
  const [mode, setMode] = useState("institution"); // institution | admin

  return mode === "admin" ? (
    <AdminAnalyticsLanding onExitAdmin={() => setMode("institution")} />
  ) : (
    <NewChatLanding onOpenAdmin={() => setMode("admin")} userRole={userRole} />
  );
}
