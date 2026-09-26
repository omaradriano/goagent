import { useEffect } from "react";

// Modales abiertos al mismo tiempo (ej. el aviso global encima del detalle):
// el scroll solo se libera cuando se cierra el ultimo.
let openLocks = 0;
let previousOverflow = "";
let previousPaddingRight = "";

// Bloquea el scroll de la pagina mientras `locked` sea true. Sin esto, la
// rueda del mouse sobre el fondo del modal (que no tiene scroll propio)
// desplazaba el dashboard de atras.
function useBodyScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) return;

    const body = document.body;
    if (openLocks === 0) {
      previousOverflow = body.style.overflow;
      previousPaddingRight = body.style.paddingRight;
      // Compensa el ancho de la barra de scroll que desaparece para que el
      // contenido no se recorra hacia la derecha.
      const scrollbarWidth =
        window.innerWidth - document.documentElement.clientWidth;
      if (scrollbarWidth > 0) {
        body.style.paddingRight = `${scrollbarWidth}px`;
      }
      body.style.overflow = "hidden";
    }
    openLocks++;

    return () => {
      openLocks--;
      if (openLocks === 0) {
        body.style.overflow = previousOverflow;
        body.style.paddingRight = previousPaddingRight;
      }
    };
  }, [locked]);
}

export default useBodyScrollLock;
