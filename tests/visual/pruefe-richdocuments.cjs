/**
 * Office (richdocuments) im Redesign mit echtem Collabora Online.
 *
 * Voraussetzung: Collabora (coolwsd) erreichbar, richdocuments wopi_url gesetzt
 * (Testumgebung: collabora-einrichten.sh in WSL, wopi_url http://localhost:9980).
 * Die Probe legt den Ordner Office-Probe und einen öffentlichen Link an und
 * räumt beides wieder weg.
 *
 * Geprüft wird:
 *   - Verwaltung (Zusätzliche Einstellungen): Adresse des Servers speichern
 *   - Neu > Dokument legt eine .odt an und öffnet den Editor
 *   - Editor lädt das Dokument (App_LoadingStatus Document_Loaded)
 *   - Text einfügen und speichern: der Text steht danach in der Datei
 *     (content.xml auf dem Server)
 *   - Schließen führt zurück in den Ordner
 *   - Klick auf eine bestehende Datei öffnet sie wieder im Editor
 *   - öffentlicher Ordner-Link mit Bearbeiten: Dokument öffnet im Editor
 *   - keine Konsolenfehler auf der Seite des Servers
 *
 * Aufruf: OC_PASSWORD=... node tests/visual/pruefe-richdocuments.cjs
 *   DATEI_PRUEFEN: Befehl, der den Inhalt von content.xml der Probedatei
 *   ausgibt (Standard: Testinstanz 18130 in WSL)
 *
 * @copyright Copyright (c) 2026, BW-Tech GmbH
 * @license AGPL-3.0
 */
'use strict';

let chromium;
try {
	({ chromium } = require('playwright'));
} catch (e) {
	({ chromium } = require('C:/git/owncloud.online-redesign/node_modules/playwright'));
}
const { execSync } = require('child_process');

const BASIS = process.env.OC_URL || 'http://127.0.0.1:18130';
const PASSWORT = process.env.OC_PASSWORD;
const TEXT = 'OfficeProbe 4711';
const DATEI_PRUEFEN = process.env.DATEI_PRUEFEN
	|| 'wsl.exe -u root -e bash -lc "D=$(sudo -u www-data php8.4 /opt/oco-schnell/occ config:system:get datadirectory); unzip -p $D/admin/files/Office-Probe/probe.odt content.xml"';
// occ-Aufruf (Präfix), um die Serveradresse kurz zu leeren und wiederherzustellen
const OCC = process.env.OCC || 'wsl.exe -u root -e sudo -u www-data php8.4 /opt/oco-schnell/occ';
if (!PASSWORT) {
	console.error('OC_PASSWORD fehlt.');
	process.exit(2);
}

const ergebnisse = [];
function pruefe(name, ok, zusatz) {
	ergebnisse.push({ name, ok: ok === true, zusatz: zusatz === undefined ? '' : String(zusatz) });
}

// Nachrichten von Collabora an die Seite mitschreiben
const MITSCHNITT = `(() => {
	window.__cool = [];
	window.addEventListener('message', function (e) {
		try {
			var m = JSON.parse(e.data);
			window.__cool.push(m.MessageId + ':' + ((m.Values && (m.Values.Status || m.Values.success)) || ''));
		} catch (x) {}
	});
})();`;

async function warteAufNachricht(seite, muster, ms) {
	return seite.waitForFunction((m) => (window.__cool || []).some((x) => new RegExp(m).test(x)), muster, { timeout: ms || 90000 }).then(() => true).catch(() => false);
}

async function editorRahmen(seite) {
	const da = await seite.waitForSelector('#loleafletframe', { state: 'attached', timeout: 60000 }).then(() => true).catch(() => false);
	if (!da) {
		return null;
	}
	for (let i = 0; i < 120; i++) {
		const f = seite.frames().find((x) => /:9980\//.test(x.url()));
		if (f) {
			return f;
		}
		await seite.waitForTimeout(250);
	}
	return null;
}

/**
 * Führt die Aktion aus und liefert die Seite, auf der der Editor geöffnet wurde.
 * Standard ist open_in_new_tab=true (window.open), sonst dieselbe Seite.
 */
async function editorSeite(seite, aktion, muster) {
	const neu = seite.context().waitForEvent('page', { timeout: 60000 }).catch(() => null);
	const gleich = seite.waitForURL(muster, { timeout: 60000 }).then(() => seite).catch(() => null);
	await aktion();
	const treffer = await Promise.race([neu, gleich]);
	const ziel = treffer || await neu || await gleich;
	if (ziel && ziel !== seite) {
		await ziel.waitForURL(muster, { timeout: 60000 }).catch(() => {});
	}
	return ziel && muster.test(ziel.url()) ? ziel : null;
}

async function colorboxZu(seite) {
	await seite.evaluate(() => {
		if (window.jQuery && jQuery.colorbox && document.getElementById('colorbox') && document.getElementById('colorbox').getClientRects().length) {
			jQuery.colorbox.close();
		}
	});
}

(async () => {
	const browser = await chromium.launch();
	const kontext = await browser.newContext({ locale: 'de-DE', viewport: { width: 1440, height: 900 } });
	await kontext.addInitScript(MITSCHNITT);
	const seite = await kontext.newPage();
	const konsole = [];
	seite.on('console', (m) => {
		const quelle = m.location().url || '';
		// eigenes Aufräumen der Probe (DELETE auf einen noch fehlenden Ordner) zählt nicht
		if (/\/remote\.php\/dav\/files\/admin\/Office-Probe$/.test(quelle)) {
			return;
		}
		if (m.type() === 'error' && /127\.0\.0\.1:18130|^[^h]/.test(quelle)) {
			konsole.push(m.text().slice(0, 160) + ' @ ' + (m.location().url || '').slice(0, 160));
		}
	});
	await seite.goto(BASIS + '/index.php/login', { waitUntil: 'domcontentloaded' });
	await seite.fill('#user', 'admin');
	await seite.fill('#password', PASSWORT);
	await Promise.all([seite.waitForNavigation({ timeout: 60000 }).catch(() => {}), seite.click('#submit, button[type=submit], input[type=submit]')]);

	// Verwaltung
	await seite.goto(BASIS + '/index.php/settings/admin?sectionid=additional', { waitUntil: 'load' });
	const verwaltung = await seite.evaluate(() => {
		const f = document.getElementById('wopi_url-richdocuments');
		return { feld: !!f, wert: f && f.value };
	});
	pruefe('Verwaltung: Serveradresse sichtbar', verwaltung.feld && verwaltung.wert === 'http://localhost:9980', JSON.stringify(verwaltung));
	if (verwaltung.feld) {
		await seite.click('#wopi_url_save-richdocuments');
		// "Speichervorgang…" ist nur der Zwischenstand; das Ergebnis setzt success oder error
		await seite.waitForFunction(() => {
			const m = document.getElementById('documents-admin-msg');
			return m.classList.contains('success') || m.classList.contains('error');
		}, null, { timeout: 30000 }).catch(() => {});
		const meldung = await seite.evaluate(() => {
			const m = document.getElementById('documents-admin-msg');
			return { text: m.textContent.trim(), erfolg: m.classList.contains('success'), fehler: m.classList.contains('error') };
		});
		pruefe('Verwaltung: Speichern prüft den Server und meldet Erfolg', meldung.erfolg && !meldung.fehler, JSON.stringify(meldung));
	}

	// Ausgangslage
	await seite.goto(BASIS + '/index.php/apps/files/', { waitUntil: 'load' });
	await seite.evaluate(async () => {
		const h = { requesttoken: OC.requestToken };
		const dav = OC.linkToRemoteBase('dav');
		await fetch(dav + '/files/admin/Office-Probe', { method: 'DELETE', headers: h });
		await fetch(dav + '/files/admin/Office-Probe', { method: 'MKCOL', headers: h });
	});

	// Neu > Dokument
	await seite.goto(BASIS + '/index.php/apps/files/?dir=%2FOffice-Probe', { waitUntil: 'load' });
	await seite.waitForTimeout(1500);
	await colorboxZu(seite);
	// Redesign: eigener Knopf "Neu" (#oco-upload-button) öffnet das Neu-Menü des Kerns
	await seite.click('#oco-upload-button');
	await seite.waitForTimeout(500);
	const angebot = await seite.evaluate(() => ['add-odt', 'add-ods', 'add-odp', 'add-odg']
		.filter((a) => document.querySelector('a.menuitem[data-action="' + a + '"]')));
	pruefe('Neu-Menü bietet Dokument, Tabelle, Präsentation, Zeichnung', angebot.length === 4, angebot.join(','));
	const eintrag = seite.locator('a.menuitem[data-action="add-odt"]').first();
	if (await eintrag.count()) {
		await eintrag.click();
		const eingabe = seite.locator('.filenameform input, .newFileMenu input[type=text]').first();
		await eingabe.waitFor({ timeout: 10000 }).catch(() => {});
		await eingabe.fill('probe.odt');
		await eingabe.press('Enter');
	}
	// Das Plugin legt die Datei nur an und fügt sie in die Liste ein (öffnet nicht)
	const zeile = seite.locator('#fileList tr[data-file="probe.odt"]');
	await zeile.waitFor({ timeout: 30000 }).catch(() => {});
	pruefe('Neu > Dokument legt probe.odt in der Liste an', await zeile.count() === 1);

	// Klick auf die Datei öffnet den Editor (Standard: neuer Tab)
	await colorboxZu(seite);
	let editor = null;
	if (await zeile.count()) {
		editor = await editorSeite(seite, () => zeile.locator('.nametext').first().click(), /richdocuments\/documents\.php/);
	}
	pruefe('Klick auf das Dokument öffnet den Editor', !!editor, editor ? editor.url() : seite.url());

	const rahmen = editor ? await editorRahmen(editor) : null;
	const geladen = rahmen ? await warteAufNachricht(editor, '^App_LoadingStatus:Document_Loaded') : false;
	pruefe('Collabora lädt das Dokument', geladen, editor ? JSON.stringify(await editor.evaluate(() => window.__cool).catch(() => null)) : '');

	if (geladen) {
		// Editor unter der Kopfleiste und rechts der Seitenleiste, nichts verdeckt
		const lage = await editor.evaluate(() => {
			const r = document.getElementById('loleafletframe').getBoundingClientRect();
			const kopf = document.getElementById('header');
			const leiste = document.getElementById('oco-sidebar');
			const k = kopf ? kopf.getBoundingClientRect() : null;
			const l = leiste ? leiste.getBoundingClientRect() : null;
			return {
				x: Math.round(r.x), y: Math.round(r.y), breite: Math.round(r.width), hoehe: Math.round(r.height),
				kopfUnten: k ? Math.round(k.bottom) : 0, leisteRechts: l && l.width ? Math.round(l.right) : 0,
				fensterB: window.innerWidth, fensterH: window.innerHeight,
			};
		});
		pruefe('Editor liegt unter der Kopfleiste und rechts der Seitenleiste', lage.y >= lage.kopfUnten - 1 && lage.x >= lage.leisteRechts - 1
			&& lage.x + lage.breite <= lage.fensterB + 1 && lage.y + lage.hoehe <= lage.fensterH + 1 && lage.hoehe > 600 && lage.breite > 900, JSON.stringify(lage));
		const akzent = await editor.evaluate(() => {
			const f = document.querySelector('#loleafletform input[name=css_variables]');
			return f ? f.value : '';
		});
		pruefe('Collabora-Akzentfarbe aus dem Token (nicht Weiß)', /--co-primary-element=#00806b/i.test(akzent), akzent);

		// Text einfügen und speichern (WOPI-Nachrichten wie ein Host)
		await editor.evaluate((text) => {
			const f = document.getElementById('loleafletframe').contentWindow;
			const senden = (id, werte) => f.postMessage(JSON.stringify({ MessageId: id, SendTime: Date.now(), Values: werte }), '*');
			senden('Send_UNO_Command', { Command: '.uno:InsertText', Args: { Text: { type: 'string', value: text } } });
			setTimeout(() => senden('Action_Save', { DontTerminateEdit: true, DontSaveIfUnmodified: false, Notify: true }), 1500);
		}, TEXT);
		const gespeichert = await warteAufNachricht(editor, '^Action_Save_Resp', 60000);
		await editor.waitForTimeout(2000);
		let inhalt = '';
		try {
			inhalt = execSync(DATEI_PRUEFEN, { encoding: 'utf8', timeout: 60000 });
		} catch (e) {
			inhalt = 'Fehler: ' + e.message;
		}
		pruefe('Speichern: Text steht in der Datei', gespeichert && inhalt.indexOf(TEXT) !== -1, 'Action_Save_Resp=' + gespeichert + ', content.xml enthält Text: ' + (inhalt.indexOf(TEXT) !== -1));

		// "Speichern unter": Collabora meldet UI_SaveAs, der Host fragt nach dem Namen
		await rahmen.evaluate(() => window.parent.postMessage(JSON.stringify({ MessageId: 'UI_SaveAs', SendTime: Date.now(), Values: {} }), '*'));
		await editor.waitForFunction(() => Array.from(document.querySelectorAll('.oc-dialog')).some((d) => d.getClientRects().length > 0), null, { timeout: 10000 }).catch(() => {});
		const speichernUnter = await editor.evaluate(() => {
			const d = Array.from(document.querySelectorAll('.oc-dialog')).find((x) => x.getClientRects().length > 0);
			if (!d) {
				return null;
			}
			const knoepfe = Array.from(d.querySelectorAll('.oc-dialog-buttonrow button')).map((b) => (b.classList.contains('primary') ? '*' : '') + b.textContent.trim());
			const kreuz = d.querySelector('.oc-dialog-close');
			return { knoepfe, kreuz: kreuz ? kreuz.textContent.trim() : null };
		});
		pruefe('Speichern unter: "Speichern" steht auf dem Bestätigen-Knopf', !!speichernUnter && speichernUnter.knoepfe.indexOf('*Speichern') !== -1 && speichernUnter.knoepfe.indexOf('Abbrechen') !== -1 && speichernUnter.kreuz !== 'Abbrechen', JSON.stringify(speichernUnter));
		if (speichernUnter) {
			await editor.locator('.oc-dialog:visible input[type=text]').first().fill('kopie.odt').catch(() => {});
			await editor.locator('.oc-dialog:visible .oc-dialog-buttonrow button.primary').first().click({ timeout: 5000 }).catch(() => {});
			let kopie = 0;
			for (let i = 0; i < 30 && kopie !== 207; i++) {
				await editor.waitForTimeout(1000);
				kopie = await seite.evaluate(async () => (await fetch(OC.linkToRemoteBase('dav') + '/files/admin/Office-Probe/kopie.odt', { method: 'PROPFIND', headers: { requesttoken: OC.requestToken, Depth: '0' } })).status);
			}
			pruefe('Speichern unter legt die Kopie an', kopie === 207, kopie);
		}

		// Schließen (wie der Schließen-Knopf von Collabora)
		await Promise.all([
			editor.waitForURL(/apps\/files/, { timeout: 30000 }).catch(() => {}),
			rahmen.evaluate(() => window.parent.postMessage(JSON.stringify({ MessageId: 'UI_Close', SendTime: Date.now(), Values: {} }), '*')),
		]);
		pruefe('Schließen führt zurück in den Ordner', /apps\/files\/?\?dir=%2FOffice-Probe|apps\/files\/?\?dir=\/Office-Probe/.test(editor.url()), editor.url());
		if (editor !== seite) {
			await editor.close();
		}
	}

	// Wiederöffnen der gespeicherten Datei
	await seite.goto(BASIS + '/index.php/apps/files/?dir=%2FOffice-Probe', { waitUntil: 'load' });
	await seite.waitForSelector('#fileList tr[data-file="probe.odt"]', { timeout: 30000 }).catch(() => {});
	await colorboxZu(seite);
	if (await seite.locator('#fileList tr[data-file="probe.odt"]').count()) {
		const wiederSeite = await editorSeite(seite, () => seite.locator('#fileList tr[data-file="probe.odt"] .nametext').first().click(), /richdocuments\/documents\.php/);
		const wieder = !!wiederSeite && !!(await editorRahmen(wiederSeite)) && await warteAufNachricht(wiederSeite, '^App_LoadingStatus:Document_Loaded');
		pruefe('bestehende Datei öffnet im Editor', wieder, wiederSeite ? wiederSeite.url() : seite.url());
		if (wiederSeite && wiederSeite !== seite) {
			await wiederSeite.close();
		}
	} else {
		pruefe('bestehende Datei öffnet im Editor', false, 'probe.odt fehlt in der Liste');
	}

	// öffentlicher Ordner-Link mit Bearbeiten
	await seite.goto(BASIS + '/index.php/apps/files/', { waitUntil: 'load' });
	const link = await seite.evaluate(async () => {
		const r = await fetch(OC.linkToOCS('apps/files_sharing/api/v1', 2) + 'shares?format=json', {
			method: 'POST',
			headers: { requesttoken: OC.requestToken, 'OCS-APIRequest': 'true', 'Content-Type': 'application/x-www-form-urlencoded' },
			body: new URLSearchParams({ path: '/Office-Probe', shareType: '3', permissions: '15' }),
		});
		const j = await r.json();
		return { id: j.ocs.data && j.ocs.data.id, token: j.ocs.data && j.ocs.data.token };
	});
	if (link.token) {
		const gast = await browser.newContext({ locale: 'de-DE', viewport: { width: 1440, height: 900 } });
		await gast.addInitScript(MITSCHNITT);
		const g = await gast.newPage();
		await g.goto(BASIS + '/index.php/s/' + link.token, { waitUntil: 'load' });
		await g.waitForSelector('#fileList tr[data-file="probe.odt"]', { timeout: 30000 }).catch(() => {});
		if (await g.locator('#fileList tr[data-file="probe.odt"]').count()) {
			const ge = await editorSeite(g, () => g.locator('#fileList tr[data-file="probe.odt"] .nametext').first().click(), /richdocuments\/documents\.php\/public/);
			if (ge) {
				// Gäste werden eventuell nach einem Namen gefragt
				const name = ge.locator('#guestName, input[name=guestName]');
				if (await name.count()) {
					await name.fill('Probe-Gast');
					await name.press('Enter');
				}
			}
			const ok = !!ge && !!(await editorRahmen(ge)) && await warteAufNachricht(ge, '^App_LoadingStatus:Document_Loaded');
			pruefe('öffentlicher Ordner-Link: Dokument öffnet im Editor', ok, ge ? ge.url() : g.url());
		} else {
			pruefe('öffentlicher Ordner-Link: Dokument öffnet im Editor', false, 'probe.odt fehlt auf der Linkseite');
		}
		await gast.close();
	}

	// Office-Übersicht (Navigationseintrag "Office")
	await seite.goto(BASIS + '/index.php/apps/files/', { waitUntil: 'load' });
	const navigation = await seite.evaluate(() => document.querySelectorAll('a[href*="richdocuments/documents.php/index"]').length);
	pruefe('Navigation: Eintrag Office vorhanden', navigation > 0, navigation);
	// genug Dokumente, dass die Übersicht über einen Bildschirm hinausgeht
	await seite.evaluate(async () => {
		const h = { requesttoken: OC.requestToken, 'Content-Type': 'application/x-www-form-urlencoded' };
		for (let i = 1; i <= 22; i++) {
			await fetch(OC.generateUrl('apps/richdocuments/ajax/documents/create'), {
				method: 'POST', headers: h,
				body: new URLSearchParams({ mimetype: 'application/vnd.oasis.opendocument.text', filename: 'viele-' + String(i).padStart(2, '0') + '.odt', dir: '/Office-Probe' }),
			});
		}
	});
	await seite.goto(BASIS + '/index.php/apps/richdocuments/documents.php/index', { waitUntil: 'load' });
	await seite.waitForSelector('.documentslist li.document:not(.template) a', { timeout: 30000 }).catch(() => {});
	await seite.waitForTimeout(1000);
	const vorRollen = await seite.evaluate(() => {
		const k = Array.from(document.querySelectorAll('.documentslist li.document:not(.template)')).filter((l) => l.getClientRects().length);
		return { kacheln: k.length, letzteUnten: k.length ? Math.round(k[k.length - 1].getBoundingClientRect().bottom) : 0, fenster: window.innerHeight };
	});
	await seite.mouse.move(800, 500);
	for (let i = 0; i < 6; i++) {
		await seite.mouse.wheel(0, 800);
		await seite.waitForTimeout(150);
	}
	const nachRollen = await seite.evaluate(() => {
		const k = Array.from(document.querySelectorAll('.documentslist li.document:not(.template)')).filter((l) => l.getClientRects().length);
		const r = k.length ? k[k.length - 1].getBoundingClientRect() : null;
		return { letzteOben: r ? Math.round(r.top) : null, letzteUnten: r ? Math.round(r.bottom) : null, fenster: window.innerHeight };
	});
	pruefe('Office-Übersicht rollt: letzte Kachel erreichbar', vorRollen.letzteUnten > vorRollen.fenster && nachRollen.letzteUnten !== null && nachRollen.letzteUnten <= nachRollen.fenster && nachRollen.letzteOben >= 0,
		JSON.stringify({ vorRollen, nachRollen }));
	await seite.waitForSelector('.documentslist li.document:not(.template) a', { timeout: 30000 }).catch(() => {});
	const liste = await seite.evaluate(() => Array.from(document.querySelectorAll('.documentslist li.document:not(.template)'))
		.filter((li) => li.getClientRects().length > 0)
		.map((li) => li.textContent.trim() + ' ' + (li.querySelector('a').getAttribute('original-title') || '')));
	pruefe('Office-Übersicht listet probe.odt', liste.some((x) => /probe\.odt/.test(x)), liste.length + ' Einträge');
	const hochladen = await seite.evaluate(() => (document.getElementById('upload') || {}).title || '');
	pruefe('Office-Übersicht: Hochladen nennt die Größengrenze', /\(max\. \d/.test(hochladen), hochladen);
	let tabellenPfad = null;
	const tabelle = await editorSeite(seite, () => seite.locator('.add-document .add-ods').first().click(), /richdocuments\/documents\.php\/index\?fileId=/);
	const tabelleOk = !!tabelle && !!(await editorRahmen(tabelle)) && await warteAufNachricht(tabelle, '^App_LoadingStatus:Document_Loaded');
	if (tabelle) {
		tabellenPfad = await tabelle.evaluate(() => window.rd_path).catch(() => null);
	}
	pruefe('Office-Übersicht: Neue Tabelle öffnet den Editor', tabelleOk, (tabelle ? tabelle.url() : seite.url()) + ' ' + tabellenPfad);
	if (tabelle && tabelle !== seite) {
		await tabelle.close();
	}

	// Zotero: Freischaltung in der Verwaltung zeigt das Schlüsselfeld in den persönlichen Einstellungen
	await seite.goto(BASIS + '/index.php/settings/admin?sectionid=additional', { waitUntil: 'load' });
	const zoteroVorher = await seite.isChecked('#enable_zotero-richdocuments').catch(() => null);
	pruefe('Verwaltung: keine Verweise auf fremde Dokumentation', await seite.evaluate(() => Array.from(document.querySelectorAll('#richdocuments a[href]'))
		.filter((a) => /owncloud\.(org|com)|github\.com\/owncloud/.test(a.href)).length) === 0);
	if (zoteroVorher === false) {
		await Promise.all([
			seite.waitForResponse((r) => /setAdminSettings/.test(r.url()), { timeout: 15000 }).catch(() => {}),
			seite.check('#enable_zotero-richdocuments'),
		]);
	}
	await seite.goto(BASIS + '/index.php/settings/personal?sectionid=additional', { waitUntil: 'load' });
	const zoteroFeld = await seite.evaluate(() => {
		const f = document.getElementById('change_zotero_key-richdocuments');
		return !!f && f.getClientRects().length > 0;
	});
	pruefe('Persönlich: Zotero-Schlüsselfeld sichtbar, wenn freigeschaltet', zoteroFeld);
	if (zoteroFeld) {
		await seite.fill('#change_zotero_key-richdocuments', '');
		await Promise.all([
			seite.waitForResponse((r) => /setPersonalSettings/.test(r.url()), { timeout: 15000 }).then((r) => r.status()).catch(() => 0),
			seite.click('#save_zotero_key-richdocuments'),
		]).then(([status]) => pruefe('Persönlich: Zotero-Schlüssel speichern', status === 200, status));
	}
	if (zoteroVorher === false) {
		await seite.goto(BASIS + '/index.php/settings/admin?sectionid=additional', { waitUntil: 'load' });
		await Promise.all([
			seite.waitForResponse((r) => /setAdminSettings/.test(r.url()), { timeout: 15000 }).catch(() => {}),
			seite.uncheck('#enable_zotero-richdocuments'),
		]);
	}

	// Öffnen von der Startseite: Link openfile=…&back=dashboard, mit aktivem
	// Popup-Blocker wie im echten Browser (Playwright schaltet ihn sonst ab)
	{
		const echt = await chromium.launch({ ignoreDefaultArgs: ['--disable-popup-blocking'] });
		const k = await echt.newContext({ locale: 'de-DE', viewport: { width: 1440, height: 900 } });
		await k.addInitScript(MITSCHNITT);
		const s = await k.newPage();
		await s.goto(BASIS + '/index.php/login', { waitUntil: 'domcontentloaded' });
		await s.fill('#user', 'admin');
		await s.fill('#password', PASSWORT);
		await Promise.all([s.waitForNavigation({ timeout: 60000 }).catch(() => {}), s.click('#submit, button[type=submit], input[type=submit]')]);
		const ziel = await editorSeite(s, () => s.goto(BASIS + '/index.php/apps/files/?dir=%2FOffice-Probe&scrollto=probe.odt&openfile=probe.odt&back=dashboard', { waitUntil: 'load' }), /richdocuments\/documents\.php/);
		const r = ziel ? await editorRahmen(ziel) : null;
		const offen = r ? await warteAufNachricht(ziel, '^App_LoadingStatus:Document_Loaded') : false;
		pruefe('Startseite (openfile, Popup-Blocker aktiv): Editor öffnet', offen, ziel ? ziel.url().replace(BASIS, '') : s.url().replace(BASIS, ''));
		if (offen) {
			await Promise.all([
				ziel.waitForURL(/apps\/dashboard/, { timeout: 30000 }).catch(() => {}),
				r.evaluate(() => window.parent.postMessage(JSON.stringify({ MessageId: 'UI_Close', SendTime: Date.now(), Values: {} }), '*')),
			]);
			pruefe('Startseite: Schließen führt zurück zur Startseite', /apps\/dashboard/.test(ziel.url()), ziel.url().replace(BASIS, ''));
			const leiste = await ziel.evaluate(() => { const t = document.querySelector('.oco-tabbar'); return t ? getComputedStyle(t).display : 'fehlt'; });
			pruefe('Desktop: mobile Reiterleiste bleibt ausgeblendet', leiste === 'none' || leiste === 'fehlt', leiste);
		}
		await echt.close();
	}

	// Telefon: Editor endet über der Reiterleiste
	{
		const dateiId = await seite.evaluate(async () => {
			const r = await fetch(OC.linkToRemoteBase('dav') + '/files/admin/Office-Probe/probe.odt', {
				method: 'PROPFIND', headers: { requesttoken: OC.requestToken, Depth: '0', 'Content-Type': 'application/xml' },
				body: '<?xml version="1.0"?><d:propfind xmlns:d="DAV:" xmlns:oc="http://owncloud.org/ns"><d:prop><oc:fileid/></d:prop></d:propfind>',
			});
			return ((await r.text()).match(/<oc:fileid>(\d+)<\/oc:fileid>/) || [])[1];
		});
		const k = await browser.newContext({ locale: 'de-DE', viewport: { width: 390, height: 800 } });
		await k.addInitScript(MITSCHNITT);
		const s = await k.newPage();
		await s.goto(BASIS + '/index.php/login', { waitUntil: 'domcontentloaded' });
		await s.fill('#user', 'admin');
		await s.fill('#password', PASSWORT);
		await Promise.all([s.waitForNavigation({ timeout: 60000 }).catch(() => {}), s.click('#submit, button[type=submit], input[type=submit]')]);
		await s.goto(BASIS + '/index.php/apps/richdocuments/documents.php/index?fileId=' + dateiId + '&dir=%2FOffice-Probe', { waitUntil: 'load' });
		const r = await editorRahmen(s);
		const offen = r ? await warteAufNachricht(s, '^App_LoadingStatus:Document_Loaded') : false;
		const lage = await s.evaluate(() => {
			const f = document.getElementById('loleafletframe');
			const t = document.querySelector('.oco-tabbar');
			const fr = f ? f.getBoundingClientRect() : null;
			const tr = t && getComputedStyle(t).display !== 'none' ? t.getBoundingClientRect() : null;
			return { rahmenUnten: fr ? Math.round(fr.bottom) : null, rahmenOben: fr ? Math.round(fr.top) : null, leisteOben: tr ? Math.round(tr.top) : null, fenster: window.innerHeight };
		});
		pruefe('Telefon: Editor endet über der Reiterleiste', offen && lage.rahmenUnten !== null && (lage.leisteOben === null || lage.rahmenUnten <= lage.leisteOben + 1) && lage.rahmenOben >= 0, JSON.stringify(lage));
		await k.close();
	}

	// ohne eingerichteten Server: Meldung im Rahmen der Oberfläche statt Absturz
	const adresse = execSync(OCC + ' config:app:get richdocuments wopi_url', { encoding: 'utf8' }).trim();
	try {
		execSync(OCC + ' config:app:set richdocuments wopi_url --value=""', { encoding: 'utf8' });
		const antwort = await seite.goto(BASIS + '/index.php/apps/richdocuments/documents.php/index', { waitUntil: 'load' });
		const leer = await seite.evaluate(() => {
			const e = document.querySelector('#app-content-view[data-view="richdocuments-error"] #emptycontent');
			return {
				da: !!e && e.getClientRects().length > 0,
				text: e ? e.textContent.replace(/\s+/g, ' ').trim().slice(0, 160) : '',
				kopf: !!document.querySelector('#header, header'),
			};
		});
		pruefe('ohne Server: Hinweis im Rahmen der Oberfläche', antwort.status() === 200 && leer.da && leer.kopf && leer.text !== '', antwort.status() + ' ' + JSON.stringify(leer));
	} finally {
		execSync(OCC + ' config:app:set richdocuments wopi_url --value="' + adresse + '"', { encoding: 'utf8' });
	}

	// aufräumen
	await seite.goto(BASIS + '/index.php/apps/files/', { waitUntil: 'load' });
	await seite.evaluate(async ([id, pfad]) => {
		const h = { requesttoken: OC.requestToken };
		if (id) {
			await fetch(OC.linkToOCS('apps/files_sharing/api/v1', 2) + 'shares/' + id, { method: 'DELETE', headers: Object.assign({ 'OCS-APIRequest': 'true' }, h) });
		}
		await fetch(OC.linkToRemoteBase('dav') + '/files/admin/Office-Probe', { method: 'DELETE', headers: h });
		if (pfad) {
			const relativ = pfad.replace(/^\/admin\/files/, '');
			await fetch(OC.linkToRemoteBase('dav') + '/files/admin' + relativ.split('/').map(encodeURIComponent).join('/'), { method: 'DELETE', headers: h });
		}
	}, [link.id, tabellenPfad]);

	pruefe('keine Konsolenfehler (Server-Seite)', konsole.length === 0, konsole.join(' | '));
	await browser.close();

	let fehler = 0;
	for (const e of ergebnisse) {
		console.log((e.ok ? 'OK    ' : 'FEHL  ') + e.name + (e.zusatz ? '  (' + e.zusatz + ')' : ''));
		if (!e.ok) {
			fehler++;
		}
	}
	console.log('\n' + (ergebnisse.length - fehler) + '/' + ergebnisse.length + ' bestanden');
	process.exit(fehler === 0 ? 0 : 1);
})().catch((e) => {
	console.error(e);
	process.exit(1);
});
