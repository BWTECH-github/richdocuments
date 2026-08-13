# Collabora Online (richdocuments)

Diese App verbindet owncloud.online mit einem Collabora-Online-Server, damit
Text-, Tabellen- und Präsentationsdokumente im Browser bearbeitet werden
können. owncloud.online liefert dabei die Datei über das WOPI-Protokoll aus
(WOPI-Host), die eigentliche Bearbeitung übernimmt der Collabora-Server
(WOPI-Client). Die App bringt selbst keine Office-Engine mit.

## Was die App tut

- Öffnet Dokumente in einem eingebetteten Collabora-Fenster (iframe) aus der
  Dateiliste, aus öffentlichen Links und über Federation.
- Legt neue Dokumente an, wahlweise im ODF- oder im OOXML-Format.
- Ergänzt einen Navigationseintrag „Büro", der sich abschalten lässt.
- Stellt die WOPI-Schnittstelle bereit, über die der Collabora-Server die
  Datei liest und zurückschreibt
  (`index.php/apps/richdocuments/wopi/files/…`).
- Bietet Secure View (Wasserzeichen, Sperren von Drucken und Export) sowie die
  Zotero-Anbindung für Literaturverweise.
- Räumt abgelaufene WOPI-Zugriffstoken über einen Hintergrundjob aus der
  Tabelle `richdocuments_wopi` auf. Ein Token ist 36000 Sekunden (10 Stunden)
  gültig.

## Voraussetzungen

- owncloud.online 11.x und PHP 8.4 (siehe `appinfo/info.xml`).
- Ein erreichbarer Collabora-Online-Server, der unter
  `<adresse>/hosting/discovery` eine gültige WOPI-Discovery-XML ausliefert.
- Ein eingerichteter Cron-Lauf, damit der Hintergrundjob
  `CleanupExpiredWopiTokens` abgelaufene Token löscht.
- Für Secure View eine gültige Lizenz; ohne Lizenz ist das Kästchen im
  Administrationsbereich ausgegraut.
- Falls Verschlüsselung aktiv ist: ausschließlich Masterkey-Verschlüsselung.
  Bei anderen Verfahren weist der Administrationsbereich auf die
  eingeschränkte Funktion hin, weil die App privilegierten Zugriff auf die
  Dateien benötigt.

### Beide Seiten müssen sich gegenseitig erreichen

Eine Anbindung funktioniert nur, wenn alle drei Verbindungen offen sind. Die
Beispiele verwenden `https://cloud.example.com` für owncloud.online und
`https://collabora.example.com:9980` für den Collabora-Server; setzen Sie Ihre
eigenen Adressen ein.

| Richtung | Wofür | Beispiel |
| --- | --- | --- |
| owncloud.online → Collabora | Discovery-XML abrufen | `https://collabora.example.com:9980/hosting/discovery` |
| Collabora → owncloud.online | Datei lesen und speichern (WOPI) | `https://cloud.example.com/index.php/apps/richdocuments/wopi/files/…` |
| Browser → Collabora | Editor im iframe laden | `https://collabora.example.com:9980/…` |

Beide Seiten sollten dasselbe Schema verwenden. Speichern Sie eine Adresse mit
`http`, während owncloud.online über `https` läuft, meldet die App beim
Speichern, dass Collabora Online dasselbe Protokoll wie die Serverinstallation
verwenden sollte. Für Testaufbauten ohne TLS betreiben Sie deshalb beide
Seiten über `http`.

## Installation

Der einfachere Weg führt über den Markt: dort die App suchen, installieren und
aktivieren. Von Hand geht es so:

    cd /var/www/owncloud.online/apps
    git clone https://github.com/BWTECH-github/richdocuments.git
    cd richdocuments
    composer install --no-dev
    chown -R www-data:www-data .
    sudo -u www-data php8.4 ../../occ app:enable richdocuments

## Einstellungen

Die Oberfläche findet sich im Administrationsbereich im Abschnitt
`additional` unter den Überschriften „Collabora Online", „Secure View für
Collabora Online" und „Zotero für Collabora Online". Die dort gezeigten Werte
lassen sich auch auf der Kommandozeile setzen. `open_in_new_tab` und
`start_grace_period` haben kein Bedienelement in der Oberfläche und lassen sich
ausschließlich auf der Kommandozeile setzen.

Der wichtigste Wert ist die Serveradresse. Geben Sie sie immer vollständig an,
also mit Schema und Port; ohne `http`- oder `https`-Schema lehnt die App die
Eingabe ab.

| Schlüssel | Bedeutung | Standard |
| --- | --- | --- |
| `wopi_url` | Adresse des Collabora-Servers, z. B. `https://collabora.example.com:9980` | leer |
| `test_wopi_url` | Adresse eines zweiten Servers für Testgruppen | leer |
| `test_server_groups` | Gruppen, die den Testserver verwenden, mit `\|` getrennt | leer |
| `edit_groups` | Gruppen, die bearbeiten dürfen, mit `\|` getrennt; leer = alle | leer |
| `doc_format` | `ooxml` oder `odf` für neu angelegte Dateien | leer (ODF) |
| `canonical_webroot` | Webroot-Pfad, der in der WOPISrc-Adresse anstelle des aktuellen Webroots eingesetzt wird | leer |
| `menu_option` | `false` blendet den Navigationseintrag „Büro" aus | aktiv |
| `open_in_new_tab` | Dokumente in einem neuen Browser-Tab öffnen (nur Kommandozeile) | `true` |
| `secure_view_option` | Secure View einschalten (Lizenz nötig) | `false` |
| `secure_view_open_action_default` | Dokumente immer in Secure View mit Wasserzeichen öffnen | `false` |
| `secure_view_can_print_default` | „kann drucken/exportieren" als Vorgabe für Freigaben | `false` |
| `secure_view_has_watermark_default` | „Secure View (mit Wasserzeichen)" als Vorgabe für Freigaben | `true` |
| `watermark_text` | Text des Wasserzeichens; `{viewer-email}` wird durch die E-Mail-Adresse des Betrachters ersetzt | leer |
| `zotero` | Zotero-Anbindung für alle Benutzer freischalten | `false` |
| `start_grace_period` | Kulanzzeitraum der Lizenzprüfung starten (nur Kommandozeile) | `false` |

Zusätzlich wertet die App zwei Werte außerhalb der eigenen App-Einstellungen
aus:

- Systemwert `collabora_group`: Ist er gesetzt, dürfen nur Mitglieder dieser
  Gruppe die App verwenden. Ist die Gruppe unbekannt, wird niemand
  zugelassen und ein Fehler protokolliert.
- Benutzerwert `zoteroAPIPrivateKey`: der persönliche Zotero-Schlüssel, den
  Benutzer selbst in ihren persönlichen Einstellungen unter „Persönlicher
  API-Schlüssel für Zotero:" hinterlegen.

## Kommandozeile

Die App bringt keine eigenen occ-Befehle mit; die Werte werden mit den
Standardbefehlen von owncloud.online gesetzt und gelesen:

    sudo -u www-data php8.4 occ config:app:set richdocuments wopi_url \
        --value https://collabora.example.com:9980
    sudo -u www-data php8.4 occ config:app:get richdocuments wopi_url

Secure View mit Wasserzeichen einschalten:

    sudo -u www-data php8.4 occ config:app:set richdocuments \
        secure_view_option --value true
    sudo -u www-data php8.4 occ config:app:set richdocuments \
        secure_view_open_action_default --value true
    sudo -u www-data php8.4 occ config:app:set richdocuments \
        watermark_text --value "Nur für {viewer-email}"

## Anbindung an die Web-Oberfläche

Für die Web-Oberfläche wird die App zusätzlich in deren `config.json`
eingetragen. Die App liefert die dafür nötige Datei unter einer eigenen Route
aus:

```json
"external_apps": [
    {
        "id": "richdocuments",
        "path": "https://cloud.example.com/index.php/apps/richdocuments/js/richdocuments.js"
    }
]
```

Die ausgelieferte Datei liegt im Repository unter `js/web/richdocuments.js`
und ist bereits gebaut. Wer sie selbst erzeugen möchte, verwendet die
Skripte aus `package.json`:

    pnpm install
    pnpm build

## Fehlersuche

Die Meldungen der App stehen im Protokoll von owncloud.online unter der
Kennung `richdocuments`. Einzige Ausnahme ist die Meldung über eine unbekannte
`collabora_group`, die unter der Kennung `collabora` protokolliert wird.

| Symptom | Ursache | Abhilfe |
| --- | --- | --- |
| Speichern der Serveradresse wird mit dem Hinweis auf ein ungültiges Schema abgelehnt | Adresse ohne `http`/`https` eingetragen | Adresse vollständig angeben: `https://collabora.example.com:9980` |
| Meldung „Saved with error", Collabora solle dasselbe Protokoll verwenden | Serveradresse und owncloud.online verwenden unterschiedliche Schemata | Beide Seiten auf `https` (oder im Test beide auf `http`) umstellen |
| Protokoll: „Cannot resolve the host" | Der Name des Collabora-Servers ist von owncloud.online aus nicht auflösbar | DNS prüfen oder IP-Adresse eintragen |
| Protokoll: „Cannot connect to the host" | Port 9980 blockiert oder Dienst läuft nicht | Firewall und Dienst prüfen |
| Protokoll: „SSL/TLS handshake failed" | TLS-Aushandlung schlägt fehl | Protokollversionen und Zertifikat des Collabora-Servers prüfen |
| Protokoll: „SSL certificate is not installed" | Das Zertifikat des Collabora-Servers ist owncloud.online nicht bekannt | CA-Kette in das CA-Bundle der Serverinstallation aufnehmen |
| Protokoll: „The protocol specified … is not allowed" oder „Malformed URL" | Die eingetragene Adresse ist unbrauchbar | Schreibweise samt Schema und Port prüfen |
| Protokoll: Discovery „is not a well-formed XML string" | Unter `/hosting/discovery` antwortet nicht Collabora, sondern z. B. eine Fehlerseite des Reverse Proxys | Weiterleitung im Proxy prüfen, Adresse direkt im Browser aufrufen |
| Fehlerseite „Collabora Online: Error encountered while opening the document." | Discovery nicht abrufbar oder Dateityp nicht unterstützt | Verbindung zum Collabora-Server prüfen, Protokoll auswerten |
| Editor lädt, bleibt aber leer oder meldet einen Fehler in Collabora | Der Collabora-Server erreicht owncloud.online nicht | Rückrichtung prüfen: `wopi/files/…` muss vom Collabora-Server aus erreichbar sein; bei mehreren Webroots `canonical_webroot` setzen |
| Geänderte Serveradresse wirkt nicht sofort | Die Discovery-XML wird eine Stunde zwischengespeichert | Warten oder den Cache der Instanz leeren |
| Navigationseintrag „Büro" fehlt | `menu_option` steht auf `false` oder der Benutzer ist nicht in `collabora_group` | Wert bzw. Gruppenmitgliedschaft prüfen |
| Kästchen „Secure View aktivieren (benötigt Enterprise Edition)" ist ausgegraut | Keine gültige Lizenz vorhanden | Lizenz einspielen |
| Roter Hinweis zur Verschlüsselung im Administrationsbereich | Verschlüsselung ohne Masterkey aktiv | Auf Masterkey-Verschlüsselung umstellen |
| Zotero-Feld in den persönlichen Einstellungen ist ausgeblendet | `zotero` ist nicht aktiviert | Zotero im Administrationsbereich freischalten |
| Tabelle `richdocuments_wopi` wächst dauerhaft | Der Hintergrundjob läuft nicht | Cron einrichten und prüfen |

## Herkunft

Diese App geht auf richdocuments von Collabora Productivity zurück, aufbauend
auf Arbeiten von Frank Karlitschek und Victor Dubiniuk und gepflegt von der
ownCloud GmbH. Lizenz: AGPL-3.0.

Angepasst von der BW-Tech GmbH für owncloud.online und PHP 8.4.

- Quelltext und Fehlermeldungen:
  https://github.com/BWTECH-github/richdocuments
- Dokumentation: https://docs.owncloud.online
- Produktseite: https://owncloud.online
