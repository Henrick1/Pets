# Conta, sincronização e versão para celular

O progresso (fome, vida, XP, nível, grupo e caixa) fica na sua conta e é igual no computador e no celular.

## Regras do grupo e da caixa

- Você tem uma lista grande de criaturas, mas só 5 ficam no grupo.
- Só quem está no grupo gasta fome e vida, mesmo que não esteja na tela.
- Quem está na caixa fica parado. Para trocar, abra a caixa, toque em Trocar e escolha quem sai do grupo.
- O tempo conta pelo relógio: se o computador ficou desligado, o grupo gasta o que passou quando você voltar.

## 1. Criar o projeto no Supabase (uma vez)

1. Crie uma conta gratuita em supabase.com e um novo projeto.
2. Abra SQL Editor, cole o conteúdo de `supabase/schema.sql` e execute.
3. Em Authentication, Providers, Email: para entrar logo depois de criar a conta, desligue "Confirm email". Se deixar ligado, o app avisa para confirmar pelo e-mail antes de entrar.
4. Em Project Settings, API, copie a Project URL e a chave anon public.
5. Cole os dois valores em `config.js`:

```
supabaseUrl: "https://xxxx.supabase.co",
supabaseAnonKey: "eyJ..."
```

A chave anon é pública por desenho; quem protege os dados são as regras do banco (RLS) criadas pelo SQL.

## 2. Computador

```
npm install
npm start
```

Ao abrir sem sessão, o painel pede e-mail e senha. Também dá para continuar sem conta.

## 3. Celular (site instalável)

```
npm install
npm run build:web
```

Isso gera a pasta `web/`. Publique essa pasta em qualquer hospedagem estática com HTTPS, por exemplo:

- Netlify Drop: arraste a pasta `web` em app.netlify.com/drop.
- Cloudflare Pages ou GitHub Pages.

No celular, abra o endereço no navegador, entre com a mesma conta e use "Adicionar à tela inicial" (no iPhone: Compartilhar, depois Adicionar à Tela de Início; no Android o botão "Instalar o app" aparece no menu da conta).

Para testar no computador: `npm run serve:web` e abra http://localhost:8080.

Sempre que mudar `config.js` ou os pets, rode `npm run build:web` de novo e republique.

## Observações

- Sem configurar o `config.js`, o app do computador funciona só local e o site mostra os bichinhos sem login.
- Ao entrar em uma conta que já tem progresso, o da conta vale. Depois disso vale a ação mais recente entre os aparelhos.
- No computador a sessão fica em `auth.json` na pasta de dados do app, só com permissão do seu usuário.
