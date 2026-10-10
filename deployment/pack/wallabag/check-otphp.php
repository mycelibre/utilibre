<?php
// Synthetic-only regression check. No application DB, network, real MFA secret,
// or wall-clock-sensitive expiry assertion is required for the security cases.
declare(strict_types=1);
require '/app/vendor/autoload.php';

use OTPHP\Factory;
use OTPHP\TOTP;
use ParagonIE\ConstantTime\Base32;
use Scheb\TwoFactorBundle\Security\TwoFactor\Provider\Google\GoogleAuthenticator;
use Scheb\TwoFactorBundle\Security\TwoFactor\Provider\Google\GoogleTotpFactory;
use Wallabag\Entity\User;

$failures = 0;
$checks = 0;
function check(string $name, callable $fn): void {
    global $failures, $checks;
    ++$checks;
    try { $fn(); echo "PASS $name\n"; }
    catch (Throwable $error) { ++$failures; echo "FAIL $name (" . get_class($error) . ")\n"; }
}
function same($expected, $actual): void {
    if ($expected !== $actual) throw new RuntimeException('Result mismatch');
}
function rejected(string $query): void {
    try { Factory::loadFromProvisioningUri('otpauth://totp/Fictional?'.$query); }
    catch (InvalidArgumentException $expected) { return; }
    throw new RuntimeException('Malformed provisioning URI accepted');
}

$secret = 'JBSWY3DPEHPK3PXP'; // Public, fictional fixture; never an account secret.
check('internal parameter map cannot be overwritten', function () use ($secret): void {
    $otp = Factory::loadFromProvisioningUri('otpauth://totp/Fictional?secret='.$secret.'&parameters[foo]=bar');
    same(6, $otp->getDigits()); same(30, $otp->getPeriod()); same($secret, $otp->getSecret());
    same(6, strlen($otp->at(1234567890)));
});
check('issuer flag cannot be mass-assigned', function () use ($secret): void {
    $otp = Factory::loadFromProvisioningUri('otpauth://totp/Fictional?secret='.$secret.'&issuer_included_as_parameter=notabool');
    same(false, $otp->isIssuerIncludedAsParameter());
    same(6, strlen($otp->at(1234567890)));
});
foreach (['50','1000000','0','-1','0.5','1e100'] as $digits) {
    check('reject digits '.$digits, fn() => rejected('secret='.$secret.'&digits='.$digits));
}
foreach (['secret[]=x', 'secret='.$secret.'&label[]=x', 'secret='.$secret.'&issuer[]=x'] as $query) {
    check('malformed parameter produces documented exception: '.$query, fn() => rejected($query));
}
check('valid provisioning URI round trip', function () use ($secret): void {
    $uri = 'otpauth://totp/Utilibre%3AFictional?issuer=Utilibre&secret='.$secret;
    $otp = Factory::loadFromProvisioningUri($uri);
    same($uri, $otp->getProvisioningUri());
    same($otp->at(1234567890), Factory::loadFromProvisioningUri($otp->getProvisioningUri())->at(1234567890));
});
check('RFC 6238 SHA1 published test vectors unchanged', function (): void {
    $otp = TOTP::create(Base32::encodeUpper('12345678901234567890'), 30, 'sha1', 8);
    foreach ([59=>'94287082',1111111109=>'07081804',1111111111=>'14050471',1234567890=>'89005924',2000000000=>'69279037',20000000000=>'65353130'] as $time=>$expected) same($expected, $otp->at($time));
});
check('native Scheb provider accepts correct code, rejects incorrect/expired codes', function () use ($secret): void {
    $user = new User(); $user->setUsername('fictional-test'); $user->setEmail('fictional@example.invalid');
    $user->setGoogleAuthenticatorSecret($secret); $user->setGoogleAuthenticator(true);
    $factory = new GoogleTotpFactory(null, 'Utilibre test', 6);
    $auth = new GoogleAuthenticator($factory, 1);
    $otp = $factory->createTotpForUser($user);
    $now = time(); $code = $otp->at($now);
    same(true, $auth->checkCode($user, $code));
    same(true, $auth->checkCode($user, substr($code,0,3).' '.substr($code,3)));
    same(false, $auth->checkCode($user, 'not-a-code'));
    same(false, $auth->checkCode($user, ''));
    same(false, $auth->checkCode($user, $otp->at($now-600)));
    same(true, str_starts_with($auth->getQRContent($user), 'otpauth://totp/'));
});
echo json_encode(['checks'=>$checks,'failed'=>$failures,'realAccountsTouched'=>false])."\n";
exit($failures ? 1 : 0);
