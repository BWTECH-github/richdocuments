<?php
/**
 * Modified by BW-Tech GmbH for owncloud.online PHP 8.4 compatibility.
 */
?>
<!DOCTYPE html>
<html class="ng-csp" lang="<?php p($_['language'] ?? 'en'); ?>">
<head>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title><?php p($l->t('Collabora Online')) ?></title>
</head>
<body>
	<main class="richdocuments-error" role="main">
		<h1><?php p($l->t('Collabora Online')) ?></h1>
		<ul>
			<?php foreach ($_['errors'] as $error): ?>
				<li>
					<strong><?php p($error['error']) ?></strong>
					<?php if (isset($error['hint']) && $error['hint']): ?>
						<p><?php p($error['hint']) ?></p>
					<?php endif; ?>
				</li>
			<?php endforeach; ?>
		</ul>
	</main>
</body>
</html>
