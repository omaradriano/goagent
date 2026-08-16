/**
 * @description Validador para email
 * @param email
 * @returns
 */
function validateEmail(email: string): boolean {
  const email_reg = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
  return email_reg.test(email);
}

/**
 * @description Validador para contraseña
 * @param password
 * @returns
 */
function validatePassword(password: string) {
  const pass_reg =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&._])[A-Za-z\d@$!%*?&._]{8,20}$/;
  return pass_reg.test(password);
}

function validateNoAsesor(no_asesor:string): boolean {
    const no_asesor_reg = /^[0-9]{2,7}$/;
    return no_asesor_reg.test(no_asesor);
}

export { validateEmail, validatePassword, validateNoAsesor };
