const level1 = {
  number: 1,
  tips: [
    "Um crime foi cometido, e como detetive, sua missão é resolver o caso. A perícia forneceu um relatório detalhado da cena do crime, mas você, de alguma forma, o perdeu.",
    "Tudo o que você lembra é que o incidente foi um assassinato ocorrido em 6 de outubro de 2023, em São Paulo.",
    "Sua primeira tarefa é recuperar o relatório da cena do crime no banco de dados do departamento de polícia.",
  ],
  problems: [
    "Seu objetivo é descobrir a descrição completa dos acontecimentos na cena do crime.",
  ],
  template: {
    descricao:
      "Imagens de segurança mostram que havia 2 testemunhas. A primeira testemunha mora na última casa na Avenida Carlos Gomes em Porto Alegre. A segunda testemunha, chamada Estefane, mora em algum lugar na Rua Augusta em São Paulo.",
  },
  hints: [
    {
      title: "Quais tabelas devo usar na consulta?",
      tip: "relatorios_criminais"
    },
    {
      title: "Quais colunas devo usar na consulta?",
      tip: "categoria, data, cidade"
    },
    {
      title: "Quais operadores devo usar na consulta?",
      tip: "=, AND"
    }
  ]
};

const level2 = {
  number: 2,
  tips: [
    "Imagens de segurança revelam que havia duas testemunhas no local.",
    "A primeira testemunha reside na última casa da Avenida Carlos Gomes em Porto Alegre.",
  ],
  problems: [
    "Seu objetivo é identificar a testemunha que corresponde à descrição fornecida.",
  ],
  template: {
    id: "6843",
    nome: "João Victor",
  },
  hints: [
    {
      title: "Quais tabelas devo usar na consulta?",
      tip: "pessoas"
    },
    {
      title: "Quais colunas devo usar na consulta?",
      tip: "logradouro, numero, cidade"
    },
    {
      title: "Quais operadores devo usar na consulta?",
      tip: "=, ORDER BY, LIMIT"
    }
  ]
};

const level3 = {
  number: 3,
  tips: [
    "Imagens de segurança mostram que havia duas testemunhas.",
    "A segunda testemunha, chamada Estefane, vive em algum lugar na Rua Augusta em São Paulo.",
  ],
  problems: [
    "Seu objetivo é identificar a testemunha que corresponde à descrição.",
  ],
  template: {
    id: "5098",
    nome: "Estefane Ribeiro",
  },
  hints: [
    {
      title: "Quais tabelas devo usar na consulta?",
      tip: "pessoas"
    },
    {
      title: "Quais colunas devo usar na consulta?",
      tip: "nome, logradouro, cidade"
    },
    {
      title: "Quais operadores devo usar na consulta?",
      tip: "=, AND, LIKE"
    }
  ]
};

const level4 = {
  number: 4,
  tips: [
    "Uma das testemunhas é João Victor, identificado pelo número '6843', residente no endereço Avenida Carlos Gomes, 1024, Porto Alegre.",
    "Ele foi entrevistado pela equipe de polícia, e as transcrições dessa entrevista estão armazenadas no banco de dados.",
  ],
  problems: [
    "Seu objetivo é recuperar as transcrições da entrevista realizada com a testemunha.",
  ],
  template: {
    transcricao:
      "Ouvi um tiro e então vi um homem correndo para fora. Ele tinha uma sacola escrito 'Fitness 360'. O número de membro na sacola começava com '6J5'. Somente membros Ouro têm essas sacolas. O homem entrou em um carro com uma placa que incluía '3J45'.",
  },
  hints: [
    {
      title: "Quais tabelas devo usar na consulta?",
      tip: "entrevistas, pessoas"
    },
    {
      title: "Quais colunas devo usar na consulta?",
      tip: "entrevistas.pessoa_id, pessoas.id"
    },
    {
      title: "Quais operadores devo usar na consulta?",
      tip: "=, JOIN"
    }
  ]
};

const level5 = {
  number: 5,
  tips: [
    "A outra testemunha é Estefane Ribeiro, identificada pelo número '5098', residente no endereço Rua Augusta, 30, São Paulo.",
    "Ela foi entrevistada pela equipe de polícia, e as transcrições dessa entrevista estão armazenadas no banco de dados.",
  ],
  problems: [
    "Seu objetivo é recuperar as transcrições da entrevista realizada com a testemunha.",
  ],
  template: {
    transcricao:
      "Eu vi o assassinato acontecer e reconheci o assassino da minha academia quando estava malhando na semana passada, dia 17 de setembro.",
  },
  hints: [
    {
      title: "Quais tabelas devo usar na consulta?",
      tip: "entrevistas, pessoas"
    },
    {
      title: "Quais colunas devo usar na consulta?",
      tip: "entrevistas.pessoa_id, pessoas.id"
    },
    {
      title: "Quais operadores devo usar na consulta?",
      tip: "=, JOIN"
    }
  ]
};

const level6 = {
  number: 6,
  tips: [
    "Uma das testemunhas ouviu um tiro e viu um homem saindo correndo. Ele carregava uma sacola escrito 'Fitness 360'.",
    "O número de membro na sacola começava com '6J5', e apenas membros Ouro têm acesso a essas sacolas. O homem entrou em um carro cuja placa incluía '3J45'.",
    "A outra testemunha relatou que presenciou o assassinato e reconheceu o assassino como alguém que viu na academia enquanto malhava na semana passada, no dia 17 de setembro.",
  ],
  problems: [
    "Seu objetivo é identificar o assassino com base nas informações fornecidas pelas testemunhas.",
  ],
  template: {
    id: "7507",
    nome: "Gabriel Braga",
  },
  hints: [
    {
      title: "Quais tabelas devo usar na consulta?",
      tip: "pessoas, carteiras_motorista, registros_academias"
    },
    {
      title: "Quais colunas devo usar na consulta?",
      tip: "pessoas.id, pessoas.carteira_id, carteiras_motorista.id, carteiras_motorista.placa_carro, registros_academias.id, registros_academias.pessoa_id, registros_academias.academia, registros_academias.codigo_membro, registros_academias.status_membro"
    },
    {
      title: "Quais operadores devo usar na consulta?",
      tip: "=, JOIN, AND, LIKE"
    }
  ]
};

const level7 = {
  number: 7,
  tips: [
    "Parabéns, você encontrou o assassino! Mas espere, há mais... o verdadeiro vilão por trás deste crime ainda está à solta.",
    "O assassino se chama Gabriel Braga, identificado pelo número '7507', e é membro Ouro da academia Fitness 360.",
    "Ele foi entrevistado pela polícia e forneceu mais detalhes sobre o crime.",
  ],
  problems: [
    "Seu objetivo é recuperar as transcrições da entrevista realizada com o assassino.",
  ],
  template: {
    transcricao:
      "Fui contratado por uma mulher com muito dinheiro. Não sei o nome dela, mas sei que ela tem cerca de 170 ou 180 centímetros. Ela tem cabelo loiro e dirige um Hyundai Creta. Sei que ela foi a Conferência de Inteligência Artificial 3 vezes em agosto de 2015.",
  },
  hints: [
    {
      title: "Quais tabelas devo usar na consulta?",
      tip: "entrevistas, pessoas"
    },
    {
      title: "Quais colunas devo usar na consulta?",
      tip: "entrevistas.pessoa_id, pessoas.id"
    },
    {
      title: "Quais operadores devo usar na consulta?",
      tip: "=, JOIN"
    }
  ]
};

const level8 = {
  number: 8,
  tips: [
    "O assassino relatou na entrevista que foi contratado por uma mulher rica.",
    "Ele disse que não sabe o nome dela, mas mencionou que ela tem aproximadamente 170 ou 180 centímetros de altura.",
    "Ela possui cabelo loiro e dirige um Hyundai Creta.",
    "Além disso, ele informou que ela compareceu a Conferência de Inteligência Artificial três vezes em agosto de 2015.",
  ],
  problems: [
    "Seu objetivo é identificar o verdadeiro vilão com base nas informações fornecidas pelo assassino.",
  ],
  template: {
    nome: "Nazaré Tedesco",
    id: "6009",
  },
  hints: [
    {
      title: "Quais tabelas devo usar na consulta?",
      tip: "pessoas, carteiras_motorista, registros_eventos"
    },
    {
      title: "Quais colunas devo usar na consulta?",
      tip: "pessoas.id, pessoas.carteira_id, carteiras_motorista.id, carteiras_motorista.sexo, carteiras_motorista.marca_carro, carteiras_motorista.modelo_carro, registros_eventos.pessoa_id, registros_eventos.evento"
    },
    {
      title: "Quais operadores devo usar na consulta?",
      tip: "=, JOIN, AND, BETWEEN, LIKE"
    }
  ]
};

const levels = [level1, level2, level3, level4, level5, level6, level7, level8];

export default levels;
