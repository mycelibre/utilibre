<?php
// Bounded parser checks, no HTTP listener, user data, or network.
declare(strict_types=1);
require '/app/vendor/autoload.php';
use Symfony\Component\HttpFoundation\HeaderUtils;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Yaml\Parser;
use Symfony\Component\Yaml\Exception\ParseException;
$fixed=$argv[1]==='fixed';$yaml=$argv[2]==='pollaris';$normal=0;
function same($a,$b): void {if($a!==$b)throw new RuntimeException('Unexpected parser result');}
foreach([
 ['foo bar',' ',['foo','bar']],
 ['foo   bar',' ',['foo','bar']],
 ["foo bar\tbaz","\t",['foo bar','baz']],
 ['foo "bar"',',',['foo bar']],
 ['"hello, world", next',',',['hello, world','next']],
 ['a b  c',',=',[['a b  c']]],
 ['da, en-gb;q=0.8',',;',[['da'],['en-gb','q=0.8']]],
] as [$text,$separators,$expected]){same(HeaderUtils::split($text,$separators),$expected);++$normal;}
$r=Request::create('/fictional','GET',[],[],[],['HTTP_CACHE_CONTROL'=>'max-age=60, private']);
same($r->headers->getCacheControlDirective('max-age'),'60');same($r->headers->hasCacheControlDirective('private'),true);++$normal;
// Small input + finite backtracking budget, avoiding a CPU-load reproduction.
ini_set('pcre.backtrack_limit','1000');
$value=HeaderUtils::split('a'.str_repeat(' ',25).',b',',=');
$error=preg_last_error();$headerSafe=$value===[['a'],['b']]&&$error===PREG_NO_ERROR;
same($headerSafe,$fixed);
if(!$fixed)same($error,PREG_BACKTRACK_LIMIT_ERROR);
$depthRejected=[];
if($yaml){
 foreach(['[','{'] as $symbol){
  try{(new Parser())->parse(str_repeat($symbol,129));throw new RuntimeException('Incomplete YAML accepted');}
  catch(ParseException $e){$depthRejected[]=str_contains($e->getMessage(),'Maximum nesting depth');}
 }
 same($depthRejected,[$fixed,$fixed]);
 $p=new Parser();same($p->parse('fictional: [uno, dos]'),['fictional'=>['uno','dos']]);++$normal;
 same($p->parse("name: Ficción\ncount: 3\n"),['name'=>'Ficción','count'=>3]);++$normal;
 $expected=[];for($i=1;$i<128;$i++)$expected=[$expected];
 same($p->parse(str_repeat('[',128).str_repeat(']',128)),$expected);++$normal;
 // A rejected parse must not poison the next valid parse.
 try{$p->parse(str_repeat('[',129));}catch(ParseException $e){}
 same($p->parse('ok: true'),['ok'=>true]);++$normal;
}
echo json_encode(['passed'=>true,'normalChecks'=>$normal,'headerSafe'=>$headerSafe,'headerError'=>$error,'yamlDepthRejected'=>$depthRejected,'network'=>'none'])."\n";
