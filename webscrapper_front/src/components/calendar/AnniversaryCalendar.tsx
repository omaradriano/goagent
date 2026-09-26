import React, { useContext, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Calendar, Views, type View, type EventProps } from "react-big-calendar";
import moment from "moment";
import { AuthContext } from "../../Context/ContextConfig";
import Icon from "../icon";
import StatCard from "../statCard";
import {
  DashboardContainer,
  DashboardHeader,
  DashboardText,
  DashboardTitle,
} from "../dashboard";
import useBodyScrollLock from "../../customHooks/useBodyScrollLock";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/animate-ui/components/radix/accordion";
import {
  localizer,
  UPCOMING_LIMIT,
  ITEM_CLASS,
  TRIGGER_CLASS,
  CONTENT_CLASS,
  parseDate,
  daysUntil,
  daysLabel,
  calendarFormats,
  calendarMessages,
  HeaderLeft,
  InfoBanner,
  StatContainer,
  Layout,
  LoadingBox,
  Spinner,
  EventChip,
  CalendarSurface,
  Upcoming,
  SectionHeading,
  UpcomingTitle,
  UpcomingCount,
  UpcomingList,
  UpcomingRow,
  DateBadge,
  RowInfo,
  RowName,
  RowMeta,
  DaysPill,
  EmptyState,
  Overlay,
  EventCard,
  CardHeader,
  CardHeaderLeft,
  EventIconBox,
  CardTitle,
  CloseBtn,
  CardBody,
  EventName,
  DetailsList,
  DetailItem,
  DetailLabel,
  DetailValue,
} from "./calendarShared";
import CalendarToolbar from "./CalendarToolbar";

interface AnniversaryEvent {
  // "numpoliza · asegurado": es lo que muestra la vista de lista.
  title: string;
  start: Date;
  end: Date;
  allDay?: boolean;
  resource: {
    numpoliza: string;
    asegurado: string;
    emision: Date;
    anos: number;
  };
}

interface AnniversaryPayload {
  numpoliza: string;
  asegurado: string;
  fecha_emision: string;
  anniversary: string;
  anos: number;
}

const ANNIVERSARY_ICON = "EventRepeat";

// Debe coincidir con AnniversaryPastDays del backend.
const PAST_DAYS = 10;

const anosLabel = (anos: number) => (anos === 1 ? "1 año" : `${anos} años`);

const aseguradoLabel = (e: AnniversaryEvent) =>
  e.resource.asegurado || "Sin asegurado principal";

// En el mes solo el numero de poliza: un mismo asegurado puede tener varias
// polizas emitidas el mismo dia.
const AnniversaryChip: React.FC<EventProps<AnniversaryEvent>> = ({ event }) => (
  <EventChip title={event.title}>
    <Icon iconName={ANNIVERSARY_ICON} size={12} customColor="currentColor" />
    <span>{event.resource.numpoliza}</span>
  </EventChip>
);

const AnniversaryCalendar: React.FC = () => {
  const auth = useContext(AuthContext);

  const [events, setEvents] = useState<AnniversaryEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [currentView, setCurrentView] = useState<View>(Views.MONTH);
  const [agendaLength, setAgendaLength] = useState<number>(30);
  const [selectedEvent, setSelectedEvent] = useState<AnniversaryEvent | null>(null);
  useBodyScrollLock(selectedEvent !== null);

  useEffect(() => {
    const fetchAnniversaries = async () => {
      try {
        if (auth?.session == null) throw new Error("No existe sesión activa");

        const jwt = localStorage.getItem("session_jwt");
        const calendar_data = await fetch(
          `${import.meta.env.VITE_API_SERVER_URL}/v1/polizas/anniversaries`,
          { headers: { Authorization: `Bearer ${jwt}` } },
        );

        const response = await calendar_data.json();

        if (response.success && response.payload) {
          const formattedEvents: AnniversaryEvent[] = response.payload.map(
            (item: AnniversaryPayload) => {
              const dateObj = parseDate(item.anniversary);
              return {
                title: item.asegurado
                  ? `${item.numpoliza} · ${item.asegurado}`
                  : item.numpoliza,
                start: dateObj,
                end: dateObj,
                allDay: true,
                resource: {
                  numpoliza: item.numpoliza,
                  asegurado: item.asegurado,
                  emision: parseDate(item.fecha_emision),
                  anos: item.anos,
                },
              };
            },
          );
          setEvents(formattedEvents);
        }
      } catch (error) {
        console.error("Error en la petición de aniversarios:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnniversaries();
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

  const openEvent = (event: AnniversaryEvent) => {
    if (currentView === Views.MONTH) setCurrentDate(event.start);
    setSelectedEvent(event);
  };

  const renderRow = (e: AnniversaryEvent) => {
    const days = daysUntil(e.start);
    return (
      <UpcomingRow
        key={e.resource.numpoliza}
        $past={days < 0}
        onClick={() => openEvent(e)}
      >
        <DateBadge $adicional={false}>
          <span>{moment(e.start).format("D")}</span>
          <small>{moment(e.start).format("MMM").replace(".", "")}</small>
        </DateBadge>
        <RowInfo>
          <RowName>Póliza {e.resource.numpoliza}</RowName>
          <RowMeta>
            {aseguradoLabel(e)} · {anosLabel(e.resource.anos)}
          </RowMeta>
        </RowInfo>
        <DaysPill $days={days}>{daysLabel(days)}</DaysPill>
      </UpcomingRow>
    );
  };

  const selectedDays = selectedEvent ? daysUntil(selectedEvent.start) : 0;

  const windowStart = moment().subtract(PAST_DAYS, "days").format("D [de] MMMM [de] YYYY");
  const windowEnd = moment()
    .subtract(PAST_DAYS, "days")
    .add(1, "year")
    .subtract(1, "day")
    .format("D [de] MMMM [de] YYYY");

  return (
    <>
      <DashboardContainer>
        <DashboardHeader>
          <HeaderLeft>
            <DashboardTitle>Aniversarios de pólizas</DashboardTitle>
            <DashboardText $theme="Light">
              Consulta qué pólizas cumplen un año más desde su emisión.
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
            title="Pólizas con aniversario"
            type="Default"
            filter={() => goToAgenda(365)}
          />
        </StatContainer>

        {/* El backend manda solo el proximo aniversario de cada poliza: fuera
            de esta ventana el calendario sale vacio. */}
        <InfoBanner>
          <Icon iconName="InfoOutlined" size={18} customColor="var(--ga-primary)" />
          <span>
            Se muestra solo el <strong>próximo aniversario</strong> de cada póliza,
            del <strong>{windowStart}</strong> al <strong>{windowEnd}</strong>{" "}
            (incluye los de los últimos {PAST_DAYS} días). Las pólizas anuladas no
            aparecen.
          </span>
        </InfoBanner>

        {loading ? (
          <LoadingBox>
            <Spinner />
            <p>Cargando calendario de aniversarios...</p>
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
                  className: daysUntil(event.start) < 0 ? "is-past" : "",
                })}
                components={{
                  toolbar: CalendarToolbar<AnniversaryEvent>,
                  month: { event: AnniversaryChip },
                }}
                formats={calendarFormats}
                messages={calendarMessages(
                  "Póliza",
                  "No hay aniversarios de pólizas en este periodo.",
                )}
              />
            </CalendarSurface>

            <Upcoming>
              {events.length === 0 ? (
                <EmptyState>
                  <Icon iconName={ANNIVERSARY_ICON} size={36} customColor="var(--ga-muted)" />
                  <p>Aún no hay pólizas registradas.</p>
                </EmptyState>
              ) : (
                <Accordion type="single" collapsible defaultValue="proximos">
                  <AccordionItem value="proximos" className={ITEM_CLASS}>
                    <AccordionTrigger className={TRIGGER_CLASS}>
                      <SectionHeading>
                        <UpcomingTitle>Próximos aniversarios</UpcomingTitle>
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
                  <EventIconBox>
                    <Icon iconName={ANNIVERSARY_ICON} size={18} customColor="var(--ga-primary)" />
                  </EventIconBox>
                  <CardTitle>Aniversario de póliza</CardTitle>
                </CardHeaderLeft>
                <CloseBtn
                  onClick={() => setSelectedEvent(null)}
                  aria-label="Cerrar"
                >
                  <Icon iconName="Close" size={16} />
                </CloseBtn>
              </CardHeader>

              <CardBody>
                <EventName>Póliza {selectedEvent.resource.numpoliza}</EventName>

                <DetailsList>
                  <DetailItem>
                    <DetailLabel>Asegurado principal</DetailLabel>
                    <DetailValue>{aseguradoLabel(selectedEvent)}</DetailValue>
                  </DetailItem>
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
                  <DetailItem>
                    <DetailLabel>Cumple</DetailLabel>
                    <DetailValue>{anosLabel(selectedEvent.resource.anos)}</DetailValue>
                  </DetailItem>
                  <DetailItem>
                    <DetailLabel>Emisión</DetailLabel>
                    <DetailValue>
                      {moment(selectedEvent.resource.emision).format("D [de] MMMM [de] YYYY")}
                    </DetailValue>
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

export default AnniversaryCalendar;
