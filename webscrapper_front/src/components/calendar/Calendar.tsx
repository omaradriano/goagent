import React, { useContext, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  Calendar,
  momentLocalizer,
  Views,
  type View,
} from "react-big-calendar";
import moment from "moment";
import styled, { keyframes } from "styled-components";
import { AuthContext } from "../../Context/ContextConfig";
import Icon from "../icon";
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

moment.locale("es");
const localizer = momentLocalizer(moment);

interface CalendarEvent {
  title: string;
  start: Date;
  end: Date;
  allDay?: boolean;
  resource?: {
    numpoliza: string;
  };
}

interface BirthdatePayload {
  nombrecompleto: string;
  birthdate: string;
  numpoliza: string;
}

const CalendarComp: React.FC = () => {
  const auth = useContext(AuthContext);

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [currentView, setCurrentView] = useState<View>(Views.MONTH);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

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
              const dateObj = new Date(item.birthdate);
              dateObj.setDate(dateObj.getDate() + 1);
              return {
                title: item.nombrecompleto,
                start: dateObj,
                end: dateObj,
                allDay: true,
                resource: { numpoliza: item.numpoliza },
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

  if (loading) {
    return (
      <div style={{ padding: "20px", textAlign: "center", fontSize: "1.2rem" }}>
        Cargando calendario de cumpleaños...
      </div>
    );
  }

  const formattedDate = selectedEvent
    ? moment(selectedEvent.start).format("DD [de] MMMM")
    : "";

  return (
    <>
      <DashboardContainer>
        <DashboardHeader>
          <DashboardTitle>Mi calendario</DashboardTitle>
          <DashboardText $theme="Light">
            Descubre quien es el siguiente cumpleañero
          </DashboardText>
        </DashboardHeader>

        <div
          style={{
            padding: "20px",
            backgroundColor: "#fff",
            borderRadius: "8px",
          }}
        >
          <Calendar
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            style={{ height: 650 }}
            date={currentDate}
            view={currentView}
            onNavigate={(newDate) => setCurrentDate(newDate)}
            onView={(newView) => setCurrentView(newView)}
            messages={{
              next: "Sig.",
              previous: "Ant.",
              today: "Hoy",
              month: "Mes",
              week: "Semana",
              day: "Día",
              agenda: "Agenda",
              date: "Fecha",
              time: "Hora",
              event: "Asegurado",
              noEventsInRange: "No hay cumpleaños registrados en este mes.",
            }}
            onSelectEvent={(event) => setSelectedEvent(event)}
          />
        </div>
      </DashboardContainer>

      {/* Modal de detalle */}
      {selectedEvent &&
        createPortal(
          <Overlay onClick={() => setSelectedEvent(null)}>
            <EventCard onClick={(e) => e.stopPropagation()}>
              <CardHeader>
                <BirthdayIcon>🎂</BirthdayIcon>
                <CloseBtn
                  onClick={() => setSelectedEvent(null)}
                  aria-label="Cerrar"
                >
                  <Icon iconName="Close" size={16} />
                </CloseBtn>
              </CardHeader>

              <EventName>{selectedEvent.title}</EventName>

              <DetailsGrid>
                <DetailItem>
                  <DetailLabel>Cumpleaños</DetailLabel>
                  <DetailValue>{formattedDate}</DetailValue>
                </DetailItem>
                <DetailItem>
                  <DetailLabel>Póliza</DetailLabel>
                  <DetailValue>{selectedEvent.resource?.numpoliza}</DetailValue>
                </DetailItem>
              </DetailsGrid>
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

// ── Styles ────────────────────────────────────────────────────────────────────
const Overlay = styled.div`
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(4, 4, 4, 0.45);
  backdrop-filter: blur(4px);
  z-index: 1000;
  padding: 1rem;
  animation: ${fadeIn} 0.18s ease;
`;

const EventCard = styled.div`
  ${sectionTheme__css}
  ${sectionBorderTheme__css}
  width: 100%;
  max-width: 320px;
  border-radius: 16px;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.22);
  animation: ${slideUp} 0.22s ease;
`;

const CardHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const BirthdayIcon = styled.span`
  font-size: 2rem;
  line-height: 1;
`;

const CloseBtn = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  cursor: pointer;
  border-radius: 6px;
  padding: 4px;
  color: #888;
  transition: background 0.15s;

  &:hover {
    background: ${(p) =>
      p.theme.mode === "Dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"};
  }
`;

const EventName = styled.h3`
  ${textTheme__css}
  font-size: 1.1rem;
  font-weight: 700;
  letter-spacing: -0.2px;
  line-height: 1.3;
  margin: 0;
`;

const DetailsGrid = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  padding-top: 0.25rem;
  border-top: 1px solid
    ${(p) =>
      p.theme.mode === "Dark" ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)"};
`;

const DetailItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
`;

const DetailLabel = styled.span`
  font-size: 0.8rem;
  color: #888;
  font-weight: 500;
`;

const DetailValue = styled.span`
  ${textTheme__css}
  font-size: 0.875rem;
  font-weight: 600;
  text-align: right;
`;

export default CalendarComp;
