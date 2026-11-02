package services

import "testing"

func TestIsAllowedOrigin_PorAmbiente(t *testing.T) {
	ext := "chrome-extension://acihafkligkgjbhmbgaidkackhojbokh"
	preview := "https://cobranzaswebscrapper-front-abc123-omaradrianos-projects.vercel.app"

	cases := []struct {
		mode, origin string
		want         bool
	}{
		{"prod", "https://www.goagent.com.mx", true},
		{"prod", "https://staging.goagent.com.mx", false},
		{"prod", "http://localhost:5173", false},
		{"prod", preview, false},
		{"prod", ext, true},
		{"staging", "https://staging.goagent.com.mx", true},
		{"staging", "https://www.goagent.com.mx", false},
		{"staging", preview, true},
		{"staging", ext, true},
		{"dev", "http://localhost:5173", true},
		{"dev", "https://www.goagent.com.mx", false},
		{"dev", ext, true},
		{"", "https://www.goagent.com.mx", false},
	}
	for _, c := range cases {
		if got := isAllowedOrigin(c.mode, c.origin); got != c.want {
			t.Errorf("isAllowedOrigin(%q, %q) = %v, quiero %v", c.mode, c.origin, got, c.want)
		}
	}
}
