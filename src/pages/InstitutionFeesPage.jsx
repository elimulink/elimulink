import { useEffect, useMemo, useState } from "react";
import { fetchFinanceSummary } from "../lib/apiClient";
import { auth } from "../lib/firebase";
import MobileFeatureLandingShell from "../shared/feature-landing/MobileFeatureLandingShell";
import {
  Archive,
  ArrowLeft,
  ChevronDown,
  Copy,
  FileText,
  Menu,
  MoreHorizontal,
  PenLine,
  Rows3,
  Sparkles,
  Trash2,
  Wallet,
  X,
  Plus,
} from "lucide-react";

function FeesWorkspaceModal({ open, title, onClose, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-slate-950/30 backdrop-blur-[1px]" onClick={onClose} />
      <div className="absolute inset-x-0 top-0 mx-auto flex min-h-full max-w-3xl items-start justify-center px-4 py-10">
        <div className="w-full rounded-[30px] border border-slate-200/80 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.14)]">
          <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-6 py-5">
            <div>
              <div className="text-lg font-semibold text-slate-900">{title}</div>
              <div className="mt-1 text-sm text-slate-500">Fees desktop workspace flow.</div>
            </div>
            <button type="button" onClick={onClose} className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 hover:bg-slate-50">
              <X size={18} />
            </button>
          </div>
          <div className="px-6 py-6">{children}</div>
        </div>
      </div>
    </div>
  );
}

const DEFAULT_FEE_ROWS = [
  { id: "fees-1", title: "Tuition balance", amount: "KES 12,000", status: "Outstanding", context: "Semester 2 • Due Apr 5", type: "Balance" },
  { id: "fees-2", title: "Library charge", amount: "KES 1,500", status: "Pending", context: "Awaiting adjustment", type: "Charge" },
  { id: "fees-3", title: "Recent payment", amount: "KES 8,000", status: "Received", context: "Mpesa • Mar 24", type: "Payment" },
  { id: "fees-4", title: "Statement request", amount: "Ready", status: "Available", context: "Latest downloadable statement", type: "Statement" },
];

function resolveBackendUserId() {
  const uid = String(auth?.currentUser?.uid || "");
  const digits = uid.match(/\d+/g)?.join("") || "";
  const numeric = Number.parseInt(digits, 10);
  if (Number.isFinite(numeric) && numeric > 0) return numeric;
  return 1;
}

export default function InstitutionFeesPage({ onBack, onOpenMainMenu, audience = "institution" }) {
  const isStudentAudience = audience === "student";
  const [isMobileViewport, setIsMobileViewport] = useState(() => typeof window !== "undefined" ? window.matchMedia("(max-width: 767px)").matches : false);
  const [showDesktopLanding, setShowDesktopLanding] = useState(() => !(typeof window !== "undefined" ? window.matchMedia("(max-width: 767px)").matches : false));
  const [showMobileLanding, setShowMobileLanding] = useState(() => typeof window !== "undefined" ? window.matchMedia("(max-width: 767px)").matches : false);
  const [landingInputValue, setLandingInputValue] = useState("");
  const [view, setView] = useState("overview");
  const [activeMobileSection, setActiveMobileSection] = useState("overview");
  const [isMobileSectionMenuOpen, setIsMobileSectionMenuOpen] = useState(false);
  const [feeRows, setFeeRows] = useState(DEFAULT_FEE_ROWS);
  const [feesLoading, setFeesLoading] = useState(false);
  const [feesError, setFeesError] = useState("");
  const [isLandingMenuOpen, setIsLandingMenuOpen] = useState(false);
  const [isLandingShareOpen, setIsLandingShareOpen] = useState(false);
  const [isLandingSettingsOpen, setIsLandingSettingsOpen] = useState(false);
  const [isLandingUtilityMenuOpen, setIsLandingUtilityMenuOpen] = useState(false);
  const [landingFeeMenuId, setLandingFeeMenuId] = useState(null);
  const [landingShareInvite, setLandingShareInvite] = useState("");
  const [landingShareAccess, setLandingShareAccess] = useState("institution only");
  const [landingShareStatus, setLandingShareStatus] = useState("");
  const [landingWorkspaceStatus, setLandingWorkspaceStatus] = useState("");
  const [landingDeleteOpen, setLandingDeleteOpen] = useState(false);
  const [landingWorkspaceSettings, setLandingWorkspaceSettings] = useState({
    name: "Fees Workspace",
    description: "Review balances, payment status, and statement readiness from one calm finance entry point.",
    linkedInstitution: isStudentAudience ? "Your finance workspace" : "ElimuLink University",
    defaultView: "fees overview",
    financeMode: "balance tracking",
    subgroup: "Not linked",
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia("(max-width: 767px)");
    const syncViewport = () => setIsMobileViewport(media.matches);
    syncViewport();
    media.addEventListener?.("change", syncViewport);
    window.addEventListener("resize", syncViewport);
    return () => {
      media.removeEventListener?.("change", syncViewport);
      window.removeEventListener("resize", syncViewport);
    };
  }, []);

  useEffect(() => {
    if (isMobileViewport) setShowDesktopLanding(false);
    else setShowMobileLanding(false);
  }, [isMobileViewport]);

  useEffect(() => {
    let active = true;

    async function loadFinance() {
      setFeesLoading(true);
      setFeesError("");
      try {
        const data = await fetchFinanceSummary(resolveBackendUserId());
        if (!active) return;
        setFeeRows(Array.isArray(data?.entries) ? data.entries : []);
        if (data?.summary) {
          setBalanceSummaryState({
            balance: data.summary.balance || "KES 0",
            paid: data.summary.paid || "Not available",
            charges: data.summary.charges || "Not available",
            status: data.summary.status || "Unknown",
          });
        }
      } catch (error) {
        if (!active) return;
        setFeeRows([]);
        setFeesError(error?.message || "Failed to load finance data.");
      } finally {
        if (active) setFeesLoading(false);
      }
    }

    loadFinance();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (
        event.target?.closest?.("[data-fees-landing-menu]") ||
        event.target?.closest?.("[data-fees-utility-menu]") ||
        event.target?.closest?.("[data-fees-row-menu]")
      ) {
        return;
      }
      setIsLandingMenuOpen(false);
      setIsLandingUtilityMenuOpen(false);
      setLandingFeeMenuId(null);
    };

    const handleKeyDown = (event) => {
      if (event.key !== "Escape") return;
      setIsLandingMenuOpen(false);
      setIsLandingUtilityMenuOpen(false);
      setLandingFeeMenuId(null);
      setIsLandingShareOpen(false);
      setIsLandingSettingsOpen(false);
      setLandingDeleteOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const [balanceSummaryState, setBalanceSummaryState] = useState({
    balance: "KES 0",
    paid: "Not available",
    charges: "Not available",
    status: "Unknown",
  });

  const balanceSummary = useMemo(() => balanceSummaryState, [balanceSummaryState]);
  const mobileSectionItems = useMemo(
    () => [
      { key: "overview", label: "Overview", icon: Wallet },
      { key: "history", label: "History", icon: FileText },
      { key: "status", label: "Status", icon: Sparkles },
      { key: "statements", label: "Statements", icon: Copy },
    ],
    []
  );

  function openMobileSection(sectionKey) {
    setIsMobileSectionMenuOpen(false);
    setActiveMobileSection(sectionKey);
    setView(sectionKey === "statements" ? "history" : sectionKey);
    setShowMobileLanding(false);
  }

  function renameFeesWorkspace() {
    const nextName = window.prompt("Rename fees workspace", landingWorkspaceSettings.name);
    if (!nextName) return;
    const normalized = nextName.trim();
    if (!normalized) return;
    setLandingWorkspaceSettings((prev) => ({ ...prev, name: normalized }));
    setLandingWorkspaceStatus("Fees workspace renamed.");
  }

  function moveFeesWorkspace() {
    setLandingWorkspaceStatus("Move to workspace is prepared here as a safe frontend-first Fees action.");
  }

  function archiveFeesWorkspace() {
    setLandingWorkspaceStatus("Archive is prepared here as a safe frontend-first Fees action.");
  }

  function renameFeeRow(id) {
    const target = feeRows.find((item) => item.id === id);
    if (!target) return;
    setLandingWorkspaceStatus(`${target.title} is a finance record view and cannot be renamed here.`);
  }

  function archiveFeeRow(id) {
    const target = feeRows.find((item) => item.id === id);
    if (!target) return;
    setLandingWorkspaceStatus(`${target.title} is a finance record view and cannot be archived here.`);
  }

  function deleteFeeRow(id) {
    const target = feeRows.find((item) => item.id === id);
    if (!target) return;
    setLandingWorkspaceStatus(`${target.title} is a finance record view and cannot be deleted here.`);
  }

  if (isMobileViewport && showMobileLanding) {
    return (
      <MobileFeatureLandingShell
        featureName="Fees"
        featureSubtitle="Balances, payments, and statements"
        featureDescription={isStudentAudience ? "Review your current fee status, payment history, and statements in a lighter mobile finance workspace." : "Review your current fee status, open payment history, and keep the finance workspace lighter on mobile."}
        featureIcon={Wallet}
        featureStyle="soft"
        workspaceLabel={landingWorkspaceSettings.name}
        workspaceHint={landingWorkspaceSettings.description}
        workspaceBadge={isStudentAudience ? "Student workspace" : "Institution workspace"}
        hideInstitutionStrip
        quickActions={[
          { key: "overview", label: "Overview", icon: Wallet, onClick: () => openMobileSection("overview") },
          { key: "history", label: "History", icon: FileText, onClick: () => openMobileSection("history") },
          { key: "status", label: "Status", icon: Sparkles, onClick: () => openMobileSection("status") },
        ]}
        quickActionsStyle="rows"
        utilityActions={[
          { key: "rename-workspace", label: "Rename workspace", icon: PenLine, onClick: renameFeesWorkspace },
          { key: "move-workspace", label: "Move workspace", icon: Rows3, onClick: moveFeesWorkspace },
          { key: "archive-workspace", label: "Archive workspace", icon: Archive, onClick: archiveFeesWorkspace },
          {
            key: "delete-workspace",
            label: "Delete workspace",
            icon: Trash2,
            destructive: true,
            onClick: () => {
              setLandingWorkspaceStatus("Delete stays protected in the full fees workspace.");
              setShowMobileLanding(false);
            },
          },
        ]}
        shareConfig={{
          title: "Share Fees",
          description: "Share the fees workspace with a clearer mobile interaction for access and finance visibility.",
          emailLabel: "Invite reviewer",
          emailPlaceholder: "accounts@example.com",
          accessLabel: "Access level",
          accessOptions: [
            { value: "institution only", label: isStudentAudience ? "Private" : "Institution only" },
            { value: "statement view", label: "Statement view" },
            { value: "finance review", label: "Finance review" },
          ],
          defaultAccess: landingShareAccess,
          membersTitle: "Fees owner",
          members: [{ key: "owner", label: "Fees workspace", role: "Owner" }],
          privacyNote: "Fees sharing remains frontend-first here, but the mobile share experience is now standardized.",
          submitLabel: "Save share setup",
        }}
        items={feeRows.map((item) => ({
          id: item.id,
          title: item.title,
          preview: item.context,
          meta: item.status,
          actions: [
            { key: "share", label: "Share", icon: Copy, onClick: () => setLandingShareStatus(`Sharing for "${item.title}" is prepared here as a safe frontend-first action.`) },
            { key: "rename", label: "Rename", icon: PenLine, onClick: () => renameFeeRow(item.id) },
            { key: "archive", label: "Archive", icon: Archive, onClick: () => archiveFeeRow(item.id) },
            { key: "delete", label: "Delete", icon: Trash2, destructive: true, onClick: () => deleteFeeRow(item.id) },
          ],
        }))}
        listStyle="plain"
        inputPlaceholder="Add finance note"
        inputValue={landingInputValue}
        onInputChange={setLandingInputValue}
        onInputSubmit={(value) => {
          setLandingWorkspaceStatus(`Saved "${value}" as a finance note for this workspace.`);
          setShowMobileLanding(false);
          setLandingInputValue("");
        }}
        onMenu={onOpenMainMenu || onBack}
        onShare={() => {
          setLandingShareStatus("Share is prepared here as a safe frontend-first Fees action.");
          setShowMobileLanding(false);
        }}
        onShareSubmit={async ({ email, access }) => {
          setLandingShareInvite(email);
          setLandingShareAccess(access);
          setLandingShareStatus(email ? `Fees sharing prepared for ${email}.` : `Fees access saved as ${access}.`);
          return { status: email ? `Fees sharing prepared for ${email}.` : `Fees access saved as ${access}.` };
        }}
        onSettings={() => {
          openMobileSection("overview");
        }}
        onNewWork={() => {
          openMobileSection("history");
        }}
        onStartCall={() => {
          openMobileSection("status");
        }}
        onOpenItem={(item) => {
          openMobileSection(item?.type === "Balance" ? "overview" : item?.type === "Status" ? "status" : "history");
        }}
        emptyStateTitle="No fee rows yet"
        emptyState="Balances, payments, and statement updates will appear here when ready."
      />
    );
  }

  if (isMobileViewport) {
    const activeMobileMeta = mobileSectionItems.find((item) => item.key === activeMobileSection) || mobileSectionItems[0];
    const statementRows = feeRows.filter((item) => String(item.type || "").toLowerCase().includes("statement"));
    const historyRows = feeRows.filter((item) => {
      const type = String(item.type || "").toLowerCase();
      return type.includes("payment") || type.includes("charge") || type.includes("statement");
    });
    const statusRows = feeRows.filter((item) => {
      const status = String(item.status || "").toLowerCase();
      return status.includes("outstanding") || status.includes("pending") || status.includes("available") || status.includes("received");
    });

    return (
      <div className="relative min-h-[100dvh] overflow-x-hidden bg-[radial-gradient(circle_at_top,#162846_0%,#10192f_58%,#0b1220_100%)] px-5 pb-28 pt-5 text-white">
        <div className="space-y-6">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Fees</div>
            <div className="mt-2 text-[30px] font-semibold leading-[1.08] text-white">
              {activeMobileSection === "overview" ? "Fees Overview" : null}
              {activeMobileSection === "history" ? "Payment History" : null}
              {activeMobileSection === "status" ? "Status" : null}
              {activeMobileSection === "statements" ? "Statements" : null}
            </div>
            <div className="mt-2 max-w-[34ch] text-[15px] leading-7 text-slate-300">
              {activeMobileSection === "overview" ? "Keep balances, paid amounts, and your current finance standing in one simple view." : null}
              {activeMobileSection === "history" ? "Read the recent payment and finance activity without the old dashboard boxes." : null}
              {activeMobileSection === "status" ? "Follow outstanding, pending, and received fee status in one focused place." : null}
              {activeMobileSection === "statements" ? "Open statement-related items in a lighter mobile view." : null}
            </div>
          </div>

          {feesLoading ? <div className="text-sm font-medium text-slate-400">Loading finance data...</div> : null}
          {feesError ? <div className="text-sm font-medium text-rose-300">{feesError}</div> : null}

          {activeMobileSection === "overview" ? (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Outstanding balance</div>
                  <div className="mt-2 text-[22px] font-semibold text-white">{balanceSummary.balance}</div>
                </div>
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Paid recently</div>
                  <div className="mt-2 text-[22px] font-semibold text-white">{balanceSummary.paid}</div>
                </div>
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Charges</div>
                  <div className="mt-2 text-[22px] font-semibold text-white">{balanceSummary.charges}</div>
                </div>
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Status</div>
                  <div className="mt-2 text-[18px] font-medium text-slate-200">{balanceSummary.status}</div>
                </div>
              </div>
              <div className="space-y-4">
                {feeRows.map((item) => (
                  <div key={item.id}>
                    <div className="text-base font-semibold text-white">{item.title}</div>
                    <div className="mt-1 text-sm leading-6 text-slate-300">{item.context}</div>
                    <div className="mt-1 text-sm leading-6 text-slate-400">{item.amount} • {item.status}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {activeMobileSection === "history" ? (
            <div className="space-y-4">
              {historyRows.map((item) => (
                <div key={item.id}>
                  <div className="text-base font-semibold text-white">{item.title}</div>
                  <div className="mt-1 text-sm leading-6 text-slate-300">{item.context}</div>
                  <div className="mt-1 text-sm leading-6 text-slate-400">{item.amount} • {item.status}</div>
                </div>
              ))}
              {!historyRows.length && !feesLoading ? (
                <div className="text-[15px] leading-7 text-slate-300">No payment history is available yet.</div>
              ) : null}
            </div>
          ) : null}

          {activeMobileSection === "status" ? (
            <div className="space-y-4">
              {statusRows.map((item) => (
                <div key={item.id}>
                  <div className="text-base font-semibold text-white">{item.title}</div>
                  <div className="mt-1 text-sm leading-6 text-slate-300">{item.status}</div>
                  <div className="mt-1 text-sm leading-6 text-slate-400">{item.context}</div>
                </div>
              ))}
              {!statusRows.length && !feesLoading ? (
                <div className="text-[15px] leading-7 text-slate-300">No status items are available yet.</div>
              ) : null}
            </div>
          ) : null}

          {activeMobileSection === "statements" ? (
            <div className="space-y-4">
              {statementRows.map((item) => (
                <div key={item.id}>
                  <div className="text-base font-semibold text-white">{item.title}</div>
                  <div className="mt-1 text-sm leading-6 text-slate-300">{item.context}</div>
                  <div className="mt-1 text-sm leading-6 text-slate-400">{item.amount} • {item.status}</div>
                </div>
              ))}
              {!statementRows.length && !feesLoading ? (
                <div className="text-[15px] leading-7 text-slate-300">No statements are ready yet.</div>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-end px-5 pb-8">
          <div className="relative pointer-events-auto">
            {isMobileSectionMenuOpen ? (
              <div className="absolute bottom-20 right-0 flex flex-col items-end gap-3">
                {[...mobileSectionItems].reverse().map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => openMobileSection(item.key)}
                      className="inline-flex items-center gap-3 rounded-full bg-[#066b2f] px-5 py-4 text-sm font-semibold text-white shadow-[0_16px_36px_rgba(6,107,47,0.34)]"
                    >
                      <Icon size={18} />
                      {item.label}
                    </button>
                  );
                })}
              </div>
            ) : null}

            <button
              type="button"
              onClick={() => setIsMobileSectionMenuOpen((prev) => !prev)}
              className="inline-flex h-16 w-16 items-center justify-center rounded-[22px] bg-[#066b2f] text-white shadow-[0_18px_42px_rgba(6,107,47,0.34)]"
              aria-label={isMobileSectionMenuOpen ? "Close sections" : "Open sections"}
              title={activeMobileMeta.label}
            >
              <Plus size={28} className={isMobileSectionMenuOpen ? "rotate-45 transition-transform" : "transition-transform"} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!isMobileViewport && showDesktopLanding) {
    return (
      <div className="min-h-[100dvh] bg-[linear-gradient(180deg,#f8fafc_0%,#f4f7fb_48%,#eef3f9_100%)] px-6 py-6 dark:bg-[linear-gradient(180deg,#06111f_0%,#0a1527_48%,#0c1830_100%)]">
        <div className="mx-auto flex min-h-[calc(100dvh-3rem)] max-w-7xl flex-col gap-6">
          <div className="relative flex items-start justify-between gap-6 bg-transparent px-7 py-6">
            <div className="absolute -left-5 top-1" data-fees-landing-menu>
              <button type="button" onClick={() => setIsLandingMenuOpen((prev) => !prev)} className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-[0_12px_30px_rgba(15,23,42,0.06)] hover:bg-slate-50 dark:border-white/10 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800">
                {isLandingMenuOpen ? <X size={18} /> : <Menu size={18} />}
              </button>
              {isLandingMenuOpen ? (
                <div className="mt-3 w-64 rounded-[24px] border border-slate-200 bg-white p-3 shadow-[0_24px_60px_rgba(15,23,42,0.12)] dark:border-white/10 dark:bg-[#0d182b] dark:shadow-[0_24px_60px_rgba(2,8,23,0.45)]">
                  <button type="button" onClick={() => setIsLandingMenuOpen(false)} className="flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm font-medium text-slate-700 hover:bg-slate-50 dark:text-slate-100 dark:hover:bg-slate-800"><span>Fees home</span><ChevronDown size={16} /></button>
                  <button type="button" onClick={() => { setIsLandingMenuOpen(false); setShowDesktopLanding(false); setView("overview"); }} className="flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm font-medium text-slate-700 hover:bg-slate-50 dark:text-slate-100 dark:hover:bg-slate-800"><span>Review balance</span><Wallet size={16} /></button>
                  <button type="button" onClick={() => { setIsLandingMenuOpen(false); setShowDesktopLanding(false); setView("history"); }} className="flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm font-medium text-slate-700 hover:bg-slate-50 dark:text-slate-100 dark:hover:bg-slate-800"><span>Payment history</span><FileText size={16} /></button>
                </div>
              ) : null}
            </div>

            <div className="max-w-3xl">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600 dark:text-slate-300">Institution Workspace</div>
              <div className="mt-3 flex items-center gap-3">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-transparent text-slate-700 dark:text-slate-100"><Wallet size={22} /></span>
                <div>
                  <h1 className="text-3xl font-semibold tracking-[-0.03em] text-slate-950 dark:text-slate-50">Fees</h1>
                  <p className="mt-1 text-sm leading-6 text-slate-700 dark:text-slate-300">Review balances, payment status, and statement readiness before entering the full fees workspace.</p>
                  {feesLoading ? <div className="mt-2 text-xs font-semibold text-slate-600 dark:text-slate-300">Loading finance data...</div> : null}
                  {feesError ? <div className="mt-2 text-xs font-semibold text-rose-600">{feesError}</div> : null}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 rounded-full bg-white/70 p-1.5 shadow-[0_8px_22px_rgba(15,23,42,0.04)] dark:bg-white/[0.05] dark:shadow-[0_8px_22px_rgba(2,8,23,0.28)]" data-fees-utility-menu>
              <button type="button" onClick={() => { setLandingShareStatus(""); setIsLandingShareOpen(true); }} className="inline-flex h-10 items-center gap-2 rounded-full border border-slate-200/70 bg-white px-4 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 dark:border-white/10 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"><Copy size={15} />Share</button>
              <button type="button" onClick={() => { setLandingWorkspaceStatus(""); setIsLandingSettingsOpen(true); }} className="inline-flex h-10 items-center gap-2 rounded-full border border-slate-200/70 bg-white px-4 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 dark:border-white/10 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"><Rows3 size={15} />Settings</button>
              <div className="relative">
                <button type="button" onClick={() => setIsLandingUtilityMenuOpen((prev) => !prev)} className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200/70 bg-white text-slate-500 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700"><MoreHorizontal size={16} /></button>
                {isLandingUtilityMenuOpen ? (
                  <div className="absolute right-0 top-14 z-30 w-72 rounded-[26px] border border-slate-200/80 bg-white p-2.5 shadow-[0_22px_56px_rgba(15,23,42,0.12)]">
                    <button type="button" onClick={() => { setIsLandingUtilityMenuOpen(false); renameFeesWorkspace(); }} className="flex w-full items-center gap-3 rounded-[18px] px-4 py-3 text-left text-[14px] text-slate-700 transition hover:bg-slate-50"><PenLine size={16} /><span>Rename workspace</span></button>
                    <button type="button" onClick={() => { setIsLandingUtilityMenuOpen(false); moveFeesWorkspace(); }} className="flex w-full items-center justify-between gap-3 rounded-[18px] px-4 py-3 text-left text-[14px] text-slate-700 transition hover:bg-slate-50"><span className="flex items-center gap-3"><Rows3 size={16} /><span>Move to workspace / project</span></span><ChevronDown size={15} className="-rotate-90 text-slate-400" /></button>
                    <button type="button" onClick={() => { setIsLandingUtilityMenuOpen(false); archiveFeesWorkspace(); }} className="mt-1 flex w-full items-center gap-3 rounded-[18px] px-4 py-3 text-left text-[14px] text-slate-700 transition hover:bg-slate-50"><Archive size={16} /><span>Archive</span></button>
                    <div className="my-2 border-t border-slate-100" />
                    <button type="button" onClick={() => { setIsLandingUtilityMenuOpen(false); setLandingDeleteOpen(true); }} className="flex w-full items-center gap-3 rounded-[18px] px-4 py-3 text-left text-[14px] text-rose-600 transition hover:bg-rose-50"><Trash2 size={16} /><span>Delete</span></button>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <div className="grid flex-1 grid-cols-12 gap-6">
            <section className="col-span-12 rounded-[30px] border border-slate-200/80 bg-white/92 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.06)] dark:border-white/10 dark:bg-[#0d182b]/96 dark:shadow-[0_20px_50px_rgba(2,8,23,0.34)] lg:col-span-8">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-lg font-semibold text-slate-950 dark:text-slate-50">Fees overview</div>
                  <div className="mt-1 text-sm text-slate-700 dark:text-slate-300">A clean finance-first entry point into balances, transactions, and statements.</div>
                </div>
                <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-300">{feesLoading ? "Syncing..." : `${feeRows.length} items`}</div>
              </div>
              <div className="mt-6 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
                <div className="grid grid-cols-2 gap-4">
                  {[
                    ["Outstanding", balanceSummary.balance, "Current balance"],
                    ["Paid", balanceSummary.paid, "Recent payments"],
                    ["Charges", balanceSummary.charges, "Fee demand"],
                    ["Status", balanceSummary.status, "Finance standing"],
                  ].map(([label, value, sub]) => (
                    <div key={label} className="rounded-[22px] border border-slate-200/80 bg-white px-4 py-4 dark:border-white/10 dark:bg-[#101c31]">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-600 dark:text-slate-300">{label}</div>
                      <div className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950 dark:text-slate-50">{value}</div>
                      <div className="mt-1 text-sm text-slate-700 dark:text-slate-300">{sub}</div>
                    </div>
                  ))}
                </div>
                <div className="rounded-[24px] border border-slate-200/80 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-[#101c31]">
                  <div className="text-[12px] font-semibold uppercase tracking-[0.16em] text-slate-600 dark:text-slate-300">Finance mix</div>
                  <div className="mt-1 text-sm text-slate-700 dark:text-slate-300">Quick visual balance between fees charged, paid, and outstanding.</div>
                  <div className="mt-5 flex h-28 items-end gap-3">
                    {["Charges", "Paid", "Balance"].map((label, index) => (
                      <div key={label} className="flex flex-1 flex-col items-center gap-2">
                        <div className="w-full rounded-t-[18px] bg-[linear-gradient(180deg,#2563eb_0%,#14b8a6_100%)]" style={{ height: `${[82, 58, 72][index]}%` }} />
                        <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-600 dark:text-slate-400">{label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="mt-6">
                {!feeRows.length && !feesLoading ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-6 text-sm text-slate-700 dark:border-white/10 dark:bg-[#101c31] dark:text-slate-300">
                    No finance rows are available from the current backend source yet.
                  </div>
                ) : null}
                {feeRows.map((item) => (
                  <div key={item.id} data-fees-row-menu className="group relative flex items-start justify-between gap-4 border-t border-slate-200/70 px-5 py-5 first:border-t-0 hover:bg-slate-50/75 dark:border-white/10 dark:hover:bg-white/[0.03]">
                    <button type="button" onClick={() => { setView(item.type === "Payment" || item.type === "Statement" ? "history" : "overview"); setShowDesktopLanding(false); }} className="min-w-0 flex flex-1 items-start gap-4 text-left">
                      <span className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-100"><Wallet size={18} /></span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-lg font-semibold tracking-[-0.02em] text-slate-950 dark:text-slate-50">{item.title}</span>
                        <span className="mt-1 block text-sm leading-6 text-slate-700 dark:text-slate-300">{item.context}</span>
                      </span>
                    </button>
                    <div className="flex items-start gap-3">
                      <div className="rounded-full bg-slate-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{item.amount} • {item.status}</div>
                      <div className="relative">
                        <button type="button" onClick={(event) => { event.stopPropagation(); setLandingFeeMenuId((prev) => prev === item.id ? null : item.id); }} className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-transparent bg-white/0 text-slate-400 opacity-0 transition hover:border-slate-200 hover:bg-white hover:text-slate-700 group-hover:opacity-100 group-focus-within:opacity-100"><MoreHorizontal size={16} /></button>
                        {landingFeeMenuId === item.id ? (
                          <div className="absolute right-0 top-11 z-20 w-60 rounded-[24px] border border-slate-200/80 bg-white p-2.5 shadow-[0_22px_56px_rgba(15,23,42,0.12)]">
                            <button type="button" onClick={() => { setLandingFeeMenuId(null); renameFeeRow(item.id); }} className="flex w-full items-center gap-3 rounded-[16px] px-4 py-3 text-left text-sm text-slate-700 hover:bg-slate-50"><PenLine size={16} /><span>Rename</span></button>
                            <button type="button" onClick={() => { setLandingFeeMenuId(null); setLandingWorkspaceStatus(`${item.title} is prepared to move as a safe frontend-first Fees action.`); }} className="flex w-full items-center gap-3 rounded-[16px] px-4 py-3 text-left text-sm text-slate-700 hover:bg-slate-50"><Rows3 size={16} /><span>Move</span></button>
                            <button type="button" onClick={() => { setLandingFeeMenuId(null); archiveFeeRow(item.id); }} className="flex w-full items-center gap-3 rounded-[16px] px-4 py-3 text-left text-sm text-slate-700 hover:bg-slate-50"><Archive size={16} /><span>Archive</span></button>
                            <div className="my-2 border-t border-slate-100" />
                            <button type="button" onClick={() => { setLandingFeeMenuId(null); deleteFeeRow(item.id); }} className="flex w-full items-center gap-3 rounded-[16px] px-4 py-3 text-left text-sm text-rose-600 hover:bg-rose-50"><Trash2 size={16} /><span>Delete</span></button>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <aside className="col-span-12 flex flex-col gap-5 lg:col-span-4">
              <section className="rounded-[28px] border border-slate-200/80 bg-white/92 px-5 py-5 shadow-[0_18px_44px_rgba(15,23,42,0.06)] dark:border-white/10 dark:bg-[#0d182b]/96 dark:shadow-[0_18px_44px_rgba(2,8,23,0.34)]">
                <div className="flex items-start gap-4">
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 dark:border-white/10 dark:bg-slate-900 dark:text-slate-100">EL</div>
                  <div>
                    <div className="text-lg font-semibold text-slate-950 dark:text-slate-50">{landingWorkspaceSettings.linkedInstitution || "ElimuLink University"}</div>
                    <div className="mt-1 text-sm leading-6 text-slate-700 dark:text-slate-300">Balance clarity, payment confidence, and calm financial status review.</div>
                  </div>
                </div>
              </section>

              <section className="rounded-[30px] border border-slate-200/80 bg-white/92 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.06)] dark:border-white/10 dark:bg-[#0d182b]/96 dark:shadow-[0_20px_50px_rgba(2,8,23,0.34)]">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-lg font-semibold text-slate-950 dark:text-slate-50">New work</div>
                    <div className="mt-2 text-sm leading-7 text-slate-700 dark:text-slate-300">Open the balance workspace or review recent transactions without losing the clean landing context.</div>
                  </div>
                  <button type="button" onClick={() => { setShowDesktopLanding(false); setView("overview"); }} className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 text-slate-700 shadow-[inset_0_0_0_1px_rgba(226,232,240,0.8)] hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-100 dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)] dark:hover:bg-slate-800"><Wallet size={20} /></button>
                </div>
                <button type="button" onClick={() => { setShowDesktopLanding(false); setView("overview"); }} className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-900 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white">Review balance</button>
              </section>

              <section className="rounded-[30px] border border-slate-200/80 bg-white/92 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.06)]">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-lg font-semibold text-slate-900">Fees snapshot</div>
                    <div className="mt-1 text-sm text-slate-500">A quick read on the current Fees workspace.</div>
                  </div>
                  <button type="button" onClick={() => setIsLandingSettingsOpen(true)} className="text-sm font-medium text-slate-500 hover:text-slate-700">Open settings</button>
                </div>
                <div className="mt-5 space-y-3">
                  {[
                    ["Outstanding balance", balanceSummary.balance],
                    ["Paid recently", balanceSummary.paid],
                    ["Charges", balanceSummary.charges],
                    ["Status", balanceSummary.status],
                    ["Default view", landingWorkspaceSettings.defaultView],
                  ].map(([label, value]) => (
                    <div key={label} className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white px-4 py-3">
                      <span className="text-sm text-slate-500">{label}</span>
                      <span className="text-sm font-semibold text-slate-900">{value}</span>
                    </div>
                  ))}
                </div>
                {landingWorkspaceStatus ? <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">{landingWorkspaceStatus}</div> : null}
              </section>

              <section className="rounded-[30px] border border-slate-200/80 bg-white/92 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.06)]">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-lg font-semibold text-slate-900">Quick actions</div>
                    <div className="mt-1 text-sm text-slate-500">Compact finance shortcuts for balances and statements.</div>
                  </div>
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Fees</div>
                </div>
                <div className="mt-5 space-y-3">
                  {[
                    ["Payment history", "Open the payment-history view in this workspace.", FileText, () => { setShowDesktopLanding(false); setView("history"); }],
                    ["Balance breakdown", "Review outstanding and cleared fee categories.", Wallet, () => { setShowDesktopLanding(false); setView("overview"); }],
                    ["Statements", "Prepare a safe frontend-first statement shortcut.", FileText, () => setLandingWorkspaceStatus("Statements are prepared here as a safe frontend-first Fees shortcut.")],
                    ["Subgroup", "Link subgroup finance context safely.", Sparkles, () => setLandingWorkspaceStatus("Subgroup routing is prepared here as a safe frontend-first Fees shortcut.")],
                  ].map(([label, desc, Icon, action]) => (
                    <button key={label} type="button" onClick={action} className="flex w-full items-center gap-4 rounded-[22px] border border-slate-200 bg-white px-4 py-4 text-left transition hover:bg-slate-50">
                      <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-600"><Icon size={18} /></span>
                      <span className="min-w-0">
                        <span className="block text-base font-semibold text-slate-950">{label}</span>
                        <span className="mt-1 block text-sm leading-6 text-slate-500">{desc}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </section>
            </aside>
          </div>
        </div>

        <FeesWorkspaceModal open={isLandingShareOpen} title="Share Fees workspace" onClose={() => setIsLandingShareOpen(false)}>
          <div className="space-y-5">
            <div>
              <div className="text-sm font-semibold text-slate-900">Invite by email</div>
              <input value={landingShareInvite} onChange={(event) => setLandingShareInvite(event.target.value)} placeholder="bursar@elimulink.edu" className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-300" />
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-900">Access level</div>
              <div className="mt-2 grid grid-cols-2 gap-3">
                {["only invited", "anyone with link", "institution only", "subgroup only"].map((option) => (
                  <button key={option} type="button" onClick={() => setLandingShareAccess(option)} className={["rounded-2xl border px-4 py-3 text-left text-sm capitalize transition", landingShareAccess === option ? "border-slate-950 bg-slate-950 text-white" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"].join(" ")}>{option}</button>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">Share for Fees stays frontend-first in this pass so it does not invent finance backend logic.</div>
            {landingShareStatus ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{landingShareStatus}</div> : null}
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setIsLandingShareOpen(false)} className="rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">Close</button>
              <button type="button" onClick={() => setLandingShareStatus("Fees workspace sharing is prepared here as a safe frontend-first flow.")} className="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-900">Save share setup</button>
            </div>
          </div>
        </FeesWorkspaceModal>

        <FeesWorkspaceModal open={isLandingSettingsOpen} title="Fees workspace settings" onClose={() => setIsLandingSettingsOpen(false)}>
          <div className="space-y-5">
            <label className="block"><div className="text-sm font-semibold text-slate-900">Workspace name</div><input value={landingWorkspaceSettings.name} onChange={(event) => setLandingWorkspaceSettings((prev) => ({ ...prev, name: event.target.value }))} className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-300" /></label>
            <label className="block"><div className="text-sm font-semibold text-slate-900">Description</div><textarea value={landingWorkspaceSettings.description} onChange={(event) => setLandingWorkspaceSettings((prev) => ({ ...prev, description: event.target.value }))} rows={4} className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-300" /></label>
            <div className="grid grid-cols-2 gap-4">
              <label className="block"><div className="text-sm font-semibold text-slate-900">Default view</div><input value={landingWorkspaceSettings.defaultView} onChange={(event) => setLandingWorkspaceSettings((prev) => ({ ...prev, defaultView: event.target.value }))} className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-300" /></label>
              <label className="block"><div className="text-sm font-semibold text-slate-900">Finance mode</div><input value={landingWorkspaceSettings.financeMode} onChange={(event) => setLandingWorkspaceSettings((prev) => ({ ...prev, financeMode: event.target.value }))} className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-300" /></label>
            </div>
            {landingWorkspaceStatus ? <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">{landingWorkspaceStatus}</div> : null}
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setIsLandingSettingsOpen(false)} className="rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">Close</button>
              <button type="button" onClick={() => setLandingWorkspaceStatus("Fees workspace settings are saved locally for this desktop landing pass.")} className="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-900">Save settings</button>
            </div>
          </div>
        </FeesWorkspaceModal>

        <FeesWorkspaceModal open={landingDeleteOpen} title="Delete Fees workspace" onClose={() => setLandingDeleteOpen(false)}>
          <div className="space-y-5">
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm leading-6 text-rose-700">Deleting the Fees workspace is not connected to backend deletion in this pass. This stays a safe frontend-first confirmation only.</div>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setLandingDeleteOpen(false)} className="rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</button>
              <button type="button" onClick={() => { setLandingDeleteOpen(false); setLandingWorkspaceStatus("Delete is prepared here as a safe frontend-first Fees action."); }} className="rounded-full bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-rose-700">Confirm delete</button>
            </div>
          </div>
        </FeesWorkspaceModal>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-slate-100 px-6 py-6">
      <div className="mx-auto max-w-7xl">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
            <button type="button" onClick={() => setShowDesktopLanding(true)} className="inline-flex h-8 items-center gap-1 rounded-md border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 hover:bg-slate-50"><ArrowLeft size={12} />Workspace</button>
            {isMobileViewport ? (
              <button type="button" onClick={() => setShowMobileLanding(true)} className="inline-flex h-8 items-center gap-1 rounded-md border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 hover:bg-slate-50">Landing</button>
            ) : null}
            <div>
              <div className="text-xl font-extrabold text-slate-900">Fees</div>
              <div className="text-sm text-slate-600">Academic balances, payment status, and statements.</div>
              {feesLoading ? <div className="mt-2 text-xs font-semibold text-slate-500">Loading finance data...</div> : null}
              {feesError ? <div className="mt-2 text-xs font-semibold text-rose-600">{feesError}</div> : null}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {["overview", "history", "status"].map((item) => (
              <button key={item} type="button" onClick={() => setView(item)} className={["rounded-full border px-4 py-2 text-sm font-semibold transition", view === item ? "border-slate-950 bg-slate-950 text-white" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"].join(" ")}>{item === "overview" ? "Overview" : item === "history" ? "History" : "Status"}</button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-12 gap-6">
          <section className="col-span-12 rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm lg:col-span-8">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              {[
                ["Outstanding balance", balanceSummary.balance, "Semester 2"],
                ["Paid recently", balanceSummary.paid, "Latest payment"],
                ["Charges", balanceSummary.charges, "Pending adjustments"],
                ["Status", balanceSummary.status, "Current standing"],
              ].map(([label, value, sub]) => (
                <div key={label} className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">{label}</div>
                  <div className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">{value}</div>
                  <div className="mt-1 text-sm text-slate-500">{sub}</div>
                </div>
              ))}
            </div>

            <div className="mt-6 space-y-3">
              {!feeRows.length && !feesLoading ? (
                <div className="rounded-[24px] border border-dashed border-slate-300 bg-slate-50 px-5 py-5 text-sm text-slate-500">
                  No finance rows are available from the current backend source yet.
                </div>
              ) : null}
              {feeRows.map((item) => (
                <div key={item.id} className="rounded-[24px] border border-slate-200 bg-slate-50 px-5 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="text-base font-semibold text-slate-900">{item.title}</div>
                      <div className="mt-1 text-sm text-slate-600">{item.context}</div>
                    </div>
                    <div className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{item.amount} • {item.status}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <aside className="col-span-12 flex flex-col gap-5 lg:col-span-4">
            <section className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="text-lg font-semibold text-slate-900">Fees snapshot</div>
              <div className="mt-5 space-y-3">
                {[
                  ["Default view", landingWorkspaceSettings.defaultView],
                  ["Finance mode", landingWorkspaceSettings.financeMode],
                  ["Outstanding balance", balanceSummary.balance],
                  ["Workspace", landingWorkspaceSettings.name],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <span className="text-sm text-slate-500">{label}</span>
                    <span className="text-sm font-semibold text-slate-900">{value}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="text-lg font-semibold text-slate-900">Quick entry</div>
              <div className="mt-2 text-sm text-slate-500">Keep finance actions close without crowding the workspace.</div>
              <div className="mt-5 space-y-3">
                <button type="button" onClick={() => setView("history")} className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left text-sm font-medium text-slate-700 hover:bg-white"><FileText size={16} />Payment history</button>
                <button type="button" onClick={() => onBack?.()} className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left text-sm font-medium text-slate-700 hover:bg-white"><ArrowLeft size={16} />Back to NewChat</button>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
