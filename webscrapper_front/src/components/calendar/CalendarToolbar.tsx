import {
  Views,
  type View,
  type ToolbarProps,
} from "react-big-calendar";
import Icon from "../icon";
import {
  capitalize,
  Toolbar,
  ToolbarNav,
  TodayBtn,
  NavBtn,
  ToolbarLabel,
  Segmented,
  SegmentBtn,
} from "./calendarShared";

// ── Toolbar ───────────────────────────────────────────────────────────────────
const VIEW_LABELS: Partial<Record<View, string>> = {
  [Views.MONTH]: "Mes",
  [Views.AGENDA]: "Lista",
};

const CalendarToolbar = <T extends object>({
  label,
  onNavigate,
  onView,
  view,
}: ToolbarProps<T>) => (
  <Toolbar>
    <ToolbarNav>
      <TodayBtn onClick={() => onNavigate("TODAY")}>Hoy</TodayBtn>
      <NavBtn onClick={() => onNavigate("PREV")} aria-label="Anterior">
        <Icon iconName="ChevronLeft" size={20} />
      </NavBtn>
      <NavBtn onClick={() => onNavigate("NEXT")} aria-label="Siguiente">
        <Icon iconName="ChevronRight" size={20} />
      </NavBtn>
    </ToolbarNav>

    <ToolbarLabel>{capitalize(label)}</ToolbarLabel>

    <Segmented>
      {(Object.keys(VIEW_LABELS) as View[]).map((v) => (
        <SegmentBtn key={v} $active={view === v} onClick={() => onView(v)}>
          {VIEW_LABELS[v]}
        </SegmentBtn>
      ))}
    </Segmented>
  </Toolbar>
);

export default CalendarToolbar;
