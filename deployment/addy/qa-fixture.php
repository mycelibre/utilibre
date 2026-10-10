<?php
// Disposable fictional fixture only; native models without notification events.
require '/var/www/anonaddy/vendor/autoload.php';
$app=require '/var/www/anonaddy/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
if(App\Models\Username::where('username','utilibreqa1009')->exists())throw new RuntimeException('Owned fixture already exists; inspect before repeating');
$id=(string)Ramsey\Uuid\Uuid::uuid4();$password=bin2hex(random_bytes(24));
$r=App\Models\Recipient::create(['user_id'=>$id,'email'=>'fictional@example.invalid','email_verified_at'=>now(),'active'=>true]);
$n=App\Models\Username::create(['user_id'=>$id,'username'=>'utilibreqa1009']);
$u=App\Models\User::create(['id'=>$id,'default_username_id'=>$n->id,'default_recipient_id'=>$r->id,'password'=>Illuminate\Support\Facades\Hash::make($password),'two_factor_secret'=>app('pragmarx.google2fa')->generateSecretKey()]);
echo json_encode(['id'=>$id,'username'=>'utilibreqa1009','password'=>$password]);
