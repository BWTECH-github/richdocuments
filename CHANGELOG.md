# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/).

## [5.0.0] - 2026-09-17

Redesign-Linie (owncloud.online Redesign 11.1). Nur im Zweig `redesign`.
Im Redesign-Kern mit echtem Collabora Online (CODE) Ende zu Ende geprüft
(tests/visual/pruefe-richdocuments.cjs, 20/20).

### Fixed

- Editor blieb im Redesign leer: Der Redesign-Kern setzt `form-action 'self'`,
  die Editorseite übergibt das Zugriffstoken aber per Formular an den
  Collabora-Server. Die Adresse des Servers ist jetzt als Formularziel erlaubt
  (Benutzer, öffentlicher Link, föderierte Freigabe). Benötigt den
  Redesign-Kern (`addAllowedFormActionDomain`), daher min-version 11.1.
- PHP 8.4: `edit_groups` ohne Standardwert gab `explode()` null (Deprecation bei
  jedem Öffnen eines Dokuments).
- Office-Übersicht ohne Dokument: fehlende Vorlagenschlüssel ("Undefined array
  key") und leerer Größenhinweis beim Hochladen ("max. ").

### Changed

- Verwaltung: Verweise auf fremde Dokumentation entfernt; tote Upstream-CI
  (SonarCloud, Transifex) entfernt; CHANGELOG-Verweise als "Upstream #N".

## [4.3.3] - 2026-08-13

### Changed

- README als Betriebsdokumentation neu geschrieben: Installation, Einstellungen,
  Kommandozeile und Fehlersuche; tote und fremde Verweise entfernt.

## [4.3.2] - 2026-08-13

### Changed

- Produktname, Beschreibung und uebersetzte Zeichenketten nennen owncloud.online;
  Verweise auf Fehlerbereich, Repository und Dokumentation zeigen auf das eigene
  Repository. Screenshots aus fremden Repositories entfernt.

## [4.2.2] - 2025-11-19

### Fixed

- Upstream #562 - Fullscreen permissions weren't applied properly
- Upstream #560 - Allow async clipboard access
- Upstream #558 - Bump vite from 4.5.6 to 5.4.21
- Upstream #557 - Remove references to an external chat service
- Upstream #556 - Bump axios from 1.8.2 to 1.12.0

## [4.2.1] - 2025-03-11

### Fixed

- Upstream #552 - Collabora WOPI src can only be http/https


## [4.2.0] - 2024-01-24

### Fixed

- Upstream #535 - Update route to documents.php/index


## [4.1.0] - 2023-12-01

### Added

- Upstream #505 - Zotero integration + refactor and bug fixes of admin/personal panel

### Fixed

- Upstream #522 - Bugfix: broken version revision
- Upstream #520 - fix: drop usage of ${}


## [4.0.0] - 2023-09-22

### Added

- Upstream #498 - Federated shares support v1
- Upstream #497 - Handle federated share mount to display error and further refactor
- Upstream #486 - E5515 feature/wopi locks
- Upstream #456 - Web: add Drawing filetype and add it to + menu

### Changed

- Upstream #508 - CollaboraOnline#6546 enable automatic color in default paragraph style
- Upstream #496 - Migrate to oC Web v7
- Upstream #494 - Refactor API and most critical parts of the code
- Upstream #493 - make sure to retrieve correct supershare based on current dir context
- Upstream #492 - Remove Symfony event dispatch from ignoreErrors
- Upstream #467 - Set appropriate icon for web
- Upstream #464 - Replace deprecated String.prototype.substr()
- Upstream #462 - Adjust 'if' conditionals that were reported by phpstan
- Upstream #454 - Change Richdocuments app name to Collabora Online
- Minimum core version 10.11, minimum php version 7.4

### Fixed

- Upstream #517 - Fix issue with null return
- Upstream #516 - Fix #515: Upload button overlaps with document icon
- Upstream #507 - Fix regressions introduced with refactors for new major release and add tests
- Upstream #457 - Typo fix (templates/documents.php)
- Upstream #455 - Ensure ODG Drawing compatibility across integration
- Upstream #451 - Disable secure view js and settings when not available
- Upstream #468 - Upload button overlaps with a document icon in the second row


## [3.0.0] - 2022-09-22

### Changed

- Upstream #470 - Adjust getMimeType for guzzle7 dependencies
- Upstream #456 - web: add Drawing filetype and add it to + menu
- This version requires server version 10.11.0 or above

### Fixed

- Upstream #467 - Set appropriate icon for web
- Upstream #455 - ensure ODG Drawing compatibility across integration
- Upstream #451 - disable secure view js and settings when not available


## [2.7.0] - 2022-01-19

### Changed

- added Diagram document type to + button - Upstream #436
- Compatibility with the separate web client - Upstream #423
- Update .drone.star and drop PHP 7.2 - Upstream #424
- Library and translation updates

### Fixed

- Make upload work again - Upstream #437

## [2.6.0] - 2021-05-31

### Fixed

- Only verify path if filename is given, additional log error - Upstream #418
- Don't log warning message on PUT in favour of debug - Upstream #407
- Prevent documents with tabs in filenames / or any other invalid chars from being created - Upstream enterprise#4628

### Changed

- Introduced "Open documents in Secure View with watermark by default" setting - Upstream #400 - Upstream #402
- Enable comments on PDFs - Upstream #404
- Use app icon for Open in Collabora action - Upstream #406


- Library updates


## [2.5.0] - 2021-04-28

### Changed

- In OC10.7 we changed the logic for encryption events -  Upstream #392
- Improved auditing capabilities for access via Collabora - Upstream #371
- Changes to allow opening documents explicitly with Collabora - Upstream #370
- Let wopi client decide the actions when token about to expire
- Translation updates
- Library updates

### Fixed
- Fix Public Links shared from Local Storage - Upstream #385
- Make Secure View licensing compatible with new license manager - Upstream #356
- Fix wrong default name


## [2.4.1] - 2020-10-19

### Changed
- Add warning for secure view regarding license
- Translation updates

### Fixed
- Hotfix for checking license for a specific feature in richdocuments


## [2.4.0] - 2020-07-30



