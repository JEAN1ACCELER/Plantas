function converter() {
  const numero = document.getElementById("inputNumero").value.trim();
  const baseOrigem = parseInt(document.getElementById("baseOrigem").value);
  const baseDestino = parseInt(document.getElementById("baseDestino").value);
  const resultadoDiv = document.getElementById("resultado");

  // Validação de número conforme base de origem
  const regexBases = {
    2: /^[01]+$/,
    8: /^[0-7]+$/,
    10: /^[0-9]+$/,
    16: /^[0-9a-fA-F]+$/
  };

  if (!regexBases[baseOrigem].test(numero)) {
    resultadoDiv.textContent = `Número inválido para base ${baseOrigem}.`;
    return;
  }

  const decimal = parseInt(numero, baseOrigem);
  const convertido = decimal.toString(baseDestino).toUpperCase();

  resultadoDiv.textContent = `Resultado: ${convertido}`;
}

function gerarTabelaHex() {
  const tabela = document.getElementById("tabelaHex");
  for (let i = 0; i < 16; i++) {
    const bin = i.toString(2).padStart(4, '0');
    const hex = i.toString(16).toUpperCase();
    const row = `<tr><td>${bin}</td><td>${hex}</td></tr>`;
    tabela.innerHTML += row;
  }
}

gerarTabelaHex();