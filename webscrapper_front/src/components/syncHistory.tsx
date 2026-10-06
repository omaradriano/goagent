import React, { useContext, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import styled from "styled-components";
import { DataChangedContext } from "../Context/ContextConfig";
import type { PolizaGetItem } from "../Types/types";
import Icon from "./icon";
import Modal from "./modal";
import useModalState from "../customHooks/useModalState";
import useBodyScrollLock from "../customHooks/useBodyScrollLock";
import {
  parseDate,
  Surface,
  Spinner,
  Overlay,
  EventCard,
  CardHeader,
  CardHeaderLeft,
  EventIconBox,
  CardTitle,
  CloseBtn,
  CardBody,
} from "./calendar/calendarShared";

// Historial de sincronizaciones de la extension (sync_runs / sync_eventos):
// tarjeta con la ultima sincronizacion y modal con QUE polizas cambiaron
// (pagos detectados, cambios de estatus, altas).

type SyncTipo = "parcial" | "completa" | "individual";
type SyncEstado = "en_curso" | "completada" | "interrumpida" | "detenida";
type EventoTipo = "pago" | "estatus" | "alta";

interface SyncRun {
  sync_id: number;
  tipo: SyncTipo;
  estado: SyncEstado;
  started_at: string;
  finished_at: string | null;
  por_vencer_antes: number | null;
  por_vencer_despues: number | null;
  pagos: number;
  estatus: number;
  altas: number;
}

interface SyncEvento {
  tipo: EventoTipo;
  valor_anterior: string | null;
  valor_nuevo: string | null;
  numpoliza: string;
  asegurado: string;
}

const TIPO_LABEL: Record<SyncTipo, string> = {
  parcial: "Sincronización",
  completa: "Resincronización completa",
  individual: "Póliza individual",
};

const ESTADO_LABEL: Record<SyncEstado, string> = {
  en_curso: "En curso",
  completada: "Completada",
  interrumpida: "Interrumpida",
  detenida: "Detenida",
};

const SECCIONES: { tipo: EventoTipo; titulo: string; icon: "Paid" | "SwapHoriz" | "AddCircleOutline" }[] = [
  { tipo: "pago", titulo: "Pagos detectados", icon: "Paid" },
  { tipo: "estatus", titulo: "Cambios de estatus", icon: "SwapHoriz" },
  { tipo: "alta", titulo: "Pólizas nuevas", icon: "AddCircleOutline" },
];

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("session_jwt")}`,
});

const API = import.meta.env.VITE_API_SERVER_URL;

const formatFechaHora = (iso: string) =>
  new Date(iso).toLocaleString("es-MX", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

const formatFechaCorta = (raw: string | null) =>
  raw
    ? parseDate(raw).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" })
    : "—";

const eventoDetalle = (e: SyncEvento): string => {
  if (e.tipo === "pago") {
    return `Próximo pago: ${formatFechaCorta(e.valor_anterior)} → ${formatFechaCorta(e.valor_nuevo)}`;
  }
  if (e.tipo === "estatus") return `${e.valor_anterior ?? "—"} → ${e.valor_nuevo ?? "—"}`;
  return "Nueva póliza registrada";
};

const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;

const SyncHistory: React.FC = () => {
  const dataChanged = useContext(DataChangedContext);
  const [runs, setRuns] = useState<SyncRun[]>([]);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [eventos, setEventos] = useState<SyncEvento[]>([]);
  const [loadingEventos, setLoadingEventos] = useState(false);
  const polizaModal = useModalState(false);
  useBodyScrollLock(detailOpen);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${API}/v1/sync-runs?limit=10`, { headers: authHeaders() });
        const data = await res.json();
        if (data.success) setRuns(data.payload ?? []);
      } catch (error) {
        console.error("Error consultando el historial de sincronizaciones:", error);
      }
    };
    load();
  }, [dataChanged?.dataHasChanged]);

  useEffect(() => {
    if (!detailOpen || selectedId == null) return;
    const load = async () => {
      setLoadingEventos(true);
      try {
        const res = await fetch(`${API}/v1/sync-runs/${selectedId}/eventos`, { headers: authHeaders() });
        const data = await res.json();
        setEventos(data.success ? (data.payload ?? []) : []);
      } catch (error) {
        console.error("Error consultando los cambios de la sincronización:", error);
        setEventos([]);
      } finally {
        setLoadingEventos(false);
      }
    };
    load();
  }, [detailOpen, selectedId]);

  // Abre el detalle de la poliza (el mismo modal del listado).
  const openPoliza = async (numpoliza: string) => {
    try {
      const res = await fetch(`${API}/v1/scrapping/poliza/${encodeURIComponent(numpoliza)}`, {
        headers: authHeaders(),
      });
      const data = await res.json();
      if (!data.success) return;
      polizaModal.setPolizaData(data.payload as PolizaGetItem);
      polizaModal.setIsOpen(true);
    } catch (error) {
      console.error("Error consultando la póliza:", error);
    }
  };

  if (runs.length === 0) return null;

  const last = runs[0];
  const selected = runs.find((r) => r.sync_id === selectedId) ?? last;

  const openDetail = (syncId: number) => {
    setSelectedId(syncId);
    setDetailOpen(true);
  };

  return (
    <>
      <Card>
        <CardMain>
          <CardIcon>
            <Icon iconName="Sync" size={20} customColor="var(--ga-primary)" />
          </CardIcon>
          <CardText>
            <CardTitleRow>
              <strong>Última sincronización</strong>
              <EstadoPill $estado={last.estado}>{ESTADO_LABEL[last.estado]}</EstadoPill>
            </CardTitleRow>
            <small>
              {TIPO_LABEL[last.tipo]} · {formatFechaHora(last.started_at)}
              {last.por_vencer_antes != null && last.por_vencer_despues != null && (
                <> · Por vencer: {last.por_vencer_antes} → {last.por_vencer_despues}</>
              )}
            </small>
          </CardText>
        </CardMain>

        <Chips>
          <Chip $tone="green">{plural(last.pagos, "pago", "pagos")}</Chip>
          <Chip $tone="amber">{plural(last.estatus, "cambio de estatus", "cambios de estatus")}</Chip>
          <Chip $tone="blue">{plural(last.altas, "nueva", "nuevas")}</Chip>
          <DetailBtn onClick={() => openDetail(last.sync_id)}>
            Ver detalle
            <Icon iconName="ChevronRight" size={16} customColor="currentColor" />
          </DetailBtn>
        </Chips>
      </Card>

      {detailOpen &&
        createPortal(
          <Overlay onClick={() => setDetailOpen(false)}>
            <DetailCard onClick={(e) => e.stopPropagation()}>
              <CardHeader>
                <CardHeaderLeft>
                  <EventIconBox>
                    <Icon iconName="Sync" size={18} customColor="var(--ga-primary)" />
                  </EventIconBox>
                  <CardTitle>Cambios por sincronización</CardTitle>
                </CardHeaderLeft>
                <CloseBtn onClick={() => setDetailOpen(false)} aria-label="Cerrar">
                  <Icon iconName="Close" size={16} />
                </CloseBtn>
              </CardHeader>

              <CardBody>
                <RunSelect
                  value={selected.sync_id}
                  onChange={(e) => setSelectedId(Number(e.target.value))}
                  aria-label="Sincronización"
                >
                  {runs.map((r) => (
                    <option key={r.sync_id} value={r.sync_id}>
                      {formatFechaHora(r.started_at)} · {TIPO_LABEL[r.tipo]} · {ESTADO_LABEL[r.estado]} (
                      {r.pagos + r.estatus + r.altas} cambios)
                    </option>
                  ))}
                </RunSelect>

                {selected.por_vencer_antes != null && selected.por_vencer_despues != null && (
                  <PorVencerNote>
                    Pólizas por vencer: <strong>{selected.por_vencer_antes}</strong> antes →{" "}
                    <strong>{selected.por_vencer_despues}</strong> después
                  </PorVencerNote>
                )}

                {loadingEventos ? (
                  <Centered>
                    <Spinner />
                  </Centered>
                ) : eventos.length === 0 ? (
                  <Centered>
                    <p>No se detectaron cambios en esta sincronización.</p>
                  </Centered>
                ) : (
                  <Sections>
                    {SECCIONES.map(({ tipo, titulo, icon }) => {
                      const items = eventos.filter((e) => e.tipo === tipo);
                      if (items.length === 0) return null;
                      return (
                        <section key={tipo}>
                          <SectionTitle>
                            <Icon iconName={icon} size={16} customColor="var(--ga-muted)" />
                            {titulo}
                            <span>{items.length}</span>
                          </SectionTitle>
                          <EventList>
                            {items.map((e, i) => (
                              <EventRow key={`${tipo}-${e.numpoliza}-${i}`} onClick={() => openPoliza(e.numpoliza)}>
                                <div>
                                  <strong>{e.numpoliza}</strong>
                                  <small>{e.asegurado || "Sin asegurado principal"}</small>
                                </div>
                                <EventValue $tipo={tipo}>{eventoDetalle(e)}</EventValue>
                              </EventRow>
                            ))}
                          </EventList>
                        </section>
                      );
                    })}
                  </Sections>
                )}
              </CardBody>
            </DetailCard>
          </Overlay>,
          document.body,
        )}

      {polizaModal.isOpen && (
        <Modal
          title="Detalle poliza"
          setModalOpen={polizaModal.setIsOpen}
          modalOpen={polizaModal.isOpen}
          polizaData={polizaModal.polizaData}
        />
      )}
    </>
  );
};

// ── Estilos ───────────────────────────────────────────────────────────────────
const TONES = {
  green: ["var(--ga-pill-success-bg)", "var(--ga-pill-success)"],
  amber: ["var(--ga-pill-warning-bg)", "var(--ga-pill-warning)"],
  blue: ["rgba(21, 93, 252, 0.1)", "var(--ga-primary)"],
} as const;

const Card = styled(Surface)`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  padding: 14px 16px;
`;

const CardMain = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
`;

const CardIcon = styled.span`
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 38px;
  height: 38px;
  border-radius: 10px;
  background-color: rgba(21, 93, 252, 0.1);
`;

const CardText = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  color: var(--ga-text);

  strong {
    font-size: 14px;
  }

  small {
    font-size: 12px;
    color: var(--ga-muted);
  }
`;

const CardTitleRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const EstadoPill = styled.span<{ $estado: SyncEstado }>`
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 20px;
  background-color: ${(p) =>
    p.$estado === "completada" ? TONES.green[0] : p.$estado === "en_curso" ? TONES.blue[0] : TONES.amber[0]};
  color: ${(p) =>
    p.$estado === "completada" ? TONES.green[1] : p.$estado === "en_curso" ? TONES.blue[1] : TONES.amber[1]};
`;

const Chips = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
`;

const Chip = styled.span<{ $tone: keyof typeof TONES }>`
  font-size: 12px;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 20px;
  background-color: ${(p) => TONES[p.$tone][0]};
  color: ${(p) => TONES[p.$tone][1]};
`;

const DetailBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 6px 10px 6px 14px;
  border-radius: 8px;
  border: 1px solid var(--ga-surface-border);
  background: var(--ga-surface);
  color: var(--ga-primary);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    background-color: var(--ga-surface-soft);
  }
`;

const DetailCard = styled(EventCard)`
  max-width: 560px;
  max-height: calc(100vh - 32px);
`;

const RunSelect = styled.select`
  width: 100%;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid var(--ga-surface-border);
  background: var(--ga-surface);
  color: var(--ga-text);
  font-size: 13px;
`;

const PorVencerNote = styled.p`
  font-size: 13px;
  color: var(--ga-muted);

  strong {
    color: var(--ga-text);
  }
`;

const Centered = styled.div`
  display: flex;
  justify-content: center;
  padding: 24px 8px;

  p {
    font-size: 13px;
    color: var(--ga-muted);
  }
`;

const Sections = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-height: 55vh;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding-right: 4px;
`;

const SectionTitle = styled.h4`
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
  font-size: 13px;
  font-weight: 700;
  color: var(--ga-text);

  span:last-child {
    margin-left: auto;
    font-size: 12px;
    font-weight: 600;
    color: var(--ga-muted);
  }
`;

const EventList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const EventRow = styled.button`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  padding: 10px 12px;
  border: 1px solid transparent;
  border-radius: 10px;
  background-color: var(--ga-surface-soft);
  cursor: pointer;
  text-align: left;
  color: var(--ga-text);
  transition: border-color 0.15s;

  &:hover {
    border-color: rgba(21, 93, 252, 0.3);
  }

  & > div {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  strong {
    font-size: 13px;
  }

  small {
    font-size: 12px;
    color: var(--ga-muted);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`;

const EventValue = styled.span<{ $tipo: EventoTipo }>`
  flex-shrink: 0;
  font-size: 12px;
  font-weight: 600;
  text-align: right;
  color: ${(p) => (p.$tipo === "pago" ? TONES.green[1] : p.$tipo === "estatus" ? TONES.amber[1] : TONES.blue[1])};
`;

export default SyncHistory;
