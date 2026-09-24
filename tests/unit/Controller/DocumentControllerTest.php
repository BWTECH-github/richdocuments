<?php
/**
 * ownCloud - Richdocuments App
 *
 * @author Victor Dubiniuk
 * @copyright 2014 Victor Dubiniuk victor.dubiniuk@gmail.com
 *
 * This file is licensed under the Affero General Public License version 3 or
 * later.
 */
namespace OCA\Richdocuments\Tests\Controller;

use OCA\Richdocuments\Controller\DocumentController;
use OCA\Richdocuments\DocumentService;
use OCA\Richdocuments\DiscoveryService;
use OCA\Richdocuments\FederationService;
use OCP\App\IAppManager;
use OCP\IGroupManager;
use OCP\INavigationManager;
use OCP\IPreview;
use OCP\IRequest;
use OCP\IConfig;
use OCA\Richdocuments\AppConfig;
use OCP\IL10N;
use OCP\ICacheFactory;
use OCP\ILogger;
use OCP\IUserManager;

/**
 * Class DocumentControllerTest
 *
 * @group DB
 *
 * @package OCA\Richdocuments\Tests\Controller
 */
class DocumentControllerTest extends \Test\TestCase {
	/**
	 * @var IRequest
	 */
	private $request;
	/**
	 * @var IConfig
	 */
	private $settings;
	/**
	 * @var AppConfig
	 */
	private $appConfig;
	/**
	 * @var IL10N
	 */
	private $l10n;
	/**
	 * @var ICacheFactory
	 */
	private $cache;
	/**
	 * @var ILogger
	 */
	private $logger;
	/**
	 * @var DocumentService
	 */
	private $documentService;
	/**
	 * @var DiscoveryService
	 */
	private $discoveryService;
	/**
	 * @var IAppManager
	 */
	private $appManager;
	/**
	 * @var IGroupManager
	 */
	private $groupManager;
	/**
	 * @var IUserManager
	 */
	private $userManager;
	/**
	 * @var IPreview
	 */
	private $previewManager;
	/**
	 * @var INavigationManager
	 */
	private $navigationManager;
	/**
	 * @var FederationService
	 */
	private $federationService;
	/**
	 * @var DocumentController
	 */
	private $documentController;

	public function setUp(): void {
		parent::setUp();
		$this->request = $this->createMock(IRequest::class);
		$this->settings = $this->createMock(IConfig::class);
		$this->appConfig = $this->createMock(AppConfig::class);
		$this->l10n = $this->createMock(IL10N::class);
		$this->cache = $this->createMock(ICacheFactory::class);
		$this->logger = $this->createMock(ILogger::class);
		$this->documentService = $this->createMock(DocumentService::class);
		$this->discoveryService = $this->createMock(DiscoveryService::class);
		$this->appManager = $this->createMock(IAppManager::class);
		$this->groupManager = $this->createMock(IGroupManager::class);
		$this->userManager = $this->createMock(IUserManager::class);
		$this->previewManager = $this->createMock(IPreview::class);
		$this->navigationManager = $this->createMock(INavigationManager::class);
		$this->federationService = $this->createMock(FederationService::class);

		$this->documentController = new DocumentController(
			'richdocuments',
			$this->request,
			$this->settings,
			$this->appConfig,
			$this->l10n,
			$this->logger,
			$this->documentService,
			$this->discoveryService,
			$this->appManager,
			$this->groupManager,
			$this->userManager,
			$this->previewManager,
			$this->navigationManager,
			$this->federationService
		);
	}

	public function testConstructor() {
		$this->assertInstanceOf(DocumentController::class, $this->documentController);
	}

	/**
	 * Tests different filenames on create
	 *
	 * @dataProvider invalidFilenameProvider
	 * @param $filename string
	 */
	public function testCreateWithInvalidFilename(string $filename) {
		$dir = "/";
		$mimetype = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

		$this->request
			->expects($this->exactly(3))
			->method('getParam')
			->withConsecutive(
				['mimetype'],
				['filename'],
				['dir'],
			)
			->willReturnOnConsecutiveCalls(
				$mimetype,
				$filename,
				$dir,
			);

		$this->assertEquals(
			$this->documentController->create(),
			[
			'status' => 'error',
			'message' => $this->l10n->t('Invalid filename'),
		]
		);
	}

	public function invalidFilenameProvider(): array {
		return [
			["filename with\t tab"],
			["filename with / slash"]
		];
	}

	public function wopiUrlErrorProvider(): array {
		return [
			// kein Server eingerichtet: eigene Meldung statt "Ungültige URL"
			['', 'Collabora Online: no server configured.'],
			['   ', 'Collabora Online: no server configured.'],
			// eingetragen, aber unbrauchbar: die bisherige Meldung bleibt
			['office.example', 'Collabora Online: Invalid URL "%s".'],
		];
	}

	/**
	 * Office-Übersicht ohne (brauchbaren) Collabora-Server: eine Meldung statt
	 * eines Fehlers.
	 *
	 * @dataProvider wopiUrlErrorProvider
	 */
	public function testIndexWithUnusableWopiUrlShowsError(string $wopiUrl, string $expectedError) {
		$this->l10n->method('t')->willReturnArgument(0);
		$this->discoveryService->method('getWopiUrl')->willReturn($wopiUrl);

		$response = $this->documentController->index(null, '/');

		$this->assertInstanceOf(\OCP\AppFramework\Http\TemplateResponse::class, $response);
		$this->assertSame('error', $response->getTemplateName());
		$this->assertSame($expectedError, $response->getParams()['errors'][0]['error']);
	}

	/**
	 * Office-Übersicht ohne Dokument: die Vorlage liest die Dokumentschlüssel
	 * trotzdem (sonst "Undefined array key" und ein leerer Upload-Hinweis).
	 */
	public function testIndexWithoutDocumentProvidesTemplateKeys() {
		// Der Kern richtet das Dateisystem vor jedem Web-Aufruf ein
		// (OC_Util::setupFS in base.php); der Größenhinweis braucht es.
		$uid = 'richdocuments-overview-test';
		$userManager = \OC::$server->getUserManager();
		$user = $userManager->get($uid) ?? $userManager->createUser($uid, 'Overview-Test-2026!');
		self::loginAsUser($uid);
		try {
			$this->discoveryService->method('getWopiUrl')->willReturn('https://office.example:9980');

			$response = $this->documentController->index(null, '/');

			$this->assertInstanceOf(\OCP\AppFramework\Http\TemplateResponse::class, $response);
			$this->assertSame('documents', $response->getTemplateName());
			$params = $response->getParams();
			foreach (['title', 'fileId', 'version', 'sessionId', 'access_token', 'access_token_ttl', 'urlsrc', 'path', 'uploadMaxHumanFilesize'] as $key) {
				$this->assertArrayHasKey($key, $params);
			}
			$this->assertNotSame('', $params['uploadMaxHumanFilesize']);
		} finally {
			self::logout();
			$user->delete();
		}
	}
}
