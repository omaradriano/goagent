import { useCallback, useContext, useEffect, useRef, useState } from "react";
import styled from "styled-components";
import { useNavigate } from "react-router";
import Icon from "./icon";
import SelectMenu from "./selectMenu";
import { Button as AnimatedButton } from "@/components/animate-ui/components/buttons/button";
import { themedOutlineButton } from "@/lib/buttonStyles";
import useConfirmDialog from "../customHooks/useConfirmDialog";
import { AlertContext, AuthContext } from "../Context/ContextConfig";
import { textTheme__css } from "../styles/CssComponents";
import {
  MESES,
  PARENTESCOS,
  diasDelMes,
  formatDiaMes,
  parentescoLabel,
} from "../functions/personasAdicionales";

interface PersonaAdicional {
  persona_id: number;
  nombre_completo: string;
  parentesco: string;
  dia: number;
  mes: number;
}

interface PersonaForm {
  nombre_completo: string;
  parentesco: string;
  dia: string;
  mes: string;
}

interface PolizaPersonasAdicionalesProps {
  polizaUUID: string;
  isSubscribed: boolean;
  onSubscriptionRequired: () => void;
}

const MAX_NOMBRE = 150;
const FORM_VACIO: PersonaForm = { nombre_completo: "", parentesco: "", dia: "", mes: "" };

// Personas adicionales de una poliza (tabla polizas_personas_adicionales):
// familiares que no estan en el seguro, solo para el calendario de
// cumpleanos. Del cumpleanos solo se guardan dia y mes.
const PolizaPersonasAdicionales: React.FC<PolizaPersonasAdicionalesProps> = ({
  polizaUUID,
  isSubscribed,
  onSubscriptionRequired,
}) => {
  const [personas, setPersonas] = useState<PersonaAdicional[]>([]);
  const [loading, setLoading] = useState(true);
  // null: formulario cerrado; 0: alta; >0: edicion de ese persona_id.
  const [editando, setEditando] = useState<number | null>(null);
  const [form, setForm] = useState<PersonaForm>(FORM_VACIO);
  const [saving, setSaving] = useState(false);

  const auth = useContext(AuthContext);
  const alertContext = useContext(AlertContext);
  const { confirm, dialog } = useConfirmDialog();
  const navigate = useNavigate();

  const baseUrl = `${import.meta.env.VITE_API_SERVER_URL}/v1/polizas/${polizaUUID}/personas-adicionales`;

  // auth se lee por ref (mismo motivo que en la bitacora de comentarios): el
  // provider crea un objeto nuevo en cada render.
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
    setEditando(null);
    request(baseUrl)
      .then((data) => {
        if (cancelled || !data) return;
        setPersonas(data.success ? (data.payload ?? []) : []);
      })
      .catch(() => {
        if (!cancelled) setPersonas([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [baseUrl, polizaUUID, request]);

  const abrirAlta = () => {
    if (!isSubscribed) {
      onSubscriptionRequired();
      return;
    }
    setForm(FORM_VACIO);
    setEditando(0);
  };

  const abrirEdicion = (p: PersonaAdicional) => {
    if (!isSubscribed) {
      onSubscriptionRequired();
      return;
    }
    setForm({
      nombre_completo: p.nombre_completo,
      parentesco: p.parentesco,
      dia: String(p.dia),
      mes: String(p.mes),
    });
    setEditando(p.persona_id);
  };

  // Al cambiar de mes, el dia se recorta al ultimo dia valido (31 -> 30).
  const cambiarMes = (mes: string) => {
    setForm((f) => {
      const max = diasDelMes(Number(mes));
      return { ...f, mes, dia: f.dia && Number(f.dia) > max ? String(max) : f.dia };
    });
  };

  const formValido =
    form.nombre_completo.trim() !== "" && form.parentesco && form.dia && form.mes;

  const guardar = async () => {
    if (!formValido || saving || editando === null) return;
    setSaving(true);
    const body = JSON.stringify({
      nombre_completo: form.nombre_completo.trim(),
      parentesco: form.parentesco,
      dia: Number(form.dia),
      mes: Number(form.mes),
    });
    try {
      const data =
        editando === 0
          ? await request(baseUrl, { method: "POST", body })
          : await request(`${baseUrl}/${editando}`, { method: "PUT", body });
      if (!data) return;
      if (!data.success) {
        showError(data.message || "No se pudo guardar la persona");
        return;
      }
      const guardada: PersonaAdicional = data.payload;
      setPersonas((prev) =>
        [...prev.filter((p) => p.persona_id !== guardada.persona_id), guardada].sort(
          (a, b) => a.mes - b.mes || a.dia - b.dia || a.persona_id - b.persona_id,
        ),
      );
      setEditando(null);
    } catch {
      showError("Error de conexión al guardar la persona");
    } finally {
      setSaving(false);
    }
  };

  const borrar = (persona: PersonaAdicional) => {
    if (!isSubscribed) {
      onSubscriptionRequired();
      return;
    }
    confirm({
      title: "Eliminar persona",
      description: `Se eliminará a ${persona.nombre_completo} y ya no aparecerá en el calendario de cumpleaños. ¿Desea continuar?`,
      confirmLabel: "Eliminar",
      tone: "danger",
      onConfirm: async () => {
        try {
          const data = await request(`${baseUrl}/${persona.persona_id}`, {
            method: "DELETE",
          });
          if (!data) return;
          if (!data.success) {
            showError(data.message || "No se pudo eliminar la persona");
            return;
          }
          setPersonas((prev) => prev.filter((p) => p.persona_id !== persona.persona_id));
          if (editando === persona.persona_id) setEditando(null);
        } catch {
          showError("Error de conexión al eliminar la persona");
        }
      },
    });
  };

  const dias = Array.from(
    { length: form.mes ? diasDelMes(Number(form.mes)) : 31 },
    (_, i) => ({ value: String(i + 1), label: String(i + 1) }),
  );

  const formulario = (
    <Form
      onSubmit={(e) => {
        e.preventDefault();
        guardar();
      }}
    >
      <Field $span>
        <Label htmlFor="persona-nombre">Nombre completo</Label>
        <Input
          id="persona-nombre"
          value={form.nombre_completo}
          maxLength={MAX_NOMBRE}
          placeholder="Nombre y apellidos"
          autoFocus
          onChange={(e) => setForm((f) => ({ ...f, nombre_completo: e.target.value }))}
        />
      </Field>
      <Field $span>
        <Label as="span">Parentesco</Label>
        <SelectMenu
          ariaLabel="Parentesco"
          value={form.parentesco}
          options={PARENTESCOS}
          onChange={(parentesco) => setForm((f) => ({ ...f, parentesco }))}
        />
      </Field>
      <Field>
        <Label as="span">Día</Label>
        <SelectMenu
          ariaLabel="Día del cumpleaños"
          placeholder="Día"
          value={form.dia}
          options={dias}
          onChange={(dia) => setForm((f) => ({ ...f, dia }))}
        />
      </Field>
      <Field>
        <Label as="span">Mes</Label>
        <SelectMenu
          ariaLabel="Mes del cumpleaños"
          placeholder="Mes"
          value={form.mes}
          options={MESES}
          onChange={cambiarMes}
        />
      </Field>
      <FormActions>
        <AnimatedButton
          type="button"
          size="sm"
          variant="outline"
          className={themedOutlineButton}
          onClick={() => setEditando(null)}
        >
          Cancelar
        </AnimatedButton>
        <AnimatedButton type="submit" size="sm" hoverScale={1.03} disabled={!formValido || saving}>
          {saving ? "Guardando..." : editando === 0 ? "Agregar" : "Guardar"}
        </AnimatedButton>
      </FormActions>
    </Form>
  );

  return (
    <Wrapper>
      {dialog}
      <Nota>
        <Icon iconName="InfoOutlined" size={16} customColor="var(--ga-muted)" />
        <span>
          Estas personas <strong>no están aseguradas</strong> en la póliza; se
          registran solo para recordar su cumpleaños en el calendario.
        </span>
      </Nota>

      {loading ? (
        <Vacio>Cargando personas adicionales...</Vacio>
      ) : (
        <>
          {personas.length === 0 && editando !== 0 && (
            <Vacio>Sin personas adicionales todavía.</Vacio>
          )}
          {personas.length > 0 && (
            <Lista>
              {personas.map((p) =>
                editando === p.persona_id ? (
                  <div key={p.persona_id}>{formulario}</div>
                ) : (
                  <Item key={p.persona_id}>
                    <ItemIcon>
                      <Icon iconName="CakeOutlined" size={16} customColor="var(--ga-primary)" />
                    </ItemIcon>
                    <ItemInfo>
                      <ItemNombre>{p.nombre_completo}</ItemNombre>
                      <ItemMeta>
                        {parentescoLabel(p.parentesco)} · {formatDiaMes(p.dia, p.mes)}
                      </ItemMeta>
                    </ItemInfo>
                    {isSubscribed && (
                      <ItemActions>
                        <IconBtn
                          type="button"
                          aria-label={`Editar a ${p.nombre_completo}`}
                          onClick={() => abrirEdicion(p)}
                        >
                          <Icon iconName="EditOutlined" size={16} />
                        </IconBtn>
                        <IconBtn
                          type="button"
                          $danger
                          aria-label={`Eliminar a ${p.nombre_completo}`}
                          onClick={() => borrar(p)}
                        >
                          <Icon iconName="DeleteOutline" size={16} />
                        </IconBtn>
                      </ItemActions>
                    )}
                  </Item>
                ),
              )}
            </Lista>
          )}

          {editando === 0 ? (
            formulario
          ) : (
            editando === null && (
              <AgregarRow>
                <AnimatedButton
                  type="button"
                  size="sm"
                  variant="outline"
                  className={themedOutlineButton}
                  onClick={abrirAlta}
                >
                  <Icon iconName="PersonAddAlt" size={16} customColor="currentColor" />
                  Agregar persona
                </AnimatedButton>
              </AgregarRow>
            )
          )}
        </>
      )}
    </Wrapper>
  );
};

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const Nota = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px dashed var(--ga-surface-border);
  font-size: 12px;
  line-height: 1.45;
  color: var(--ga-muted);

  & > span:first-child {
    flex-shrink: 0;
    margin-top: 1px;
  }

  strong {
    color: var(--ga-text);
    font-weight: 600;
  }
`;

const Lista = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const Item = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 8px;
  background-color: var(--ga-surface-soft);
`;

const ItemIcon = styled.span`
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 30px;
  height: 30px;
  border-radius: 8px;
  background-color: rgba(21, 93, 252, 0.1);
`;

const ItemInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-width: 0;
`;

const ItemNombre = styled.span`
  ${textTheme__css}
  font-size: 14px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const ItemMeta = styled.span`
  font-size: 12px;
  color: var(--ga-muted);
`;

const ItemActions = styled.div`
  display: flex;
  gap: 2px;
  flex-shrink: 0;
`;

const IconBtn = styled.button<{ $danger?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 5px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--ga-muted);
  cursor: pointer;

  &:hover {
    color: ${(p) => (p.$danger ? "var(--ga-red)" : "var(--ga-primary)")};
    background-color: ${(p) =>
      p.$danger ? "var(--ga-pill-danger-bg)" : "rgba(21, 93, 252, 0.1)"};
  }
`;

const Form = styled.form`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  padding: 12px;
  border-radius: 8px;
  border: 1px solid var(--ga-surface-border);
`;

const Field = styled.div<{ $span?: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 4px;
  grid-column: ${(p) => (p.$span ? "1 / -1" : "auto")};
`;

const Label = styled.label`
  font-size: 11px;
  font-weight: 600;
  color: var(--ga-muted);
`;

const Input = styled.input`
  height: 36px;
  padding: 0 10px;
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

const FormActions = styled.div`
  grid-column: 1 / -1;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
`;

const AgregarRow = styled.div`
  display: flex;
`;

const Vacio = styled.p`
  font-size: 13px;
  color: var(--ga-muted);
`;

export default PolizaPersonasAdicionales;
