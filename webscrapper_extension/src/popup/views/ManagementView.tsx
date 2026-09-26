import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Button } from "@/components/animate-ui/components/buttons/button";
import { Loader } from "@/popup/components/Loader";
import { useConfirmDialog } from "@/popup/components/ConfirmDialog";
import {
  getActiveTab,
  openTab,
  sendToBackground,
  sendToTab,
  type PolizaInDb,
  type PolizasDetails,
  type SessionData,
} from "@/popup/lib/chrome";
import { formatDateDisplay } from "../../shared/dates.js";
import { filterNewPolizas } from "../../shared/compare.js";
import { FRONTEND_URL } from "../../shared/env.js";

const CONFIGURED_PAGES = {
  all: "PolizasAgente.aspx",
  unique: "DetallePoliza.aspx",
} as const;

type ActionMode = "all" | "unique";
type DetailsView = ActionMode | "empty";

interface AllInfo {
  viewCount: number | null;
  notLoaded: number | null;
  // Ya hay cartera cargada en BD: cambia el rotulo del boton principal y
  // habilita "Resincronizar todo".
  hasDbData: boolean;
}

interface ManagementViewProps {
  session: SessionData;
  tabId: number;
  currentPage: string;
  onLoggedOut: () => void;
  onSessionLost: () => void;
}

export function ManagementView({
  session,
  tabId,
  currentPage,
  onLoggedOut,
  onSessionLost,
}: ManagementViewProps) {
  const dialog = useConfirmDialog();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<PolizasDetails | null>(null);
  const [actionMode, setActionMode] = useState<ActionMode | null>(null);
  const [detailsView, setDetailsView] = useState<DetailsView>("empty");
  const [notice, setNotice] = useState<string | null>(null);
  // Sesion distinta, sin suscripcion o pagina incompatible: no se permite
  // sincronizar desde esta vista.
  const [syncBlocked, setSyncBlocked] = useState(false);
  const [showReactivate, setShowReactivate] = useState(false);
  const [allInfo, setAllInfo] = useState<AllInfo>({
    viewCount: null,
    notLoaded: null,
    hasDbData: false,
  });
  const [polizaNum, setPolizaNum] = useState<string | null>(null);
  const [uniqueInfo, setUniqueInfo] = useState<PolizaInDb | null>(null);

  // Las cargas de la vista (all/unique) corren en paralelo a las
  // verificaciones de sesion/suscripcion; si alguna de esas bloquea, una
  // carga que termine despues no debe borrar el aviso del bloqueo.
  const blockedRef = useRef(false);

  const block = useCallback((message: string) => {
    blockedRef.current = true;
    setSyncBlocked(true);
    setNotice(message);
    setDetailsView("empty");
  }, []);

  const loadAllDetails = useCallback(async () => {
    try {
      const resView = await sendToTab<{ polizas_count: number }>(tabId, {
        action: "get-all-in-view",
      });
      const viewCount = resView.success
        ? (resView.data?.polizas_count ?? 0)
        : null;

      const resDb = await sendToBackground<{ polizas: string[] }>({
        action: "get-all-in-db",
      });
      const inDbData = resDb.data?.polizas ?? [];

      const resViewDetailed = await sendToTab<{ polizas: string[] }>(tabId, {
        action: "get-all-in-view-detailed",
      });
      const inViewData = resViewDetailed.data?.polizas ?? [];

      setAllInfo({
        viewCount,
        notLoaded: filterNewPolizas(inViewData, inDbData).length,
        hasDbData: inDbData.length > 0,
      });
    } catch {
      /* content script might not be loaded */
    }
  }, [tabId]);

  const loadUniqueDetails = useCallback(async () => {
    try {
      const captureRes = await sendToTab<{ num_poliza: string }>(tabId, {
        action: "get-unique-in-view",
      });
      if (!captureRes.success || !captureRes.data) {
        throw new Error("No se han podido capturar datos de poliza");
      }
      const numPoliza = captureRes.data.num_poliza;
      setPolizaNum(numPoliza);

      const authRes = await sendToBackground<SessionData>({
        action: "verify-session",
      });
      if (!authRes.success || !authRes.data) {
        onSessionLost();
        return;
      }

      const sameSession = await sendToTab(tabId, {
        action: "verify-same-session",
        data: { extension_no_agente: authRes.data.no_agente },
      });
      if (!sameSession.success) {
        setSyncBlocked(true);
        blockedRef.current = true;
        throw new Error(
          "La sesión activa en la extensión no coincide con la sesión de la página.",
        );
      }

      const polizaGet = await sendToBackground<PolizaInDb>({
        action: "get-unique-in-db",
        data: { num_poliza: numPoliza },
      });
      if (!polizaGet.success || !polizaGet.payload) {
        throw new Error(
          "No existen datos de la poliza en la vista actual. Se recomienda sincronizar el registro.",
        );
      }

      setUniqueInfo(polizaGet.payload);
      if (!blockedRef.current) setNotice(null);
    } catch (error) {
      setDetailsView("empty");
      setUniqueInfo(null);
      setNotice(error instanceof Error ? error.message : String(error));
    }
  }, [tabId, onSessionLost]);

  // Carga inicial: equivalente a loadManagementUI del popup anterior.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const detailsRes = await sendToBackground<PolizasDetails>({
          action: "get-polizas-details",
        });
        if (cancelled) return;
        if (detailsRes.payload) setStats(detailsRes.payload);

        const isCompatible = (
          Object.values(CONFIGURED_PAGES) as string[]
        ).includes(currentPage);
        if (!isCompatible) {
          block("Esta ventana no es compatible");
          return;
        }

        const mode: ActionMode =
          currentPage === CONFIGURED_PAGES.all ? "all" : "unique";
        setActionMode(mode);
        setDetailsView(mode);
        // Sin await, igual que antes: los datos de la vista se cargan
        // mientras se verifican sesion y suscripcion.
        void (mode === "all" ? loadAllDetails() : loadUniqueDetails());

        let sameSession: { success: boolean } | undefined;
        try {
          sameSession = await sendToTab(tabId, {
            action: "verify-same-session",
            data: { extension_no_agente: session.no_agente },
          });
        } catch {
          /* page might not have content script */
        }
        if (cancelled) return;

        if (!sameSession?.success) {
          block(
            "La sesión activa en la extensión no coincide con la sesión de la página. Por favor, verifique que está utilizando la misma cuenta en ambos lugares.",
          );
          return;
        }

        const subRes = await sendToBackground<{ is_subscribed: boolean }>({
          action: "get-subscription-status",
        });
        if (cancelled) return;

        if (!subRes.success || !subRes.data?.is_subscribed) {
          block(
            "Necesitas una suscripción activa para sincronizar tu cartera de pólizas.",
          );
          setShowReactivate(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    session.no_agente,
    tabId,
    currentPage,
    block,
    loadAllDetails,
    loadUniqueDetails,
  ]);

  const handleLogout = () => {
    dialog.show(
      "Cierre de sesión",
      "Esta por cerrar la sesión actual, desea continuar?",
      async () => {
        const res = await sendToBackground({ action: "exec-delete-session" });
        if (res.success) onLoggedOut();
      },
    );
  };

  const handleSyncUnique = (activeTabId: number) => {
    dialog.show(
      "Carga de registros",
      `Se va a realizar la carga del registro ${polizaNum}. Continuar?`,
      async () => {
        const res = await sendToTab<{ num_poliza: string }>(activeTabId, {
          action: "scrapping-unique",
          tab: activeTabId,
        });
        const payload = res.payload;

        if (!res.success || !payload) {
          dialog.show(
            "Conflicto en la solicitud",
            `${res.message}. Desea sincronizar registro?`,
          );
          return;
        }

        setDetailsView("unique");
        setNotice(null);

        const polizaGet = await sendToBackground<PolizaInDb>({
          action: "get-unique-in-db",
          data: { num_poliza: payload.num_poliza },
        });
        if (!polizaGet.success || !polizaGet.payload) {
          throw new Error(polizaGet.message ?? "No se pudo consultar la póliza");
        }

        setUniqueInfo(polizaGet.payload);
        dialog.show("Confirmación de registro", res.message ?? "");
      },
    );
  };

  const handleSyncAll = async (activeTabId: number) => {
    const resDb = await sendToBackground<{ polizas: string[] }>({
      action: "get-all-in-db",
    });
    const inDbData = resDb.data?.polizas ?? [];

    const resView = await sendToTab<{ polizas: string[] }>(activeTabId, {
      action: "get-all-in-view-detailed",
    });
    const inViewData = resView.data?.polizas ?? [];

    const comparedList = filterNewPolizas(inViewData, inDbData);

    const currentPageHint =
      comparedList.length > 0
        ? `Se detectaron al menos ${comparedList.length} registro(s) nuevos en esta página. `
        : "";

    const accionDescripcion =
      inDbData.length > 0
        ? "Se buscarán registros nuevos en todas las páginas disponibles y se actualizarán las pólizas próximas a vencer o cuyo estatus haya cambiado."
        : "Se buscarán y sincronizarán los registros nuevos en todas las páginas disponibles.";

    dialog.show(
      "Confirmación de carga de registros",
      `${currentPageHint}${accionDescripcion} Desea continuar?`,
      async () => {
        const res = await sendToTab(activeTabId, {
          action: "post-all",
          tab: activeTabId,
        });
        if (!res.success) {
          dialog.show("Conflicto en la solicitud", res.message ?? "");
        }
      },
    );
  };

  const handleSync = async () => {
    const tab = await getActiveTab();
    if (tab.id === undefined) return;
    try {
      if (actionMode === "unique") {
        handleSyncUnique(tab.id);
      } else if (actionMode === "all") {
        await handleSyncAll(tab.id);
      }
    } catch (error) {
      dialog.show(
        "Error",
        `Existe un error: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  };

  // Recorre TODAS las polizas de todas las paginas y sobrescribe sus datos
  // (alta para las nuevas, refresco completo para las existentes), sin el
  // filtro de la sincronizacion parcial. Pensado para corregir datos sin
  // tener que borrar la cartera en la BD; es mucho mas lento que
  // "Actualizar cartera" porque abre el detalle de cada poliza.
  const handleFullResync = async () => {
    const tab = await getActiveTab();
    if (tab.id === undefined) return;
    const activeTabId = tab.id;

    // No se muestra un conteo: lo registrado en BD puede ser menor que lo
    // que hay en el portal, y el recorrido cubre todas las paginas del
    // portal.
    dialog.show(
      "Resincronización completa",
      "Se recorrerá toda tu cartera en el portal (todas las páginas) y se abrirá el detalle de cada póliza: las registradas se sobrescribirán con lo que muestra el portal y las que falten se darán de alta. Puede tardar bastante; puedes interrumpirla desde la notificación. Desea continuar?",
      async () => {
        const res = await sendToTab(activeTabId, {
          action: "post-all",
          tab: activeTabId,
          full: true,
        });
        if (!res.success) {
          dialog.show("Conflicto en la solicitud", res.message ?? "");
        }
      },
    );
  };

  const syncLabel =
    actionMode === "unique"
      ? "Sincronizar registro"
      : allInfo.hasDbData
        ? "Actualizar cartera"
        : "Sincronizar registros";

  const showSync = actionMode !== null && !syncBlocked;
  // Resincronizar todo solo tiene sentido si ya hay cartera cargada; sin
  // registros, "Sincronizar registros" ya recorre todo.
  const showFullResync = showSync && actionMode === "all" && allInfo.hasDbData;

  return (
    <section className="w-full">
      {loading && <Loader />}

      <div className="flex w-full items-center justify-between p-2.5">
        <div>
          <h5 className="text-xl font-bold">No. Asesor {session.no_agente}</h5>
          <p className="text-sm">{session.email}</p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          aria-label="Cerrar sesión"
          onClick={handleLogout}
        >
          <i className="fa-solid fa-arrow-right-from-bracket text-red-600" />
        </Button>
      </div>

      <h1 className="px-2.5 text-[2em] font-bold">Mis pólizas</h1>

      <div className="flex items-center justify-around gap-2.5 p-2.5">
        <StatTag title="Total" value={stats?.total} tone="primary" />
        <StatTag title="Activas" value={stats?.activas} tone="green" />
        <StatTag title="Por vencer" value={stats?.por_vencer} tone="orange" />
      </div>

      {detailsView === "all" && (
        <DetailsBox title="Información en la vista actual">
          <DetailRow label="Pólizas en la vista" value={allInfo.viewCount ?? "—"} />
          <DetailRow
            label="Pólizas en la vista no registradas"
            value={allInfo.notLoaded ?? "Pendiente"}
          />
        </DetailsBox>
      )}

      {detailsView === "unique" && uniqueInfo && (
        <DetailsBox title="Detalles de la póliza actual">
          <DetailRow label="Número de póliza" value={uniqueInfo.num_poliza} />
          <DetailRow
            label="Siguiente pago"
            value={formatDateDisplay(new Date(uniqueInfo.next_payment))}
          />
          <DetailRow label="Forma de pago" value={uniqueInfo.forma_pago} />
        </DetailsBox>
      )}

      {notice && (
        <div className="mx-1.5 mt-1.5 mb-2.5 rounded-md border border-[#ea868f] bg-red-500/10 px-2.5 py-2 text-[0.8rem] text-destructive">
          {notice}
        </div>
      )}

      {showReactivate && (
        <Button
          type="button"
          className="mb-1.5"
          onClick={() => openTab(`${FRONTEND_URL}/pricing`)}
        >
          Reactivar suscripción
        </Button>
      )}

      <div className="flex flex-col gap-1.5">
        {showSync && (
          <Button
            type="button"
            hoverScale={1.02}
            className="w-full"
            onClick={handleSync}
          >
            {syncLabel}
          </Button>
        )}
        {showFullResync && (
          <Button
            type="button"
            hoverScale={1.02}
            variant="outline"
            className="w-full border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 hover:text-amber-900"
            onClick={handleFullResync}
          >
            Resincronizar todo
          </Button>
        )}
      </div>
    </section>
  );
}

// Estilo de la presentacion de GoAgent: tarjeta limpia con el numero grande
// en el color de su estado y la etiqueta en gris debajo.
const statTones = {
  primary: "text-primary",
  green: "text-ga-green",
  orange: "text-ga-orange",
} as const;

function StatTag({
  title,
  value,
  tone,
}: {
  title: string;
  value?: number;
  tone: keyof typeof statTones;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-1 rounded-xl border bg-card px-3 py-4 text-center">
      <span className={`text-[2rem] leading-tight font-bold ${statTones[tone]}`}>
        {value ?? "—"}
      </span>
      <h5 className="text-sm text-muted-foreground">{title}</h5>
    </div>
  );
}

// Contenedor blanco con filas en gris calido (como la lista de polizas de
// la presentacion).
function DetailsBox({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="mx-2.5 mb-2.5 flex flex-col gap-2 rounded-2xl border bg-card p-3">
      <h3 className="px-1 text-base font-semibold">{title}</h3>
      <div className="flex flex-col gap-1.5">{children}</div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-surface-soft px-3 py-2.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-semibold">{value}</span>
    </div>
  );
}
