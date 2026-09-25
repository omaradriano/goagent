import React, { useContext, useEffect, useRef, useState } from "react";
import { AuthButton, CredentialAlert, InputText } from "./styles";
import { useLocation, useNavigate } from "react-router";
import { AuthContext } from "../../Context/ContextConfig";
import type { session_claims } from "../../Types/types";
import styled from "styled-components";
import {
  isExtensionLoginRequest,
  sendSessionToExtension,
} from "../../functions/extensionBridge";

const SignInForm: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const formRef = useRef<HTMLFormElement>(null);

  const auth = useContext(AuthContext);

  // Login iniciado desde la extension (?from=extension): al tener sesion se
  // le envia el JWT a la extension y se muestra /auth/loggedin.
  const fromExtension = isExtensionLoginRequest(location.search);
  // Evita enviar la sesion dos veces: tras el login tambien cambia
  // isAuthenticated (lo que dispara el efecto de abajo), y StrictMode ejecuta
  // los efectos dos veces en desarrollo.
  const extensionLoginStarted = useRef(false);

  const [credentials, setCredentials] = React.useState({
    email: "",
    password: "",
  });

  const [showError, setShowError] = useState<{
    isValid: boolean;
    errorMessage: string;
  }>({ isValid: true, errorMessage: "" });

  async function finishExtensionLogin(jwt: string): Promise<boolean> {
    if (extensionLoginStarted.current) return false;
    extensionLoginStarted.current = true;
    const delivered = await sendSessionToExtension(jwt);
    if (delivered) {
      navigate("/auth/loggedin");
      return true;
    }
    // Permite reintentar (ej. despues de instalar/actualizar la extension).
    extensionLoginStarted.current = false;
    setShowError({
      isValid: false,
      errorMessage:
        "Iniciaste sesión en la web, pero no se pudo conectar con la extensión. Verifica que esté instalada y actualizada, o inicia sesión desde el popup.",
    });
    return false;
  }

  // Si ya hay sesion en la web, no se piden credenciales otra vez: se le pasa
  // directo a la extension.
  useEffect(() => {
    if (!fromExtension || !auth?.isAuthenticated) return;
    const jwt = localStorage.getItem("session_jwt");
    if (jwt) void finishExtensionLogin(jwt);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromExtension, auth?.isAuthenticated]);

  async function handleSignIn(credentials: {
    email: string;
    password: string;
  }) {
    const auth_res = await fetch(
      `${import.meta.env.VITE_API_SERVER_URL}/v1/auth/authenticate/manual`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(credentials),
      },
    );

    const auth_data = await auth_res.json();

    if (auth_data.success) {
      console.log(auth_data);
      /**
       * Aqui se debe de guardar el JWT de sesion
       */
      localStorage.setItem("session_jwt", auth_data.payload.jwt_token);

      const session_req = await fetch(
        `${import.meta.env.VITE_API_SERVER_URL}/v1/auth/checkSession`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${auth_data.payload.jwt_token}`,
          },
        },
      );

      const session_data: {
        success: boolean;
        payload: session_claims;
        message?: string;
      } = await session_req.json();
      if (!session_data.success) {
        console.error("Error al verificar sesión:", session_data.message);
        auth?.setIsAuthenticated(false);
        navigate("/home");
        return;
      }

      auth?.setSession(session_data.payload);
      auth?.setIsAuthenticated(true);
      if (fromExtension) {
        // Si la extension no responde se queda en esta vista con el aviso
        // (la sesion web ya quedo iniciada).
        await finishExtensionLogin(auth_data.payload.jwt_token);
        return;
      }
      navigate("/dashboard");
    } else {
      console.error("Error al iniciar sesión:", auth_data.message);
      setShowError({
        isValid: false,
        errorMessage: auth_data.message,
      });
    }
  }

  return (
    // <form> real con name/autocomplete: el gestor de contrasenas de Chrome
    // ofrece guardar y autocompletar las credenciales.
    <form
      ref={formRef}
      // display: contents conserva el layout del contenedor (antes era un
      // fragmento).
      style={{ display: "contents" }}
      onSubmit={(e) => {
        e.preventDefault();
        handleSignIn(credentials);
      }}
    >
      <p>
        {fromExtension
          ? "Inicia sesion para conectar tu extension de GoAgent"
          : "Inicia sesion para acceder al sistema"}
      </p>
      <InputText>
        <p>Email</p>
        <input
          type="text"
          name="email"
          autoComplete="username"
          placeholder="tu@email.com"
          value={credentials.email}
          onChange={(e) =>
            setCredentials({ ...credentials, email: e.target.value })
          }
        />
      </InputText>
      <InputText>
        <p>Contraseña</p>
        <input
          type="password"
          name="password"
          autoComplete="current-password"
          placeholder="Contraseña"
          value={credentials.password}
          onChange={(e) =>
            setCredentials({ ...credentials, password: e.target.value })
          }
        />
      </InputText>
      <SignInFooter>
        <AuthButton
          label="Iniciar sesión"
          type="DefaultBlue"
          action={() => {
            formRef.current?.requestSubmit();
          }}
        />
        <ForgotPassLink onClick={()=>{navigate('/auth/resetpasswordinitflow')}}>Olvidé mi contraseña</ForgotPassLink>
      </SignInFooter>
      {!showError.isValid ? (
        <CredentialAlert $valid={false}>
          <p>{showError.errorMessage}</p>
        </CredentialAlert>
      ) : null}
      {/* <Button label="Entrar como Demo" type="Default" /> */}
      {/* Permite enviar con Enter (AuthButton es un div). */}
      <button type="submit" hidden />
    </form>
  );
};

const SignInFooter = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
`

const ForgotPassLink = styled.p`
  display: inline-block;
  color: blue;
  text-decoration: underline;
  cursor: pointer;
`

export default SignInForm;
