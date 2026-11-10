<?php
// Ordinary local expressions only; no crash or excessive-depth reproduction.
declare(strict_types=1);
require '/app/vendor/autoload.php';
use Symfony\Component\ExpressionLanguage\ExpressionLanguage;
use Symfony\Component\ExpressionLanguage\SyntaxError;
$language = new ExpressionLanguage();
$checks = 0;
$check = function ($condition) use (&$checks) {
    if (!$condition) { throw new RuntimeException('Ordinary expression compatibility check '.($checks + 1).' failed'); }
    ++$checks;
};
$cases = [
    ['1 + 2 * 3', [], 7],
    ['(1 + 2) * 3', [], 9],
    ['-5 + 8', [], 3],
    ['not false and true', [], true],
    ['price * count', ['price' => 4, 'count' => 3], 12],
    ['"hello" ~ " world"', [], 'hello world'],
    ['[1, 2, 3][1]', [], 2],
    ['{"kind": "fictional"}["kind"]', [], 'fictional'],
    ['score > 5 ? "yes" : "no"', ['score' => 6], 'yes'],
    ['2 in [1, 2, 3]', [], true],
    ['name matches "/^fic/"', ['name' => 'fictional'], 1],
    ['value == null', ['value' => null], true],
];
foreach ($cases as [$text, $values, $expected]) {
    $check($language->evaluate($text, $values) === $expected);
    $language->lint($text, array_keys($values));
}
$parsed = $language->parse('price * count', ['price', 'count']);
$check($language->evaluate($parsed, ['price' => 2, 'count' => 4]) === 8);
$check($language->evaluate(unserialize(serialize($parsed)), ['price' => 3, 'count' => 4]) === 12);
$check(str_contains($language->compile('price + 1', ['price']), '$price'));
$object = (object) ['label' => 'fictional'];
$check($language->evaluate('item.label', ['item' => $object]) === 'fictional');
$rejected = false;
try { $language->lint('1 +', []); } catch (SyntaxError $error) { $rejected = true; }
$check($rejected);
$check($language->evaluate('2 + 2', []) === 4);
$file = '/app/vendor/symfony/expression-language/Parser.php';
$reflection = new ReflectionClass(Symfony\Component\ExpressionLanguage\Parser::class);
echo json_encode(['passed' => true, 'normalChecks' => $checks,
    'parserSha256' => hash_file('sha256', $file),
    'hasDepthGuard' => $reflection->hasConstant('MAX_NESTING_LEVEL') && $reflection->getConstant('MAX_NESTING_LEVEL') === 256 && $reflection->hasMethod('checkDepth'),
    'network' => 'none', 'excessiveDepthReproduction' => false], JSON_THROW_ON_ERROR)."\n";
