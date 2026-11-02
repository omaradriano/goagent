package handlers

import "testing"

func TestEsVigente(t *testing.T) {
	vigentes := []string{"En Vigor", "EN VIGOR", "Vigor Prorrogado", "En Vigor sin Pago de Primas"}
	for _, e := range vigentes {
		if !esVigente(e) {
			t.Errorf("esVigente(%q) = false, quiero true", e)
		}
	}
	for _, e := range []string{"Anulada", "ANULADA", " anulada "} {
		if esVigente(e) {
			t.Errorf("esVigente(%q) = true, quiero false", e)
		}
	}
}
