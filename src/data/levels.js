const level1 = {
  number: 1,
  tips: [
    "Um crime foi cometido, e como detetive, sua missão é resolver o caso. A perícia forneceu um relatório detalhado da cena do crime, mas você, de alguma forma, o perdeu.",
    "Tudo o que você lembra é que o incidente foi um assassinato ocorrido em 15 de janeiro de 2018, em SQL City.",
    "Sua primeira tarefa é recuperar o relatório da cena do crime no banco de dados do departamento de polícia.",
  ],
  problems: [
    "Seu objetivo é descobrir a descrição completa dos acontecimentos na cena do crime.",
  ],
  template: {
    description:
      'Security footage shows that there were 2 witnesses. The first witness lives at the last house on "Northwestern Dr". The second witness, named Annabel, lives somewhere on "Franklin Ave".',
  },
};

const level2 = {
  number: 2,
  tips: [
    "Imagens de segurança revelam que havia duas testemunhas no local.",
    "A primeira testemunha reside na última casa da 'Northwestern Dr'.",
  ],
  problems: [
    "Seu objetivo é identificar a testemunha que corresponde à descrição fornecida.",
  ],
  template: {
    id: "14887",
    name: "Morty Schapiro",
  },
};

const level3 = {
  number: 3,
  tips: [
    "Imagens de segurança mostram que havia duas testemunhas.",
    "A segunda testemunha, chamada Annabel, vive em algum lugar na 'Franklin Ave'.",
  ],
  problems: [
    "Seu objetivo é identificar a testemunha que corresponde à descrição.",
  ],
  template: {
    id: "16371",
    name: "Annabel Miller",
  },
};

const level4 = {
  number: 4,
  tips: [
    "Uma das testemunhas é Morty Schapiro, identificado pelo número '14887', residente no endereço Northwestern Dr, 4919.",
    "Ele foi entrevistado pela equipe de polícia, e as transcrições dessa entrevista estão armazenadas no banco de dados.",
  ],
  problems: [
    "Seu objetivo é recuperar as transcrições da entrevista realizada com a testemunha.",
  ],
  template: {
    transcript:
      'I heard a gunshot and then saw a man run out. He had a "Get Fit Now Gym" bag. The membership number on the bag started with "48Z". Only gold members have those bags. The man got into a car with a plate that included "H42W".',
  },
};

const level5 = {
  number: 5,
  tips: [
    "A outra testemunha é Annabel Miller, identificada pelo número '16371', residente no endereço Franklin Ave, 103.",
    "Ela foi entrevistada pela equipe de polícia, e as transcrições dessa entrevista estão armazenadas no banco de dados.",
  ],
  problems: [
    "Seu objetivo é recuperar as transcrições da entrevista realizada com a testemunha.",
  ],
  template: {
    transcript:
      "I saw the murder happen, and I recognized the killer from my gym when I was working out last week on January the 9th.",
  },
};

const level6 = {
  number: 6,
  tips: [
    "Uma das testemunhas ouviu um tiro e viu um homem saindo correndo. Ele carregava uma sacola do 'Get Fit Now Gym'.",
    "O número de membro na sacola começava com '48Z', e apenas membros Gold têm acesso a essas sacolas. O homem entrou em um carro cuja placa incluía 'H42W'.",
    "A outra testemunha relatou que presenciou o assassinato e reconheceu o assassino como alguém que viu na academia enquanto malhava na semana passada, no dia 9 de janeiro.",
  ],
  problems: [
    "Seu objetivo é identificar o assassino com base nas informações fornecidas pelas testemunhas.",
    "Pode ser necessário realizar várias consultas no banco de dados para isso.",
  ],
  template: {
    id: "67318",
    name: "Jeremy Bowers",
  },
};

const level7 = {
  number: 7,
  tips: [
    "Parabéns, você encontrou o assassino! Mas espere, há mais... o verdadeiro vilão por trás deste crime ainda está à solta.",
    "O assassino se chama Jeremy Bowers, identificado pelo número '67318', e é membro Gold da academia.",
    "Ele foi entrevistado pela polícia e forneceu mais detalhes sobre o crime.",
  ],
  problems: [
    "Seu objetivo é recuperar as transcrições da entrevista realizada com o assassino.",
  ],
  template: {
    transcript:
      "I was hired by a woman with a lot of money. I don't know her name but I know she's around 5'5\" (65\") or 5'7\" (67\"). She has red hair and she drives a Tesla Model S. I know that she attended the SQL Symphony Concert 3 times in December 2017.",
  },
};

const level8 = {
  number: 8,
  tips: [
    "O assassino relatou na entrevista que foi contratado por uma mulher rica.",
    "Ele disse que não sabe o nome dela, mas mencionou que ela tem aproximadamente 5'5\" (65\") ou 5'7\" (67\") de altura.",
    "Ela possui cabelo ruivo e dirige um Tesla Model S.",
    "Além disso, ele informou que ela compareceu ao SQL Symphony Concert três vezes em dezembro de 2017.",
  ],
  problems: [
    "Seu objetivo é identificar o verdadeiro vilão com base nas informações fornecidas pelo assassino.",
    "Pode ser necessário realizar várias consultas no banco de dados para isso.",
  ],
  template: {
    id: "99716",
    name: "Miranda Priestly",
  },
};

const levels = [level1, level2, level3, level4, level5, level6, level7, level8];

export default levels;
