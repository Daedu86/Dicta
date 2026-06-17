import type { LanguageCode } from './types';

export const FALLBACK_PHRASES: Record<LanguageCode, string[]> = {
  de: [
    'Heute planen wir eine ruhige Uebung mit klaren Saetzen und kurzen Pausen.',
    'Die Aufgabe bleibt einfach, damit du dich auf Rhythmus und Genauigkeit konzentrierst.',
    'Nach jedem Satz kannst du den Text pruefen und dann kontrolliert weiter tippen.',
    'Wenn ein Wort schwierig ist, halte kurz inne und wiederhole den ganzen Abschnitt.',
    'Der Morgen beginnt mit Kaffee, Notizen und einem geordneten Blick auf den Tag.',
    'Im Buero werden Termine verglichen, Aufgaben verteilt und offene Fragen gesammelt.',
    'Eine gute Mitschrift braucht Geduld, saubere Satzzeichen und gleichmaessiges Tempo.',
    'Zum Schluss kontrollierst du Namen, Zahlen und die wichtigsten Verben noch einmal.',
  ],
  en: [
    'This practice session uses clear sentences, steady pacing, and short pauses.',
    'Focus on accuracy first, then let your typing speed rise naturally.',
    'After each phrase, check the words before moving to the next line.',
    'If a sentence feels difficult, pause briefly and repeat the full idea.',
    'The morning report includes plans, notes, and a careful review of priorities.',
    'During the meeting, the team compares options and records the next actions.',
    'A reliable transcript needs patience, punctuation, and consistent attention.',
    'At the end, review names, numbers, and the most important verbs again.',
  ],
  es: [
    'Esta practica usa frases claras, ritmo estable y pausas breves.',
    'Concetrate primero en la precision y despues aumenta la velocidad poco a poco.',
    'Despues de cada frase, revisa las palabras antes de continuar.',
    'Si una oracion parece dificil, haz una pausa y repite la idea completa.',
    'El informe de la manana incluye planes, notas y prioridades del dia.',
    'Durante la reunion, el equipo compara opciones y registra las proximas tareas.',
    'Una transcripcion fiable necesita paciencia, puntuacion y atencion constante.',
    'Al final, revisa nombres, numeros y los verbos mas importantes otra vez.',
  ],
  fr: [
    'Cette seance utilise des phrases claires, un rythme stable et des pauses courtes.',
    'Concentre-toi d abord sur la precision, puis augmente la vitesse peu a peu.',
    'Apres chaque phrase, verifie les mots avant de continuer.',
    'Si une phrase semble difficile, fais une pause et repete toute l idee.',
    'Le rapport du matin presente les plans, les notes et les priorites du jour.',
    'Pendant la reunion, l equipe compare les options et note les prochaines actions.',
    'Une transcription fiable demande de la patience, de la ponctuation et une attention constante.',
    'A la fin, revise les noms, les nombres et les verbes les plus importants.',
  ],
  pt: [
    'Esta pratica usa frases claras, ritmo estavel e pausas curtas.',
    'Concentre-se primeiro na precisao e depois aumente a velocidade pouco a pouco.',
    'Depois de cada frase, confira as palavras antes de continuar.',
    'Se uma oracao parecer dificil, faca uma pausa e repita a ideia completa.',
    'O relatorio da manha inclui planos, notas e prioridades do dia.',
    'Durante a reuniao, a equipe compara opcoes e registra as proximas tarefas.',
    'Uma transcricao confiavel precisa de paciencia, pontuacao e atencao constante.',
    'No final, revise nomes, numeros e os verbos mais importantes outra vez.',
  ],
};

export const HARD_FALLBACK_PHRASES: Record<LanguageCode, string[]> = {
  de: [
    'Obwohl der Zeitplan eng bleibt, muessen die wichtigsten Entscheidungen praezise dokumentiert werden.',
    'Die Analyse vergleicht mehrere Vorschlaege, bevor ein tragfaehiger Kompromiss formuliert wird.',
    'Besonders anspruchsvoll sind lange Nebensaetze, wechselnde Betonungen und unerwartete Fachbegriffe.',
    'Am Ende entsteht ein Protokoll, das Ursachen, Folgen und konkrete naechste Schritte trennt.',
  ],
  en: [
    'Although the schedule remains tight, the most important decisions must be documented precisely.',
    'The analysis compares several proposals before a workable compromise is finally written down.',
    'Long clauses, shifting emphasis, and unexpected technical terms make the exercise more demanding.',
    'The final note separates causes, consequences, and concrete next steps for the team.',
  ],
  es: [
    'Aunque el horario sigue ajustado, las decisiones principales deben documentarse con precision.',
    'El analisis compara varias propuestas antes de formular un compromiso practico.',
    'Las frases largas, los cambios de enfasis y los terminos tecnicos aumentan la dificultad.',
    'La nota final separa causas, consecuencias y proximos pasos concretos para el equipo.',
  ],
  fr: [
    'Bien que le calendrier reste serre, les decisions principales doivent etre documentees avec precision.',
    'L analyse compare plusieurs propositions avant de formuler un compromis vraiment praticable.',
    'Les longues propositions, les changements d accent et les termes techniques rendent l exercice plus exigeant.',
    'La note finale separe les causes, les consequences et les prochaines etapes concretes pour l equipe.',
  ],
  pt: [
    'Embora o cronograma continue apertado, as decisoes principais devem ser documentadas com precisao.',
    'A analise compara varias propostas antes de formular um compromisso realmente pratico.',
    'As oracoes longas, as mudancas de enfase e os termos tecnicos aumentam a dificuldade.',
    'A nota final separa causas, consequencias e proximos passos concretos para a equipe.',
  ],
};
