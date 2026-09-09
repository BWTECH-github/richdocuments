<?php
/**
 * Fehlerausgabe INNERHALB der Oberflaeche (renderAs 'user').
 *
 * templates/error.php ist ein vollstaendiges HTML-Dokument fuer die
 * oeffentlichen Routen, die ohne Sitzung aufgerufen werden. Wer dagegen
 * angemeldet ueber das Menue kommt, soll die Meldung nicht als nackte Seite in
 * der Standardschrift des Browsers sehen, sondern im gewohnten Rahmen.
 *
 * Der Leerzustand steht in einem #app-content-view ausserhalb der Dateiansicht:
 * so bekommt er die mittige Anordnung des Entwurfs, aber nicht dessen
 * gestrichelten Rahmen - der ist dort die Ablageflaeche fuer Dateien und waere
 * hier eine falsche Aufforderung.
 *
 * Modified by BW-Tech GmbH for owncloud.online.
 */
?>
<div id="app-content">
	<div id="app-content-view" data-view="richdocuments-error">
		<div id="emptycontent" class="emptycontent">
			<div class="icon-error"></div>
			<?php foreach ($_['errors'] as $error): ?>
				<h2><?php p($error['error']); ?></h2>
				<?php if (isset($error['hint']) && $error['hint']): ?>
					<p><?php p($error['hint']); ?></p>
				<?php endif; ?>
			<?php endforeach; ?>
		</div>
	</div>
</div>
