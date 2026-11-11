import asyncio
from playwright.async_api import async_playwright, expect
B='http://localhost:4173/#'
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
        pg = await (await b.new_context(viewport={'width':1280,'height':900})).new_page()
        errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(B+'/'); await pg.wait_for_timeout(1200)
        # cadastro
        await pg.goto(B+'/cadastro'); await pg.wait_for_timeout(400)
        f = pg.locator('form input')
        await f.nth(0).fill('Teste Automatizado Silva'); await f.nth(1).fill('84999998888')
        await f.nth(3).fill('teste.e2e@exemplo.com'); await f.nth(5).fill('senhaforte1')
        await pg.locator('form input[type=checkbox]').check()
        await pg.get_by_role('button', name='Criar conta').click(); await pg.wait_for_timeout(600)
        assert '/cliente' in pg.url, pg.url
        print('cadastro ok')
        # anamnese
        await pg.goto(B+'/cliente/anamnese'); await pg.wait_for_timeout(400)
        await pg.get_by_role('button', name='Continuar').click()
        await pg.get_by_role('checkbox', name='Diabetes').click()
        await pg.get_by_role('radiogroup', name='medicamentos').get_by_role('radio', name='Sim').click()
        await pg.get_by_role('radiogroup', name='alergias').get_by_role('radio', name='Não').click()
        await pg.get_by_role('button', name='Continuar').click()  # deve falhar: falta detalhe
        await expect(pg.get_by_text('Informe quais medicamentos.')).to_be_visible()
        await pg.get_by_placeholder('Quais?').fill('Metformina (teste)')
        await pg.get_by_role('button', name='Continuar').click()
        await pg.get_by_role('checkbox', name='Nenhuma das opções').click()
        await pg.get_by_role('radiogroup', name='sensibilidade').get_by_role('radio', name='Não').click()
        await pg.get_by_role('button', name='Continuar').click()
        for g in ['dor','lesao','limitacao']:
            await pg.get_by_role('radiogroup', name=g).get_by_role('radio', name='Sim' if g=='dor' else 'Não').click()
        await pg.get_by_role('button', name='Continuar').click()
        # mapa: tenta avançar sem marcar
        await pg.get_by_role('button', name='Continuar').click()
        await expect(pg.get_by_text('marque no mapa pelo menos').first).to_be_visible()
        await pg.locator('[data-region="posterior.lombar"]').click()
        await pg.locator('[data-region="anterior.ombro.esq"]').click()
        await pg.get_by_role('button', name='Amarelo').click()
        await pg.get_by_role('button', name='Mais atenção, sem dor').click()
        await pg.locator('[data-region="posterior.panturrilha.dir"]').click()
        fill = await pg.locator('[data-region="posterior.lombar"]').get_attribute('fill')
        assert fill == '#C4543F', fill
        # trocar cor do ombro: clicar com amarelo/atencao substitui
        await pg.locator('[data-region="anterior.ombro.esq"]').click()
        assert 'hatch-amarelo' in (await pg.locator('[data-region="anterior.ombro.esq"]').get_attribute('fill'))
        # borracha
        await pg.get_by_role('button', name='Borracha').click()
        await pg.locator('[data-region="anterior.ombro.esq"]').click()
        assert (await pg.locator('[data-region="anterior.ombro.esq"]').get_attribute('fill')) == '#F3F2EF'
        await expect(pg.get_by_text('Regiões marcadas (2)')).to_be_visible()
        print('mapa ok')
        await pg.get_by_role('button', name='Continuar').click()
        for g,v in [('gestante','Não se aplica'),('evitar','Não'),('objetivo','Relaxamento'),('pressao','Moderada')]:
            await pg.get_by_role('radiogroup', name=g).get_by_role('radio', name=v).click()
        await pg.get_by_role('button', name='Continuar').click()
        btn = pg.get_by_role('button', name='Enviar anamnese')
        assert await btn.is_disabled()
        await pg.get_by_text('Li e concordo').click()
        await btn.click(); await pg.wait_for_timeout(500)
        await pg.goto(B+'/cliente/anamnese'); await pg.wait_for_timeout(400)
        await expect(pg.get_by_text('Versão 1')).to_be_visible()
        assert (await pg.locator('[data-region="posterior.lombar"]').get_attribute('fill')) == '#C4543F'
        print('anamnese salva e recuperada ok')
        # agendamento
        await pg.goto(B+'/cliente/agendar'); await pg.wait_for_timeout(400)
        await pg.locator('button:has(span.bg-sage-500)').nth(3).click()
        await pg.wait_for_timeout(200)
        await pg.locator('.grid-cols-3 button').first.click()
        await pg.get_by_label('Rua / avenida').fill('Rua Teste'); 
        await pg.get_by_label('Número').fill('10'); await pg.get_by_label('Bairro').fill('Centro')
        await pg.get_by_role('button', name='Confirmar agendamento').click(); await pg.wait_for_timeout(400)
        await expect(pg.get_by_text('Sessão agendada!')).to_be_visible()
        print('agendamento ok')
        # cliente nao acessa admin
        await pg.goto(B+'/admin'); await pg.wait_for_timeout(400)
        assert '/cliente' in pg.url, pg.url
        print('bloqueio admin ok')
        # admin vê mapa
        await pg.goto(B+'/cliente'); await pg.get_by_role('button', name='Sair').first.click()
        await pg.goto(B+'/admin/login'); await pg.wait_for_timeout(300)
        await pg.get_by_label('E-mail').fill('admin@demo.salvia'); await pg.get_by_label('Senha').fill('demo1234'); await pg.get_by_role('button', name='Entrar').click(); await pg.wait_for_timeout(500)
        await pg.goto(B+'/admin/clientes'); await pg.get_by_text('Teste Automatizado Silva').first.click(); await pg.wait_for_timeout(300)
        await pg.get_by_role('button', name='Anamnese e mapa').click()
        assert (await pg.locator('[data-region="posterior.lombar"]').get_attribute('fill')) == '#C4543F'
        await expect(pg.get_by_text('Metformina (teste)')).to_be_visible()
        print('admin ve mapa ok')
        await pg.goto(B+'/admin/agenda'); await pg.wait_for_timeout(400)
        await pg.screenshot(path='/home/claude/shots/e2e-agenda.png')
        # ana não vê notas
        await pg.get_by_role('button', name='Sair').first.click()
        await pg.goto(B+'/entrar'); await pg.get_by_label('E-mail').fill('ana.demo@exemplo.com'); await pg.get_by_label('Senha').fill('demo1234'); await pg.get_by_role('button', name='Entrar').click(); await pg.wait_for_timeout(500)
        for path in ['/cliente','/cliente/historico','/cliente/anamnese','/cliente/pacotes','/cliente/notificacoes']:
            await pg.goto(B+path); await pg.wait_for_timeout(300)
            t = await pg.inner_text('body')
            assert 'Nota interna' not in t, path
        print('notas privadas ok')
        print('ERROS JS:', errs or 'nenhum')
        await b.close()
asyncio.run(main())
