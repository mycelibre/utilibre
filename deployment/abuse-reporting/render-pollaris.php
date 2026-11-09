<?php
// CLI-only, no kernel/database/session initialization. Render installed Twig
// with fictional context to verify the common template and actual home view.
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
require '/app/vendor/autoload.php';
$loader = new Twig\Loader\ChainLoader([
    new Twig\Loader\ArrayLoader([
        'shared-fixture.html.twig' => "{% extends 'base.html.twig' %}{% block body %}<h1>Fictional shared-poll layout check</h1><p>No accounts, polls or database are used in this template fixture.</p>{% endblock %}",
    ]),
    new Twig\Loader\FilesystemLoader('/app/templates'),
]);
$twig = new Twig\Environment($loader, ['cache' => false]);
$dictionary = [];
$twig->addFilter(new Twig\TwigFilter('trans', function ($value, $parameters = []) use (&$dictionary) {
    $text = $dictionary[$value] ?? $value;
    foreach ($parameters as $key => $parameter) $text = str_replace('{' . $key . '}', (string)$parameter, $text);
    return $text;
}));
$twig->addFilter(new Twig\TwigFilter('locale_to_bcp47', fn ($value) => $value));
$twig->addFunction(new Twig\TwigFunction('path', fn ($name) => '#fixture-' . rawurlencode($name)));
$twig->addFunction(new Twig\TwigFunction('icon', fn ($name) => ''));
$twig->addFunction(new Twig\TwigFunction('asset_exists', fn ($name) => false));
$twig->addFunction(new Twig\TwigFunction('asset', fn ($name) => '/' . $name));
$twig->addFunction(new Twig\TwigFunction('esbuild_asset', fn ($name) => '/assets/' . $name));
$app = new class {
    public string $locale = 'en';
    public function flashes(string $type): array { return []; }
};
$rendered = [];
foreach (['en', 'es'] as $language) {
    $app->locale = $language;
    $locale = $language === 'en' ? 'en_GB' : 'es';
    $dictionary = Symfony\Component\Yaml\Yaml::parseFile('/app/translations/messages+intl-icu.' . $locale . '.yaml');
    foreach (['home' => 'home/show.html.twig', 'shared-layout' => 'shared-fixture.html.twig'] as $surface => $template) {
        $rendered[$language . '-' . $surface] = $twig->render($template, ['app' => $app, 'appName' => 'Pollaris']);
    }
}
echo json_encode($rendered, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
