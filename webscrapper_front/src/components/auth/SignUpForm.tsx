import React, { useState } from "react";
import { useNavigate } from "react-router";
import { validateEmail, validateNoAsesor, validatePassword } from "./functions";
import { AuthButton, CredentialAlert, InputText } from "./styles";
import type { ResetPassProps } from "./SetPasswordForm";

export interface RegisterCredentialsProps extends ResetPassProps {
  email: string;
  insurance: number;
  no_asesor: string;
}

const SignUpForm: React.FC = () => {
  const navigate = useNavigate();

  // 1. Estado centralizado de credenciales
  const [registerCredentials, setRegisterCredentials] =
    useState<RegisterCredentialsProps>({
      email: "",
      password: "",
      insurance: 0,
      repeat_password: "",
      no_asesor: "",
    });

  // 2. Estado centralizado de interacción
  const [fieldModified, setFieldModified] = useState({
    email: false,
    password: false,
    repeat_password: false,
    no_asesor: false,
    insurance: false,
  });

  const [emailExist, setEmailExist] = useState<boolean | null>(null);

  // 3. Valores derivados del estado
  const isEmailValid = validateEmail(registerCredentials.email);
  const isRegisterPasswordValid = validatePassword(
    registerCredentials.password,
  );
  const isNoAsesorValid = validateNoAsesor(registerCredentials.no_asesor);
  const isInsuranceSelected = registerCredentials.insurance !== null && registerCredentials.insurance !== 0;
  const registerPasswordsMatch =
    registerCredentials.password !== "" &&
    registerCredentials.password === registerCredentials.repeat_password;

  const areRegisterCredentialsValid =
    isEmailValid &&
    isRegisterPasswordValid &&
    registerPasswordsMatch &&
    isInsuranceSelected &&
    isNoAsesorValid;

  // 4. Manejador dinámico de cambios
  const handleChange = (
    evt: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = evt.target;

    // Actualizar credenciales dinámicamente usando el atributo 'name' del input
    setRegisterCredentials((prev) => ({
      ...prev,
      [name]: name === "insurance" ? value || null : value,
    }));

    // Marcar campo como modificado si existe en nuestro registro de interacción
    if (name in fieldModified) {
      setFieldModified((prev) => ({
        ...prev,
        [name]: true,
        // Caso especial: Si cambia la contraseña, asumimos que debe revisar la confirmación
        ...(name === "password" ? { repeat_password: true } : {}),
      }));
    }
  };

  // 5. Lógica de envío al servidor
  const handleRegister = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_SERVER_URL}/v1/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(registerCredentials),
      });

      const data = await response.json();

      if (data.success) {
        navigate("/auth/emailsended");
      } else {
        setEmailExist(false);
      }
    } catch (error) {
      console.error("Error al procesar el registro:", error);
      setEmailExist(false);
    }
  };

  return (
    <>
      <p>Crea una nueva cuenta</p>
      {/* EMAIL */}
      <InputText>
        <p>Correo</p>
        <input
          name="email"
          type="text"
          placeholder="tu@email.com"
          value={registerCredentials.email}
          onChange={handleChange}
        />
        {!isEmailValid && fieldModified.email && (
          <CredentialAlert $valid={false}>
            <p>Formato de correo incorrecto</p>
          </CredentialAlert>
        )}
      </InputText>

      {/* CONTRASEÑA */}
      <InputText>
        <p>Contraseña</p>
        <input
          name="password"
          type="password"
          placeholder="Contraseña"
          value={registerCredentials.password}
          onChange={handleChange}
        />
        {!isRegisterPasswordValid && fieldModified.password && (
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
      </InputText>

      {/* REPITE CONTRASEÑA */}
      <InputText>
        <p>Repite contraseña</p>
        <input
          name="repeat_password"
          type="password"
          placeholder="Contraseña"
          value={registerCredentials.repeat_password}
          onChange={handleChange}
        />
        {!registerPasswordsMatch && fieldModified.repeat_password && (
          <CredentialAlert $valid={false}>
            <p>Las contraseñas no coinciden</p>
          </CredentialAlert>
        )}
      </InputText>

      {/* NUMERO DE ASESOR */}
      <InputText>
        <p>Número de asesor</p>
        <input
          name="no_asesor"
          type="number"
          placeholder="Ej. 000000"
          value={registerCredentials.no_asesor}
          onChange={handleChange}
        />
        {!isNoAsesorValid && fieldModified.no_asesor && (
          <CredentialAlert $valid={false}>
            <p>Formato de número de asesor incorrecto</p>
          </CredentialAlert>
        )}
      </InputText>

      {/* ASEGURADORA */}
      <InputText>
        <p>Aseguradora</p>
        <select
          name="insurance"
          value={registerCredentials.insurance ?? ""}
          onChange={handleChange}
        >
          <option value="">Seleccione una opción</option>
          <option value="1">Seguros Monterrey</option>
        </select>
      </InputText>

      <AuthButton
        disabled={!areRegisterCredentialsValid}
        label={"Registrarse"}
        type="DefaultBlue"
        action={handleRegister}
      />

      {emailExist === false && (
        <CredentialAlert $valid={false}>
          <p>El correo ingresado ya se encuentra registrado</p>
        </CredentialAlert>
      )}
    </>
  );
};

export default SignUpForm;
