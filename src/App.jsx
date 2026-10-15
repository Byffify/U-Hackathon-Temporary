import { useCallback, useState } from "react";
import Marketing from "./pages/CreatorLanding.jsx";
import Modal from "./components/ui/Modal.jsx";
import {
  StartDialog,
  FeesDialog,
  ExploreDialog,
  ProjectDialog,
  PlanDialog,
  AboutDialog,
} from "./components/dialogs/CreatorDialogs.jsx";
import { trackInteraction as track } from "./utils/analytics.js";

export default function App() {
  const [dialog, setDialog] = useState(null);
  const close = useCallback(() => setDialog(null), []);
  const actions = {
    openStart: (placement) => {
      track("onboarding_start", placement);
      setDialog({ kind: "start" });
    },
    openExplore: () => {
      track("explore_examples", "landing");
      setDialog({ kind: "explore" });
    },
    openProject: (id) => {
      track("project_example_open", id);
      setDialog({ kind: "project", id });
    },
    openFees: (placement) => {
      track("fee_info_open", placement);
      setDialog({ kind: "fees" });
    },
    previewPlan: (plan) => {
      track("composition_plan_preview", "ubot");
      setDialog({ kind: "plan", plan });
    },
    openPrivacy: () => setDialog({ kind: "about" }),
  };
  return (
    <>
      <Marketing actions={actions} />
      <Modal
        open={Boolean(dialog)}
        contentKey={`${dialog?.kind ?? ""}-${dialog?.id ?? ""}`}
        onClose={close}
      >
        {dialog?.kind === "start" && <StartDialog />}
        {dialog?.kind === "fees" && (
          <FeesDialog onStart={() => actions.openStart("fee-dialog")} />
        )}
        {dialog?.kind === "explore" && (
          <ExploreDialog onProject={actions.openProject} />
        )}
        {dialog?.kind === "project" && (
          <ProjectDialog id={dialog.id} onExplore={actions.openExplore} />
        )}
        {dialog?.kind === "plan" && (
          <PlanDialog plan={dialog.plan} onClose={close} />
        )}
        {dialog?.kind === "about" && <AboutDialog />}
      </Modal>
    </>
  );
}
