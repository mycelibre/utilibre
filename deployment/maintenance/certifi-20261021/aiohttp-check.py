"""Small native HTTP/WS and form-limit checks; isolated loopback, no public requests."""
import asyncio, importlib.metadata as md, json, sys
from urllib.parse import urlencode
from aiohttp import web, ClientSession, ClientTimeout, WSMsgType
from yarl import URL

version = sys.argv[1]
assert md.version('aiohttp') == version
assert URL('https://example.invalid/a%20b?q=hola').path == '/a b'
assert URL('https://example.invalid/').with_query({'q':'acción ñ'}).query['q'] == 'acción ñ'

async def main():
    async def echo(request):
        return web.json_response(await request.json())
    async def form(request):
        fields = await request.post()
        return web.json_response({'count':len(fields), 'first':fields.get('field0')})
    async def ws(request):
        response = web.WebSocketResponse(compress=True)
        await response.prepare(request)
        async for message in response:
            if message.type == WSMsgType.TEXT:
                await response.send_str(message.data)
            elif message.type == WSMsgType.ERROR:
                break
        return response
    app = web.Application()
    app.add_routes([web.post('/echo',echo),web.post('/form',form),web.get('/ws',ws)])
    runner = web.AppRunner(app, access_log=None)
    await runner.setup()
    site = web.TCPSite(runner, '127.0.0.1', 0)
    await site.start()
    origin = 'http://127.0.0.1:'+str(site._server.sockets[0].getsockname()[1])
    try:
        async with ClientSession(timeout=ClientTimeout(total=5)) as client:
            async with client.post(origin+'/echo', json={'fictional':'acción ñ'}) as response:
                assert response.status == 200 and await response.json() == {'fictional':'acción ñ'}
            async with client.post(origin+'/form', data={'field0':'fictional'}) as response:
                assert response.status == 200 and await response.json() == {'count':1,'first':'fictional'}
            async with client.ws_connect(origin+'/ws',compress=15) as socket:
                await socket.send_str('fictional websocket á')
                assert (await socket.receive()).data == 'fictional websocket á'
            async with client.ws_connect(origin+'/ws',compress=15) as socket:
                await socket.ping()
                await socket.send_str('fictional after ping')
                message = await socket.receive()
                if version == '3.14.4':
                    assert message.type == WSMsgType.TEXT and message.data == 'fictional after ping'
                else:
                    assert message.type == WSMsgType.CLOSE and message.data == 1002
            # 11 KB fixture, not a resource exhaustion attack.
            data = urlencode({f'field{i}':'x' for i in range(1001)})
            async with client.post(origin+'/form', data=data,headers={'Content-Type':'application/x-www-form-urlencoded'}) as response:
                limit_status = response.status
                assert limit_status == (413 if version == '3.14.4' else 200)
                await response.read()
            async with client.post(origin+'/form',data={'field0':'still works'}) as response:
                assert response.status == 200 and (await response.json())['first'] == 'still works'
        print(json.dumps({'passed':True,'aiohttp':version,'yarl':md.version('yarl'),'jsonRoundtrip':True,'unicodeURL':True,'compressedWebSocket':True,'controlFrameRegression': 'fixed' if version == '3.14.4' else 'reproduced','ordinaryForms':True,'afterRejectionWorks':True,'fieldLimitStatus':limit_status,'network':'isolated loopback only','limitation':'Representative compatibility and bounded form-limit regression, not reproduction of every advisory.'}))
    finally:
        await runner.cleanup()

asyncio.run(main())
