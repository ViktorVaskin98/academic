import { register } from './viz.js';
import { shell, controlRow, buttonGroup } from './render.js';

const PROGRESS_KEY = 'difgem-progress';

const readProgress = () => {
  try {
    return JSON.parse(window.localStorage.getItem(PROGRESS_KEY) || '{}') || {};
  } catch {
    return {};
  }
};

export const pickTicket = (count, isDone, onlyFresh, random = Math.random) => {
  const all = Array.from({ length: count }, (_, index) => index + 1);
  const fresh = all.filter((number) => !isDone(number));
  const pool = onlyFresh && fresh.length > 0 ? fresh : all;
  return pool[Math.floor(random() * pool.length)];
};

register('TicketDraw', (host, config) => {
  const parts = config.parts || [];
  const state = { onlyFresh: true, drawn: null };

  const { body, captionNode } = shell(host, {
    badge: 'Тренажёр',
    title: config.title || 'Вытянуть билеты',
    caption: config.caption || 'На коллоквиуме два вопроса: один из списка по топологии, второй — '
      + 'по многообразиям. Тяни пару, отвечай вслух 5–7 минут по плану «формулировка → '
      + 'доказательство → 3 примера → контрпример», потом открывай билет и сверяйся. '
      + 'Режим «сначала неразобранные» берёт билеты, которые ты ещё не отметил галочкой.',
  });
  const controls = controlRow(body);
  const result = document.createElement('div');
  result.className = 'ticket-draw';
  body.appendChild(result);

  const render = () => {
    result.innerHTML = '';
    if (!state.drawn) {
      const hint = document.createElement('p');
      hint.className = 'footnote';
      hint.textContent = 'Нажми «вытянуть» — появятся два билета.';
      result.appendChild(hint);
      return;
    }
    const progress = readProgress();
    state.drawn.forEach((number, index) => {
      const part = parts[index];
      const card = document.createElement('a');
      card.className = 'ticket-draw__card';
      card.href = `${part.href}#b-${number}`;
      const kicker = document.createElement('small');
      const done = progress[`${part.prefix}/${number}`];
      kicker.textContent = `${part.label} · билет ${number}${done ? ' · уже разобран' : ''}`;
      const title = document.createElement('b');
      title.textContent = part.titles[number - 1] || `Билет ${number}`;
      card.append(kicker, title);
      result.appendChild(card);
    });
  };

  const draw = () => {
    const progress = readProgress();
    state.drawn = parts.map((part) => pickTicket(
      part.titles.length,
      (number) => Boolean(progress[`${part.prefix}/${number}`]),
      state.onlyFresh,
    ));
    render();
  };

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'btn btn--active';
  button.textContent = 'вытянуть билеты';
  button.addEventListener('click', draw);
  controls.appendChild(button);
  buttonGroup(
    controls,
    [{ label: 'сначала неразобранные', value: true }, { label: 'любые', value: false }],
    (value) => { state.onlyFresh = value; },
    0,
  );

  if (captionNode) body.appendChild(captionNode);
  render();
});
