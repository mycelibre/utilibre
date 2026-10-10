<?php
// Run only with the isolated synthetic SQLite fixture database, never production.
namespace Wallabag\Tests\Functional\Controller;

use OTPHP\TOTP;
use Wallabag\Entity\User;
use Wallabag\Tests\Functional\WallabagTestCase;

class MfaRepairTest extends WallabagTestCase
{
    public function testPasswordAloneAndInvalidChallengesCannotAccessPrivateContent(): void
    {
        $client = $this->getTestClient();
        $client->followRedirects();
        $em = $this->getEntityManager();
        $user = $em->getRepository(User::class)->findOneByUsername('admin');
        $secret = 'JBSWY3DPEHPK3PXP'; // Public fictional fixture.
        $user->setGoogleAuthenticatorSecret($secret);
        $user->setGoogleAuthenticator(true);
        $user->setBackupCodes([]);
        $em->flush();

        $this->logInAsUsingHttp('admin');
        $crawler = $client->request('GET', '/config');
        $this->assertCount(1, $crawler->filter('#_auth_code'));
        $this->assertCount(1, $crawler->filter('input[name="_csrf_token"]'));
        $this->assertStringNotContainsString('config.form_feed.description', $client->getResponse()->getContent());

        $form = $crawler->filter('button[type=submit]')->form();
        $crawler = $client->submit($form, ['_auth_code' => 'not-a-code']);
        $this->assertCount(1, $crawler->filter('#_auth_code'), 'After wrong code: '.$client->getResponse()->getStatusCode().' '.$client->getRequest()->getPathInfo().' '.$crawler->filter('title')->text());

        // Correct OTP without a valid CSRF token must also fail closed.
        $form = $crawler->filter('button[type=submit]')->form();
        $crawler = $client->submit($form, [
            '_auth_code' => TOTP::create($secret)->now(),
            '_csrf_token' => 'invalid-synthetic-token',
        ]);
        $this->assertCount(1, $crawler->filter('#_auth_code'));
        $this->assertStringNotContainsString('config.form_feed.description', $client->getResponse()->getContent());

        $form = $crawler->filter('button[type=submit]')->form();
        $client->submit($form, ['_auth_code' => TOTP::create($secret)->now()]);
        $crawler = $client->request('GET', '/config');
        $this->assertCount(0, $crawler->filter('#_auth_code'));
        $this->assertStringContainsString('config.form_feed.description', $client->getResponse()->getContent());

        $client->request('GET', '/logout');
        $crawler = $client->request('GET', '/config');
        $this->assertCount(1, $crawler->filter('input[name="_password"]'));
    }
}
