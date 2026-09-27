import { LogicHost } from "./runtime/logic";
import PulseLogic from "./logic/PulseLogic";
import AppShell from "./views/AppShell";

/* Options the design exposed as tweaks. */
const config = {
  /** Base colour of the abstract background behind the Dashboard's core KPIs. */
  kpiBackdrop: "#5f8f63",
  /** Show that background (it is always hidden in the light theme). */
  kpiBackdropOn: true,
};

export default function App() {
  return <LogicHost logic={PulseLogic} view={AppShell} props={config} />;
}
