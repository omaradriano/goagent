import { useCallback, useContext, useEffect, useRef, useState } from "react";
import styled from "styled-components";
import { useNavigate } from "react-router";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import Icon from "./icon";
import { Button as AnimatedButton } from "@/components/animate-ui/components/buttons/button";
import useConfirmDialog from "../customHooks/useConfirmDialog";
import { AlertContext, AuthContext } from "../Context/ContextConfig";
import { textTheme__css } from "../styles/CssComponents";

interface Comentario {
  comentario_id: number;
  contenido: string;
  created_at: string;
  autor_email: string;
}

interface PolizaComentariosProps {
  polizaUUID: string;
  isSubscribed: boolean;
  onSubscriptionRequired: () => void;
  // Se agrego o borro un comentario. El modal recarga la lista al cerrarse
  // (recargarla aqui desmonta la lista y cierra el modal).
  onChanged: () => void;
}

const MAX_LEN = 2000;

const formatFecha = (iso: string) =>
  new Date(iso).toLocaleString("es-MX", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

// Bitacora de comentarios de una poliza (tabla polizas_comentarios): los
// comentarios no se editan; se agregan y se pueden borrar (borrado logico).
const PolizaComentarios: React.FC<PolizaComentariosProps> = ({
  polizaUUID,
  isSubscribed,
  onSubscriptionRequired,
  onChanged,
}) => {
  const [comentarios, setComentarios] = useState<Comentario[]>([]);
  const [loading, setLoading] = useState(true);
  const [nuevo, setNuevo] = useState("");
  const [saving, setSaving] = useState(false);

  const auth = useContext(AuthContext);
  const alertContext = useContext(AlertContext);
  const { confirm, dialog } = useConfirmDialog();
  const navigate = useNavigate();

  const baseUrl = `${import.meta.env.VITE_API_SERVER_URL}/v1/polizas/${polizaUUID}/comentarios`;

  // auth se lee por ref: el provider crea un objeto nuevo en cada render y, si
  // fuera dependencia, la bitacora se volveria a pedir tras cada cambio.
  const authRef = useRef(auth);
  authRef.current = auth;

  const request = useCallback(
    async (url: string, init: RequestInit = {}) => {
      const token = localStorage.getItem("session_jwt");
      if (!token) {
        authRef.current?.setIsAuthenticated(false);
        navigate("/home");
        return null;
      }
      const res = await fetch(url, {
        ...init,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      return res.json();
    },
    [navigate],
  );

  const showError = (message: string) => {
    alertContext?.setAlertOptions({ title: "Error", message, type: "error" });
    alertContext?.setShowAlert(true);
  };

  useEffect(() => {
    if (!polizaUUID) return;
    let cancelled = false;
    setLoading(true);
    setNuevo("");
    request(baseUrl)
      .then((data) => {
        if (cancelled || !data) return;
        setComentarios(data.success ? (data.payload ?? []) : []);
      })
      .catch(() => {
        if (!cancelled) setComentarios([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [baseUrl, polizaUUID, request]);

  const agregar = async () => {
    const contenido = nuevo.trim();
    if (!contenido || saving) return;
    if (!isSubscribed) {
      onSubscriptionRequired();
      return;
    }
    setSaving(true);
    try {
      const data = await request(baseUrl, {
        method: "POST",
        body: JSON.stringify({ contenido }),
      });
      if (!data) return;
      if (!data.success) {
        showError(data.message || "No se pudo guardar el comentario");
        return;
      }
      setComentarios((prev) => [data.payload, ...prev]);
      setNuevo("");
      onChanged();
    } catch {
      showError("Error de conexión al guardar el comentario");
    } finally {
      setSaving(false);
    }
  };

  const borrar = (comentario: Comentario) => {
    if (!isSubscribed) {
      onSubscriptionRequired();
      return;
    }
    confirm({
      title: "Eliminar comentario",
      description: "Se eliminará este comentario de la bitácora. ¿Desea continuar?",
      confirmLabel: "Eliminar",
      tone: "danger",
      onConfirm: async () => {
        try {
          const data = await request(`${baseUrl}/${comentario.comentario_id}`, {
            method: "DELETE",
          });
          if (!data) return;
          if (!data.success) {
            showError(data.message || "No se pudo eliminar el comentario");
            return;
          }
          setComentarios((prev) =>
            prev.filter((c) => c.comentario_id !== comentario.comentario_id),
          );
          onChanged();
        } catch {
          showError("Error de conexión al eliminar el comentario");
        }
      },
    });
  };

  return (
    <Wrapper>
      {dialog}
      <NuevoComentario>
        <Textarea
          value={nuevo}
          placeholder="Escribe un comentario..."
          rows={2}
          maxLength={MAX_LEN}
          readOnly={!isSubscribed}
          onFocus={!isSubscribed ? onSubscriptionRequired : undefined}
          onChange={(e) => setNuevo(e.target.value)}
          onKeyDown={(e) => {
            // Ctrl/Cmd + Enter agrega el comentario.
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              agregar();
            }
          }}
        />
        <AnimatedButton
          type="button"
          size="sm"
          hoverScale={1.03}
          disabled={!nuevo.trim() || saving || !isSubscribed}
          onClick={agregar}
        >
          {saving ? "Guardando..." : "Agregar"}
          <SendRoundedIcon />
        </AnimatedButton>
      </NuevoComentario>

      {loading ? (
        <Vacio>Cargando comentarios...</Vacio>
      ) : comentarios.length === 0 ? (
        <Vacio>Sin comentarios todavía.</Vacio>
      ) : (
        <Lista>
          {comentarios.map((c) => (
            <Item key={c.comentario_id}>
              <ItemHeader>
                <Meta>
                  {c.autor_email || "—"} · {formatFecha(c.created_at)}
                </Meta>
                {isSubscribed && (
                  <BorrarBtn
                    type="button"
                    aria-label="Eliminar comentario"
                    onClick={() => borrar(c)}
                  >
                    <Icon iconName="DeleteOutline" size={16} />
                  </BorrarBtn>
                )}
              </ItemHeader>
              <Contenido>{c.contenido}</Contenido>
            </Item>
          ))}
        </Lista>
      )}
    </Wrapper>
  );
};

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const NuevoComentario = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
`;

const Textarea = styled.textarea`
  width: 100%;
  min-height: 60px;
  resize: vertical;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid var(--ga-surface-border);
  background-color: var(--ga-surface-soft);
  ${textTheme__css}
  font-family: inherit;
  font-size: 14px;
  outline: none;

  &:focus {
    border-color: var(--ga-primary);
  }
`;

const Lista = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const Item = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px 12px;
  border-radius: 8px;
  background-color: var(--ga-surface-soft);
`;

const ItemHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
`;

const Meta = styled.span`
  font-size: 12px;
  color: var(--ga-muted);
`;

const Contenido = styled.p`
  ${textTheme__css}
  font-size: 14px;
  white-space: pre-wrap;
  word-break: break-word;
`;

const BorrarBtn = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--ga-muted);
  cursor: pointer;

  &:hover {
    color: var(--ga-red);
    background-color: var(--ga-pill-danger-bg);
  }
`;

const Vacio = styled.p`
  font-size: 13px;
  color: var(--ga-muted);
`;

export default PolizaComentarios;
