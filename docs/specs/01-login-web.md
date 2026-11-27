# Login web: Entrar, Esqueci minha senha, Criar senha

Situação: no ar na homologação (PRs #2 a #5 e #8). Referência visual aprovada em 20/11: https://orizon-rho.vercel.app
Quem acessa: qualquer pessoa já cadastrada.

## Telas
| Endereço | Tela |
| --- | --- |
| `/entrar` | E-mail, senha (com mostrar/ocultar), "Manter conectado", link "Esqueci minha senha", botão Entrar |
| `/esqueci-senha` | 3 etapas: e-mail → código de 6 dígitos → nova senha → pronto |
| `/criar-senha` | Destino do convite: código (ou link) → criar senha → pronto |
| `/primeiro-acesso` | Desligado na web: redireciona para `/entrar` (Gilmar pausou em 27/11; o fluxo fica para o celular) |

As telas Entrar mantêm a frase dos Termos de uso e da Política de privacidade e a "Versão 1.0.0" (16/11).

## Regras
- Ao entrar com sucesso, vai para `/inicio`.
- Link de convite ou recuperação no formato padrão do Supabase (`#access_token=...`) que cair em `/entrar` é levado para `/criar-senha`.
- Senha forte: 8 caracteres, 1 minúscula, 1 maiúscula, 1 número e 1 símbolo, mostrados como lista de conferência.
- Código de 6 dígitos vale 24 horas.

## Mensagens
| Situação | Mensagem |
| --- | --- |
| Campos vazios ou e-mail inválido | Preencha e-mail e senha. |
| Senha errada | E-mail ou senha incorretos. |
| E-mail não confirmado | Confirme seu e-mail antes de entrar. |
| Código errado ou vencido | Código inválido ou expirado. Peça um novo. |
| Muitas tentativas | Muitas tentativas. Aguarde alguns minutos. |
| Senha igual à anterior | A nova senha precisa ser diferente da anterior. |

## E-mails (modelos em `supabase/templates/`)
Convite, redefinir senha, confirmar e-mail e código de acesso. Só entram em uso quando o SMTP do Mailgrid for ligado;
até lá o Supabase manda o e-mail padrão (só link, sem código).

## Pendente
- SMTP Mailgrid (remetente `nao-responda@orizonsportss.com.br`, domínio a confirmar).
- Login do celular (aprovado em 20/11, artifact "Orizon Pass Mobile"): entrar com digital; e-mail não encontrado = autocadastro como Visitante.
