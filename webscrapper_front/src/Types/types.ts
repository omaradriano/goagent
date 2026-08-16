import type { PreferedScheme } from "../Context/ContextConfig";
import * as MuiIcons from "@mui/icons-material";

export type PolizaGetItem = {
  diaCobro: number;
  estatus: StatusValues;
  fecha_emision: string;
  forma_pago: string;
  medio_cobro: string;
  num_poliza: string;
  plan: string;
  tipo_seguro: string;
  asegurados: [ string : { nombre: string; is_principal: boolean; birthday: string, numpoliza: string } ];
  moneda: string;
  pais: string;
  email: string;
  telefono: string;
  direccion: {
    calle: string;
    codigoPostal: string;
    ciudad: string;
    estado: string;
    colonia: string;
  };
  next_payment: string;
  poliza_uuid: string;
  payment_exist: string
};

export type StatusValues = "En Vigor" | "Anulada";

export type viewMode = "Mobile" | "Desktop";

export type CardType =
  | "Default"
  | "Danger"
  | "Warning"
  | "Success"
  | "DefaultBlue";

export type FilterType =
  | "All"
  | "Active"
  | "AlreadyPay"
  | "Inactive"
  | "OverDueDate"
  | "AlmostOnDueDate";

export type MaterialIconName = keyof typeof MuiIcons;

export type Insurance = "SM" | string | null;

declare module "styled-components" {
  export interface DefaultTheme {
    mode: PreferedScheme;
    text: string;
  }
}

export type session_claims = {
  agente_role: string;
  agente_uuid: string;
  email: string;
  insurance_id: string;
  insurance_name: string;
  no_agente: string;
};
