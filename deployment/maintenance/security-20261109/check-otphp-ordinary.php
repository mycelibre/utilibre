<?php
// Ordinary public test vectors and a synthetic in-memory user; no real MFA data.
declare(strict_types=1);
require '/app/vendor/autoload.php';
use OTPHP\Factory;
use OTPHP\TOTP;
use ParagonIE\ConstantTime\Base32;
use Scheb\TwoFactorBundle\Security\TwoFactor\Provider\Google\GoogleAuthenticator;
use Scheb\TwoFactorBundle\Security\TwoFactor\Provider\Google\GoogleTotpFactory;
use Wallabag\Entity\User;
function same($expected, $actual): void {
    if ($expected !== $actual) throw new RuntimeException('Ordinary OTP check failed');
}
$secret = 'JBSWY3DPEHPK3PXP'; // Public fictional fixture, never an account secret.
$uri = 'otpauth://totp/Utilibre%3AFictional?issuer=Utilibre&secret='.$secret;
$otp = Factory::loadFromProvisioningUri($uri);
same($uri, $otp->getProvisioningUri());
same($otp->at(1234567890), Factory::loadFromProvisioningUri($uri)->at(1234567890));
$otp = TOTP::create(Base32::encodeUpper('12345678901234567890'), 30, 'sha1', 8);
foreach ([59=>'94287082',1111111109=>'07081804',1111111111=>'14050471',1234567890=>'89005924',2000000000=>'69279037',20000000000=>'65353130'] as $time=>$expected) same($expected, $otp->at($time));
$user = new User();
$user->setUsername('fictional-test'); $user->setEmail('fictional@example.invalid');
$user->setGoogleAuthenticatorSecret($secret); $user->setGoogleAuthenticator(true);
$factory = new GoogleTotpFactory(null, 'Utilibre test', 6);
$auth = new GoogleAuthenticator($factory, 1);
$otp = $factory->createTotpForUser($user); $now = time(); $code = $otp->at($now);
same(true, $auth->checkCode($user, $code));
same(true, $auth->checkCode($user, substr($code,0,3).' '.substr($code,3)));
same(false, $auth->checkCode($user, 'not-a-code'));
same(false, $auth->checkCode($user, ''));
same(false, $auth->checkCode($user, $otp->at($now-600)));
same(true, str_starts_with($auth->getQRContent($user), 'otpauth://totp/'));
echo json_encode(['checks'=>14,'failed'=>0,'realAccountsTouched'=>false,'ordinaryOnly'=>true])."\n";
