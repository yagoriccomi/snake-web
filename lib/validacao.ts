/**
 * Validações e máscaras de entrada.
 *
 * São as MESMAS regras do aplicativo (`snake-thai/src/utils/validation.ts` e
 * `masks.ts`), copiadas de propósito: os dois clientes precisam recusar
 * exatamente o mesmo CPF, senão o aluno consegue gravar pela web um dado que o
 * app rejeitaria — e o banco acaba com cadastro em dois padrões.
 *
 * Isto aqui é defesa em profundidade, não segurança: quem protege o dado é a
 * regra no banco.
 */

/** Mínimo 8 caracteres, com maiúscula, minúscula, dígito e caractere especial. */
const SENHA_FORTE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

export function senhaEhForte(senha: string): boolean {
  return SENHA_FORTE.test(senha);
}

/** O que ainda falta na senha, para a tela dizer em vez de só recusar. */
export function faltaNaSenha(senha: string): string[] {
  const pendencias: string[] = [];
  if (senha.length < 8) pendencias.push('pelo menos 8 caracteres');
  if (!/[A-Z]/.test(senha)) pendencias.push('uma letra maiúscula');
  if (!/[a-z]/.test(senha)) pendencias.push('uma letra minúscula');
  if (!/\d/.test(senha)) pendencias.push('um número');
  if (!/[^A-Za-z0-9]/.test(senha)) pendencias.push('um símbolo');
  return pendencias;
}

export function apenasDigitos(valor: string): string {
  return valor.replace(/\D/g, '');
}

export function nomeEhValido(nome: string): boolean {
  return nome.trim().replace(/[^A-Za-zÀ-ÿ]/g, '').length >= 3;
}

/** Celular com 10 (fixo) ou 11 (móvel) dígitos. */
export function celularEhValido(valor: string): boolean {
  const digitos = apenasDigitos(valor);
  return digitos.length === 10 || digitos.length === 11;
}

/** CPF pelo formato E pelos dígitos verificadores — o algoritmo oficial. */
export function cpfEhValido(valor: string): boolean {
  const cpf = apenasDigitos(valor);
  if (cpf.length !== 11) return false;
  // 111.111.111-11 passa na conta dos dígitos, mas não é CPF de ninguém.
  if (/^(\d)\1{10}$/.test(cpf)) return false;

  const digitoVerificador = (tamanho: number): number => {
    let soma = 0;
    for (let indice = 0; indice < tamanho; indice += 1) {
      soma += Number(cpf.charAt(indice)) * (tamanho + 1 - indice);
    }
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };

  return (
    digitoVerificador(9) === Number(cpf.charAt(9)) &&
    digitoVerificador(10) === Number(cpf.charAt(10))
  );
}

export function mascararCpf(valor: string): string {
  const d = apenasDigitos(valor).slice(0, 11);
  return d
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d{1,2})$/, '.$1-$2');
}

export function mascararCelular(valor: string): string {
  const d = apenasDigitos(valor).slice(0, 11);
  if (d.length <= 10) {
    return d.replace(/^(\d{2})(\d)/, '($1) $2').replace(/(\d{4})(\d{1,4})$/, '$1-$2');
  }
  return d.replace(/^(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d{1,4})$/, '$1-$2');
}

export function mascararData(valor: string): string {
  const d = apenasDigitos(valor).slice(0, 8);
  return d.replace(/^(\d{2})(\d)/, '$1/$2').replace(/^(\d{2})\/(\d{2})(\d)/, '$1/$2/$3');
}

/** `DD/MM/AAAA` para `AAAA-MM-DD`; `null` quando a data não existe. */
export function dataBrParaIso(valor: string): string | null {
  const d = apenasDigitos(valor);
  if (d.length !== 8) return null;
  const dia = Number(d.slice(0, 2));
  const mes = Number(d.slice(2, 4));
  const ano = Number(d.slice(4, 8));
  const data = new Date(Date.UTC(ano, mes - 1, dia));
  // 31/02 vira 03/03 sem esta conferência, e a pessoa nunca saberia.
  if (
    data.getUTCDate() !== dia ||
    data.getUTCMonth() !== mes - 1 ||
    data.getUTCFullYear() !== ano ||
    ano < 1900 ||
    data > new Date()
  ) {
    return null;
  }
  return `${String(ano)}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
}
