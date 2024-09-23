const level1 = {
  number: 1,
  tips: [
    "Um crime ocorreu e você como detetive precisa desvendar o caso. A perícia lhe deu o relatório da cena do crime, mas de alguma forma você o perdeu.",
    "Você vagamente se lembra que o crime foi um assassinato que ocorreu em algum momento em 15 de janeiro de 2018 e que ocorreu em SQL City.",
    "Comece recuperando o relatório da cena do crime correspondente do banco de dados do departamento de polícia."
  ],
  problems: [
    "Seu objetivo é descobrir a descrição do que ocorreu na cena do crime."
  ],
  template: {
    description: "Security footage shows that there were 2 witnesses. The first witness lives at the last house on \"Northwestern Dr\". The second witness, named Annabel, lives somewhere on \"Franklin Ave\"."
  },
};

const level2 = {
  number: 2,
  tips: [
    "Imagens de segurança mostram que havia 2 testemunhas.",
    "A primeira testemunha mora na última casa na \"Northwestern Dr\"."
  ],
  problems: [
    "Seu objetivo é identificar a testemunha que se encaixa na descrição.",
  ],
  template: {
    id: "14887",
    name: "Morty Schapiro"
  },
};

const level3 = {
  number: 3,
  tips: [
    "Imagens de segurança mostram que havia 2 testemunhas.",
    "A segunda testemunha, chamada Annabel, mora em algum lugar na \"Franklin Ave\""
  ],
  problems: [
    "Seu objetivo é identificar a testemunha que se encaixa na descrição.",
  ],
  template: {
    id: "16371",
    name: "Annabel Miller"
  },
};

const level4 = {
  number: 4,
  tips: [
    "Uma das testemunhas se chama Morty Schapiro, sua identificação é \"14887\", mora em Northwestern Dr, 4919.",
    "A testemunha foi entrevistada pela equipe de pólicia e as transcrições foram guardadas no banco de dados."
  ],
  problems: [
    "Seu objetivo é recuperar as transcrições da conversa realizada pela testemunha.",
  ],
  template: {
    transcript: "I heard a gunshot and then saw a man run out. He had a \"Get Fit Now Gym\" bag. The membership number on the bag started with \"48Z\". Only gold members have those bags. The man got into a car with a plate that included \"H42W\".",
  },
};

const level5 = {
  number: 5,
  tips: [
    "A outra testemunha se chama Annabel Miller, sua identificação é \"16371\", mora em Franklin Ave, 103.",
    "A testemunha foi entrevistada pela equipe de pólicia e as transcrições foram guardadas no banco de dados."
  ],
  problems: [
    "Seu objetivo é recuperar as transcrições da conversa realizada pela testemunha.",
  ],
  template: {
    transcript: "I saw the murder happen, and I recognized the killer from my gym when I was working out last week on January the 9th.",
  },
};

const level6 = {
  number: 6,
  tips: [
    "Uma das testemunhas ouviu um tiro e então viu um homem correndo para fora. Ele tinha uma sacola \"Get Fit Now Gym\".",
    "O número de membro na sacola começava com \"48Z\". Somente membros Gold têm essas sacolas. O homem entrou em um carro com uma placa que incluía \"H42W\".",
    "A outra testemunha contou que viu o assassinato acontecer e reconheceu o assassino da sua academia quando estava malhando na semana passada, no dia 9 de janeiro."
  ],
  problems: [
    "Seu objetivo é identificar o assassino com base nos dados fornecidos pelas testemunhas.",
    "Talvez seja necessário efetuar mais de uma consulta."
  ],
  template: {
    id: "67318",
    name: "Jeremy Bowers",
  },
};

const level7 = {
  number: 7,
  tips: [
    "Parabéns, você encontrou o assassino! Mas espere, tem mais... o verdadeiro vilão por trás deste crime ainda está solto.",
    "O assassino se chama Jeremy Bowers, sua identificação é \"67318\", é membro gold da academia.",
    "O assassino realizou uma entrevista com a polícia e trouxe mais dethales sobre o crime."
  ],
  problems: [
    "Seu objetivo é recuperar as transcrições da conversa realizada com o assassino.",
  ],
  template: {
    transcript: "I was hired by a woman with a lot of money. I don't know her name but I know she's around 5'5\" (65\") or 5'7\" (67\"). She has red hair and she drives a Tesla Model S. I know that she attended the SQL Symphony Concert 3 times in December 2017.",
  },
};

const level8 = {
  number: 8,
  tips: [
    "O assassino relatou na entrevista que foi contratado por uma mulher com muito dinheiro.",
    "Disse que não sabe seu nome, mas que ela tem cerca de 5'5\" (65\") ou 5'7\" (67\").",
    "Ela tem cabelo ruivo e dirige um Tesla Model S.",
    "Relatou também que ela compareceu ao SQL Symphony Concert 3 vezes em dezembro de 2017."
  ],
  problems: [
    "Seu objetivo é identificar o verdadeiro vilão com base nos dados fornecidos pelo assassino.",
    "Talvez seja necessário efetuar mais de uma consulta."
  ],
  template: {
    id: "99716",
    name: "Miranda Priestly",
  },
};

const levels = [
  level1,
  level2,
  level3,
  level4,
  level5,
  level6,
  level7,
  level8
];

export default levels;
