import React, { useContext, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  Calendar,
  momentLocalizer,
  Views,
  type View,
  type ToolbarProps,
  type EventProps,
} from "react-big-calendar";
import moment from "moment";
import styled, { keyframes } from "styled-components";
import { AuthContext } from "../../Context/ContextConfig";
import Icon from "../icon";
import StatCard from "../statCard";
import {
  sectionTheme__css,
  sectionBorderTheme__css,
  textTheme__css,
} from "../../styles/CssComponents";

import "react-big-calendar/lib/css/react-big-calendar.css";
import {
  DashboardContainer,
  DashboardHeader,
  DashboardText,
  DashboardTitle,
} from "../dashboard";
import useBodyScrollLock from "../../customHooks/useBodyScrollLock";
import { parentescoLabel } from "../../functions/personasAdicionales";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/animate-ui/components/radix/accordion";

// Español definido aquí: el import de "moment/locale/es" lo empaqueta Vite
// con otra instancia de moment y el calendario seguía en inglés.
moment.defineLocale("es", {
  months:
    "enero_febrero_marzo_abril_mayo_junio_julio_agosto_septiembre_octubre_noviembre_diciembre".split("_"),
  monthsShort: "ene_feb_mar_abr_may_jun_jul_ago_sep_oct_nov_dic".split("_"),
  weekdays: "domingo_lunes_martes_miércoles_jueves_viernes_sábado".split("_"),
  weekdaysShort: "dom_lun_mar_mié_jue_vie_sáb".split("_"),
  weekdaysMin: "do_lu_ma_mi_ju_vi_sá".split("_"),
  week: { dow: 0, doy: 6 },
});
moment.locale("es");
const localizer = momentLocalizer(moment);

interface CalendarEvent {
  title: string;
  start: Date;
  end: Date;
  allDay?: boolean;
  resource?: {
    numpoliza: string;
    // "adicional": familiar no asegurado (polizas_personas_adicionales).
    tipo: "asegurado" | "adicional";
    parentesco?: string;
  };
}

interface BirthdatePayload {
  nombrecompleto: string;
  birthdate: string;
  numpoliza: string;
  tipo?: "asegurado" | "adicional";
  parentesco?: string;
}

// Cuantos cumpleanos proximos se listan en el panel lateral (la lista hace
// scroll dentro de su seccion).
const UPCOMING_LIMIT = 30;

// Clases del accordion de Animate UI con la paleta --ga-*. Tailwind va sin
// preflight, asi que el boton trae el fondo y borde nativos del navegador y
// "border-b" no tiene estilo de borde: se quitan/fijan aqui.
const ITEM_CLASS = "border-solid border-0 border-b border-[var(--ga-surface-border)]";
const TRIGGER_CLASS =
  "items-center px-1 py-3 bg-transparent border-0 hover:no-underline cursor-pointer [&>svg]:text-[var(--ga-muted)]";
const CONTENT_CLASS = "pt-1 pb-3";

// El backend manda un cumpleanos por asegurado (los proximos y los de los
// ultimos dias) como YYYY-MM-DD; se arma la fecha local sin pasar por UTC para
// que la zona horaria no la mueva un dia.
const parseBirthdate = (raw: string): Date => {
  const [y, m, d] = raw.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d);
};

const daysUntil = (date: Date): number =>
  moment(date).startOf("day").diff(moment().startOf("day"), "days");

const daysLabel = (days: number): string =>
  days < -1
    ? `Hace ${-days} días`
    : days === -1
      ? "Ayer"
      : days === 0
        ? "Hoy"
        : days === 1
          ? "Mañana"
          : `En ${days} días`;

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const isAdicional = (e: CalendarEvent) => e.resource?.tipo === "adicional";

// ── Toolbar ───────────────────────────────────────────────────────────────────
const VIEW_LABELS: Partial<Record<View, string>> = {
  [Views.MONTH]: "Mes",
  [Views.AGENDA]: "Lista",
};

const CalendarToolbar: React.FC<ToolbarProps<CalendarEvent>> = ({
  label,
  onNavigate,
  onView,
  view,
}) => (
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

const BirthdayEvent: React.FC<EventProps<CalendarEvent>> = ({ event }) => (
  <EventChip title={event.title}>
    <Icon iconName="CakeOutlined" size={12} customColor="currentColor" />
    <span>{event.title}</span>
  </EventChip>
);

const CalendarComp: React.FC = () => {
  const auth = useContext(AuthContext);

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [currentView, setCurrentView] = useState<View>(Views.MONTH);
  const [agendaLength, setAgendaLength] = useState<number>(30);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  useBodyScrollLock(selectedEvent !== null);

  useEffect(() => {
    const fetchBirthdays = async () => {
      try {
        if (auth?.session == null) throw new Error("No existe sesión activa");

        const jwt = localStorage.getItem("session_jwt");
        const calendar_data = await fetch(
          `${import.meta.env.VITE_API_SERVER_URL}/v1/polizas/birthdates`,
          { headers: { Authorization: `Bearer ${jwt}` } },
        );

        const response = await calendar_data.json();

        if (response.success && response.payload) {
          const formattedEvents: CalendarEvent[] = response.payload.map(
            (item: BirthdatePayload) => {
              const dateObj = parseBirthdate(item.birthdate);
              return {
                title: item.nombrecompleto,
                start: dateObj,
                end: dateObj,
                allDay: true,
                resource: {
                  numpoliza: item.numpoliza,
                  tipo: item.tipo ?? "asegurado",
                  parentesco: item.parentesco,
                },
              };
            },
          );
          setEvents(formattedEvents);
        }
      } catch (error) {
        console.error("Error en la petición de cumpleaños:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchBirthdays();
  }, [auth?.session]);

  const upcoming = useMemo(
    () =>
      events
        .filter((e) => daysUntil(e.start) >= 0)
        .sort((a, b) => a.start.getTime() - b.start.getTime()),
    [events],
  );

  // Los que ya pasaron, del mas reciente al mas viejo.
  const recent = useMemo(
    () =>
      events
        .filter((e) => daysUntil(e.start) < 0)
        .sort((a, b) => b.start.getTime() - a.start.getTime()),
    [events],
  );

  const stats = useMemo(() => {
    const now = moment();
    return {
      week: upcoming.filter((e) => daysUntil(e.start) <= 7).length,
      month: events.filter((e) => moment(e.start).isSame(now, "month")).length,
      total: events.length,
    };
  }, [events, upcoming]);

  const goToMonth = (date: Date) => {
    setCurrentView(Views.MONTH);
    setCurrentDate(date);
  };

  const goToAgenda = (length: number) => {
    setAgendaLength(length);
    setCurrentView(Views.AGENDA);
    setCurrentDate(new Date());
  };

  const openEvent = (event: CalendarEvent) => {
    if (currentView === Views.MONTH) setCurrentDate(event.start);
    setSelectedEvent(event);
  };

  const renderRow = (e: CalendarEvent) => {
    const days = daysUntil(e.start);
    return (
      <UpcomingRow
        key={`${e.resource?.tipo}-${e.title}-${e.resource?.numpoliza}`}
        $past={days < 0}
        onClick={() => openEvent(e)}
      >
        <DateBadge $adicional={isAdicional(e)}>
          <span>{moment(e.start).format("D")}</span>
          <small>{moment(e.start).format("MMM").replace(".", "")}</small>
        </DateBadge>
        <RowInfo>
          <RowName>{e.title}</RowName>
          <RowMeta>
            {isAdicional(e)
              ? `${parentescoLabel(e.resource?.parentesco)} · Póliza ${e.resource?.numpoliza}`
              : `Póliza ${e.resource?.numpoliza}`}
          </RowMeta>
        </RowInfo>
        <DaysPill $days={days}>{daysLabel(days)}</DaysPill>
      </UpcomingRow>
    );
  };

  const selectedDays = selectedEvent ? daysUntil(selectedEvent.start) : 0;

  return (
    <>
      <DashboardContainer>
        <DashboardHeader>
          <HeaderLeft>
            <DashboardTitle>Mi calendario</DashboardTitle>
            <DashboardText $theme="Light">
              Descubre quién es el siguiente cumpleañero.
            </DashboardText>
          </HeaderLeft>
        </DashboardHeader>

        <StatContainer>
          <StatCard
            amount={stats.week}
            title="Próximos 7 días"
            type="Warning"
            filter={() => goToAgenda(7)}
          />
          <StatCard
            amount={stats.month}
            title="Este mes"
            type="Success"
            filter={() => goToMonth(new Date())}
          />
          <StatCard
            amount={stats.total}
            title="Asegurados con cumpleaños"
            type="Default"
            filter={() => goToAgenda(365)}
          />
        </StatContainer>

        {loading ? (
          <LoadingBox>
            <Spinner />
            <p>Cargando calendario de cumpleaños...</p>
          </LoadingBox>
        ) : (
          <Layout>
            <CalendarSurface>
              <Calendar
                localizer={localizer}
                culture="es"
                events={events}
                startAccessor="start"
                endAccessor="end"
                style={{ height: 640 }}
                date={currentDate}
                view={currentView}
                views={[Views.MONTH, Views.AGENDA]}
                length={agendaLength}
                popup
                onNavigate={(newDate) => setCurrentDate(newDate)}
                onView={(newView) => setCurrentView(newView)}
                onSelectEvent={(event) => setSelectedEvent(event)}
                eventPropGetter={(event) => ({
                  className: [
                    isAdicional(event) ? "is-adicional" : "",
                    daysUntil(event.start) < 0 ? "is-past" : "",
                  ].join(" "),
                })}
                components={{
                  toolbar: CalendarToolbar,
                  month: { event: BirthdayEvent },
                }}
                formats={{
                  weekdayFormat: (date, culture, loc) =>
                    capitalize(
                      loc!.format(date, "ddd", culture).replace(".", ""),
                    ),
                  agendaDateFormat: (date, culture, loc) =>
                    capitalize(loc!.format(date, "ddd D [de] MMM", culture)),
                  agendaHeaderFormat: ({ start, end }, culture, loc) =>
                    `${loc!.format(start, "D MMM", culture)} – ${loc!.format(end, "D MMM YYYY", culture)}`,
                }}
                messages={{
                  date: "Fecha",
                  time: "Hora",
                  event: "Asegurado",
                  allDay: "Todo el día",
                  showMore: (total) => `+${total} más`,
                  noEventsInRange: "No hay cumpleaños en este periodo.",
                }}
              />
            </CalendarSurface>

            <Upcoming>
              {events.length === 0 ? (
                <EmptyState>
                  <Icon iconName="CakeOutlined" size={36} customColor="var(--ga-muted)" />
                  <p>Aún no hay cumpleaños registrados.</p>
                </EmptyState>
              ) : (
                // Una seccion abierta a la vez y cada lista con su propio
                // scroll: asi el panel no crece mas que el calendario.
                <Accordion type="single" collapsible defaultValue="proximos">
                  <AccordionItem value="proximos" className={ITEM_CLASS}>
                    <AccordionTrigger className={TRIGGER_CLASS}>
                      <SectionHeading>
                        <UpcomingTitle>Próximos cumpleaños</UpcomingTitle>
                        <UpcomingCount>{upcoming.length}</UpcomingCount>
                      </SectionHeading>
                    </AccordionTrigger>
                    <AccordionContent className={CONTENT_CLASS}>
                      <UpcomingList>
                        {upcoming.slice(0, UPCOMING_LIMIT).map(renderRow)}
                      </UpcomingList>
                    </AccordionContent>
                  </AccordionItem>

                  {recent.length > 0 && (
                    <AccordionItem value="recientes" className={ITEM_CLASS}>
                      <AccordionTrigger className={TRIGGER_CLASS}>
                        <SectionHeading>
                          <UpcomingTitle>Recientes</UpcomingTitle>
                          <UpcomingCount>{recent.length}</UpcomingCount>
                        </SectionHeading>
                      </AccordionTrigger>
                      <AccordionContent className={CONTENT_CLASS}>
                        <UpcomingList>{recent.map(renderRow)}</UpcomingList>
                      </AccordionContent>
                    </AccordionItem>
                  )}
                </Accordion>
              )}
            </Upcoming>
          </Layout>
        )}
      </DashboardContainer>

      {/* Modal de detalle */}
      {selectedEvent &&
        createPortal(
          <Overlay onClick={() => setSelectedEvent(null)}>
            <EventCard onClick={(e) => e.stopPropagation()}>
              <CardHeader>
                <CardHeaderLeft>
                  <BirthdayIcon>
                    <Icon iconName="CakeOutlined" size={18} customColor="var(--ga-primary)" />
                  </BirthdayIcon>
                  <CardTitle>Cumpleaños</CardTitle>
                </CardHeaderLeft>
                <CloseBtn
                  onClick={() => setSelectedEvent(null)}
                  aria-label="Cerrar"
                >
                  <Icon iconName="Close" size={16} />
                </CloseBtn>
              </CardHeader>

              <CardBody>
                <EventName>{selectedEvent.title}</EventName>
                {isAdicional(selectedEvent) && (
                  <AdicionalNote>
                    Persona adicional: no está asegurada en la póliza.
                  </AdicionalNote>
                )}

                <DetailsList>
                  <DetailItem>
                    <DetailLabel>Fecha</DetailLabel>
                    <DetailValue>
                      {moment(selectedEvent.start).format("dddd D [de] MMMM")}
                    </DetailValue>
                  </DetailItem>
                  <DetailItem>
                    <DetailLabel>Faltan</DetailLabel>
                    <DaysPill $days={selectedDays}>
                      {daysLabel(selectedDays)}
                    </DaysPill>
                  </DetailItem>
                  {isAdicional(selectedEvent) && (
                    <DetailItem>
                      <DetailLabel>Parentesco</DetailLabel>
                      <DetailValue>
                        {parentescoLabel(selectedEvent.resource?.parentesco)}
                      </DetailValue>
                    </DetailItem>
                  )}
                  <DetailItem>
                    <DetailLabel>Póliza</DetailLabel>
                    <DetailValue>{selectedEvent.resource?.numpoliza}</DetailValue>
                  </DetailItem>
                </DetailsList>
              </CardBody>
            </EventCard>
          </Overlay>,
          document.body,
        )}
    </>
  );
};

// ── Animations ────────────────────────────────────────────────────────────────
const fadeIn = keyframes`
  from { opacity: 0; }
  to   { opacity: 1; }
`;

const slideUp = keyframes`
  from { opacity: 0; transform: translateY(12px) scale(0.97); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
`;

const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

// ── Layout ────────────────────────────────────────────────────────────────────
const HeaderLeft = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const StatContainer = styled.div`
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  justify-content: center;
`;

const Layout = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  gap: 16px;
  align-items: start;

  @media (max-width: 1024px) {
    grid-template-columns: minmax(0, 1fr);
  }
`;

// Contenedor blanco con borde sutil (estilo de la presentacion), igual que la
// lista de polizas.
const Surface = styled.div`
  background-color: var(--ga-surface);
  border: 1.5px solid var(--ga-surface-border);
  border-radius: 16px;
`;

const LoadingBox = styled(Surface)`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 60px 16px;

  p {
    font-size: 14px;
    color: var(--ga-muted);
  }
`;

const Spinner = styled.div`
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 3px solid var(--ga-surface-border);
  border-top-color: var(--ga-primary);
  animation: ${spin} 0.8s linear infinite;
`;

// ── Toolbar styles ────────────────────────────────────────────────────────────
const Toolbar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 16px;
`;

const ToolbarNav = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
`;

const baseBtn = `
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 34px;
  border-radius: 8px;
  border: 1px solid var(--ga-surface-border);
  background: var(--ga-surface);
  color: var(--ga-text);
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  transition: background-color 0.15s, border-color 0.15s;

  &:hover {
    background-color: var(--ga-surface-soft);
  }
`;

const TodayBtn = styled.button`
  ${baseBtn}
  padding: 0 14px;
`;

const NavBtn = styled.button`
  ${baseBtn}
  width: 34px;

  & svg {
    color: var(--ga-text);
  }
`;

const ToolbarLabel = styled.h2`
  font-size: 18px;
  font-weight: 700;
  letter-spacing: -0.2px;
  color: var(--ga-text);

  @media (max-width: 640px) {
    order: -1;
    width: 100%;
  }
`;

const Segmented = styled.div`
  display: inline-flex;
  padding: 3px;
  gap: 2px;
  border-radius: 10px;
  background-color: var(--ga-surface-soft);
  border: 1px solid var(--ga-surface-border);
`;

const SegmentBtn = styled.button<{ $active: boolean }>`
  border: none;
  border-radius: 7px;
  padding: 6px 14px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  background: ${(p) => (p.$active ? "var(--ga-primary)" : "transparent")};
  color: ${(p) => (p.$active ? "#fff" : "var(--ga-muted)")};
  transition: background-color 0.15s, color 0.15s;

  &:hover {
    color: ${(p) => (p.$active ? "#fff" : "var(--ga-text)")};
  }
`;

// ── Calendar (overrides de react-big-calendar con la paleta --ga-*) ──────────
const EventChip = styled.span`
  display: flex;
  align-items: center;
  gap: 4px;
  min-width: 0;

  & > span:last-child {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`;

const CalendarSurface = styled(Surface)`
  padding: 20px;
  min-width: 0;

  @media (max-width: 640px) {
    padding: 14px;
  }

  .rbc-calendar {
    color: var(--ga-text);
  }

  /* Rejilla del mes */
  .rbc-month-view,
  .rbc-agenda-view table.rbc-agenda-table {
    border: 1px solid var(--ga-surface-border);
    border-radius: 12px;
    overflow: hidden;
  }

  .rbc-header {
    padding: 10px 4px;
    font-size: 12px;
    font-weight: 600;
    color: var(--ga-muted);
    border-bottom: 1px solid var(--ga-surface-border);
    background-color: var(--ga-surface-soft);
  }

  .rbc-header + .rbc-header,
  .rbc-day-bg + .rbc-day-bg {
    border-left: 1px solid var(--ga-surface-border);
  }

  .rbc-month-row + .rbc-month-row {
    border-top: 1px solid var(--ga-surface-border);
  }

  .rbc-off-range-bg {
    background-color: var(--ga-surface-soft);
  }

  .rbc-today {
    background-color: rgba(21, 93, 252, 0.06);
  }

  .rbc-date-cell {
    padding: 6px 8px 2px;
    font-size: 13px;
    font-weight: 500;
    text-align: right;

    &.rbc-off-range {
      color: var(--ga-muted);
      opacity: 0.6;
    }

    /* Numero del dia actual en un circulo azul */
    &.rbc-now > * {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 24px;
      height: 24px;
      padding: 0 6px;
      border-radius: 12px;
      background-color: var(--ga-primary);
      color: #fff;
      font-weight: 700;
    }
  }

  .rbc-button-link {
    color: inherit;
    font: inherit;
  }

  /* Eventos como pildoras con tinte suave */
  .rbc-event,
  .rbc-day-slot .rbc-background-event {
    background-color: rgba(21, 93, 252, 0.1);
    color: var(--ga-primary);
    border: none;
    border-radius: 6px;
    padding: 2px 6px;
    font-size: 12px;
    font-weight: 600;
    transition: background-color 0.15s;

    &:hover {
      background-color: rgba(21, 93, 252, 0.18);
    }

    /* Personas adicionales (no aseguradas) en violeta */
    &.is-adicional {
      background-color: var(--ga-violet-soft);
      color: var(--ga-violet);
    }

    /* Cumpleanos que ya pasaron: gris en lugar de azul */
    &.is-past {
      background-color: var(--ga-surface-soft);
      color: var(--ga-muted);
      box-shadow: inset 0 0 0 1px var(--ga-surface-border);
    }

    &.rbc-selected {
      background-color: var(--ga-primary);
      color: #fff;
    }

    &:focus {
      outline: 2px solid var(--ga-primary);
      outline-offset: 1px;
    }
  }

  .rbc-row-segment {
    padding: 1px 4px;
  }

  .rbc-show-more {
    background: transparent;
    color: var(--ga-primary);
    font-size: 12px;
    font-weight: 600;
    padding: 0 6px;

    &:hover {
      text-decoration: underline;
    }
  }

  /* Popup de "+N mas" */
  .rbc-overlay {
    background-color: var(--ga-surface);
    border: 1px solid var(--ga-surface-border);
    border-radius: 12px;
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.18);
    padding: 10px;
  }

  .rbc-overlay-header {
    border-bottom: 1px solid var(--ga-surface-border);
    margin: -10px -10px 8px;
    padding: 10px 12px;
    font-size: 13px;
    font-weight: 600;
    color: var(--ga-muted);
  }

  /* Vista de lista */
  .rbc-agenda-view table.rbc-agenda-table {
    border-collapse: separate;
    border-spacing: 0;

    thead > tr > th {
      padding: 10px 14px;
      font-size: 12px;
      font-weight: 600;
      color: var(--ga-muted);
      text-align: left;
      background-color: var(--ga-surface-soft);
      border-bottom: 1px solid var(--ga-surface-border);
    }

    tbody > tr > td {
      padding: 10px 14px;
      font-size: 14px;
      border-top: none;
      border-left: none;
    }

    tbody > tr + tr > td {
      border-top: 1px solid var(--ga-surface-border);
    }

    tbody > tr > td + td {
      border-left: 1px solid var(--ga-surface-border);
    }

    .rbc-agenda-date-cell {
      font-weight: 600;
      white-space: nowrap;
    }

    .rbc-agenda-time-cell {
      color: var(--ga-muted);
      font-size: 13px;
    }

    .rbc-agenda-event-cell {
      font-weight: 500;
      cursor: pointer;
    }

    tbody > tr {
      background: transparent !important;
      color: var(--ga-text) !important;
    }
  }

  .rbc-agenda-empty {
    padding: 40px 16px;
    text-align: center;
    color: var(--ga-muted);
    font-size: 14px;
  }
`;

// ── Panel de proximos cumpleanos ──────────────────────────────────────────────
const Upcoming = styled(Surface)`
  padding: 4px 16px;
`;

const SectionHeading = styled.span`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex: 1;
`;

const UpcomingTitle = styled.span`
  font-size: 15px;
  font-weight: 700;
  color: var(--ga-text);
`;

const UpcomingCount = styled.span`
  font-size: 12px;
  font-weight: 600;
  padding: 2px 10px;
  border-radius: 20px;
  background-color: rgba(21, 93, 252, 0.1);
  color: var(--ga-primary);
`;

const UpcomingList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 460px;
  overflow-y: auto;
  overscroll-behavior: contain;
  /* Espacio para que el hover (translateY) y la barra no corten las filas */
  padding: 2px 4px 2px 0;

  &::-webkit-scrollbar {
    width: 4px;
  }
  &::-webkit-scrollbar-thumb {
    border-radius: 4px;
    background-color: rgba(128, 128, 128, 0.35);
  }
`;

// Fila en gris calido dentro del contenedor blanco, como en la lista de
// polizas. Las de cumpleanos que ya pasaron van atenuadas.
const UpcomingRow = styled.button<{ $past: boolean }>`
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 10px 12px;
  border: 1px solid transparent;
  border-radius: 10px;
  background-color: var(--ga-surface-soft);
  cursor: pointer;
  text-align: left;
  opacity: ${(p) => (p.$past ? 0.7 : 1)};
  transition: border-color 0.15s, transform 0.15s, opacity 0.15s;

  &:hover {
    opacity: 1;
    border-color: rgba(21, 93, 252, 0.3);
    transform: translateY(-1px);
  }
`;

const DateBadge = styled.div<{ $adicional: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 44px;
  height: 44px;
  border-radius: 10px;
  background-color: var(--ga-surface);
  border: 1px solid var(--ga-surface-border);
  line-height: 1;

  span {
    font-size: 17px;
    font-weight: 700;
    color: ${(p) => (p.$adicional ? "var(--ga-violet)" : "var(--ga-primary)")};
  }

  small {
    margin-top: 2px;
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--ga-muted);
  }
`;

const RowInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  flex: 1;
`;

const RowName = styled.span`
  font-size: 13px;
  font-weight: 600;
  color: var(--ga-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const RowMeta = styled.span`
  font-size: 12px;
  color: var(--ga-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

// Hoy en verde, esta semana en naranja, el resto (y los que ya pasaron)
// neutro.
const DaysPill = styled.span<{ $days: number }>`
  flex-shrink: 0;
  font-size: 11px;
  font-weight: 600;
  padding: 3px 10px;
  border-radius: 20px;
  white-space: nowrap;
  background-color: ${(p) =>
    p.$days === 0
      ? "var(--ga-pill-success-bg)"
      : p.$days > 0 && p.$days <= 7
        ? "var(--ga-pill-warning-bg)"
        : "var(--ga-surface)"};
  color: ${(p) =>
    p.$days === 0
      ? "var(--ga-pill-success)"
      : p.$days > 0 && p.$days <= 7
        ? "var(--ga-pill-warning)"
        : "var(--ga-muted)"};
  box-shadow: ${(p) =>
    p.$days < 0 || p.$days > 7
      ? "inset 0 0 0 1px var(--ga-surface-border)"
      : "none"};
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 32px 8px;
  text-align: center;

  p {
    font-size: 13px;
    color: var(--ga-muted);
  }
`;

// ── Modal de detalle ──────────────────────────────────────────────────────────
const Overlay = styled.div`
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(4, 4, 4, 0.55);
  backdrop-filter: blur(3px);
  z-index: 1000;
  padding: 16px;
  animation: ${fadeIn} 0.18s ease;
`;

const EventCard = styled.div`
  ${sectionTheme__css}
  ${sectionBorderTheme__css}
  width: 100%;
  max-width: 360px;
  border-radius: 12px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.22);
  animation: ${slideUp} 0.22s ease;
`;

const CardHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid var(--ga-surface-border);
`;

const CardHeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const BirthdayIcon = styled.span`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background-color: rgba(21, 93, 252, 0.1);
`;

const CardTitle = styled.h3`
  ${textTheme__css}
  font-size: 15px;
  font-weight: 600;
`;

const CloseBtn = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  background: none;
  border: none;
  cursor: pointer;
  border-radius: 6px;
  opacity: 0.6;
  transition:
    opacity 0.15s,
    background 0.15s;

  &:hover {
    opacity: 1;
    background: var(--ga-surface-soft);
  }
`;

const CardBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 18px 16px 16px;
`;

const EventName = styled.h3`
  ${textTheme__css}
  font-size: 18px;
  font-weight: 700;
  letter-spacing: -0.2px;
  line-height: 1.3;
`;

const AdicionalNote = styled.p`
  margin-top: -6px;
  font-size: 12px;
  font-weight: 500;
  color: var(--ga-violet);
`;

// Filas en gris calido: etiqueta a la izquierda, valor a la derecha.
const DetailsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const DetailItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  padding: 10px 12px;
  border-radius: 8px;
  background-color: var(--ga-surface-soft);
`;

const DetailLabel = styled.span`
  font-size: 13px;
  color: var(--ga-muted);
  font-weight: 500;
`;

const DetailValue = styled.span`
  font-size: 13px;
  font-weight: 600;
  text-align: right;
  color: var(--ga-text);

  &::first-letter {
    text-transform: uppercase;
  }
`;

export default CalendarComp;
