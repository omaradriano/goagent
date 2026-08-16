import React, { useState } from "react";
import { useNavigate } from "react-router";
import { validatePassword } from "./functions";
import { AuthButton, CredentialAlert, InputText } from "./styles";
import type { Insurance } from "../../Types/types";

export interface ResetPassProps {
  password: string;
  repeat_password: string;
}

// 1. Añadimos la interfaz de Props para recibir los parámetros de la URL
interface SetPasswordFormProps {
  setPasswordMode: string | null;
  token: string | null;
}

const SetPasswordForm: React.FC<SetPasswordFormProps> = ({
  setPasswordMode,
  token,
}) => {
  const navigate = useNavigate();

  // 2. Estado unificado para el formulario
  const [formData, setFormData] = useState({
    password: "",
    repeat_password: "",
    no_asesor: "",
    insurance: null as Insurance | null,
  });

  // 3. Control de campos modificados
  const [fieldModified, setFieldModified] = useState({
    password: false,
    repeat_password: false,
  });

  const [resetPassCompleted, setResetPassCompleted] = useState<boolean | null>(
    null,
  );
  const [customErrorMessage, setCustomErrorMessage] = useState<string | null>(
    null,
  );

  // 4. Validaciones calculadas a partir del estado
  const isPasswordValid = validatePassword(formData.password);
  const passwordsMatch =
    formData.password !== "" && formData.password === formData.repeat_password;

  // Si es nuevo usuario, obligamos a que llene asesor y aseguradora
  const isNewUser = setPasswordMode === "newuser";
  const isExtraInfoValid =
    !isNewUser ||
    (formData.no_asesor.trim() !== "" && formData.insurance !== null);

  const isFormValid = isPasswordValid && passwordsMatch && isExtraInfoValid;

  // 5. Manejador dinámico de cambios
  const handleChange = (
    evt: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = evt.target;

    setFormData((prev) => ({
      ...prev,
      [name]: name === "insurance" ? value || null : value,
    }));

    if (name in fieldModified) {
      setFieldModified((prev) => ({
        ...prev,
        [name]: true,
        ...(name === "password" && value !== ""
          ? { repeat_password: true }
          : {}),
      }));
    }
  };

  // 6. Envío del formulario a la API
  const handleSavePassword = async () => {
    try {
      // Construimos el body de forma condicional basándonos en el modo
      const payload = {
        password: formData.password,
        ...(isNewUser && {
          no_asesor: formData.no_asesor,
          insurance: formData.insurance,
        }),
      };

      console.log(payload);

      const response = await fetch(
        `${import.meta.env.VITE_API_SERVER_URL}/v1/auth/setpassword?token=${token}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        },
      );

      const data = await response.json();

      if (!data.success) {
        setResetPassCompleted(false);
        setCustomErrorMessage(data.message || "Error desconocido");
        return;
      }

      console.log("Contraseña guardada con éxito");

      if (!isNewUser) {
        navigate("/auth/resetpasswordcompleted");
      } else {
        navigate("/auth/registercompleted");
      }
    } catch (error) {
      console.error("Error al establecer contraseña:", error);
      setResetPassCompleted(false);
      setCustomErrorMessage("Error de conexión con el servidor");
    }
  };

  return (
    <>
      <p>Establece tu nueva contraseña</p>

      {/* NUEVA CONTRASEÑA */}
      <InputText>
        <p>Nueva contraseña</p>
        <input
          name="password"
          type="password"
          placeholder="Nueva contraseña"
          value={formData.password}
          onChange={handleChange}
        />
      </InputText>

      {!isPasswordValid && fieldModified.password && (
        <CredentialAlert $valid={false}>
          <p>
            Formato de contraseña incorrecto. Debe cumplir con lo siguiente:
          </p>
          <ul>
            <li>
              <strong>Longitud:</strong> De 8 a 20 caracteres.
            </li>
            <li>
              <strong>Variedad:</strong> Debe incluir mayúsculas, minúsculas y
              números.
            </li>
            <li>
              <strong>Carácter especial:</strong> Debe contener al menos un
              símbolo (ej: @, $, !, %, *, ?, &, _, .).
            </li>
          </ul>
        </CredentialAlert>
      )}

      {/* CONFIRMAR CONTRASEÑA */}
      <InputText>
        <p>Confirmar contraseña</p>
        <input
          name="repeat_password"
          type="password"
          placeholder="Confirmar contraseña"
          value={formData.repeat_password}
          onChange={handleChange}
        />
      </InputText>

      {!passwordsMatch && fieldModified.repeat_password && (
        <CredentialAlert $valid={false}>
          <p>Las contraseñas no coinciden</p>
        </CredentialAlert>
      )}

      {/* CAMPOS CONDICIONALES PARA NUEVO USUARIO */}
      {isNewUser && (
        <>
          <InputText>
            <p>Número de asesor</p>
            <input
              maxLength={6}
              name="no_asesor"
              type="number"
              placeholder="Ej. 000000"
              value={formData.no_asesor}
              onChange={handleChange}
            />
          </InputText>

          <InputText>
            <p>Aseguradora</p>
            <select
              name="insurance"
              value={formData.insurance ?? ""}
              onChange={handleChange}
            >
              <option value="">Seleccione una opción</option>
              <option value={1}>Seguros Monterrey</option>
            </select>
          </InputText>
        </>
      )}

      <AuthButton
        label="Guardar contraseña"
        type="DefaultBlue"
        disabled={!isFormValid}
        action={handleSavePassword}
      />

      {resetPassCompleted === false && (
        <CredentialAlert $valid={false}>
          <p>No se ha podido cambiar la contraseña: {customErrorMessage}</p>
        </CredentialAlert>
      )}
    </>
  );
};

export default SetPasswordForm;
