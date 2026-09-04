/**
 * Cloudflare Pages Function — Formularversand ohne Zwischendienstleister.
 *
 * Nimmt die Objektanfrage von /immobilien.html entgegen und stellt sie per
 * Cloudflare Email Service direkt an die Zieladresse zu. Es wird nichts
 * gespeichert und kein weiterer Anbieter eingebunden.
 *
 * Voraussetzungen im Cloudflare-Dashboard (Pages -> Settings -> Functions):
 *   1. Binding "Send email", Variablenname: SENDER
 *      Zieladresse goldschwendt@unitherm.at muss vorher in Email Routing
 *      als Destination Address bestaetigt werden.
 *   2. Compatibility date 2024-09-01 oder spaeter.
 *   3. Optionale Variablen:
 *        MAIL_TO    Vorgabe: goldschwendt@unitherm.at
 *        MAIL_FROM  Vorgabe: formular@unitherm-beteiligung.at
 *
 * Schlaegt der Versand fehl, antwortet die Funktion mit Status 502. Das
 * Formular faellt dann sichtbar auf den direkten E-Mail-Weg zurueck.
 */

import { EmailMessage } from "cloudflare:email";

const FELDER = [
  "Objektart", "Ort", "Adresse", "Flaeche", "Baujahr",
  "Zustand", "Preisvorstellung", "Name", "EMail", "Telefon"
];

const LIMIT = 4000;

const CTRL_EINZEILIG = /[\u0000-\u001f\u007f]/g;
const CTRL_MEHRZEILIG = /[\u0000-\u0009\u000b\u000c\u000e-\u001f\u007f]/g;

const json = (obj, status) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" }
  });

/** Einzeiliges Feld: Zeilenumbrueche raus, damit keine Kopfzeile injiziert werden kann. */
function sauber(wert) {
  return String(wert == null ? "" : wert)
    .replace(/[\r\n]+/g, " ")
    .replace(CTRL_EINZEILIG, "")
    .trim()
    .slice(0, LIMIT);
}

/** Mehrzeiliges Feld: Umbrueche bleiben erhalten. */
function mehrzeilig(wert) {
  return String(wert == null ? "" : wert)
    .replace(/\r\n?/g, "\n")
    .replace(CTRL_MEHRZEILIG, "")
    .trim()
    .slice(0, LIMIT);
}

/** RFC 2047, damit Umlaute in der Betreffzeile ankommen. */
function betreffCodieren(text) {
  const bytes = new TextEncoder().encode(text);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return "=?UTF-8?B?" + btoa(bin) + "?=";
}

export async function onRequestPost({ request, env }) {
  let daten;
  try {
    const typ = request.headers.get("content-type") || "";
    daten = typ.includes("application/json")
      ? await request.json()
      : Object.fromEntries(await request.formData());
  } catch {
    return json({ ok: false, fehler: "Anfrage konnte nicht gelesen werden." }, 400);
  }

  // Honigtopf: von Menschen nie ausgefuellt, von Bots fast immer.
  if (sauber(daten.website)) return json({ ok: true }, 200);

  const werte = {};
  for (const feld of FELDER) werte[feld] = sauber(daten[feld]);
  werte.Nachricht = mehrzeilig(daten.Nachricht);

  if (!werte.Name || !werte.EMail || !werte.Objektart || !werte.Ort) {
    return json({ ok: false, fehler: "Pflichtfelder fehlen." }, 400);
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(werte.EMail)) {
    return json({ ok: false, fehler: "E-Mail-Adresse ist nicht gueltig." }, 400);
  }

  const an = env.MAIL_TO || "goldschwendt@unitherm.at";
  const von = env.MAIL_FROM || "formular@unitherm-beteiligung.at";

  const zeilen = [
    "Objektart:        " + werte.Objektart,
    "Ort / Bezirk:     " + werte.Ort,
    werte.Adresse ? "Adresse:          " + werte.Adresse : null,
    werte.Flaeche ? "Fläche:           " + werte.Flaeche + " m²" : null,
    werte.Baujahr ? "Baujahr:          " + werte.Baujahr : null,
    werte.Zustand ? "Zustand:          " + werte.Zustand : null,
    werte.Preisvorstellung ? "Preisvorstellung: " + werte.Preisvorstellung : null,
    "",
    "Name:             " + werte.Name,
    "E-Mail:           " + werte.EMail,
    werte.Telefon ? "Telefon:          " + werte.Telefon : null,
    "",
    werte.Nachricht ? "Nachricht:" : null,
    werte.Nachricht || null,
    "",
    "—",
    "Gesendet über das Formular auf unitherm-beteiligung.at/immobilien.html",
    "Eingegangen: " + new Date().toLocaleString("de-AT", { timeZone: "Europe/Vienna" })
  ].filter((z) => z !== null);

  const kennung = "u" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const absenderName = werte.Name.replace(/[<>"]/g, "");

  const roh = [
    "From: Unitherm Website <" + von + ">",
    "To: <" + an + ">",
    "Reply-To: " + betreffCodieren(absenderName) + " <" + werte.EMail + ">",
    "Subject: " + betreffCodieren("Objektanfrage: " + werte.Objektart + " in " + werte.Ort),
    "Message-ID: <" + kennung + "@unitherm-beteiligung.at>",
    "Date: " + new Date().toUTCString(),
    "MIME-Version: 1.0",
    'Content-Type: text/plain; charset="utf-8"',
    "Content-Transfer-Encoding: 8bit",
    "",
    zeilen.join("\r\n")
  ].join("\r\n");

  if (!env.SENDER || typeof env.SENDER.send !== "function") {
    return json({ ok: false, fehler: "Versand ist derzeit nicht eingerichtet." }, 502);
  }

  try {
    await env.SENDER.send(new EmailMessage(von, an, roh));
  } catch (e) {
    return json({ ok: false, fehler: "Versand fehlgeschlagen." }, 502);
  }

  return json({ ok: true }, 200);
}

export async function onRequestGet() {
  return new Response("Method Not Allowed", { status: 405, headers: { allow: "POST" } });
}
